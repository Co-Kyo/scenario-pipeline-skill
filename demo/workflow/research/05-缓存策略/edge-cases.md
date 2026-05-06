# P5-缓存策略 | Edge Cases — 坑点提取

## 概述

缓存系统的设计看似简单——"存下来，下次用"——但在生产环境中，缓存相关的故障往往是 **最难排查、影响最广** 的问题之一。本节提取三层缓存中最常见的坑点，按严重程度和触发条件分类。

---

## 一、缓存穿透（Cache Penetration）

### 触发条件
请求的资源在缓存中不存在，且源站也无此资源（或缓存未初始化），导致每次请求都穿透到源站。

### 典型场景
- 用户访问一个从未被缓存的页面（冷启动）
- 恶意请求大量不存在的 URL（如扫描器、爬虫）
- 缓存刚被 Purge 后的流量尖峰

### 症状
```
源站 QPS 突增 → 响应延迟飙升 → 5xx 错误率上升
```

### 缓解方案

**CDN 层：**
```nginx
# Nginx 缓存穿透保护
proxy_cache_use_stale error timeout updating http_500 http_502 http_503;
proxy_cache_lock on;  # 合并并发回源请求
proxy_cache_lock_timeout 5s;
```

**Service Worker 层：**
```javascript
// 空响应不写入缓存
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open('v1');
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}
```

**通用策略：**
- 空值缓存：将"不存在"也缓存一小段时间（如 30 秒），避免反复穿透
- Request Coalescing：CDN 层合并同一资源的并发回源请求
- 限流 + WAF：拦截恶意扫描流量

---

## 二、缓存雪崩（Cache Avalanche）

### 触发条件
大量缓存资源在同一时间过期，瞬时产生海量回源请求，源站不堪重负。

### 典型场景
- 批量部署时所有资源使用相同的 max-age
- CDN TTL 统一设置为相同值
- 定时任务批量更新缓存

### 症状
```
缓存集中过期 → 回源 QPS 突增 10-100 倍 → 源站超时 → 级联故障
```

### 缓解方案

**Jittered TTL（抖动 TTL）：**
```javascript
// 基础 TTL + 随机偏移
const baseTTL = 3600; // 1 小时
const jitter = Math.floor(Math.random() * 300); // 0-5 分钟随机
const maxAge = baseTTL + jitter;
res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
```

**CDN 配置：**
```
# 分层 TTL，避免同时过期
静态 JS/CSS: s-maxage=86400 + max-age=3600
图片资源:     s-maxage=604800 + max-age=86400
HTML 入口:    s-maxage=60 + stale-while-revalidate=300
```

**Service Worker 预缓存：**
```javascript
// install 阶段预缓存关键资源，不受网络影响
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('critical-v1').then(cache =>
      cache.addAll(['/shell.html', '/critical.css', '/app.js'])
    )
  );
});
```

---

## 三、缓存版本污染（Cache Version Pollution）

### 触发条件
新版本部署后，旧版本缓存未被清除，导致用户加载到过时资源。

### 典型场景
- Service Worker 更新后旧缓存未清理
- CDN Purge 不完全（部分边缘节点未失效）
- 浏览器缓存仍在有效期内

### 症状
```
用户看到旧版界面 → JS/CSS 版本不匹配 → 功能异常 / 白屏
```

### 缓解方案

**内容哈希 URL（最可靠）：**
```
/assets/main.abc123.js   →  Cache-Control: immutable, max-age=31536000
/assets/main.def456.js   →  新版本自动生成新 URL
```

**Service Worker 版本管理：**
```javascript
const CACHE_NAME = 'app-v2';  // 版本号随部署更新

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(name => name !== CACHE_NAME)
              .map(name => caches.delete(name))
      )
    )
  );
});
```

**CDN 主动 Purge + 预热：**
```bash
# Purge 旧版本
curl -X POST "https://api.cdn.com/purge" \
  -d '{"urls": ["/index.html", "/manifest.json"]}'

# 预热新版本
curl -X POST "https://api.cdn.com/warmup" \
  -d '{"urls": ["/assets/main.def456.js"]}'
```

