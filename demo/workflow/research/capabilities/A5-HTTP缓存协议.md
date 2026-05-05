# HTTP缓存协议

> ID: A5 | 扇出: 2/8 | 耦合度: 1 | 战略价值: 2.0

## 核心机制

HTTP缓存是浏览器和中间代理（CDN、反向代理）在本地存储响应副本、避免重复请求源服务器的协议级机制。依据 RFC 9111，缓存分为**私有缓存**（浏览器本地）和**共享缓存**（CDN/代理）。核心判断流程为：**强缓存命中 → 协商缓存验证 → 源站响应**。

### 1. 强缓存（Strong Cache）

强缓存命中时，浏览器直接使用本地缓存，**不发起网络请求**，状态码显示为 `200 (from disk cache)` 或 `200 (from memory cache)`。

**Cache-Control 指令（响应头，RFC 9111）：**

| 指令 | 含义 | 示例 |
|------|------|------|
| `max-age=N` | 响应在 N 秒内保持新鲜 | `Cache-Control: max-age=3600` |
| `s-maxage=N` | 仅对共享缓存（CDN）生效，覆盖 max-age | `Cache-Control: s-maxage=86400` |
| `no-store` | **禁止任何缓存**存储该响应 | `Cache-Control: no-store` |
| `no-cache` | **允许缓存但每次必须验证**（注意：不是"不缓存"） | `Cache-Control: no-cache` |
| `private` | 仅允许私有缓存（浏览器）存储 | `Cache-Control: private` |
| `public` | 允许共享缓存存储（含带 Authorization 的响应） | `Cache-Control: public` |
| `immutable` | 新鲜期内**不参与浏览器重新验证**（配合 cache-busting 使用） | `Cache-Control: max-age=31536000, immutable` |
| `must-revalidate` | 过期后**必须**向源站验证，不允许使用过期缓存 | `Cache-Control: max-age=3600, must-revalidate` |
| `stale-while-revalidate=N` | 过期后 N 秒内可先返回旧缓存，同时后台验证 | `Cache-Control: max-age=3600, stale-while-revalidate=86400` |
| `stale-if-error=N` | 源站返回 5xx 时，允许在过期后 N 秒内使用旧缓存 | `Cache-Control: max-age=3600, stale-if-error=86400` |
| `no-transform` | 禁止中间代理转换内容（如图片压缩） | `Cache-Control: no-transform` |

**Expires 头（HTTP/1.0 遗留）：** 指定缓存过期的绝对时间。当 `Cache-Control: max-age` 与 `Expires` 同时存在时，**max-age 优先**。

**启发式缓存（Heuristic Caching）：** 当响应既无 `Cache-Control` 也无 `Expires` 时，浏览器会根据 `Last-Modified` 时间启发式推断缓存有效期（通常为 `(Date - Last-Modified) × 10%`）。这是 HTTP 的"尽量缓存"设计，但生产环境应**显式指定 Cache-Control**。

### 2. 协商缓存（Negotiated Cache）

当强缓存过期或配置了 `no-cache` 时，浏览器携带**条件请求头**向源站验证缓存是否仍有效。若未变化，服务器返回 `304 Not Modified`（无 body，极小传输量），浏览器刷新缓存新鲜度继续使用。

**两种验证器（Validator）：**

| 验证器 | 响应头 | 条件请求头 | 特点 |
|--------|--------|------------|------|
| 时间验证 | `Last-Modified` | `If-Modified-Since` | 基于文件修改时间，精度为秒，分布式服务器时间同步困难 |
| 内容验证 | `ETag` | `If-None-Match` | 基于内容哈希/版本号，精度更高，优先级高于时间验证 |

**ETag 类型：**
- **强 ETag**（`"33a64df5"`）：字节级完全匹配，可用于 Range 请求
- **弱 ETag**（`W/"33a64df5"`）：语义等价即可，允许微小差异（如空白字符变化）

**优先级链：** 当 `If-Modified-Since` 和 `If-None-Match` 同时存在时，**ETag（If-None-Match）优先**。RFC 9110 建议服务器在 200 响应中**同时返回 ETag 和 Last-Modified**。

### 3. 304 Not Modified 机制

```
客户端请求 → 检查本地缓存
  ├─ 强缓存命中（fresh）→ 直接使用，无网络请求
  ├─ 强缓存过期（stale）→ 发送条件请求（If-None-Match / If-Modified-Since）
  │   ├─ 服务器返回 304 → 刷新缓存新鲜度，继续使用
  │   └─ 服务器返回 200 → 更新缓存，使用新响应
  └─ 无缓存 → 正常请求，200 响应
```

