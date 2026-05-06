# 首屏优化 — 学习阶梯

> 跟着阶梯走，每步有具体任务，做到才算过关。

## 你需要什么基础
- 了解 HTTP 请求和浏览器渲染的基本概念
- 用过 Vue3 或 React 的 SSR 框架（Nuxt / Next）或至少听说过
- 知道什么是打包构建（Webpack / Vite）

## 阶梯总览
- **阶段一：理解首屏加载全链路**（对应能力 A1 渲染管线 + A6 HTTP 缓存）
- **阶段二：掌握体积控制手段**（对应能力 A7 Code Splitting + A8 Web Vitals）
- **阶段三：理解 SSR/Hydration 机制**（对应能力 A11 SSR/Hydration）
- **阶段四：综合运用——Nuxt/Next 落地**（全部能力联动）

---

## 阶段一：理解首屏加载全链路

### 你将理解什么
首屏慢的瓶颈在哪？从 URL 输入到像素显示经历了哪些步骤？

### Step 1：画出 CRP 全链路
**做**：阅读 `03-首屏优化/overview.md` 的 CRP 部分。理解 DOM+CSSOM→Render Tree→Layout→Paint→Composite 的完整流程。
**你会看到什么**：CSS 是渲染阻塞的（必须全部解析完才能构建 Render Tree），JS 是解析阻塞的。
**这说明了什么**：首屏优化的核心是减少关键资源的数量和体积，缩短关键路径长度。
**接下来去哪**：带着"哪些资源在关键路径上"这个问题，进入 Step 2。
**做到才算过**：能画出 CRP 流程图，标注哪些资源是渲染阻塞的。

### Step 2：理解 HTTP 缓存的作用
**做**：阅读 `03-首屏优化/overview.md` 的 A6 节点 + `edge-cases.md` 的缓存相关坑点。
**你会看到什么**：强缓存（不发请求）和协商缓存（304）两层机制；hash 文件名 + 长期缓存是最优策略。
**这说明了什么**：缓存是首屏优化的"免费午餐"——配好了用户秒开，配错了全量回源。
**接下来去哪**：进入阶段二，学习如何控制 JS 体积。
**做到才算过**：能解释强缓存 vs 协商缓存的完整流程，以及 contenthash 的作用。

### 阶段一过关标准
- [ ] 能画出 CRP 流程图并标注渲染阻塞资源
- [ ] 能解释强缓存与协商缓存的区别
- [ ] 能说出 contenthash 文件名 + 长期缓存的策略
- 做不到？→ 回到 `overview.md` A1/A6 节点重读

---

## 阶段二：掌握体积控制手段

### 你将理解什么
如何把首屏 JS 从 500KB 压缩到 100KB？Code Splitting 和 Tree Shaking 的原理是什么？

### Step 3：理解 Code Splitting
**做**：阅读 `03-首屏优化/overview.md` 的 A7 节点。理解动态 `import()` 生成独立 chunk 的机制。
**你会看到什么**：路由级分割（按页面拆分）是最大收益点，组件级分割是精细化补充。
**这说明了什么**：Code Splitting 的本质是"只加载当前页面需要的代码"。
**接下来去哪**：阅读 `trade-offs.md` 的"路由级 vs 组件级"对比。
**做到才算过**：能在一个 Vue/React 项目中配置路由级 Code Splitting。

### Step 4：理解 Tree Shaking 为什么失效
**做**：阅读 `edge-cases.md` 的 A7 相关坑点。理解 CommonJS 污染和 sideEffects 误配导致 Tree Shaking 失效。
**你会看到什么**：一个 `require()` 就能让整个模块失去 Tree Shaking 资格。
**这说明了什么**：Tree Shaking 不是"开了就有效"，需要依赖 ESM + 正确的 sideEffects 配置。
**接下来去哪**：进入阶段三，学习 SSR/Hydration。
**做到才算过**：能说出 Tree Shaking 失效的 3 个常见原因及修复方法。

### 阶段二过关标准
- [ ] 能配置路由级 Code Splitting
- [ ] 能说出 Tree Shaking 失效的 3 个原因
- [ ] 能解释 LCP/CLS 的定义和阈值
- 做不到？→ 回到 `overview.md` A7/A8 节点 + `edge-cases.md` 重读

