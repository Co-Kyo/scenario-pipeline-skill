# SSR/Hydration机制

> ID: A13 | 扇出: 1/8 | 耦合度: 3 | 战略价值: 1.0

## 核心机制

### 1. 服务端渲染流程 (Server-Side Rendering)

SSR 的核心思路是：在服务端将组件树渲染为 HTML 字符串，直接发送给浏览器，再由客户端 JavaScript「接管」为可交互应用。

**Vue SSR 流程：**
1. 服务端使用 `createSSRApp()` 创建应用实例
2. 调用 `renderToString(app)` 将组件树渲染为 HTML 字符串
3. 将 HTML 嵌入完整页面模板返回浏览器
4. 浏览器加载客户端 JS，调用 `createSSRApp()` + `app.mount('#app')` 执行 hydration

**React SSR 流程：**
1. 服务端调用 `renderToReadableStream(<App />, options)` 生成 Readable Web Stream
2. Stream 返回后直接作为 `Response` 发送（支持 Web Streams / Node.js Streams）
3. 客户端调用 `hydrateRoot(document, <App />)` 将静态 HTML 激活为可交互应用

**关键差异：**
- Vue 默认同步渲染（`renderToString`），也支持流式（`renderToNodeStream` / `pipeToNodeWritable`）
- React 18+ 推荐流式渲染（`renderToReadableStream` / `renderToPipeableStream`），同步 API 为 legacy

### 2. 客户端激活 (Hydration)

Hydration 是 SSR 的核心环节：客户端 JavaScript 不重新创建 DOM，而是「附着」到已有的服务端 HTML 上，绑定事件监听器并恢复组件状态。

**Hydration 过程：**
1. 客户端加载与服务端相同的组件代码
2. 框架遍历组件树，将每个组件与对应的 DOM 节点匹配
3. 绑定事件监听器，恢复响应式状态
4. 组件变为可交互

**Hydration 严格要求：**
- 客户端首次渲染输出必须与服务端 HTML 完全一致
- 不一致会导致 hydration mismatch 警告，最坏情况下事件绑定到错误元素
- React 提供 `suppressHydrationWarning` 作为 escape hatch（仅限单层文本差异）

**Vue 的 Hydration 特殊性：**
- 服务端禁用响应式系统（无 DOM 更新需求），提升性能
- 仅 `beforeCreate` / `created` 生命周期在服务端执行；`mounted` / `updated` 仅客户端执行
- 使用 `createSSRApp()` 而非 `createApp()` 来启用 hydration 模式

### 3. 流式渲染 (Streaming SSR)

**React 流式渲染：**
- `renderToReadableStream`（Web Streams API）/ `renderToPipeableStream`（Node.js Streams）
- 通过 `<Suspense>` 边界实现分段流式传输
- Shell（Suspense 边界外的内容）优先发送
- Suspense 内部的异步内容就绪后，通过内联 `<script>` 标签替换 fallback

**流式渲染的 HTML 输出结构：**
```html
<!DOCTYPE html>
<html>
  <!-- Shell: 立即发送 -->
  <div>...</div>
  <!-- Suspense fallback -->
  <div id="loading-spinner">...</div>
  <!-- 异步内容就绪后注入 -->
  <script>$RC("B","S")</script>
  <template id="B">...实际内容...</template>
  <script>$RC = function(a,b){...}</script>
  <script src="/main.js" async=""></script>
</html>
```

**Vue 流式渲染：**
- `renderToNodeStream()` 返回 Node.js Readable Stream
- `pipeToNodeWritable()` 用于更细粒度的流式控制
- Vue 3.5+ 引入 Lazy Hydration，支持组件级别的延迟水合

### 4. SSG 预渲染 (Static Site Generation)

SSG 是 SSR 的特殊形式：在构建时而非请求时渲染 HTML。

**核心特点：**
- 构建时渲染，输出静态 HTML 文件
- 部署简单（静态文件服务器即可），无需 Node.js 运行时
- 适用场景：内容不常变化的页面（文档站、博客、营销页）

**框架支持：**
- Vue: VitePress（文档站）、Nuxt SSG 模式
- React: Next.js `output: 'export'`、Gatsby

