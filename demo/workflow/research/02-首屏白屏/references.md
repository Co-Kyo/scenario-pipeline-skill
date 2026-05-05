# 参考资料：首屏白屏 — 从 FCP 到 LCP 的全链路优化

## T1 · 核心必读

| # | 标题 | URL | 说明 |
|---|------|-----|------|
| 1 | Critical Rendering Path — MDN | <https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path> | 浏览器从 HTML 到像素的完整渲染流水线，是理解白屏根因的理论基础。 |
| 2 | Critical Rendering Path — web.dev | <https://web.dev/articles/critical-rendering-path> | Google 对 CRP 的详解版，含 DOM/CSSOM/Render Tree 构建全过程与优化建议。 |
| 3 | Render Tree Construction — web.dev | <https://web.dev/articles/critical-rendering-path/render-tree-construction> | 深入 Render Tree 如何从 DOM + CSSOM 合并生成，理解阻塞渲染的关键节点。 |
| 4 | Preload Critical Assets — web.dev | <https://web.dev/articles/preload-critical-assets> | 用 `<link rel="preload">` 提前拉取关键资源，直接缩短 FCP/LCP 的实战指南。 |
| 5 | rel=preload — MDN | <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload> | `<link rel="preload">` 的语法、`as` 属性、浏览器兼容性等完整参考。 |

## T2 · 重要扩展

| # | 标题 | URL | 说明 |
|---|------|-----|------|
| 6 | Resource Hints — web.dev | <https://web.dev/articles/resource-hints> | `preload` / `preconnect` / `prefetch` / `prerender` 的对比与使用场景决策树。 |
| 7 | Webpack Code Splitting | <https://webpack.js.org/guides/code-splitting/> | 通过动态 `import()` 和 SplitChunksPlugin 将首屏 JS 体积降至最小。 |
| 8 | Webpack Tree Shaking | <https://webpack.js.org/guides/tree-shaking/> | 利用 ES Module 静态分析移除未使用代码，减少首屏需要解析的 JS 量。 |
| 9 | React SSR 讨论 (React 18 WG) | <https://github.com/Reactwg/React-18/discussions/37> | React 18 SSR 架构设计讨论：Selective Hydration、Streaming SSR 与 FCP/LCP 的关系。 |
| 10 | React Server Components | <https://react.dev/reference/rsc/server-components> | RSC 将组件渲染移至服务端，客户端零 JS 开销，从根本上消除首屏白屏。 |

## T3 · 框架实践参考

| # | 标题 | URL | 说明 |
|---|------|-----|------|
| 11 | Vue SSR 指南 | <https://vuejs.org/guide/scaling-up/ssr.html> | Vue 3 服务端渲染的完整方案：createSSRApp、Renderer、数据预取与 hydration。 |
| 12 | Next.js Data Fetching | <https://nextjs.org/docs/app/building-your-application/data-fetching> | Next.js App Router 的数据获取策略：Server Components、Server Actions、缓存与流式渲染。 |
| 13 | Nuxt Data Fetching | <https://nuxt.com/docs/getting-started/data-fetching> | Nuxt 3 的 `useFetch` / `useAsyncData` 组合式 API，服务端预取 + 客户端复用的首屏优化模式。 |