---

## 阶段三：理解 SSR/Hydration 机制

### 你将理解什么
SSR 为什么能加速首屏？Hydration 是什么？为什么 SSR 首屏快但 TTI 可能反而慢？

### Step 5：理解 SSR 的工作流程
**做**：阅读 `03-首屏优化/overview.md` 的 A11 节点。理解服务端渲染 HTML→浏览器显示→加载 JS→Hydration 绑定事件→可交互的完整流程。
**你会看到什么**：FCP 快（HTML 直出）但 TTI 可能慢（Hydration 阻塞交互）。
**这说明了什么**：SSR 不是银弹——首屏快了，但如果 JS bundle 太大，用户看到内容却点不动。
**接下来去哪**：阅读 `edge-cases.md` 的 Hydration 不匹配和 Hydration 阻塞交互。
**做到才算过**：能画出 SSR 的时间线：TTFB → FCP → Hydration → TTI。

### Step 6：理解 SSR vs SSG 的权衡
**做**：阅读 `trade-offs.md` 的 SSR/SSG/CSR 对比。
**你会看到什么**：SSR 有服务端开销，SSG 无服务端开销但只适合静态内容，CSR 首屏最慢。
**这说明了什么**：选 SSR 还是 SSG 取决于内容动态性和性能需求。
**接下来去哪**：进入阶段四，综合落地到 Nuxt/Next。
**做到才算过**：能说出 3 种渲染策略的适用场景。

### 阶段三过关标准
- [ ] 能画出 SSR 时间线（TTFB→FCP→Hydration→TTI）
- [ ] 能解释 Hydration 不匹配的根因
- [ ] 能说出 SSR vs SSG vs CSR 的适用场景
- 做不到？→ 回到 `overview.md` A11 节点 + `trade-offs.md` 重读

---

## 阶段四：综合运用——Nuxt/Next 落地

### 你将理解什么
如何把 CRP 优化 + Code Splitting + 缓存 + SSR 组合成一个完整的首屏优化方案？

### Step 7：配置 Nuxt/Next 优化
**做**：阅读 `overview.md` 的收尾部分（Nuxt 3 / Next.js 具体配置），逐项检查自己的项目。
**你会看到什么**：默认 SSG + 动态页面 SSR 是最佳平衡点。
**这说明了什么**：框架已经内置了大部分优化，关键是理解每个配置项的含义和代价。
**接下来去哪**：阅读 `edge-cases.md` 的防御清单，逐项自查。
**做到才算过**：能在一个 Nuxt/Next 项目中配置 Code Splitting + 长期缓存 + SSR。

### Step 8：用 Web Vitals 度量效果
**做**：阅读 `overview.md` 的 CWV 部分。用 Lighthouse 或 web-vitals 库测量优化前后的 LCP/INP/CLS。
**你会看到什么**：LCP ≤2.5s、INP ≤200ms、CLS ≤0.1 是达标线。
**这说明了什么**：优化必须有度量——没有数据就没有优化。
**接下来去哪**：完成！
**做到才算过**：能用 Lighthouse 测量并解读 LCP/INP/CLS 指标。

### 阶段四过关标准
- [ ] 能在 Nuxt/Next 中配置完整的首屏优化方案
- [ ] 能用 Lighthouse 测量并解读 Web Vitals
- [ ] 能根据度量结果定位瓶颈并优化
- 做不到？→ 回到 `overview.md` + `edge-cases.md` 防御清单重读

---

## 学完之后你应该能做到

**面试场景**：面对"SSR 首屏如何优化到 1s 内"的问题，能从 CRP→Code Splitting→Tree Shaking→HTTP 缓存→SSR/Hydration→Web Vitals 全链路回答，区分 SSR vs SSG 的权衡，给出 Nuxt/Next 的具体配置方案。

**实战场景**：能独立配置一个 Nuxt/Next 项目的首屏优化方案，用 Lighthouse 度量效果，针对 LCP/CLS 瓶颈做定向优化。