### 4. Vary 头

`Vary` 头指定缓存键（Cache Key）的额外维度。例如 `Vary: Accept-Language` 使不同语言版本独立缓存。注意：`Vary: User-Agent` 会因 UA 变体过多导致缓存命中率骤降，应尽量避免。

### 5. 缓存类型层级

| 类型 | 位置 | 特点 | 控制方式 |
|------|------|------|----------|
| 私有缓存 | 浏览器 | 存储个性化内容 | `private` |
| 代理缓存 | 网络中间节点 | HTTPS 下通常被隧道化，无法缓存 | 历史遗留问题 |
| 托管缓存 | CDN / 反向代理 / Service Worker | 可主动清除、API 控制 | `s-maxage`、CDN 专有头（如 `Surrogate-Control`）、`CDN-Cache-Control`（RFC 9213） |

---

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|----------|----------|----------|----------|
| 1 | 缓存穿透 | 频繁请求未缓存或 `no-store` 的资源 | 源站负载飙升，响应延迟增大 | 监控源站 QPS 和缓存命中率 | 使用合理的 `max-age`，对可缓存资源启用缓存；使用 `stale-while-revalidate` 平滑回源 |
| 2 | 缓存雪崩 | 大量缓存同时过期（相同 `max-age`） | 瞬间大量请求涌入源站 | 监控回源流量突增 | 在 `max-age` 基础上加随机抖动（如 `max-age=3600 + rand(0,300)`） |
| 3 | 缓存一致性 | 资源更新但客户端仍使用旧缓存 | 用户看到过期内容 | 用户反馈 + 版本对比 | 采用 cache-busting（文件名含哈希）+ 长 `max-age` + `immutable`；HTML 使用 `no-cache` 或短 `max-age` |
| 4 | Vary 过度膨胀 | `Vary: User-Agent` 或过多维度 | 缓存命中率极低，存储浪费 | 检查 Vary 头和缓存命中率 | 避免 `Vary: User-Agent`；使用特性检测替代 UA 判断；个性化内容用 `private` 而非 Vary |
| 5 | 304 风暴 | 高频访问 + 短 `max-age` + `must-revalidate` | 大量 304 请求占用连接和 CPU | 抓包分析 304 比例 | 延长 `max-age`；使用 `stale-while-revalidate` 减少同步验证；使用 `immutable` 避免重新验证 |
| 6 | 私有数据泄露 | 个性化响应未标记 `private` | 共享缓存返回他人数据 | 安全审计 + 检查响应头 | 对含 Cookie/Session 的响应强制加 `private`；使用 `Vary: Cookie` 作为安全层 |
| 7 | 启发式缓存失控 | 缺少显式 Cache-Control | 资源被意外长期缓存 | 检查无 Cache-Control 响应的缓存行为 | **所有响应显式设置 Cache-Control**，不依赖启发式缓存 |

---

## 调试工具

| 工具 | 用法 |
|------|------|
| Chrome DevTools → Network 面板 | 查看请求状态：`200 (from disk cache)` / `304 Not Modified`；检查 `Cache-Control`、`ETag`、`Age` 响应头 |
| `curl -v` / `curl -I` | 查看完整响应头，验证缓存指令是否正确下发 |
| `curl -H "If-None-Match: <etag>"` | 手动模拟条件请求，验证 ETag 机制 |
| `curl -H "Cache-Control: no-cache"` | 强制绕过缓存，获取最新响应 |
| Chrome DevTools → Application → Cache Storage | 查看 Service Worker 缓存内容 |
| `lighthouse` (PageSpeed Insights) | 检测缓存策略是否合理，给出 "Uses efficient cache policy" 评分 |
| WebPageTest | 多次加载对比缓存命中情况和加载瀑布图 |
| `chrome://net-internals/#httpCache` | 查看浏览器 HTTP 缓存内部状态 |
| CDN 控制台（Cloudflare/AWS CloudFront 等） | 查看 CDN 缓存命中率、手动清除缓存 |
| `Varnish log` / `varnishstat` | 查看 Varnish 反向代理的缓存命中率和统计 |

---

## 典型权衡