**SSG vs SSR 选择：**
- 数据对所有用户相同且静态 → SSG
- 数据依赖用户/请求、需要实时更新 → SSR
- 混合使用：静态页面用 SSG，动态页面用 SSR（如 Nuxt 的 `routeRules`）

### 5. Selective Hydration / Lazy Hydration

**React Selective Hydration（React 18+）：**
- 结合 `<Suspense>` 实现组件级别的选择性激活
- 不同组件可以独立完成 hydration，不阻塞其他部分
- 用户交互优先级影响 hydration 顺序（点击的组件优先 hydrated）

**Vue Lazy Hydration（Vue 3.5+）：**
- `defineAsyncComponent` 配合 `hydrate` 选项
- 支持 `onInteraction`（用户交互时才 hydrate）
- 支持 `onVisible`（进入视口时才 hydrate）
- 支持 `whenIdle`（浏览器空闲时才 hydrate）
- 开发模式下提供全面的 hydration 错误处理

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|---------|---------|---------|---------|
| 1 | Hydration Mismatch | 客户端首次渲染与服务端 HTML 不一致 | 控制台警告、事件绑定错位、UI 闪烁 | React DevTools hydration warning；Vue `__VUE_SSR_CONTEXT__` 调试 | 统一数据源；使用 `suppressHydrationWarning`（React）；`v-once` 标记静态内容（Vue） |
| 2 | 服务端 CPU 瓶颈 | 高并发请求，Node.js 单线程渲染阻塞 | 响应延迟飙升、TTFB 增大 | APM 监控（Datadog/New Relic）；Node.js `--prof` profiling | 流式渲染减少阻塞时间；边缘 SSR（Cloudflare Workers / Deno Deploy）；缓存策略（ISR/ESI） |
| 3 | JS Bundle 体积过大 | Hydration 需要加载完整客户端 JS | FCP 快但 TTI 慢（页面可见但不可交互） | Lighthouse TTI 指标；Bundle Analyzer | Code splitting + Lazy hydration；Tree shaking；移除未使用代码 |
| 4 | 数据获取瓶颈 | SSR 需要服务端预取数据，数据库/API 延迟高 | TTFB 受数据源制约 | 分布式追踪（OpenTelemetry） | 并行数据获取；`<Suspense>` 流式传输；服务端缓存（Redis/Stale-While-Revalidate） |
| 5 | 跨请求状态污染 | 单例 store 在请求间共享状态 | 用户 A 看到用户 B 的数据 | 压力测试 + 日志审计 | 每个请求创建独立应用实例；使用 `provide/inject`（Vue）或 request-scoped context |
| 6 | 浏览器 API 不可用 | 服务端代码引用 `window` / `document` | 服务端运行时报错 | SSR 构建时 lint 检查；运行时错误日志 | 平台 API 抽象层；`typeof window !== 'undefined'` 守卫；延迟到 `onMounted` / `useEffect` |
| 7 | 第三方库兼容性 | npm 包在服务端环境无法运行 | Import 阶段报错、渲染异常 | SSR 构建测试；CI 中添加 SSR 环境测试 | `ssr: { noExternal }`（Vite）；动态 `import()` 包裹；Mock 全局对象 |

## 调试工具

| 工具 | 用法 |
|------|------|
| React DevTools | 显示 hydration mismatch 警告，可查看组件树的 server/client 渲染对比 |
| Vue DevTools | 支持 SSR 模式下检查组件状态和事件绑定 |
| Chrome DevTools Performance | 分析 hydration 耗时，识别长任务（Long Tasks） |
| Lighthouse | 测量 TTFB / FCP / TTI 指标，评估 SSR 效果 |
| Bundle Analyzer (webpack/vite) | 分析客户端 JS 体积，识别 hydration 相关依赖 |
| `react-dom/server` onError 回调 | 捕获服务端渲染错误，区分 recoverable / fatal |
| Node.js `--prof` / `--inspect` | 分析服务端渲染 CPU 热点 |
| OpenTelemetry | 分布式追踪 SSR 数据获取链路 |
| `__VUE_SSR_CONTEXT__` (Vue) | 开发模式下查看 SSR 上下文信息 |
| Next.js `debug` / Nuxt DevTools | 框架级别的 SSR 调试面板，查看渲染模式、缓存状态 |

