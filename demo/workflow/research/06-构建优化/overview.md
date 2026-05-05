# 构建优化：Webpack/Vite 的产物体积与加载速度

## 命题概述

构建工具的核心职责是将源码转化为浏览器可执行的产物。产物体积决定传输成本，加载速度决定用户体验。本命题沿构建流水线的六个阶段展开——从源码输入到运行时加载——梳理影响体积与速度的关键机制，并标注通用技术与工具特化方案。

---

## 流水线总览

```
源码输入 → 模块解析 → 转换 → 优化 → 产物输出 → 运行时加载
```

---

## 1. 源码输入：模块规范决定优化上限

构建工具对源码的分析能力，从根本上取决于模块规范的选择。

- **ESM（ES Modules）**：`import`/`export` 语法在编译期即可确定依赖图，是 Tree Shaking、静态分析、Code Splitting 的前提条件。构建工具能精确知道每个模块导出了什么、被谁引用。
- **CommonJS**：`require()` 是运行时调用，依赖关系无法静态确定。CJS 模块无法被 Tree Shaking，构建工具只能整体打包，产出冗余代码不可避免。
- **动态导入 `import()`**：将模块标记为异步边界，构建工具据此生成独立 chunk，是路由级 / 组件级按需加载的基础手段。

> **能力引用**：A28（ESM 与 CommonJS）、A10（Code Splitting — Dynamic Import）

**实践指引**：新项目一律采用 ESM；遗留 CJS 库需确认 `package.json` 中的 `sideEffects` 字段或配合构建工具的 CJS→ESM 转换（见阶段 2）。

---

## 2. 模块解析：从文件到依赖图

构建工具读取入口文件，递归解析所有 `import`/`require`，构建完整的模块依赖图。

- **Webpack**：通过 loader 链处理非 JS 文件（CSS、图片、TS 等），loader 从右到左执行；plugin 通过 Tapable 事件系统在编译各阶段注入逻辑。依赖图构建完成后交由内置模块系统运行。
- **Vite**：开发阶段不打包，利用浏览器原生 ESM 能力直接加载模块。对 CJS 依赖（如 `node_modules` 中的老旧包）通过 **esbuild 预构建**将其转换为 ESM 并缓存，避免重复转换。HMR 通过 WebSocket 通知浏览器，配合 ESM 的模块缓存失效实现毫秒级热更新。

> **能力引用**：W1（Webpack loader/plugin 链）、VI1（Vite 预构建与 esbuild）

**关键差异**：Webpack 的全量打包在开发阶段也会产生较大开销（大型项目冷启动可达数十秒）；Vite 的按需编译将开发启动时间压缩到亚秒级，但生产构建仍依赖 Rollup 进行完整打包。

---

## 3. 转换：语法降级与兼容性处理

将现代语法转译为目标环境可执行的代码（如 ES5），包括 Babel / SWC / esbuild 等转译器的介入。

- **按需转译**：通过 `.browserslistrc` 或 `targets` 配置，只转译目标环境不支持的语法，避免不必要的代码膨胀。
- **Polyfill 策略**：`@babel/polyfill` 已废弃，推荐 `core-js` 按需注入 + `useBuiltIns: 'usage'`，或使用 `polyfill.io` 等外部服务按 UA 分发。

此阶段虽不直接决定优化策略，但转换器的选择（esbuild vs Babel）直接影响构建速度：esbuild 比 Babel 快 10-100 倍。

---

## 4. 优化：体积缩减的核心战场

这是决定产物体积的关键阶段，所有主要优化手段集中在此。

### 4.1 Tree Shaking — 消除死代码

- **原理**：构建工具标记模块中「已导出但未被使用」的符号（`usedExports`），在压缩阶段由 Terser 等工具安全删除。
- **前提**：ESM 模块规范 + 生产模式（`mode: 'production'`）。
- **`sideEffects` 字段**：在 `package.json` 中声明哪些文件有副作用（如全局 CSS 注入、polyfill），无副作用的文件可整棵跳过，大幅缩小分析范围。
- **Webpack 特化**：通过 `optimization.usedExports` 和 `optimization.sideEffects` 控制。
- **Vite/Rollup**：默认开启，Tree Shaking 与作用域提升（Scope Hoisting）同时生效，合并模块减少函数调用开销。

> **能力引用**：A11（Tree Shaking）

### 4.2 Code Splitting — 代码分割

将单一 bundle 拆分为多个 chunk，实现按需加载，减少首屏传输量。

| 方式 | 机制 | 适用场景 |
|------|------|----------|
| Entry Points | 多入口配置，每个入口生成独立 bundle | 多页应用 |
| SplitChunksPlugin | 自动提取公共依赖（`node_modules`、共享模块） | 通用 |
| Dynamic Import | `import()` 语法标记异步边界 | 路由懒加载、组件按需加载 |

