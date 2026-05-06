# P5-缓存策略 | 学习阶梯

## 总览

```
Level 4 ─────────────────────────────────────────────
  │  三层缓存架构设计与实战
  │  Multi-CDN + SW + 浏览器缓存的完整方案
  │
Level 3 ─────────────────────────────────────────────
  │  Service Worker 编程式缓存
  │  Cache API、缓存策略实现、版本管理
  │
Level 2 ─────────────────────────────────────────────
  │  CDN 边缘缓存与失效策略
  │  多级缓存架构、Cache Key、Purge、Origin Shield
  │
Level 1 ─────────────────────────────────────────────
  │  HTTP 缓存协议基础
  │  强缓存、协商缓存、Cache-Control 指令
  │
Level 0 ─────────────────────────────────────────────
     HTTP 协议基础、浏览器 Network 面板
```

---

## Level 0：前置知识

**目标**：理解 HTTP 请求/响应模型，会用 DevTools Network 面板

### 知识点
- HTTP 请求方法（GET/POST）和状态码（200/304/404）
- 请求头和响应头的基本概念
- DevTools Network 面板的使用（查看请求、响应头、时间线）

### 验证标准
- [ ] 能在 Network 面板中找到任意请求的 Cache-Control 头
- [ ] 能区分 200（新资源）和 304（未修改）响应

### 推荐资源
- MDN - HTTP 概述：https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview
- Chrome DevTools Network 面板：https://developer.chrome.com/docs/devtools/network

---

## Level 1：HTTP 缓存协议基础

**目标**：掌握浏览器缓存的两种机制——强缓存和协商缓存

### 知识点

#### 1.1 强缓存（Strong Caching）
- `Cache-Control: max-age=<seconds>` — 相对过期时间
- `Expires: <date>` — 绝对过期时间（已过时，优先用 max-age）
- `Cache-Control: immutable` — 新鲜期内不发送条件请求
- 命中时浏览器直接使用本地副本，Network 面板显示 `from cache`

#### 1.2 协商缓存（Conditional Caching）
- `ETag: "<hash>"` — 内容标识符
- `Last-Modified: <date>` — 最后修改时间
- `If-None-Match: "<etag>"` — 条件请求头（匹配 ETag）
- `If-Modified-Since: <date>` — 条件请求头（匹配时间）
- 命中时服务器返回 304 Not Modified，浏览器使用本地副本

#### 1.3 关键指令
- `no-cache` — 允许缓存，但每次必须验证
- `no-store` — 完全不缓存
- `must-revalidate` — 过期后必须验证，不能使用过期缓存
- `stale-while-revalidate` — 过期后先返回旧缓存，后台异步验证
- `s-maxage` — 专门控制共享缓存（CDN）的过期时间

### 动手实验
```bash
# 启动实验服务器
cd 05-缓存策略/experiment/src && node server.js

# 在浏览器中：
# 1. 打开 Network 面板
# 2. 连续点击"发送请求"
# 3. 观察 200 from cache → 304 → 200 的循环
```

### 验证标准
- [ ] 能解释 `max-age=3600` 和 `no-cache` 的区别
- [ ] 能在 Network 面板中识别强缓存命中（200 from cache）
- [ ] 能在 Network 面板中识别协商缓存命中（304 Not Modified）
- [ ] 能解释 `stale-while-revalidate` 的工作原理

### 推荐资源
- MDN - HTTP Caching：https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
- web.dev - HTTP Cache：https://web.dev/articles/http-cache
- Jake Archibald - Caching Best Practices：https://jakearchibald.com/2016/caching-best-practices/

---

## Level 2：CDN 边缘缓存与失效策略

**目标**：理解 CDN 多级缓存架构，掌握缓存失效和一致性策略

### 知识点

#### 2.1 CDN 多级架构
- **Edge PoP（边缘节点）**：离用户最近，缓存热门资源
- **Mid-tier（汇聚层）**：区域中心，减少回源次数
- **Origin Shield（源站保护层）**：最后一道防线，防止回源风暴
- DNS 智能解析将用户导向最近节点

#### 2.2 Cache Key 设计
- 默认：URL
- 可扩展：URL + Accept-Encoding + Cookie + ...
- Vary 头控制缓存键维度
- 过细的 Cache Key 导致命中率下降

#### 2.3 缓存失效策略
- **TTL 过期**：自动失效，但有延迟
- **版本化 URL**：`/assets/main.abc123.js`，部署即生效
- **主动 Purge**：API 调用立即失效
- **预热（Warmup）**：部署后主动将新资源推送到边缘

#### 2.4 高可用策略
- Multi-CDN：多服务商冗余
- DNS Failover：故障时自动切换
- Origin Shield：保护源站免受回源风暴

### 动手实验
```bash
# 用 curl 观察 CDN 缓存行为
curl -sI https://cdn.example.com/asset.js | grep -iE "x-cache|age|cache-control"

# 首次请求：X-Cache: MISS, Age: 0
# 二次请求：X-Cache: HIT, Age: 42
```

### 验证标准
- [ ] 能画出 CDN 多级缓存架构图
- [ ] 能解释 Cache Key 和 Vary 头的关系
- [ ] 能设计一个静态资源的 CDN 缓存策略（TTL + 版本化 URL）
- [ ] 能解释回源风暴的成因和缓解方案

