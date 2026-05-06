# 首屏优化：SSR/SSG 首屏加载慢——Vue3/React 项目如何提升到 1s 内

## 痛点切入

Vue3（Nuxt 3）和 React（Next.js）项目采用 SSR/SSG 后，首屏加载仍然经常超过 1 秒。根本原因不是 SSR 本身慢，而是从服务端 HTML 到用户可交互的整条链路——TTFB、关键资源下载、Hydration——每一环都在争抢时间预算。本文从通用浏览器原理出发，梳理 1s 内首屏的完整优化路径。

---

## 一、浏览器渲染管线（CRP）——理解"为什么慢"

浏览器渲染页面的完整流程：

```
HTML → DOM Tree ─┐
                  ├→ Render Tree → Layout → Paint → Composite
CSS  → CSSOM  ───┘
```

**关键约束**：CSS 是渲染阻塞资源，必须等全部 CSSOM 构建完成才能生成 Render Tree。JS 是解析阻塞资源（除非 `async`/`defer`），会阻止 DOM 解析。

**首屏瓶颈**：
- CSS 文件过大或未拆分 → Render Tree 构建延迟
- 首屏 JS 体积过大 → 解析+执行时间长，阻塞交互
- 强制同步布局（读写布局属性交替）→ 帧率骤降

**优化方向**：
- 内联关键 CSS（Critical CSS），非关键 CSS 异步加载
- 使用 `transform`/`opacity` 做动画（只触发 Composite），避免 `width`/`height`（触发 Layout 重排）
- 首屏 HTML 中减少内联脚本，使用 `<script defer>` 或 `<script type="module">`

---

## 二、SSR/Hydration 机制——"首屏快但可交互慢"的根源

### 流程

```
服务端渲染 HTML → 浏览器显示首屏 → 加载 JS Bundle → Hydration 绑定事件 → 可交互
```

SSR 的优势是让用户**看到**内容更快（TTFB 减少），但**可交互**仍然要等 JS 加载+Hydration 完成。这就是"首屏快但 TTI 慢"的根本原因。

### 两大瓶颈

| 瓶颈 | 现象 | 根因 |
|------|------|------|
| **Hydration 不匹配** | 控制台 Warning，界面闪烁 | 服务端与客户端渲染结果不一致（时间戳、随机数、浏览器 API） |
| **Hydration 阻塞交互** | 页面可见但点击无反应 | 整棵组件树必须全部 Hydration 完成才能响应事件 |

### 优化策略

**1. 选择性 Hydration（Partial Hydration）**
- React：`<Suspense>` 包裹非首屏组件，延迟 Hydration
- Vue3：`defineAsyncComponent()` + `onMounted` 延迟注册
- 只有首屏可见区域立即 Hydration，其余按需触发

**2. 流式 SSR（Streaming SSR）**
- React 18：`renderToPipeableStream()` / `renderToReadableStream()`
- Nuxt 3：默认支持流式渲染
- 优势：TTFB 更早，浏览器可边接收边解析

**3. SSR vs SSG 权衡**

| | SSR | SSG |
|---|---|---|
| 首屏速度 | 取决于服务端响应 | 构建时生成，CDN 直出 |
| 服务端开销 | 每次请求都需计算 | 无（纯静态文件） |
| 适用场景 | 动态内容、个性化页面 | 文档、博客、营销页 |
| 优化重点 | 服务端缓存 + 流式渲染 | 预渲染 + 增量静态再生成 |

---

## 三、Code Splitting 与 Tree Shaking——控制 JS 体积

### 机制

- **Code Splitting**：`import()` 动态导入生成独立 chunk，按需加载
- **Tree Shaking**：基于 ESM 的静态分析，删除未使用代码（dead code elimination）

### 瓶颈与对策

| 瓶颈 | 原因 | 对策 |
|------|------|------|
| Tree Shaking 失效 | CommonJS 模块、副作用未声明、动态 require | 统一 ESM，配置 `sideEffects` 字段 |
| vendor chunk 膨胀 | 全量打包第三方库 | 拆分 vendor：`vue`/`react` 单独 chunk，UI 库按需引入 |
| 路由级分割粒度不够 | 首页仍加载全部路由 | 组件级 `import()` + `React.lazy` / `defineAsyncComponent` |

**首屏 JS 体积目标**：关键路径 JS ≤ 100KB（gzip），总 JS ≤ 300KB（gzip）。

---

## 四、HTTP 缓存策略——减少重复传输

### 分层缓存架构

```
浏览器缓存 → CDN 边缘节点 → 源站
```

### 策略选择

| 资源类型 | 缓存策略 | 理由 |
|----------|----------|------|
| HTML（SSR/SSG 输出） | `no-cache`（协商缓存） | 内容可能变化，需验证新鲜度 |
| 带 hash 的 JS/CSS | `max-age=31536000, immutable` | 文件名变化=新文件，永不过期 |
| 图片/字体 | `max-age=2592000` + hash | 中长期缓存，配合 CDN |
| API 数据 | `s-maxage=60, stale-while-revalidate=300` | CDN 缓存 60s，过期后 300s 内返回旧数据同时异步更新 |

