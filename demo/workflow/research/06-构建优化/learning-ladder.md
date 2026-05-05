# 构建优化：Webpack/Vite 的产物体积与加载速度 — 学习阶梯

> 跟着阶梯走，每步有具体任务，做到才算过关。

## 你需要什么基础
- 用过 npm/yarn 安装依赖
- 了解 import/export 语法
- 知道 Webpack 或 Vite 的基本配置

## 阶梯总览
- **阶段一：模块系统基础**（对应能力 A28）— ESM vs CommonJS
- **阶段二：产物体积优化**（对应能力 A10、A11）— Code Splitting + Tree Shaking
- **阶段三：缓存策略**（对应能力 A29）— contenthash 长期缓存
- **阶段四：工具链特化**（对应能力 W1、VI1、W2）— Webpack vs Vite

---

## 阶段一：模块系统基础

### 你将理解什么
构建工具的一切优化都建立在"模块系统"之上。ESM 的静态分析能力是 Tree Shaking 和 Code Splitting 的前提。

### Step 1：ESM vs CommonJS
**做**：读 `capabilities/A28-ESM与CommonJS.md`。
**你会看到什么**：ESM 的 `import` 是静态声明（编译时确定依赖）；CommonJS 的 `require` 是运行时调用。
**这说明了什么**：只有 ESM 才能做 Tree Shaking——因为构建工具可以在编译时知道"哪些 export 没被 import"。
**接下来去哪**：读 `overview.md` 第一节。
**做到才算过**：能解释"为什么 CommonJS 不能 Tree Shaking"。

### 阶段一过关标准
- [ ] 能区分 ESM 和 CommonJS 的静态/动态特性
- [ ] 能解释 `import()` 动态导入的作用
- [ ] 做不到？→ 回看 `capabilities/A28`

---

## 阶段二：产物体积优化

### 你将理解什么
减小产物体积的两个核心手段：Code Splitting（拆）和 Tree Shaking（删）。

### Step 2：Code Splitting
**做**：读 `capabilities/A10-Code Splitting.md`。
**你会看到什么**：按路由拆分（`import()`）、按 vendor 拆分（splitChunks）、按需加载组件。
**这说明了什么**：首屏只加载当前路由需要的代码，其余延迟加载——直接减少 FCP。
**接下来去哪**：读 `experiment/index.html`。
**做到才算过**：能在一个 SPA 中按路由配置 Code Splitting。

### Step 3：Tree Shaking
**做**：读 `capabilities/A11-Tree Shaking.md`。
**你会看到什么**：ESM 静态分析消除未引用代码。副作用标记（`sideEffects: false`）告诉打包器"这个模块没有副作用，未引用的 export 可以安全删除"。
**这说明了什么**：不是所有 ESM 都能 Tree Shaking——如果模块有副作用（如 polyfill），需要精确标记。
**接下来去哪**：读 `edge-cases.md` 关于"Tree Shaking 失效"的场景。
**做到才算过**：能在一个项目中验证 Tree Shaking 是否生效（对比产物大小）。

### 阶段二过关标准
- [ ] 能配置 Code Splitting（按路由 + vendor 分离）
- [ ] 能解释 Tree Shaking 的前提条件和失效场景
- [ ] 做不到？→ 回看 `capabilities/A10` + `A11`

---

## 阶段三：缓存策略

### 你将理解什么
Code Splitting 拆出了多个 chunk，如果文件名不变，浏览器会用缓存中的旧版本。

### Step 4：contenthash 长期缓存
**做**：读 `capabilities/A29-持久化缓存（contenthash）.md`。
**你会看到什么**：文件名加 hash（如 `app.a1b2c3.js`），内容变了 hash 变 → 缓存自动失效；内容没变 hash 不变 → 长期缓存。
**这说明了什么**：HTML 不缓存（每次获取最新），JS/CSS 用 hash 长期缓存——这是标准模式。
**接下来去哪**：读 `edge-cases.md` 关于"hash 不稳定"的问题。
**做到才算过**：能配置一个项目的 contenthash 缓存策略。

### 阶段三过关标准
- [ ] 能解释 contenthash 的缓存失效机制
- [ ] 能处理"只改了一个文件，所有 chunk hash 都变了"的问题
- [ ] 做不到？→ 回看 `capabilities/A29`

---

## 阶段四：工具链特化

### 你将理解什么
Webpack 和 Vite 的设计哲学不同——Webpack 是"一切皆 loader/plugin 的构建管线"，Vite 是"ESM 原生 + esbuild 预构建"。

### Step 5：Webpack loader/plugin 链
**做**：读 `capabilities/W1-Webpack loader-plugin链.md`。
**你会看到什么**：loader 处理单文件（从右到左执行），plugin 处理整个构建生命周期（hooks）。
**这说明了什么**：Webpack 的灵活性来自 plugin 系统，但复杂配置是它的痛点。
**接下来去哪**：读 `capabilities/VI1-Vite预构建与esbuild.md`。
**做到才算过**：能解释 loader 和 plugin 的区别。

### Step 6：Vite 预构建
**做**：读 `capabilities/VI1-Vite预构建与esbuild.md`。
**你会看到什么**：Vite 开发时用 ESM 原生加载（无需打包），用 esbuild 预构建 node_modules 依赖；生产时用 Rollup 打包。
**这说明了什么**：Vite 的开发服务器启动极快——因为不需要像 Webpack 那样先打包再启动。
**接下来去哪**：读 `capabilities/W2-Module Federation.md`。
**做到才算过**：能解释 Vite 为什么比 Webpack 开发启动快。

### Step 7：Module Federation
**做**：读 `capabilities/W2-Module Federation.md`。
**你会看到什么**：运行时模块共享——多个独立构建的应用共享组件库，不需要重复打包。
**这说明了什么**：Module Federation 解决了"微前端场景下共享依赖"的问题，但配置复杂。
**接下来去哪**：读 `trade-offs.md` 的选型建议。
**做到才算过**：能解释 Module Federation 的适用场景。

### 阶段四过关标准
- [ ] 能解释 Webpack 和 Vite 的核心区别
- [ ] 能根据项目需求选择合适的构建工具
- [ ] 做不到？→ 回看 `capabilities/W1` + `VI1` + `W2`

---

## 学完之后你应该能做到
- 面试中能解释 ESM 对构建优化的意义
- 能设计一个完整的构建优化方案（Code Splitting + Tree Shaking + contenthash）
- 能对比 Webpack 和 Vite 的优劣并给出选型建议
- 能解释 Module Federation 的价值和局限
