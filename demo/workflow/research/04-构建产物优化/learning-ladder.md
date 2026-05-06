# 构建产物优化 — 学习阶梯

> 跟着阶梯走，每步有具体任务，做到才算过关。

## 你需要什么基础
- 用过 Webpack 或 Vite 打包项目
- 了解 import/export 语法
- 知道什么是 npm 依赖

## 阶梯总览
- **阶段一：理解模块系统与 Tree Shaking**（对应能力 A7 Code Splitting）
- **阶段二：掌握 chunk 策略与缓存**（对应能力 A7 + A6 HTTP 缓存）
- **阶段三：综合运用——Webpack/Vite 配置实战**（全部能力联动）

---

## 阶段一：理解模块系统与 Tree Shaking

### 你将理解什么
为什么 CommonJS 会让 Tree Shaking 失效？ESM 的静态分析是怎么工作的？

### Step 1：理解 ESM vs CommonJS 的本质区别，用 Treemap 直观感受
**做**：阅读 `04-构建产物优化/overview.md` 的 A7 节点。理解 ESM 是静态分析（编译时确定 import/export），CommonJS 是动态加载（运行时确定 require/module.exports）。
**然后动手**：打开 `experiment/src/index.html`，默认「Treemap 视图」。观察优化前（730KB）的模块分布：moment 290KB、antd 340KB、lodash 72KB。再看优化后（260KB）：moment 68KB、antd 85KB、lodash 4KB。
**你会看到什么**：Tree Shaking 基于 ESM 的静态分析——lodash-es 具名导入只保留 4KB，而全量导入的 lodash 是 72KB。
**这说明了什么**：用 CommonJS 写的库（如 moment.js）无法被 Tree Shaking，整个库都会打进 bundle。
**接下来去哪**：阅读 `edge-cases.md` 的 EC1（Tree Shaking 失效）。
**做到才算过**：能解释为什么 `import { debounce } from 'lodash-es'` 能 Tree Shaking 而 `const _ = require('lodash')` 不能。能在 Treemap 中直观看到体积差异。

### Step 2：理解 sideEffects 配置
**做**：阅读 `edge-cases.md` 的 EC1。理解 `sideEffects: false` 和 `sideEffects: ["*.css"]` 的含义。
**你会看到什么**：`sideEffects: false` 告诉打包器"这个模块的所有 export 都可以安全删除"；但如果有副作用（如 polyfill、CSS import），需要声明例外。
**这说明了什么**：sideEffects 配置错误是 Tree Shaking 失效的头号原因。
**接下来去哪**：进入阶段二，学习 chunk 策略。
**做到才算过**：能说出 3 个导致 Tree Shaking 失效的原因及修复方法。

### 阶段一过关标准
- [ ] 能解释 ESM 静态分析 vs CommonJS 动态加载的区别
- [ ] 能说出 sideEffects 配置的含义和常见错误
- [ ] 能识别项目中导致 Tree Shaking 失效的代码模式
- 做不到？→ 回到 `overview.md` A7 节点 + `edge-cases.md` EC1 重读

---

## 阶段二：掌握 chunk 策略与缓存

### 你将理解什么
如何划分 chunk 才能让缓存命中率最高？vendor chunk 膨胀怎么解决？

### Step 3：理解 contenthash 缓存策略
**做**：阅读 `04-构建产物优化/overview.md` 的 A6 节点。理解 contenthash 文件名 + 长期缓存（`max-age=31536000`）的机制。
**然后动手**：在实验中点击「💾 缓存策略」，查看持久化缓存配置。理解 vendor.[hash].js 设 1 年缓存、index.html 用 no-cache 协商缓存的策略。
**你会看到什么**：文件内容不变 → hash 不变 → 浏览器命中缓存；内容变了 → hash 变了 → 浏览器拉新文件。带 contenthash 的资源可以安全地设长期缓存。
**这说明了什么**：contenthash 是"永久缓存 + 即时更新"的基石。
**接下来去哪**：阅读 `edge-cases.md` 的 EC4（缓存失效全量回源）。
**做到才算过**：能解释 contenthash 和 hash 的区别，以及为什么 contenthash 更适合长期缓存。能在实验中查看缓存策略配置。

