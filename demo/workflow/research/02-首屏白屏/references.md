# P2-首屏白屏 — 参考资料汇总

---

## T1 — 规范与官方文档

### 浏览器渲染管线 (A1)
- MDN - Critical Rendering Path: https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path
- Chrome DevTools - Performance Panel: https://developer.chrome.com/docs/devtools/performance/

### HTTP缓存协议 (A5)
- MDN - HTTP Caching: https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
- RFC 9111 - HTTP Caching: https://httpwg.org/specs/rfc9111.html
- RFC 9110 - HTTP Semantics: https://httpwg.org/specs/rfc9110.html
- RFC 9213 - Targeted HTTP Cache Control: https://httpwg.org/specs/rfc9213.html

### 资源加载策略 (A7)
- MDN - Link preload: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
- MDN - fetchpriority: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/fetchpriority
- MDN - Speculative loading: https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Speculative_loading

### 模块系统与构建优化 (A9)
- MDN - Dynamic import: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import
- MDN - JavaScript Modules: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

### CDN与边缘计算 (A10)
- MDN - CDN: https://developer.mozilla.org/en-US/docs/Glossary/CDN

### SSR/Hydration机制 (A13)
- Vue SSR Guide: https://vuejs.org/guide/scaling-up/ssr.html
- React SSR Reference: https://react.dev/reference/react-dom/server
- React Streaming SSR: https://react.dev/reference/react-dom/server/renderToReadableStream
- React Hydration: https://react.dev/reference/react-dom/client/hydrateRoot

---

## T2 — 技术博客与教程

### 渲染与性能
- web.dev - Critical Rendering Path: https://web.dev/articles/critical-rendering-path
- Chrome DevTools Performance 功能详解: https://www.cnblogs.com/xikui/p/17302436.html
- 前端性能优化-渲染优化: https://www.cnblogs.com/MarsPGY/p/15780486.html

### 资源加载
- web.dev - Preload critical assets: https://web.dev/articles/preload-critical-assets
- web.dev - Fetch Priority: https://web.dev/articles/fetch-priority

### HTTP 缓存
- web.dev - HTTP Cache: https://web.dev/articles/http-cache
- Jake Archibald - Caching Best Practices: https://jakearchibald.com/2016/caching-best-practices/

### 构建优化
- webpack Code Splitting: https://webpack.js.org/guides/code-splitting/
- webpack Tree Shaking: https://webpack.js.org/guides/tree-shaking/
- webpack SplitChunksPlugin: https://webpack.js.org/plugins/split-chunks-plugin/
- web.dev - Reduce JS Payloads with Code Splitting: https://web.dev/articles/reduce-javascript-payloads-with-code-splitting

### CDN
- web.dev - Content Delivery Networks: https://web.dev/articles/content-delivery-networks
- Varnish Origin Shield: https://www.varnish-software.com/solutions/origin-shield/

### SSR 框架
- Nuxt: https://nuxt.com/
- Next.js: https://nextjs.org/docs
-  Vue 3 SSR 实践: https://zhuanlan.zhihu.com/p/589621349
- React 18 Streaming SSR 解析: https://juejin.cn/post/7410710728783462451
