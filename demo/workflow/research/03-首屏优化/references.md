# 参考资料：首屏优化——SSR/SSG 首屏加载慢

> 命题：Vue3/React 项目如何将首屏加载提升到 1s 内

---

## T1 — 核心必读

### 渲染机制

| 资料 | 说明 |
|------|------|
| [MDN: Critical Rendering Path](https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path) | 浏览器从接收 HTML 到渲染像素的完整流水线：DOM → CSSOM → Render Tree → Layout → Paint。理解 CRP 是所有首屏优化的理论基石 |

### 服务端渲染

| 资料 | 说明 |
|------|------|
| [Vue SSR 指南](https://vuejs.org/guide/scaling-up/ssr.html) | Vue3 官方 SSR 文档，涵盖 `renderToString`、流式渲染、数据预取、客户端激活（hydration）等核心概念与实践 |
| [React Server DOM](https://react.dev/reference/react-dom/server) | React 官方服务端渲染 API 参考，包括 `renderToString`、`renderToPipeableStream`（React 18 流式 SSR），以及 RSC 架构说明 |

### 代码拆分与加载

| 资料 | 说明 |
|------|------|
| [Webpack Code Splitting](https://webpack.js.org/guides/code-splitting/) | Webpack 代码拆分三大策略：入口拆分、动态 `import()`、`SplitChunksPlugin` 提取公共 chunk，直接控制首屏 JS 体积 |

### 缓存策略

| 资料 | 说明 |
|------|------|
| [MDN: HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching) | HTTP 缓存机制全景：`Cache-Control`、`ETag`、`Last-Modified`、强缓存 vs 协商缓存，以及缓存层级（浏览器/CDN/网关） |

---

## T2 — 扩展参考

### 性能度量

| 资料 | 说明 |
|------|------|
| [web.dev: Core Web Vitals](https://web.dev/articles/vitals) | Google 三大核心指标 LCP（最大内容绘制）、INP（交互延迟）、CLS（布局偏移），首屏优化的度量标准 |

### 缓存与产物优化

| 资料 | 说明 |
|------|------|
| [web.dev: HTTP Cache](https://web.dev/articles/http-cache) | web.dev 对 HTTP 缓存的实践指南，侧重性能视角的缓存策略设计 |
| [web.dev: Tree Shaking](https://web.dev/articles/reduce-javascript-payloads-with-tree-shaking) | Tree Shaking 原理与配置（Webpack/Rollup），通过静态分析消除未引用代码，减少首屏 JS payload |

---

## 按主题索引

| 主题 | 关键资料 |
|------|----------|
| 渲染流水线 | MDN: Critical Rendering Path |
| SSR 原理与实践 | Vue SSR、React Server DOM |
| JS 体积控制 | Webpack Code Splitting、web.dev: Tree Shaking |
| 缓存策略 | MDN: HTTP Caching、web.dev: HTTP Cache |
| 性能度量 | web.dev: Core Web Vitals |

---

*共 8 篇参考资料（T1: 5 篇，T2: 3 篇），全部来自官方文档或权威来源，无重复。*
