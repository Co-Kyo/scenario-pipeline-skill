# 首屏白屏：从 FCP 到 LCP 的全链路优化 — 学习阶梯

> 跟着阶梯走，每步有具体任务，做到才算过关。

## 你需要什么基础
- 了解 HTTP 请求流程（DNS→TCP→TLS→响应）
- 知道 `<script>` 和 `<link>` 标签的作用
- 了解 SPA 和 SSR 的概念

## 阶梯总览
- **阶段一：理解首屏瓶颈**（对应能力 A1、A9）— CRP 全链路
- **阶段二：网络层优化**（对应能力 A6、A7、A8）— 让资源更快到达
- **阶段三：构建层优化**（对应能力 A28、A10、A11）— 让资源更小
- **阶段四：框架层 SSR**（对应能力 R2、V2、N1）— 让 HTML 先到

---

## 阶段一：理解首屏瓶颈

### 你将理解什么
白屏的本质是"浏览器拿到 HTML 后，到第一像素上屏之间的时间太长"。这段路径叫关键渲染路径（CRP）。

### Step 1：建立 CRP 心智模型
**做**：读 `overview.md` 第一节"关键渲染路径"。
**你会看到什么**：HTML→DOM + CSSOM→Render Tree→Layout→Paint→Composite。
**这说明了什么**：CSS 是渲染阻塞资源（不加载完不 Paint），JS 是解析阻塞资源（不执行完不继续解析 DOM）。
**接下来去哪**：读 `capabilities/A9-Critical-Rendering-Path.md`。
**做到才算过**：能画出 CRP 流程图并标出两个阻塞点。

### Step 2：用实验看白屏
**做**：打开 `experiment/index.html`，观察首屏加载模拟。
**你会看到什么**：内联 CSS 的页面立即显示，外链 CSS 的页面要等下载完才开始渲染。
**这说明了什么**：Critical CSS 内联可以消除首屏的渲染阻塞。
**接下来去哪**：读 `edge-cases.md` 关于"CSS 渲染阻塞"的部分。
**做到才算过**：能解释"为什么 `<link rel='stylesheet'>` 会阻塞渲染"。

### 阶段一过关标准
- [ ] 能画出 CRP 流程图
- [ ] 能区分渲染阻塞和解析阻塞
- [ ] 做不到？→ 回看 `overview.md` + `capabilities/A9`

---

## 阶段二：网络层优化

### 你将理解什么
资源从服务器到浏览器的速度取决于三个因素：缓存命中率、CDN 就近访问、资源大小。

### Step 3：HTTP 缓存策略
**做**：读 `capabilities/A6-HTTP缓存策略.md`。
**你会看到什么**：强缓存（Cache-Control max-age）不发请求；协商缓存（ETag）发请求但可能 304。
**这说明了什么**：缓存策略决定了"第二次访问要不要重新下载"。
**接下来去哪**：读 `capabilities/A7-CDN与资源分发.md`。
**做到才算过**：能区分强缓存和协商缓存的触发条件。

### Step 4：资源预加载
**做**：读 `capabilities/A8-资源预加载（preload-prefetch）.md`。
**你会看到什么**：`<link rel="preload">` 提前下载关键资源；`prefetch` 空闲时下载未来资源。
**这说明了什么**：浏览器不知道哪些资源是关键的，preload 帮它"提前知道"。
**接下来去哪**：读 `trade-offs.md` 中 R3（CSS containment）的网络层部分。
**做到才算过**：能说出 preload 和 prefetch 的区别及使用场景。

### 阶段二过关标准
- [ ] 能设计一个静态资源的缓存策略（hash 文件名 + 长期缓存 + HTML 不缓存）
- [ ] 能解释 CDN + 缓存的协作机制
- [ ] 做不到？→ 回看 `capabilities/A6` + `capabilities/A7`

---

## 阶段三：构建层优化

### 你将理解什么
同样的功能代码，构建工具决定了最终产物的体积和加载方式。

### Step 5：理解模块系统
**做**：读 `capabilities/A28-ESM与CommonJS.md`。
**你会看到什么**：ESM 的 `import` 是静态声明，构建时可以分析依赖树；CommonJS 的 `require` 是运行时调用，无法静态分析。
**这说明了什么**：Tree Shaking 只能在 ESM 上工作——这是前提条件。
**接下来去哪**：读 `capabilities/A11-Tree Shaking.md`。
**做到才算过**：能解释"为什么 CommonJS 不能 Tree Shaking"。

### Step 6：Code Splitting 实操
**做**：读 `capabilities/A10-Code Splitting.md`。
**你会看到什么**：`import()` 动态导入会生成独立 chunk，按需加载。
**这说明了什么**：首屏不需要的代码可以延迟加载，减少 FCP 时间。
**接下来去哪**：读 `edge-cases.md` 关于"chunk 过多导致请求数暴涨"的部分。
**做到才算过**：能在一个 SPA 项目中按路由做 Code Splitting。

### 阶段三过关标准
- [ ] 能解释 ESM 和 CommonJS 的区别及其对构建的影响
- [ ] 能配置一个项目的 Code Splitting + Tree Shaking
- [ ] 做不到？→ 回看 `capabilities/A28` + `A10` + `A11`

---

## 阶段四：框架层 SSR

### 你将理解什么
SPA 的白屏根因是"JS 下载+执行完才能渲染"。SSR 的思路是"服务器先生成 HTML，客户端再激活"。

### Step 7：理解 Hydration
**做**：读 `capabilities/R2-React hydration.md`。
**你会看到什么**：SSR 返回的 HTML 是"静态的"，需要 hydration（激活）才能交互。React 18 的 Selective Hydration 可以按 Suspense 边界逐步激活。
**这说明了什么**：SSR 不是"把 JS 搬到服务器"，而是"HTML 先到，JS 后激活"。
**接下来去哪**：读 `capabilities/V2-Vue SSR激活.md`。
**做到才算过**：能解释 SSR + Hydration 的完整流程。

### Step 8：SSR/SSG/ISR 选型
**做**：读 `capabilities/N1-Next/Nuxt SSR实践.md`。
**你会看到什么**：SSR（每次请求生成）、SSG（构建时生成）、ISR（构建时生成+定期重验证）三种模式。
**这说明了什么**：没有最好的渲染模式，只有最适合场景的。
**接下来去哪**：读 `trade-offs.md` 的选型建议。
**做到才算过**：能针对一个博客站点选择 SSG 并解释理由。

### 阶段四过关标准
- [ ] 能解释 Hydration 的作用和代价
- [ ] 能区分 SSR/SSG/ISR 并给出选型建议
- [ ] 做不到？→ 回看 `capabilities/R2` + `V2` + `N1`

---

## 学完之后你应该能做到
- 面试中能从 CRP 出发解释白屏的根因
- 能设计一个完整的首屏优化方案（缓存+CDN+Code Splitting+SSR）
- 能区分不同渲染模式的适用场景
- 能用 Lighthouse 量化优化效果
