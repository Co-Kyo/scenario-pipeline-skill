# P5-缓存策略 | References — 参考资料

## 一级参考资料（T1 - 权威规范与官方文档）

### HTTP 缓存协议
- **RFC 9111 - HTTP Caching**
  https://httpwg.org/specs/rfc9111.html
  HTTP 缓存的权威规范，定义了缓存行为、新鲜度模型、验证机制。

- **RFC 9110 - HTTP Semantics**
  https://httpwg.org/specs/rfc9110.html
  HTTP 语义规范，包含缓存相关头部字段的完整定义。

- **RFC 9213 - Targeted HTTP Cache Control**
  https://httpwg.org/specs/rfc9213.html
  针对 CDN 的缓存控制指令扩展（CDN-Cache-Control）。

- **MDN - HTTP Caching**
  https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
  浏览器缓存机制的完整教程，涵盖强缓存、协商缓存、启发式缓存。

- **MDN - Cache-Control**
  https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
  Cache-Control 指令的完整参考。

### Service Worker
- **MDN - Service Worker API**
  https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
  Service Worker 的完整 API 参考。

- **MDN - Cache API**
  https://developer.mozilla.org/en-US/docs/Web/API/Cache
  Cache API 的接口参考，用于 Service Worker 中的编程式缓存。

- **MDN - Using Service Workers**
  https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
  Service Worker 的使用教程，包含注册、安装、激活、拦截请求的完整流程。

- **W3C - Service Workers Specification**
  https://w3c.github.io/ServiceWorker/
  Service Worker 的 W3C 规范草案。

### CDN
- **web.dev - Content Delivery Networks**
  https://web.dev/articles/content-delivery-networks
  CDN 的工作原理、优势和最佳实践。

---

## 二级参考资料（T2 - 深度文章与工具）

### HTTP 缓存
- **web.dev - HTTP Cache**
  https://web.dev/articles/http-cache
  Chrome 团队的 HTTP 缓存最佳实践指南。

- **Jake Archibald - Caching Best Practices**
  https://jakearchibald.com/2016/caching-best-practices/
  经典的缓存最佳实践文章，讲解 cache-busting 和版本化 URL。

### Service Worker
- **web.dev - The Service Worker Lifecycle**
  https://web.dev/articles/service-worker-lifecycle
  Service Worker 生命周期的深度解析。

- **Chrome DevTools - Workbox**
  https://developer.chrome.com/docs/workbox/
  Google 的 Service Worker 工具库，生产环境推荐使用。

- **Workbox 官方文档**
  https://developer.chrome.com/docs/workbox/
  缓存策略、路由、预缓存的完整文档。

### CDN
- **Varnish Origin Shield**
  https://www.varnish-software.com/solutions/origin-shield/
  Origin Shield 的原理和配置。

- **CDN 缓存策略详解**
  https://www.ctyun.cn/developer/article/611748830158917
  CDN 缓存策略的中文详解，包含 Cache Key、TTL、Purge 等。

### 综合
- **RFC 7234 - Hypertext Transfer Protocol (HTTP/1.1): Caching**
  https://httpwg.org/specs/rfc7234.html
  HTTP/1.1 的缓存规范（已被 RFC 9111 取代，但仍有参考价值）。

---

## 学习路径推荐

### 入门（1-2 天）
1. MDN - HTTP Caching → 理解强缓存/协商缓存基本概念
2. web.dev - HTTP Cache → 掌握最佳实践
3. MDN - Service Worker API → 了解 SW 基本原理

### 进阶（3-5 天）
1. RFC 9111 → 深入理解缓存规范
2. web.dev - Service Worker Lifecycle → 掌握 SW 生命周期
3. Jake Archibald - Caching Best Practices → 实战缓存策略设计

### 高级（1-2 周）
1. Workbox 文档 → 生产级 SW 缓存方案
2. CDN 配置实战 → 多级缓存架构设计
3. 边缘计算 → Edge Functions 动态缓存逻辑
