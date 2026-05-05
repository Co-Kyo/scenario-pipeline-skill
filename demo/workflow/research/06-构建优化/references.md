# 参考资料：构建优化——Webpack/Vite 的产物体积与加载速度

> 分级说明：T1 = 必读核心（直接出题来源），T2 = 重要补充（拓展理解），T3 = 延伸参考（开阔视野）

---

## T1 · 必读核心

### 1. Webpack Code Splitting — 代码分割
- **Webpack — Code Splitting**：https://webpack.js.org/guides/code-splitting/
- **web.dev — Reduce JavaScript payloads with code splitting**：https://web.dev/articles/reduce-javascript-payloads-with-code-splitting
- **核心知识点**：
  - 三种代码分割方式：入口起点（`entry` 配置多入口）、`SplitChunksPlugin`（抽取公共依赖）、动态导入（`import()` 语法）
  - `SplitChunksPlugin` 配置：`chunks`（`async`/`initial`/`all`）、`minSize`、`maxSize`、`minChunks`、`maxAsyncRequests`、`maxInitialRequests`
  - `cacheGroups` 自定义分组策略（如 `vendors`、`default`）
  - 动态 `import()` 返回 Promise，配合 React.lazy / Vue 异步组件实现路由级懒加载
  - 魔术注释：`/* webpackChunkName: "xxx" */`、`/* webpackPrefetch: true */`、`/* webpackPreload: true */`
  - Prefetch vs Preload：Prefetch 空闲时预取（未来导航），Preload 当前导航立即加载

### 2. Webpack Tree Shaking — 摇树优化
- **Webpack — Tree Shaking**：https://webpack.js.org/guides/tree-shaking/
- **MDN — Tree Shaking**：https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking
- **web.dev — Remove unused code**：https://web.dev/articles/remove-unused-code
- **核心知识点**：
  - Tree Shaking 依赖 ESM 静态结构（`import`/`export`），CommonJS 无法被静态分析
  - Webpack 标记未使用导出（`usedExports`）→ Terser 删除死代码（`sideEffects`）
  - `package.json` 中 `"sideEffects": false` 告诉 Webpack 模块无副作用，可安全移除未引用代码
  - `"sideEffects": ["*.css", "*.global.js"]` 精确声明有副作用的文件
  - Webpack 5 production 模式默认开启 `optimization.usedExports` 和 `optimization.minimize`
  - 命名导出 vs 默认导出：命名导出更利于 Tree Shaking 的静态分析

### 3. MDN ESM — ES Modules 模块系统
- **MDN — JavaScript Modules**：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
- **核心知识点**：
  - `import`/`export` 语法，静态结构使打包工具可在编译期分析依赖图
  - Named export vs Default export 的设计取舍
  - `import()` 动态导入返回 Promise，实现运行时按需加载
  - ESM 是 Tree Shaking 的前提条件
  - `<script type="module">` 默认 defer 行为，阻塞 DOM 解析但不阻塞渲染
  - 模块作用域隔离，不会污染全局

### 4. Webpack Caching — 构建缓存
- **Webpack — Caching**：https://webpack.js.org/guides/caching/
- **核心知识点**：
  - `contenthash`：基于文件内容生成哈希，内容不变则哈希不变，最大化利用浏览器缓存
  - `[contenthash:8]` 截取前 8 位，平衡唯一性与长度
  - `optimization.runtimeChunk: 'single'` 将 runtime 抽离为独立 chunk，避免业务代码变更导致 runtime 缓存失效
  - `optimization.splitChunks` 配合 `cacheGroups` 抽离第三方库（vendor），第三方库更新频率低，缓存命中率高
  - Webpack 5 内置持久化缓存（`cache: { type: 'filesystem' }`），二次构建速度显著提升
  - 模块标识符问题：使用 `optimization.moduleIds: 'deterministic'` 确保模块 ID 稳定，避免无关改动导致 hash 变化

---

## T2 · 重要补充

### 5. Vite 依赖预构建 — Dep Pre-Bundling
- **Vite — Dependency Pre-Bundling**：https://vitejs.dev/guide/dep-pre-bundling.html
- **核心知识点**：
  - 开发阶段用 esbuild 将 `node_modules` 中的 CommonJS/UMD 依赖转为 ESM，解决两个问题：模块格式转换 + 减少请求数量（合并零碎模块）
  - 预构建产物缓存在 `node_modules/.vite` 目录
  - `optimizeDeps.include` / `optimizeDeps.exclude` 手动控制预构建范围
  - `optimizeDeps.esbuildOptions` 传递 esbuild 配置（如 `target`）
  - 预构建仅影响开发模式，生产构建使用 Rollup
  - 依赖变更或 `vite.config.js` 变更时自动重新构建，也可手动 `--force` 触发