## 典型权衡

| 维度 | 方案A | 方案B | 选择建议 |
|------|-------|-------|---------|
| 渲染模式 | SSR（每请求渲染） | SSG（构建时预渲染） | 内容静态 → SSG；内容动态/个性化 → SSR；混合 → ISR |
| 流式 vs 同步 | 流式 Streaming SSR | 同步 renderToString | 数据源延迟高 → Streaming；SEO 严格要求完整 HTML → 同步 + `allReady` |
| Hydration 策略 | 全量 Hydration | Selective / Lazy Hydration | 首屏交互要求高 → 全量；页面长/内容多 → Selective |
| 部署目标 | Node.js 服务器 | 边缘运行时（Workers/Deno） | 需要访问数据库/文件系统 → Node.js；延迟敏感 + 无状态 → 边缘 |
| 框架选择 | Next.js (React) | Nuxt (Vue) | React 生态 + App Router → Next.js；Vue 生态 + 文件路由 → Nuxt |
| 缓存粒度 | 页面级缓存 | 组件级缓存（ESI/Fragment Caching） | 高流量站点 → 组件级；中小站点 → 页面级足够 |
| 混合渲染 | 纯 SSR | SSR + CSR 混合（如 Islands Architecture） | 交互密集型页面 → Islands；整体性强的 SPA → 纯 SSR/SSG |

## 最小验证实验

### Vue SSR 基础实验

```bash
mkdir vue-ssr-demo && cd vue-ssr-demo
npm init -y
# package.json 添加 "type": "module"
npm install vue
```

```js
// app.js（共享代码）
import { createSSRApp } from 'vue'
export function createApp() {
  return createSSRApp({
    data: () => ({ count: 1 }),
    template: `<button @click="count++">{{ count }}</button>`
  })
}
```

```js
// server.js
import express from 'express'
import { createApp } from './app.js'
import { renderToString } from 'vue/server-renderer'

const server = express()
server.get('/', async (req, res) => {
  const app = createApp()
  const html = await renderToString(app)
  res.send(`<!DOCTYPE html>
<html><head><title>Vue SSR</title></head>
<body><div id="app">${html}</div>
<script type="module" src="/client.js"></script>
</body></html>`)
})
server.use(express.static('.'))
server.listen(3000)
```

```js
// client.js
import { createApp } from './app.js'
createApp().mount('#app')
```

### React Streaming SSR 实验

```js
// server.js
import { renderToReadableStream } from 'react-dom/server'
import App from './App.js'

Deno.serve(async (req) => {
  const stream = await renderToReadableStream(<App />, {
    bootstrapScripts: ['/client.js']
  })
  return new Response(stream, { headers: { 'content-type': 'text/html' } })
})
```

```js
// client.js
import { hydrateRoot } from 'react-dom/client'
import App from './App.js'
hydrateRoot(document, <App />)
```

### 验证 Hydration 成功

1. 打开浏览器访问页面，确认按钮可点击（事件绑定成功）
2. 查看控制台无 hydration mismatch 警告
3. 禁用 JS 后刷新，确认 HTML 仍可显示（SSR 生效）
4. 使用 Lighthouse 测量 TTFB 和 TTI

## 参考资料

1. [Vue.js SSR 官方文档](https://vuejs.org/guide/scaling-up/ssr.html)
2. [React Server DOM APIs](https://react.dev/reference/react-dom/server)
3. [React renderToReadableStream 文档](https://react.dev/reference/react-dom/server/renderToReadableStream)
4. [React hydrateRoot 文档](https://react.dev/reference/react-dom/client/hydrateRoot)
5. [React Streaming SSR 原理解析 - 徐超](https://zhuanlan.zhihu.com/p/589621349)
6. [Vue 3.5 SSR 渲染优化与 Lazy Hydration](https://juejin.cn/post/7410710728783462451)
7. [Nuxt 官方文档](https://nuxt.com/)
8. [Next.js 文档 - App Router](https://nextjs.org/docs)
9. [Web.dev - Core Web Vitals](https://web.dev/vitals/)
10. [React WG - Streaming HTML Discussion](https://github.com/reactwg/react-18/discussions/37)