- **Chunk 粒度控制**：通过 `splitChunks.minSize`、`maxSize`、`maxAsyncRequests` 等参数平衡请求数与缓存命中率。
- **Vite 默认策略**：Rollup 的 `manualChunks` 或自动拆分，对大型依赖（如 `lodash`、`echarts`）自动提取为独立 chunk。

> **能力引用**：A10（Code Splitting）

### 4.3 压缩与混淆

- **JS 压缩**：Terser（Webpack 默认）/ esbuild（Vite 默认，速度快但压缩率略低）/ SWC。
- **CSS 压缩**：`css-minimizer-webpack-plugin` / `csso` / `lightningcss`。
- **图片优化**：`image-minimizer-webpack-plugin`，配合 WebP/AVIF 等现代格式。

---

## 5. 产物输出：缓存策略与部署效率

产物的文件名与分块策略直接影响 CDN 缓存命中率和增量更新效率。

### 5.1 持久化缓存（contenthash）

- **contenthash**：文件内容变化才改变 hash，未变化的文件 URL 不变 → 浏览器/CDN 缓存命中。
- **runtimeChunk 分离**：将 Webpack 的运行时代码（模块加载器、chunk 映射表）单独提取，避免业务代码变更导致 runtime hash 失效，进而使所有 chunk 缓存失效。
- **vendor 独立缓存**：将第三方依赖打包为独立 chunk（如 `vendor.[contenthash].js`），其内容稳定、缓存周期长。

> **能力引用**：A29（持久化缓存）

### 5.2 Module Federation — 运行时模块共享

- **场景**：多个独立构建的应用共享运行时模块（如公共组件库、状态管理），无需重复打包。
- **机制**：每个应用声明 `remote` 和 `exposes`，通过 `remoteEntry.js` 在运行时协商版本、按需加载远程模块。
- **优势**：减少微前端架构中的重复代码，独立部署、独立构建。
- **代价**：运行时开销、版本兼容性复杂度、调试难度上升。

> **能力引用**：W2（Module Federation）

### 5.3 产物分析

- **Webpack Bundle Analyzer**：可视化 chunk 组成，定位体积瓶颈。
- **Rollup Plugin Visualizer**：Vite/Rollup 生态的对应工具。
- **`source-map-explorer`**：基于 source map 的精确分析。

---

## 6. 运行时加载：从网络到可交互

产物到达浏览器后的加载行为，是用户感知速度的最终环节。

### 6.1 加载策略

- **`<link rel="preload">`**：预加载关键资源（字体、首屏 chunk），提升 LCP。
- **`<link rel="modulepreload">`**：针对 ESM chunk 的专用预加载，浏览器并行解析模块依赖图。
- **`<script type="module">`**：天然支持 `defer` 语义，不阻塞 HTML 解析。

### 6.2 运行时执行

- **Webpack 运行时**：内置模块加载器，维护 chunk 映射表，通过 JSONP / `import()` 加载异步 chunk。
- **Vite 生产产物**：基于 Rollup 输出，运行时更轻量（无模块加载器），依赖浏览器原生 ESM。

### 6.3 关键指标

| 指标 | 含义 | 优化目标 |
|------|------|----------|
| FCP（First Contentful Paint） | 首次渲染内容 | < 1.8s |
| LCP（Largest Contentful Paint） | 最大内容渲染 | < 2.5s |
| TTI（Time to Interactive） | 可交互时间 | < 3.8s |
| TBT（Total Blocking Time） | 总阻塞时间 | < 200ms |

---

## 能力索引

| 能力 ID | 名称 | 流水线阶段 |
|---------|------|-----------|
| A28 | ESM 与 CommonJS | 1. 源码输入 |
| A10 | Code Splitting | 4. 优化 |
| A11 | Tree Shaking | 4. 优化 |
| A29 | 持久化缓存 | 5. 产物输出 |
| W1 | Webpack loader/plugin 链 | 2. 模块解析 |
| VI1 | Vite 预构建与 esbuild | 2. 模块解析 |
| W2 | Module Federation | 5. 产物输出 |

---

## Webpack vs Vite 构建策略对照

| 维度 | Webpack | Vite |
|------|---------|------|
| 开发模式 | 全量打包，HMR 基于模块替换 | 原生 ESM 按需加载，HMR 基于缓存失效 |
| 生产构建 | 自身打包引擎 | Rollup |
| Tree Shaking | `usedExports` + `sideEffects` 标记模式 | Rollup 内置，更激进 |
| Code Splitting | `SplitChunksPlugin` 丰富配置 | Rollup `manualChunks` + 自动拆分 |
| 预构建 | 不需要（全量处理） | esbuild 预构建 CJS→ESM |
| 构建速度 | 较慢（Babel/Terser） | 较快（esbuild/SWC） |
| 缓存策略 | `contenthash` + `runtimeChunk` + `splitChunks` | `contenthash`，Rollup 输出 |
| 微前端 | Module Federation（原生支持） | 需 `vite-plugin-federation` |