### 6. Vite 生产构建 — Build
- **Vite — Build**：https://vitejs.dev/guide/build.html
- **核心知识点**：
  - 生产构建底层使用 Rollup，输出高度优化的 ESM 产物
  - `build.rollupOptions` 自定义 Rollup 配置（手动分包、外部依赖等）
  - `build.lib` 构建库模式，输出 ESM/CJS/UMD 多格式
  - `build.cssCodeSplit` 控制 CSS 是否按需分割
  - `build.minify` 默认 `'esbuild'`（最快），可选 `'terser'`
  - `build.sourcemap` 生成 source map，调试用
  - `build.assetsInlineLimit`（默认 4096 bytes）：小于此值的资源内联为 base64

### 7. Webpack Module Federation — 模块联邦
- **Webpack — Module Federation**：https://webpack.js.org/concepts/module-federation/
- **核心知识点**：
  - 运行时共享模块，多个独立构建的应用之间共享依赖
  - `ModuleFederationPlugin` 配置：`name`（当前应用名）、`filename`（远程入口文件）、`exposes`（暴露的模块）、`remotes`（消费的远程模块）、`shared`（共享依赖）
  - `shared` 配置 `singleton: true` 确保全局只加载一份（如 React）
  - `shared` 配置 `requiredVersion` 约束版本兼容
  - `eager: true` 将共享模块打包到主 bundle（减少请求数但增大初始体积）
  - 适用场景：微前端架构、多团队独立部署、跨应用共享组件/工具库
  - Webpack 5 原生支持，无需额外插件

---

## T3 · 延伸参考

### 8. 综合策略与最佳实践

| 策略 | 适用场景 | 关键技术 |
|------|---------|---------|
| 代码分割 | 大型 SPA、多页面应用 | `SplitChunksPlugin`、动态 `import()` |
| Tree Shaking | 使用 ESM 的库/应用 | `sideEffects`、`usedExports` |
| 构建缓存 | 长期维护项目、CI/CD | `contenthash`、`runtimeChunk`、filesystem cache |
| 依赖预构建 | Vite 开发阶段 | esbuild、`optimizeDeps` |
| 模块联邦 | 微前端、多应用共享 | `ModuleFederationPlugin`、`shared` |
| 按需加载 | 路由级/组件级懒加载 | `import()`、React.lazy、`webpackChunkName` |
| Bundle 分析 | 体积诊断与优化 | webpack-bundle-analyzer、rollup-plugin-visualizer |
| 压缩混淆 | 所有生产构建 | Terser、esbuild minify |

### 9. 常见优化手段速查

- **第三方库优化**：用 ESM 版本替代 CJS（如 `lodash-es` 代替 `lodash`）、按需引入（`import { debounce } from 'lodash-es'`）
- **Polyfill 按需注入**：`@babel/preset-env` + `useBuiltIns: 'usage'` 或 `core-js` 按需引入
- **CSS 提取与分割**：`MiniCssExtractPlugin`（Webpack）/ `build.cssCodeSplit`（Vite）
- **图片与字体压缩**：`image-minimizer-webpack-plugin`、`vite-plugin-imagemin`
- **Gzip/Brotli 预压缩**：`compression-webpack-plugin`、`vite-plugin-compression`
- **HTTP/2 Push / Preload**：配合 `html-webpack-plugin` 的 `preload` 注入

---

## 参考链接汇总

| # | 资源 | URL | 级别 |
|---|------|-----|------|
| 1 | Webpack Code Splitting | https://webpack.js.org/guides/code-splitting/ | T1 |
| 2 | web.dev Code Splitting | https://web.dev/articles/reduce-javascript-payloads-with-code-splitting | T1 |
| 3 | Webpack Tree Shaking | https://webpack.js.org/guides/tree-shaking/ | T1 |
| 4 | MDN Tree Shaking | https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking | T1 |
| 5 | web.dev Remove unused code | https://web.dev/articles/remove-unused-code | T1 |
| 6 | MDN JavaScript Modules | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules | T1 |
| 7 | Webpack Caching | https://webpack.js.org/guides/caching/ | T1 |
| 8 | Vite Dep Pre-Bundling | https://vitejs.dev/guide/dep-pre-bundling.html | T2 |
| 9 | Vite Build | https://vitejs.dev/guide/build.html | T2 |
| 10 | Webpack Module Federation | https://webpack.js.org/concepts/module-federation/ | T2 |