| 维度 | 方案A：长缓存 + Cache-Busting | 方案B：短缓存 / no-cache | 选择建议 |
|------|-------------------------------|--------------------------|----------|
| **静态资源（JS/CSS/图片）** | `max-age=31536000, immutable`，文件名含内容哈希 | `max-age=3600` 或 `no-cache` | **选 A**：哈希保证更新时 URL 变化，长缓存最大化命中率 |
| **HTML 入口文件** | 长缓存（用户可能看不到更新） | `no-cache` 或 `max-age=0` | **选 B**：HTML 是缓存控制的入口，必须每次验证 |
| **API 响应** | `max-age=60, stale-while-revalidate=300` | `no-store` | **按数据特性选**：准实时数据用短缓存+后台验证；敏感数据用 `no-store` |
| **用户个性化内容** | 公共缓存（可能泄露数据） | `private` 或 `no-store` | **选 B**：隐私优先，个性化内容必须 `private` |
| **ETag vs Last-Modified** | ETag（精度高，但增加服务器计算开销） | Last-Modified（简单，但精度为秒级） | **优先 ETag**，静态文件可用文件哈希；分布式系统避免依赖文件时间戳 |
| **CDN 缓存策略** | `s-maxage` 单独控制 CDN TTL | 统一 `max-age` 控制所有缓存 | **分离控制**：用 `s-maxage` 指导 CDN，`max-age` 指导浏览器 |
| **stale-while-revalidate** | 后台静默验证，用户体验好 | 同步验证，保证数据新鲜 | **高频读场景选 A**：用过期数据换取即时响应，后台异步更新 |

---

## 最小验证实验

### 实验 1：强缓存验证

```bash
# 启动一个简单 HTTP 服务器（Node.js）
cat > /tmp/cache-test.js << 'EOF'
const http = require('http');
const server = http.createServer((req, res) => {
  if (req.url === '/cached') {
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'max-age=60',
      'Date': new Date().toUTCString()
    });
    res.end('cached response: ' + Date.now());
  } else if (req.url === '/no-cache') {
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
      'ETag': '"v1"',
      'Last-Modified': new Date().toUTCString()
    });
    res.end('no-cache response: ' + Date.now());
  } else if (req.url === '/immutable') {
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'max-age=31536000, immutable'
    });
    res.end('immutable response: ' + Date.now());
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('no cache-control');
  }
});
server.listen(8899, () => console.log('Cache test server on :8899'));
EOF
node /tmp/cache-test.js &

# 测试强缓存（第二次请求应 from cache）
curl -s -D- http://localhost:8899/cached
sleep 1
curl -s -D- http://localhost:8899/cached   # 观察是否命中缓存

# 测试协商缓存
curl -s -D- http://localhost:8899/no-cache
# 使用返回的 ETag 发起条件请求
curl -s -D- -H 'If-None-Match: "v1"' http://localhost:8899/no-cache
# 预期：304 Not Modified
```

### 实验 2：ETag 协商验证

```bash
# 获取资源及 ETag
curl -s -D- http://localhost:8899/no-cache
# 提取 ETag 值，发送条件请求
ETAG=$(curl -s -D- http://localhost:8899/no-cache 2>&1 | grep -i etag | awk '{print $2}' | tr -d '\r')
curl -s -D- -H "If-None-Match: $ETAG" http://localhost:8899/no-cache
# 预期输出: HTTP/1.1 304 Not Modified（无 body）
```

### 实验 3：Chrome DevTools 验证

1. 打开 Chrome DevTools → Network
2. 访问带 `Cache-Control: max-age=60` 的资源
3. 刷新页面，观察 Status 列显示 `200 (from disk cache)`
4. 勾选 "Disable cache"，观察变为完整请求
5. 对 `no-cache` 资源，观察第二次请求显示 `304 Not Modified`

---

## 参考资料

1. [RFC 9111 - HTTP Caching](https://httpwg.org/specs/rfc9111.html) — HTTP 缓存标准规范
2. [RFC 9110 - HTTP Semantics](https://httpwg.org/specs/rfc9110.html) — HTTP 语义，含 ETag/条件请求定义
3. [RFC 9213 - Targeted HTTP Cache Control (CDN-Cache-Control)](https://httpwg.org/specs/rfc9213.html) — CDN 专用缓存控制头
4. [MDN - HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching) — 权威开发者文档
5. [MDN - Cache-Control Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control) — Cache-Control 指令完整参考
6. [web.dev - HTTP Caching](https://web.dev/articles/http-cache) — Google 工程实践指南
7. [Jake Archibald - Caching Best Practices](https://jakearchibald.com/2016/caching-best-practices/) — 前端缓存策略经典文章
