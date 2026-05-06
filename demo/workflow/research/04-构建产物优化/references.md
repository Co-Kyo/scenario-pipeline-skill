# 参考资料

## Tier 1 — 核心参考

1. **Webpack Code Splitting** — Webpack 官方指南，讲解代码分割的三种方式（入口点分割、动态导入 `import()`、`SplitChunksPlugin`），是解决首屏 JS 体积过大的直接手段。
   - https://webpack.js.org/guides/code-splitting/

2. **MDN: HTTP Caching** — MDN 对 HTTP 缓存机制的权威说明，涵盖 `Cache-Control`、`ETag`、`Last-Modified` 等策略，帮助理解如何通过缓存减少重复传输、配合构建产物哈希实现长效缓存。
   - https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching

## Tier 2 — 补充参考

3. **web.dev: Tree Shaking** — Google Web Fundamentals 文章，详解 Tree Shaking 原理（ESM 静态分析 + 副作用标记），说明如何消除未引用代码以缩减打包体积。
   - https://web.dev/articles/reduce-javascript-payloads-with-tree-shaking

4. **web.dev: HTTP Cache** — Google Web Fundamentals 对 HTTP 缓存策略的实践指南，补充 MDN 的理论基础，侧重工程落地（`immutable`、`stale-while-revalidate` 等现代缓存策略）。
   - https://web.dev/articles/http-cache
