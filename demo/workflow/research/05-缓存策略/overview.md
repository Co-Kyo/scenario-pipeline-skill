# P5-缓存策略 | Overview — 链路编排

## 全景视图

现代 Web 应用的缓存不是单一机制，而是一条 **从用户浏览器到源站的多层防线**。每一层都有独立的存储、失效逻辑和命中判定规则，理解它们如何协作是缓存策略的核心。

```
┌─────────────────────────────────────────────────────────────────────┐
│                         用户请求                                     │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Layer 1: 浏览器缓存（HTTP Cache）                              │   │
│  │  ┌─────────┐    ┌──────────┐    ┌────────────┐              │   │
│  │  │ 强缓存   │───▶│ 协商缓存  │───▶│ 网络请求    │              │   │
│  │  │ 200 OK  │    │ 304      │    │ 200 OK     │              │   │
│  │  │ from    │    │ Not      │    │ from       │              │   │
│  │  │ cache   │    │ Modified │    │ server     │              │   │
│  │  └─────────┘    └──────────┘    └────────────┘              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │ miss                                  │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Layer 2: CDN 边缘缓存                                        │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌──────────┐         │   │
│  │  │ Edge PoP    │───▶│ Mid-tier    │───▶│ Origin   │         │   │
│  │  │ 边缘节点     │ miss│ 汇聚层      │ miss│ Shield   │         │   │
│  │  │ (最近节点)   │    │ (区域中心)   │    │ (回源保护)│         │   │
│  │  └─────────────┘    └─────────────┘    └──────────┘         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │ miss                                  │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Layer 3: Service Worker 编程式缓存                            │   │
│  │  ┌──────────────────────────────────────────────────────┐    │   │
│  │  │  Cache API（IndexedDB-like KV 存储）                   │    │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │    │   │
│  │  │  │ cache-   │ │ network- │ │ stale-while-         │ │    │   │
│  │  │  │ first    │ │ first    │ │ revalidate           │ │    │   │
│  │  │  └──────────┘ └──────────┘ └──────────────────────┘ │    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              ▼                                       │
│                         源站响应                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 三层职责划分

| 层级 | 存储位置 | 控制者 | 失效方式 | 典型延迟 |
|------|----------|--------|----------|----------|
| **L1 浏览器缓存** | 磁盘/内存 Cache | HTTP 响应头 | max-age 过期 / 用户手动清除 | 0ms（内存）/ ~1ms（磁盘） |
| **L2 CDN 缓存** | 边缘节点 / 汇聚层 | CDN 配置 + HTTP 头 | TTL 过期 / 主动 Purge | 5-50ms（边缘）/ 50-200ms（回源） |
| **L3 SW 编程缓存** | Cache API 存储 | Service Worker 代码 | 代码逻辑控制 | 1-5ms |

## 关键设计原则

### 原则一：越靠近用户的层，命中优先级越高
浏览器缓存命中的请求根本不会到达网络层，这是最快的路径。CDN 边缘命中避免了回源延迟。Service Worker 可以在网络层之前拦截请求。

### 原则二：每一层都有独立的失效语义
- 浏览器缓存：遵循 HTTP 头（Cache-Control、ETag）
- CDN 缓存：遵循 HTTP 头 + CDN 配置（s-maxage、Purge API）
- Service Worker：由代码完全控制（Cache API 不读 HTTP 缓存头）

### 原则三：Cache Key 一致性是三层协作的前提
如果同一资源在三层的 Cache Key 不一致（例如 CDN 按 URL+Accept-Encoding 缓存，但 SW 只按 URL），就会出现缓存不命中或版本错乱。

## 核心链路：一个请求的生命周期

```
1. 用户访问 /app
2. Service Worker fetch 事件拦截
   → Cache API match(/app)
   → 命中？返回缓存（Cache-First）
   → 未命中？进入网络层
3. 浏览器检查 HTTP 缓存
   → Cache-Control: max-age=3600 未过期？
   → 返回 200 from cache
   → 过期？发送条件请求 If-None-Match: "etag-v2"
4. 请求到达 CDN 边缘
   → Edge PoP 命中？返回缓存 + Age 头
   → 未命中？转发到 Mid-tier / Origin Shield
   → 源站返回响应 + Cache-Control
   → CDN 存储响应，返回给浏览器
5. 浏览器存储到 HTTP Cache
6. Service Worker 收到响应
   → 写入 Cache API（如果策略需要）
   → 返回给页面
```

## 三层协作的关键接口

### HTTP 头 → CDN 协作
```http
# 静态资源：长缓存 + 版本化 URL
Cache-Control: public, max-age=31536000, immutable

# CDN 专用 TTL（覆盖 max-age）
Cache-Control: public, s-maxage=86400, max-age=3600

# 过期后异步验证
Cache-Control: public, max-age=60, stale-while-revalidate=3600

# 协商缓存
ETag: "a1b2c3"
Last-Modified: Wed, 06 May 2026 05:30:00 GMT
```

### Service Worker → Cache API 协作
```javascript
// Cache-First 策略
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open('v1');
  cache.put(request, response.clone());
  return response;
}
```

### 三层协作的 Vary 头
```http
# 控制 CDN 和浏览器按 Accept-Encoding 分别缓存
Vary: Accept-Encoding

# SW 中需要手动处理 Vary 维度
// 不要缓存带 Vary: Cookie 的私有响应
if (response.headers.get('Vary')) {
  // 谨慎重写缓存键
}
```

## 实战模式

### 模式一：静态资源全链路缓存
```
URL: /assets/main.abc123.js
Cache-Control: public, max-age=31536000, immutable
CDN: s-maxage=31536000, immutable
SW: cache-first, 预缓存到 install 阶段
```
内容哈希保证版本唯一，三层都可以放心长缓存。

### 模式二：HTML 入口协商缓存
```
URL: /index.html
Cache-Control: no-cache
ETag: "deploy-v42"
CDN: s-maxage=60, stale-while-revalidate=300
SW: network-first, 离线时返回缓存
```
HTML 是所有资源的入口，必须每次验证以确保拿到最新版本。

### 模式三：API 数据分层缓存
```
URL: /api/user/profile
Cache-Control: private, max-age=300
CDN: 不缓存（private）
SW: stale-while-revalidate, 5 分钟内返回缓存
```
用户数据不能被 CDN 缓存，但可以在浏览器和 SW 层缓存。

## 小结

三层缓存不是互相替代，而是 **互补协作**：
- **浏览器缓存**：最快，遵循 HTTP 协议，零配置即生效
- **CDN 缓存**：最近，减少跨地域延迟，保护源站
- **Service Worker**：最灵活，可编程控制任何请求，支持离线

成功的缓存策略是让每一层做它最擅长的事，而不是在某一层做所有事。