### 瓶颈

- **缓存失效全量回源**：HTML 缓存策略不当 → 每次请求穿透 CDN 回源站
- **CDN 与浏览器缓存不一致**：CDN 刷新了但浏览器还缓存着旧版本 → 用 `immutable` + hash 文件名规避

---

## 五、Core Web Vitals——用指标驱动优化

### 三大指标

| 指标 | 含义 | 目标 | 首屏关联 |
|------|------|------|----------|
| **LCP**（Largest Contentful Paint） | 最大内容元素渲染完成 | ≤ 2.5s | 直接衡量首屏加载速度 |
| **INP**（Interaction to Next Paint） | 交互到下一帧渲染 | ≤ 200ms | 衡量 Hydration 后的响应能力 |
| **CLS**（Cumulative Layout Shift） | 累积布局偏移 | ≤ 0.1 | 衡量视觉稳定性 |

### LCP 优化（首屏核心）

LCP 元素通常是首屏大图、标题或视频封面。优化路径：

1. **预加载 LCP 资源**：`<link rel="preload" as="image" href="hero.webp">`
2. **服务端直接输出 LCP 元素**：SSR 时确保 LCP 元素在首屏 HTML 中，不依赖 JS 渲染
3. **图片优化**：WebP/AVIF 格式 + 响应式 `srcset` + `loading="eager"`（首屏图片禁用 lazy）
4. **减少 LCP 资源的网络路径**：CDN 就近部署，HTTP/2 或 HTTP/3 多路复用

### CLS 优化

- 图片/视频/广告位预留尺寸（`aspect-ratio` 或固定 `width`/`height`）
- 字体加载使用 `font-display: swap` + `size-adjust` 避免 FOUT
- 动态内容插入使用骨架屏（Skeleton）占位

---

## 六、Nuxt 3 / Next.js 实战配置

### Nuxt 3（Vue3）

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  // 1. 流式 SSR（默认开启，确认未被关闭）
  // ssr: true,  // 默认就是 true

  // 2. 路由级 Code Splitting（自动，但确认没有全量 import）
  build: {
    transpile: ['@some-ui-lib']  // 只转译需要的
  },

  // 3. 关键 CSS 内联
  css: ['~/assets/css/critical.css'],  // 首屏样式内联

  // 4. 图片优化
  image: {
    quality: 80,
    format: ['webp', 'avif']
  },

  // 5. 预渲染首屏路由（SSG 混合）
  nitro: {
    prerender: {
      routes: ['/', '/about', '/pricing']
    }
  },

  // 6. 缓存配置
  routeRules: {
    '/': { prerender: true },          // 首页 SSG
    '/blog/**': { isr: 60 },           // 博客 ISR 60s
    '/api/**': { cors: true, cache: { maxAge: 60 } }
  },

  // 7. 延迟 Hydration（Vue3 需手动配合 defineAsyncComponent）
  experimental: {
    payloadExtraction: true  // 减少 payload 体积
  }
})
```

### Next.js（React）

```ts
// next.config.ts
const nextConfig = {
  // 1. 流式 SSR（App Router 默认支持）
  // 使用 app/ 目录 + React Server Components

  // 2. 图片优化
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30  // 30 天
  },

  // 3. 关键 CSS 内联（需配合 critters 或 Tailwind JIT）
  experimental: {
    optimizeCss: true
  },

  // 4. 静态导出混合
  // 使用 generateStaticParams() 预渲染关键路由
  // 使用 revalidate 进行 ISR

  // 5. 路由级分割（App Router 自动按路由分割）
  // 使用 React.lazy() 做组件级分割
  // <Suspense fallback={<Skeleton />}> 包裹延迟组件
}
```

### 通用检查清单

- [ ] 首屏 JS gzip ≤ 100KB
- [ ] LCP 资源有 `<link rel="preload">`
- [ ] HTML 使用协商缓存，静态资源使用长期缓存 + hash
- [ ] 首屏图片 `loading="eager"`，非首屏图片 `loading="lazy"`
- [ ] 关键 CSS 内联或预加载，非关键 CSS 异步
- [ ] Hydration 不匹配 Warning 为 0
- [ ] LCP ≤ 2.5s，CLS ≤ 0.1，INP ≤ 200ms

---

## 总结

首屏优化的核心是**时间预算分配**：在 1 秒内完成「HTML 到达 → 关键资源加载 → 首屏渲染 → 可交互」的全链路。通用原理（CRP、缓存、Code Splitting、CWV）决定了优化的上限，框架配置（Nuxt 3 / Next.js）决定了落地的效率。两者结合，1s 内首屏不是目标——是底线。