---

## 四、缓存一致性延迟（Stale Cache）

### 触发条件
内容更新后，缓存未及时失效，用户看到旧版本内容。

### 典型场景
- 新闻/公告页面更新后 CDN 缓存未刷新
- 用户头像更新后浏览器缓存未失效
- 配置变更后 Service Worker 仍返回旧缓存

### 症状
```
用户反馈"内容不对" → 排查发现是缓存 → 等待 TTL 过期或手动 Purge
```

### 缓解方案

**分层 TTL 策略：**
```
不常变资源（图片/字体）: max-age=31536000, immutable
偶尔变资源（JS/CSS）:    max-age=3600 + 内容哈希
频繁变资源（HTML/API）:  no-cache + ETag
```

**stale-while-revalidate 模式：**
```http
Cache-Control: public, max-age=60, stale-while-revalidate=3600
```
过期后先返回旧缓存，后台异步验证并更新。用户感知不到延迟。

**Service Worker 消息通知：**
```javascript
// 通知所有客户端有新版本
self.addEventListener('activate', event => {
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({ type: 'NEW_VERSION' }));
    })
  );
});
```

---

## 五、Vary 头过度膨胀（Vary Explosion）

### 触发条件
Vary 头包含过多维度，导致缓存键组合爆炸，命中率骤降。

### 典型场景
```http
# 灾难性配置
Vary: User-Agent, Accept-Language, Accept-Encoding, Cookie
```
User-Agent 有数千种变体，每个变体都会产生独立的缓存副本。

### 症状
```
缓存命中率从 95% 降到 20% → 回源率飙升 → 源站压力倍增
```

### 缓解方案

**精简 Vary 维度：**
```http
# 推荐：只按压缩格式区分
Vary: Accept-Encoding

# 避免：User-Agent 维度爆炸
# Vary: User-Agent  ← 除非确实需要
```

**CDN 层面：**
```
# 忽略不影响内容的 Header
cdn-cache-key: url + accept-encoding  # 不含 User-Agent
```

**Service Worker 层面：**
```javascript
// 手动规范化缓存键
function normalizeRequest(request) {
  const url = new URL(request.url);
  url.searchParams.delete('utm_source');  // 去除无关参数
  return new Request(url.toString());
}
```

---

## 六、私有数据泄露（Private Data Leak）

### 触发条件
包含用户私有数据的响应被标记为 public，被 CDN 共享缓存存储并返回给其他用户。

### 典型场景
```http
# 危险：用户个人数据被 CDN 缓存
Cache-Control: public, max-age=300
Content: {"name": "张三", "email": "zhangsan@example.com"}
```

### 症状
```
用户 A 看到用户 B 的个人信息 → 安全事故
```

### 缓解方案

**正确标记私有响应：**
```http
# 个人数据必须标记为 private
Cache-Control: private, no-store

# 或者不缓存
Cache-Control: no-store
```

**CDN 配置：**
```
# 强制私有响应不被 CDN 缓存
cdn-bypass-on: Set-Cookie
cdn-bypass-on: Authorization
```

**Service Worker 层面：**
```javascript
// 不缓存带 Set-Cookie 或 Authorization 的响应
async function safeCache(request, response) {
  if (response.headers.get('Set-Cookie') ||
      request.headers.get('Authorization')) {
    return response;  // 直接返回，不缓存
  }
  const cache = await caches.open('v1');
  cache.put(request, response.clone());
  return response;
}
```

---

## 七、304 风暴（304 Storm）

### 触发条件
短 max-age + must-revalidate 配置，导致大量条件请求产生 304 响应。

### 典型场景
```http
Cache-Control: max-age=10, must-revalidate
```
每 10 秒所有用户都要发送条件请求验证。

### 症状
```
源站 304 响应占比 >80% → 条件请求开销 → 源站 CPU 升高
```

### 缓解方案

**延长缓存时间 + stale-while-revalidate：**
```http
# 从 10 秒延长到 5 分钟，过期后异步验证
Cache-Control: max-age=300, stale-while-revalidate=3600
```

