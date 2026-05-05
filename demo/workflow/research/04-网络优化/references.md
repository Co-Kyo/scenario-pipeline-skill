# 参考资料：网络优化——弱网环境下的资源加载策略

## T1 · 核心必读

| # | 标题 | URL | 要点 |
|---|------|-----|------|
| 1 | MDN — HTTP Caching | https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching | 浏览器缓存机制全景：强缓存（`Cache-Control`/`Expires`）、协商缓存（`ETag`/`Last-Modified`）、启发式缓存策略。弱网场景下缓存命中是最快的资源获取方式 |
| 2 | web.dev — HTTP 缓存 | https://web.dev/articles/http-cache | 以实战角度讲解缓存策略设计：`max-age`、`stale-while-revalidate`、`immutable` 等指令的取舍，以及如何为不同资源类型定制缓存方案 |
| 3 | MDN — Service Worker API | https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API | Service Worker 生命周期与拦截机制，是离线优先（offline-first）架构和运行时缓存的基础设施 |
| 4 | Workbox | https://developer.chrome.com/docs/workbox/ | Google 出品的 Service Worker 工具库，提供缓存策略模板（CacheFirst / NetworkFirst / StaleWhileRevalidate 等），是弱网缓存策略的工程化落地方案 |
| 5 | web.dev — Optimize CLS | https://web.dev/articles/optimize-cls | 布局偏移（CLS）优化方法：为图片/广告/嵌入设置尺寸、避免动态注入内容。弱网下资源慢加载极易引发 CLS，是体感体验的关键指标 |

## T2 · 重要参考

| # | 标题 | URL | 要点 |
|---|------|-----|------|
| 6 | MDN — HTTP/2 | https://developer.mozilla.org/en-US/docs/Glossary/HTTP_2 | HTTP/2 核心特性：多路复用、头部压缩、服务器推送。理解其在弱网下如何减少连接开销和排队延迟 |
| 7 | RFC 7540 — HTTP/2 | https://httpwg.org/specs/rfc7540.html | HTTP/2 协议规范原文。流控制、优先级、流管理等细节对弱网调优有直接参考价值 |
| 8 | MDN — HTTP/3 | https://developer.mozilla.org/en-US/docs/Glossary/HTTP_3 | HTTP/3 基于 QUIC/UDP 的设计优势：消除队头阻塞、0-RTT 连接建立、连接迁移。对高丢包/高延迟网络改善显著 |
| 9 | RFC 9114 — HTTP/3 | https://httpwg.org/specs/rfc9114.html | HTTP/3 协议规范原文。QUIC 流控、连接迁移、拥塞控制等细节 |
| 10 | Cloudflare — HTTP/3 | https://developers.cloudflare.com/http3/ | HTTP/3 的部署现状与性能数据，Cloudflare 对弱网场景的实测改善说明 |

## T3 · 拓展阅读

| # | 标题 | URL | 要点 |
|---|------|-----|------|
| 11 | web.dev — CommonJS 导致更大的 bundle | https://web.dev/articles/commonjs-larger-bundles | 模块格式对打包体积的影响。弱网下资源体积敏感，理解 ESM vs CJS 的 tree-shaking 差异有助于减小传输量 |