### Step 4：理解 chunk 粒度的权衡
**做**：阅读 `trade-offs.md` 的"Code Splitting 粒度"和"Vendor Chunk 策略"。
**你会看到什么**：路由级分割（简单，收益大）vs 组件级分割（精细，复杂）；单一 vendor（简单，缓存差）vs 拆分 vendor（复杂，缓存好）。
**这说明了什么**：chunk 粒度是 HTTP 请求数 vs 缓存命中率的权衡。
**接下来去哪**：进入阶段三，实战配置。
**做到才算过**：能说出"路由级分割 + 按更新频率拆分 vendor"的推荐策略。

### 阶段二过关标准
- [ ] 能解释 contenthash 缓存机制
- [ ] 能说出 chunk 粒度的权衡维度
- [ ] 能说出 vendor chunk 的推荐拆分策略
- 做不到？→ 回到 `overview.md` A6 节点 + `trade-offs.md` 重读

---

## 阶段三：综合运用——Webpack/Vite 配置实战

### 你将理解什么
如何在 Webpack/Vite 中落地 Code Splitting + Tree Shaking + 缓存的完整方案？

### Step 5：配置 Webpack splitChunks
**做**：阅读 `overview.md` 的收尾部分（Webpack splitChunks 配置）。在自己的项目中配置 `splitChunks`。
**你会看到什么**：`chunks: 'all'` + `cacheGroups` 可以把 vendor、公共模块、路由 chunk 分离。
**这说明了什么**：Webpack 的 splitChunks 是 chunk 策略的核心配置。
**接下来去哪**：阅读 `edge-cases.md` 的 EC3（chunk 粒度太细）。
**做到才算过**：能在 Webpack 配置中实现路由级分割 + vendor 拆分。

### Step 6：配置 Vite 预构建
**做**：阅读 `overview.md` 的 Vite 部分。理解 Vite 的 `optimizeDeps`（预构建）和 `manualChunks`（手动分割）。
**你会看到什么**：Vite 用 esbuild 做预构建（比 Webpack 快 10-100 倍），`manualChunks` 控制 chunk 划分。
**这说明了什么**：Vite 和 Webpack 的配置思路相同，但工具链不同。
**接下来去哪**：用 CI 卡口监控产物体积。
**做到才算过**：能在 Vite 项目中配置 manualChunks 并验证产物体积。

### Step 7：建立 CI 体积监控
**做**：阅读 `edge-cases.md` 的收尾部分（CI 体积监控流水线）。理解如何用 `size-limit` 或 `bundlesize` 设置体积基线。
**你会看到什么**：CI 卡口可以在 PR 合入前阻止体积膨胀。
**这说明了什么**：构建优化是一次性的，体积监控是持续性的。
**接下来去哪**：完成！
**做到才算过**：能在一个项目中配置 CI 体积监控卡口。

### 阶段三过关标准
- [ ] 能在 Webpack 中配置 splitChunks
- [ ] 能在 Vite 中配置 manualChunks
- [ ] 能配置 CI 体积监控卡口
- 做不到？→ 回到 `overview.md` + `edge-cases.md` 配置部分重读

---

## 学完之后你应该能做到

**面试场景**：面对"首屏 JS >500KB 怎么优化"的问题，能从 ESM vs CommonJS→Tree Shaking 原理→Code Splitting 策略→contenthash 缓存→splitChunks/manualChunks 配置→CI 体积监控完整回答。

**实战场景**：能在 Webpack/Vite 项目中配置完整的构建优化方案，用 `webpack-bundle-analyzer` 分析产物，用 CI 卡口持续监控体积。