**ETag 优化：**
```javascript
// 使用轻量级 ETag（内容哈希而非时间戳）
const crypto = require('crypto');
const etag = `"${crypto.createHash('md5').update(body).digest('hex')}"`;
res.setHeader('ETag', etag);
```

---

## 八、Service Worker 首次加载延迟

### 触发条件
Service Worker 注册、安装、激活的生命周期耗时，导致首次访问页面加载变慢。

### 典型流程
```
注册 (register) → 安装 (install) → 激活 (activate) → 接管 (claim)
                     ↓ 预缓存资源
                  可能耗时数秒
```

### 缓解方案

**skipWaiting + clients.claim：**
```javascript
// install 完成后立即激活
self.addEventListener('install', event => {
  self.skipWaiting();  // 跳过等待
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());  // 立即接管所有客户端
});
```

**按需缓存（非预缓存）：**
```javascript
// 不在 install 阶段预缓存所有资源
// 而是在 fetch 时按需缓存
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // 只缓存成功响应
        if (response.ok) {
          const clone = response.clone();
          caches.open('dynamic-v1').then(c => c.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
```

---

## 九、缓存配额溢出（Quota Exceeded）

### 触发条件
Service Worker 缓存数据超出浏览器单源存储配额。

### 典型场景
- 缓存大量图片/视频资源
- 未设置淘汰策略
- 单页应用缓存了所有路由的资源

### 症状
```
QuotaExceededError → 新资源无法写入 → 旧缓存被浏览器强制清除
```

### 缓解方案

**LRU 淘汰策略：**
```javascript
async function addWithLimit(cacheName, request, response, maxEntries = 100) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response);

  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    // 删除最早的条目
    await cache.delete(keys[0]);
  }
}
```

**配额监控：**
```javascript
async function checkQuota() {
  if (navigator.storage && navigator.storage.estimate) {
    const { usage, quota } = await navigator.storage.estimate();
    const percent = (usage / quota) * 100;
    console.log(`存储使用: ${percent.toFixed(1)}%`);
    if (percent > 80) {
      console.warn('存储空间不足，清理旧缓存');
      await cleanupOldCaches();
    }
  }
}
```

---

## 十、跨域缓存失败（Opaque Response）

### 触发条件
Service Worker 对跨域资源使用 no-cors 模式请求，返回 opaque 响应。

### 典型场景
```javascript
// no-cors 模式下返回 opaque 响应
fetch('https://cdn.example.com/image.png', { mode: 'no-cors' })
```

### 症状
```
opaque 响应 status=0 → 无法判断成功/失败 → 缓存 match 行为不可预测
```

### 缓解方案

**使用 CORS 模式：**
```javascript
// 服务器需要设置 Access-Control-Allow-Origin
fetch('https://cdn.example.com/image.png', { mode: 'cors' })
```

**接受 opaque 限制：**
```javascript
// 如果无法控制跨域服务器，接受 opaque 响应
// 但不能检查 status，只能假设成功
if (response.type === 'opaque') {
  // 无法检查 status，直接缓存
  cache.put(request, response);
}
```

---

## 坑点严重程度速查表

| 坑点 | 严重程度 | 触发层 | 影响范围 |
|------|----------|--------|----------|
| 缓存穿透 | 🔴 P0 | CDN / SW | 源站过载 |
| 缓存雪崩 | 🔴 P0 | CDN / 浏览器 | 源站过载 |
| 私有数据泄露 | 🔴 P0 | CDN | 安全事故 |
| 缓存版本污染 | 🟠 P1 | SW / CDN | 功能异常 |
| 缓存一致性延迟 | 🟠 P1 | 全部 | 用户体验 |
| 304 风暴 | 🟠 P1 | 浏览器 | 源站 CPU |
| Vary 膨胀 | 🟠 P1 | 浏览器 / CDN | 命中率下降 |
| SW 首次加载延迟 | 🟡 P2 | SW | 首次体验 |
| 配额溢出 | 🟡 P2 | SW | 缓存失效 |
| 跨域缓存失败 | 🟡 P2 | SW | 功能异常 |