### 推荐资源
- web.dev - Content Delivery Networks：https://web.dev/articles/content-delivery-networks
- Varnish Origin Shield：https://www.varnish-software.com/solutions/origin-shield/
- CDN 缓存策略详解：https://www.ctyun.cn/developer/article/611748830158917

---

## Level 3：Service Worker 编程式缓存

**目标**：掌握 Service Worker 生命周期和 Cache API，实现自定义缓存策略

### 知识点

#### 3.1 Service Worker 生命周期
- **Register**：`navigator.serviceWorker.register('/sw.js')`
- **Install**：预缓存关键资源，`skipWaiting()` 跳过等待
- **Activate**：清理旧缓存，`clients.claim()` 立即接管
- **Fetch**：拦截请求，实现自定义缓存策略

#### 3.2 Cache API
- `caches.open(name)` — 打开/创建缓存空间
- `cache.match(request)` — 查找缓存
- `cache.put(request, response)` — 写入缓存
- `cache.delete(request)` — 删除缓存
- `caches.keys()` — 列出所有缓存空间

#### 3.3 缓存策略实现
- **Cache-First**：静态资源，先查缓存
- **Network-First**：动态内容，先请求网络
- **Stale-While-Revalidate**：高频读，立即返回+后台更新
- **Cache-Only / Network-Only**：极端场景

#### 3.4 版本管理与清理
- 缓存命名带版本号：`app-v1`, `app-v2`
- activate 阶段清理旧版本
- 内容哈希 URL 避免版本冲突

### 动手实验
```bash
# 在实验中：
# 1. 打开 Application → Service Workers 面板
# 2. 观察 SW 的 install/activate 状态
# 3. 打开 Application → Cache Storage，查看缓存内容
# 4. 勾选 Network → Offline，测试离线回退
# 5. 修改 sw.js 中的缓存策略，观察行为变化
```

### 验证标准
- [ ] 能手写一个 Cache-First 策略的 Service Worker
- [ ] 能手写一个 Network-First 策略的 Service Worker
- [ ] 能解释 skipWaiting() 和 clients.claim() 的作用
- [ ] 能实现缓存版本管理和旧缓存清理
- [ ] 能用 Workbox 实现混合缓存策略

### 推荐资源
- MDN - Service Worker API：https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- web.dev - Service Worker Lifecycle：https://web.dev/articles/service-worker-lifecycle
- Workbox：https://developer.chrome.com/docs/workbox/

---

## Level 4：三层缓存架构设计与实战

**目标**：设计完整的三层缓存架构，按资源类型分配策略，处理边界情况

### 知识点

#### 4.1 资源分类与策略分配

| 资源类型 | 浏览器缓存 | CDN 缓存 | SW 缓存 |
|----------|-----------|----------|---------|
| 静态资源（带哈希） | max-age=1年, immutable | s-maxage=1年 | Cache-First 预缓存 |
| HTML 入口 | no-cache + ETag | s-maxage=60 + SWR | Network-First |
| API 数据 | private, max-age=300 | 不缓存 | Stale-While-Revalidate |
| 敏感数据 | no-store | 不缓存 | 不缓存 |

#### 4.2 三层协作的关键挑战
- Cache Key 一致性：三层使用相同的缓存键逻辑
- 版本同步：部署时三层同时更新
- 失效协调：Purge CDN + 清理 SW 缓存 + 浏览器自然过期
- 错误处理：每层的降级和回退策略

#### 4.3 监控与调优
- 缓存命中率监控（CDN 控制台 + RUM）
- 回源率告警（>20% 需要排查）
- 缓存存储配额监控（SW 层）
- 性能指标：TTFB、FCP、LCP 与缓存的关系

#### 4.4 高级模式
- **Edge Computing + 缓存**：在 CDN 边缘执行动态逻辑
- **预缓存 + 按需缓存**：关键资源预缓存，其他按需
- **后台同步**：Background Sync API 处理离线写入
- **缓存降级**：SW 不可用时回退到浏览器缓存

### 动手实验
```bash
# 完整实验流程：
# 1. 启动服务器，首次访问（三层都 MISS）
# 2. 刷新（三层都 HIT）
# 3. 等待 30 秒后刷新（浏览器过期，SW HIT，发条件请求）
# 4. 断网刷新（SW 返回缓存）
# 5. 修改服务器版本号并重启（观察版本更新流程）
# 6. 清除所有缓存，重新开始
```

### 验证标准
- [ ] 能为一个 SPA 设计完整的三层缓存架构
- [ ] 能处理缓存穿透、雪崩、版本污染等边界情况
- [ ] 能用 Workbox 实现按资源类型的混合缓存策略
- [ ] 能设计缓存监控和告警方案
- [ ] 能解释 Edge Computing 在缓存架构中的作用

### 推荐资源
- RFC 9111：https://httpwg.org/specs/rfc9111.html
- Workbox 高级用法：https://developer.chrome.com/docs/workbox/
- Jake Archibald - Caching Best Practices：https://jakearchibald.com/2016/caching-best-practices/
