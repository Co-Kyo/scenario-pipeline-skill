# 参考资料：网络请求优化：接口串行导致首屏阻塞——瀑布流请求与并发控制

## Tier 1（核心参考）

| 资源 | 说明 |
|------|------|
| [MDN: HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching) | HTTP 缓存机制详解，涵盖强缓存与协商缓存策略，是减少重复请求、优化首屏加载的基础知识。 |
| [MDN: Promise.all](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) | Promise.all 静态方法，将多个独立请求从串行改为并发执行，是解决接口瀑布流阻塞的核心 API。 |
| [MDN: IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) | 元素可见性观察器，用于实现懒加载与按需请求，避免首屏一次性加载全部资源导致的请求阻塞。 |

## Tier 2（辅助参考）

| 资源 | 说明 |
|------|------|
| [web.dev: Core Web Vitals](https://web.dev/articles/vitals) | 核心性能指标（LCP、FID、CLS）定义与优化建议，从指标维度衡量首屏阻塞对用户体验的影响。 |
| [web.dev: HTTP Cache](https://web.dev/articles/http-cache) | HTTP 缓存优化实战指南，配合 Service Worker 等策略进一步减少网络请求延迟。 |
