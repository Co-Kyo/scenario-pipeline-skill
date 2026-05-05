# 边界与极端情况 — 构建优化：Webpack/Vite 的产物体积与加载速度

本文档梳理构建优化方案在真实项目中容易踩到的边界条件与极端场景，覆盖 Tree Shaking、代码分割、产物配置、构建流水线、Vite 特有陷阱、模块联邦七大维度。每个条目按「场景 → 表现 → 风险 → 应对」结构组织。

---

## 1 Tree Shaking 的静默失效

### 1.1 Babel 默认转 CJS 破坏 Tree Shaking

| 项目 | 内容 |
|------|------|
| **场景** | 项目使用 Babel 转译，未配置 `modules: false`，所有 ES Module 被转为 `require()` / `module.exports` |
| **表现** | `webpack --mode production` 后产物体积远超预期，`sideEffects: false` 配置完全无效，被导入但未使用的模块代码完整保留在产物中 |
| **风险** | CommonJS 是动态的——`require()` 可以出现在任何位置（条件、循环、函数内部），静态分析器无法确定哪些导出被使用，被迫保留全部代码；Babel 的 `@babel/preset-env` 默认 `modules: "auto"`，在大多数项目中等价于 `"commonjs"` |
| **应对** | ① `.babelrc` 中显式设置 `"modules": false`，将模块语法的转译交给 Webpack（Webpack 原生理解 ESM）；② 双重确认：`@babel/preset-env` + `"modules": false` + `@babel/plugin-transform-runtime` 避免 helper 内联；③ 用 `webpack-bundle-analyzer` 对比修改前后产物，验证 Tree Shaking 是否生效 |

### 1.2 CJS 库无法被 Tree Shaking

| 项目 | 内容 |
|------|------|
| **场景** | 引入 lodash（非 lodash-es）、moment、antd 等以 CommonJS 发布的库，仅使用其中 1-2 个函数 |
| **表现** | 整个库被打入产物：moment 300KB+（含全部 locale）、lodash 70KB+、antd 全量打包后数 MB |
| **风险** | CJS 导入无法被静态分析，Webpack 只能将整个模块作为副作用保留；即使用了 `babel-plugin-import` 或 `babel-plugin-lodash` 做按需导入，也只是将 `import _ from 'lodash'` 拆成 `import get from 'lodash/get'`，并未真正做 Tree Shaking |
| **应对** | ① 优先使用 ESM 版本（lodash-es、dayjs 替代 moment）；② 对无法替换的 CJS 库使用 `babel-plugin-import` 或 `unplugin-auto-import` 做路径级按需导入；③ 配合 `webpack.IgnorePlugin` 忽略 moment 的 locale 文件（`/^\.\/locale$/` + contextRegExp）；④ 用 `esm` 或 `esbuild` 对 CJS 依赖做预构建转 ESM |

### 1.3 import() 的 webpackChunkName 影响缓存命中

| 项目 | 内容 |
|------|------|
| **场景** | 动态导入使用魔法注释 `/* webpackChunkName: "utils" */`，团队成员在不同分支添加了同名注释 |
| **表现** | 多个不相关的动态导入被打包到同一个 chunk，或同名 chunk 在不同构建中内容不同，缓存命中率低 |
| **风险** | `webpackChunkName` 相同的动态导入会被合并到同一个 chunk 文件中，导致无关代码被一起加载；更严重的是，如果两个开发者给不同模块起了相同的 chunk 名称，合并后 chunk 内容变化，`contenthash` 随之变化，CDN 缓存全部失效 |
| **应对** | ① 使用 `[request]` 占位符自动生成 chunk 名称：`/* webpackChunkName: "[request]" */`；② 在 CI 中检测重复的 chunkName 并告警；③ 对关键路由的 chunkName 使用固定语义化命名（如 `route-dashboard`），其余使用自动命名；④ 结合 `webpack.ids.HashedModuleIdsPlugin` 确保模块 ID 稳定 |

### 1.4 副作用检测困难导致误删或漏删

| 项目 | 内容 |
|------|------|
| **场景** | 库的 `package.json` 中声明 `"sideEffects": false`，但模块内实际包含全局副作用（polyfill、样式注册、全局变量设置） |
| **表现** | ① 库的全局副作用代码被 Tree Shaking 移除，运行时功能异常（如 polyfill 丢失、样式不生效）；② 或相反——项目代码中 `import './polyfill'` 被保留但其内部的 `window.Promise = ...` 赋值被移除 |
| **风险** | Webpack 的副作用检测基于静态分析：纯函数调用、属性赋值、`import` 语句本身；但对以下场景无法判断：① `console.log()`（副作用 vs 调试）；② 修改全局对象（`window.X = ...`）；③ `import` 的模块导出被 re-export 但未被使用时是否安全删除 |
| **应对** | ① 对有副作用的文件在 `package.json` 中精确声明 `"sideEffects": ["./src/polyfill.js", "*.css"]`；② 对可疑模块用 `/*#__PURE__*/` 注释标记纯函数调用；③ 构建后用 `grep -r "should be removed" dist/` 或 Diff 工具验证关键代码是否被误删；④ 编写集成测试覆盖 polyfill 和样式注入场景 |

### 1.5 CSS Tree Shaking 需要 PurgeCSS 但误删动态类名

| 项目 | 内容 |
|------|------|
| **场景** | 使用 PurgeCSS/TailwindCSS 的 purge 功能移除未使用的 CSS 类名，项目中通过字符串拼接或模板生成类名 |
| **表现** | 构建后部分页面样式丢失，动态生成的类名（如 `bg-${color}-500`、`text-${size}`）在源码扫描阶段无法被检测到 |
| **风险** | PurgeCSS 默认只扫描源码中的字面量字符串，对以下场景无法识别：① 模板字符串拼接（`` `${prefix}-active` ``）；② 条件表达式中的类名（`isActive ? 'active' : 'inactive'`）；③ 通过 JS 动态注入的类名（`element.className = computedClass`）；④ 第三方库内部使用的类名 |
| **应对** | ① 在 PurgeCSS 的 `safelist` 中保留动态类名模式（支持正则：`/^bg-/`）；② 对 Tailwind 使用 `content` 配置扫描所有可能包含类名的文件（JSX、模板、Markdown）；③ 用 `@apply` 替代字符串拼接，让构建工具能静态分析；④ CI 中增加视觉回归测试（Percy/Chromatic），捕获样式丢失 |

### 1.6 re-export 误删

| 项目 | 内容 |
|------|------|
| **场景** | 模块 A 从模块 B re-export 所有内容（`export * from './B'`），模块 B 的某些导出仅被外部消费者使用 |
| **表现** | 构建后 B 的某些导出在 A 的 re-export 中被移除，外部消费者通过 A 访问时得到 `undefined` |
| **风险** | Webpack 的 re-export 分析存在边界：当 re-export 的模块是 CJS 或使用了动态导出时，`export *` 无法确定哪些属性会被外部使用，可能保守地全部保留或错误地全部移除；混合使用 `export { specific } from` 和 `export * from` 时行为更不可预测 |
| **应对** | ① 对 re-export 使用显式命名导出（`export { A, B } from './module'`）而非 `export *`；② 库发布时在 `package.json` 的 `sideEffects` 中声明 re-export 链路；③ 用 `api-extractor`（TypeScript）或 `@rollup/plugin-typescript` 的 `declaration` 模式验证导出完整性；④ 在库的集成测试中验证所有公共 API 可访问 |

---

## 2 代码分割的过度与不足

### 2.1 过度拆分导致 HTTP 请求过多

| 项目 | 内容 |
|------|------|
| **场景** | 每个页面组件、每个工具函数、每个第三方库都独立成 chunk，最终产物包含 100+ 个 JS 文件 |
| **表现** | Network 面板出现大量小文件请求（大多 < 5KB），页面加载时并行请求排队，总加载时间反而增加 |
| **风险** | HTTP/1.1 下每个请求都有 TCP 握手 + TLS 建立的开销（~100-300ms），大量小文件的总延迟远超合并后的大文件；即使 HTTP/2 多路复用，浏览器也有并发流限制（Chrome 100 个），超过后仍然排队；每个 chunk 的 runtime 开销（模块注册、JSONP 回调）也不可忽略 |
| **应对** | ① 设置 `optimization.splitChunks.minSize`（默认 20000，建议 30000-50000）和 `minChunks` 限制最小 chunk 体积和最少引用次数；② 使用 `maxSize` 拆分过大的 vendor chunk，但不要设得过小；③ 用 `webpack-bundle-analyzer` 可视化，识别过小的 chunk 并合并；④ HTTP/2 场景下适度放宽限制，HTTP/1.1 下控制在 20-30 个文件以内 |

### 2.2 chunk 间共享模块重复打包

| 项目 | 内容 |
|------|------|
| **场景** | 页面 A 和页面 B 都导入了 `moment`，但因 `splitChunks.chunks: 'async'` 配置，同步导入的共享模块被打入各自页面的 chunk |
| **表现** | 构建产物中 `moment` 出现两次（或更多），总冗余体积达数百 KB |
| **风险** | 默认 `splitChunks` 仅处理异步 chunk 的共享模块，同步导入的公共依赖不会被提取；多页应用中各页面独立打包，相同依赖被重复包含；即使设置了 `chunks: 'all'`，如果依赖被不同 loader 处理（如一个走 babel-loader，一个走 ts-loader），Webpack 也会将其视为不同模块 |
| **应对** | ① 设置 `splitChunks.chunks: 'all'` 同时处理同步和异步 chunk；② 用 `splitChunks.cacheGroups` 显式配置 vendor 组（`test: /[\\/]node_modules[\\/]/`），设置 `priority` 控制归属；③ 确保同一模块在所有入口中使用相同的 loader 链；④ 用 `webpack-stats-plugin` 输出 `stats.json`，分析 `modules` 中的重复模块 |

### 2.3 动态导入的加载状态处理缺失

| 项目 | 内容 |
|------|------|
| **场景** | 使用 `import('./HeavyComponent')` 做代码分割，但未处理加载中、加载失败的状态 |
| **表现** | 用户点击触发动态导入时，页面无任何反馈（无 loading、无 skeleton），在网络慢或 chunk 加载失败时页面直接白屏或 JS 报错导致整个应用崩溃 |
| **风险** | `import()` 返回的 Promise 没有内置的 UI 反馈机制；React 的 `Suspense` 只能 fallback 到静态组件，无法展示加载进度；chunk 加载失败时（CDN 故障、版本更新后旧 chunk 被清理），没有重试机制，用户只能刷新页面 |
| **应对** | ① 使用 `React.lazy` + `Suspense` 提供 fallback 组件；② 封装 `import()` 包装器，增加超时检测和重试逻辑（指数退避，最多 3 次）；③ 对关键路由预加载（`<link rel="prefetch">` 或 `webpackPrefetch: true`），减少用户感知的加载时间；④ 监控 chunk 加载失败率，接入错误上报（Sentry 等），区分 CDN 故障和版本不一致 |

---

## 3 产物配置的微妙问题

### 3.1 runtimeChunk 分离增加请求数

| 项目 | 内容 |
|------|------|
| **场景** | 配置 `optimization.runtimeChunk: 'single'` 将 Webpack runtime 抽为独立文件 |
| **表现** | 每次页面加载多一个 HTTP 请求（runtime.js，通常只有几 KB），在弱网下这个额外请求可能成为瓶颈 |
| **风险** | runtime chunk 包含模块加载、chunk 映射、异步加载逻辑，是所有 chunk 的前置依赖——必须在任何业务代码执行前加载完成；分离后它变成一个独立的网络请求，增加了 DNS/TCP/TLS 的开销；对于单页应用，runtime 体积可能只有 2-5KB，单独请求的收益远小于开销 |
| **应对** | ① 单页应用且只有一个入口时，通常不需要 `runtimeChunk: 'single'`（runtime 直接内联到入口 chunk）；② 多入口或多页应用才需要分离 runtime 避免重复；③ 如必须分离，考虑使用 `InlineChunkHtmlPlugin` 将 runtime.js 内联到 HTML 中（体积小时，消除网络请求）；④ 设置 `optimization.runtimeChunk: { name: 'runtime' }` 配合长期缓存策略 |

### 3.2 contenthash 在开发模式不必要

| 项目 | 内容 |
|------|------|
| **场景** | 开发环境也使用 `[contenthash]` 命名输出文件 |
| **表现** | 每次修改代码后 `dist/` 目录文件名全部变化，增量构建的缓存收益消失；HMR 需要额外的 hash 重算开销，热更新速度明显变慢 |
| **风险** | contenthash 的计算需要遍历模块内容生成哈希，对大项目（数百个模块）这个过程本身可能耗时 100-500ms；开发环境下不需要长期缓存，文件名变化反而破坏了浏览器的 disk cache 策略；Webpack devServer 默认使用内存文件系统，hash 计算完全是浪费 |
| **应对** | ① 开发环境使用 `[name].js` 或 `[id].js`，仅生产环境使用 `[contenthash:8]`；② 通过环境变量切换配置：`filename: isProd ? '[name].[contenthash:8].js' : '[name].js'`；③ 即使生产环境，`contenthash:8`（8 位）已足够，不需要完整的 20 位哈希 |

### 3.3 vendor chunk 过大

| 项目 | 内容 |
|------|------|
| **场景** | `splitChunks` 默认将所有 `node_modules` 中的依赖打包到一个 `vendors~main.js` 中 |
| **表现** | vendor chunk 体积达 500KB-2MB+，即使用户只访问了一个简单页面，也必须下载整个 vendor 包 |
| **风险** | 大 vendor chunk 的问题：① 首次加载时间过长（尤其弱网）；② 任何依赖更新（即使是小版本）都会导致整个 vendor chunk 的 hash 变化，缓存完全失效；③ 无法利用浏览器并行加载多个小文件的优势 |
| **应对** | ① 将 vendor 拆分为多个 cacheGroup：框架（react/vue）、UI 库（antd/element）、工具库（lodash/dayjs）、其余 vendor，每个组独立 hash；② 设置 `maxSize` 自动拆分过大的 chunk（如 `maxSize: 200000`）；③ 使用 `webpack-bundle-analyzer` 识别 vendor 中的"大户"，考虑替换或按需导入；④ 对稳定的大型依赖（react、vue）单独成 chunk，利用长期缓存 |

### 3.4 contenthash 在模块顺序变化时不稳定

| 项目 | 内容 |
|------|------|
| **场景** | 代码未修改但重新构建后，多个 chunk 的 contenthash 发生变化 |
| **表现** | CI/CD 流水线中相同代码的两次构建产出不同的文件名，CDN 缓存大量失效，部署后出现版本不一致的 JS 错误 |
| **风险** | Webpack 的 contenthash 计算依赖模块的执行顺序——如果模块的解析顺序在不同构建间发生变化（如文件系统遍历顺序不稳定、动态导入顺序不同），即使模块内容不变，hash 也会变化；Node.js 不同版本的 `fs.readdir` 顺序可能不同，跨平台构建（Windows/Linux）更容易触发 |
| **应对** | ① 使用 `webpack.ids.HashedModuleIdsPlugin`（Webpack 4）或 `optimization.moduleIds: 'deterministic'`（Webpack 5）确保模块 ID 稳定；② 使用 `optimization.chunkIds: 'deterministic'` 确保 chunk ID 稳定；③ 在 CI 中固定 Node.js 版本和操作系统；④ 构建后对比 `stats.json` 中的 module hash，定位不稳定的模块 |

---

## 4 构建流水线的可靠性

### 4.1 loader 执行顺序错误

| 项目 | 内容 |
|------|------|
| **场景** | 配置中同时使用 `babel-loader`、`ts-loader`、`eslint-loader`，顺序配置不当 |
| **表现** | TypeScript 类型注解未被正确移除导致语法错误；或 ESLint 对未转译的代码报错（不识别新语法）；或源码 map 映射错乱 |
| **风险** | Webpack loader 的执行顺序是**从右到左**（或从下到上），配置 `use: ['babel-loader', 'ts-loader']` 实际执行顺序是 `ts-loader` → `babel-loader`；如果顺序反了，`babel-loader` 接收到的是包含类型注解的代码，无法解析；`eslint-loader`（或 `eslint-webpack-plugin`）如果放在 loader 链的最后，它检查的是转译后的代码而非源码 |
| **应对** | ① 记住执行顺序规则：`use` 数组中从右到左（从后到前）执行；② TypeScript 项目标准顺序：`ts-loader`（或 `babel-loader` + `@babel/preset-typescript`）→ 其他 loader；③ lint 工具应作为独立 plugin（`ESLintWebpackPlugin`）而非 loader，确保检查源码；④ 对 loader 链编写单元测试，验证输入输出是否符合预期 |

### 4.2 plugin hook 选择不当

| 项目 | 内容 |
|------|------|
| **场景** | 自定义 plugin 在 `compilation.hooks.optimizeAssets` 中修改资源，但期望影响后续的 minification 步骤 |
| **表现** | 修改后的代码未经 minification 就被输出，产物体积异常大 |
| **风险** | Webpack 的 plugin hook 有严格的执行顺序，`optimizeAssets` 在 `afterOptimizeAssets` 之后执行，此时 minification（TerserPlugin）已经完成；在错误的 hook 中修改资源等于在 minify 之后修改，修改过的内容不会被再次压缩 |
| **应对** | ① 理解 Webpack 的 hook 时序图：`processAssets` stage（Webpack 5）是最通用的资源处理 hook，支持 `STAGE_*` 常量控制执行时机；② 需要在 minify 前修改代码时，使用 `processAssets` + `Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE`（在 TerserPlugin 之前）；③ 使用 `stats` 输出 hook 执行顺序，验证 plugin 的实际执行时机 |

### 4.3 构建缓存失效导致 CI 构建时间爆炸

| 项目 | 内容 |
|------|------|
| **场景** | 团队使用 Webpack 5 的持久化缓存（`cache: { type: 'filesystem' }`），但 CI 环境中缓存频繁失效 |
| **表现** | CI 构建时间从 2 分钟飙升到 15 分钟以上，缓存命中率接近 0% |
| **风险** | 文件系统缓存的失效条件非常敏感：① `cache.version` 变化（Webpack 配置修改）；② 任何 loader/plugin 的版本变化；③ `NODE_ENV` 等环境变量变化；④ `tsconfig.json`、`.babelrc` 等配置文件变化；⑤ 缓存目录路径变化（CI 的临时目录每次不同）；⑥ 不同 CI runner 的 Node.js 版本或操作系统不同 |
| **应对** | ① 将 `cache.cacheDirectory` 设置为固定的、跨构建持久化的路径（如 `node_modules/.cache/webpack`）；② 在 CI 中使用缓存插件（GitHub Actions 的 `actions/cache`）持久化缓存目录；③ 设置 `cache.buildDependencies` 明确声明影响缓存的依赖（`config: [__filename]`）；④ 用 `cache.name` 区分不同环境的缓存（dev/prod/不同分支）；⑤ 监控 `stats.cacheHit` 判断缓存是否生效 |

---

## 5 Vite 特有陷阱

### 5.1 CJS 依赖预构建的边界

| 项目 | 内容 |
|------|------|
| **场景** | 项目引入了 CJS 格式的 npm 包，Vite 使用 esbuild 进行依赖预构建 |
| **表现** | ① 预构建后某些模块导出缺失（如 `default` 导出丢失）；② 条件 `require()` 未被正确处理；③ 预构建结果在不同环境下不一致 |
| **风险** | Vite 的预构建（`optimizeDeps`）使用 esbuild 将 CJS 转为 ESM，但存在边界：① `require()` 的动态特性无法完全模拟（如 `require(variable)`）；② 某些 CJS 模块依赖 `__dirname`、`__filename` 等 Node.js 全局变量，浏览器环境下不存在；③ 预构建的缓存键基于 `node_modules` 的修改时间，npm/yarn 的安装策略可能导致缓存意外命中（内容变了但 mtime 没变） |
| **应对** | ① 在 `optimizeDeps.include` 中显式声明需要预构建的 CJS 依赖，排除有问题的模块手动处理；② 对使用 Node.js 内置模块的依赖，配置 `resolve.alias` 映射到浏览器兼容的 polyfill；③ `optimizeDeps.force: true` 强制重新预构建（调试用）；④ 使用 `optimizeDeps.esbuildOptions` 自定义 esbuild 的 `format`、`platform` 等选项 |

### 5.2 esbuild 不支持类型擦除的高级特性

| 项目 | 内容 |
|------|------|
| **场景** | TypeScript 项目使用 `enum`、`namespace`、装饰器（`decorators`）等需要类型擦除的特性，依赖 esbuild 处理 |
| **表现** | ② `const enum` 在开发模式下不被内联（esbuild 不支持 `const enum` 的跨文件内联）；② 装饰器需要额外配置才能工作；③ `namespace` 合并与 TypeScript 的行为不完全一致 |
| **风险** | esbuild 的 TypeScript 处理是"只做类型擦除，不做类型检查"，且对某些语法的处理与 `tsc` 存在差异：① `const enum` 在 esbuild 中被当作普通 `enum` 处理，跨文件引用不会被内联，增加了产物体积；② TC39 Stage 3 装饰器和旧版实验性装饰器的语法不同，esbuild 仅支持后者；③ `namespace` 的合并行为可能导致运行时 `undefined` |
| **应对** | ① 避免使用 `const enum`（改用普通 `enum` 或字面量联合类型）；② 使用 `tsc --noEmit` 在 CI 中做独立的类型检查，不依赖 esbuild；③ 对装饰器项目，确认使用的是 TC39 装饰器提案语法，或配置 `tsconfig.json` 的 `experimentalDecorators: true`；④ 在 Vite 中使用 `vite-plugin-checker` 在开发时实时显示类型错误 |

### 5.3 HMR 在大项目中内存暴涨

| 项目 | 内容 |
|------|------|
| **场景** | 大型 monorepo 项目（500+ 模块），开发时频繁修改代码触发 HMR |
| **表现** | 开发服务器运行数小时后，Node.js 进程内存从 500MB 增长到 2GB+，最终 OOM 崩溃或系统极度缓慢 |
| **风险** | Vite 的 HMR 需要维护模块依赖图和每个模块的缓存状态；每次 HMR 更新时，旧的模块实例不会立即被 GC（被闭包或事件监听器持有）；大量模块的 HMR 边界传播（propagation）本身消耗 CPU 和内存；esbuild 的 watch 模式也会累积文件句柄和解析缓存 |
| **应对** | ① 配置 `server.hmr.overlay: false` 减少 DOM 开销（可选）；② 使用 `server.watch.ignored` 排除不需要监听的目录（`node_modules`、`dist`、测试文件）；③ 定期重启开发服务器（`nodemon` 或手动）；④ 监控 Node.js 进程内存（`process.memoryUsage()`），设置告警阈值；⑤ 对超大项目考虑用 Turbopack 替代 Vite 的开发服务器 |

---

## 6 模块联邦的边界场景

### 6.1 共享模块版本冲突

| 项目 | 内容 |
|------|------|
| **场景** | 多个微前端应用通过 Module Federation 共享 `react`，但各应用的 React 版本不一致（如 17 vs 18） |
| **表现** | 运行时加载到错误版本的 React，hooks 报错（`Invalid hook call`）、或新 API 不存在（`createRoot`）导致应用崩溃 |
| **风险** | Module Federation 的 `shared` 配置中 `singleton: true` 确保只加载一个版本，但版本选择逻辑是"取满足所有约束的最高版本"；如果 host 应用加载了 React 18，而 remote 应用声明了 `react: "^17.0.0"`，可能加载 18 到 17 的消费者中；没有 `singleton` 时，各应用加载各自版本，但多个 React 实例共存会导致 hooks 上下文丢失 |
| **应对** | ① 使用 `requiredVersion` 精确约束每个应用期望的版本范围；② 对核心框架（React/Vue）统一使用 `singleton: true` + `requiredVersion`，确保版本一致；③ 在 CI 中增加版本一致性检查，检测各应用的 shared 依赖版本是否兼容；④ 使用 `eager: true` 将共享模块预加载到 host 的入口 chunk 中，避免运行时版本冲突 |

### 6.2 远程容器加载失败无降级

| 项目 | 内容 |
|------|------|
| **场景** | Remote 应用的 `remoteEntry.js` 因 CDN 故障、部署回滚、或网络问题加载失败 |
| **表现** | 页面白屏或 JS 报错，整个应用不可用——即使 host 应用本身功能完全正常 |
| **风险** | Module Federation 在运行时动态加载远程容器，如果 `remoteEntry.js` 加载失败，`__webpack_init_sharing__` 会抛出未捕获的 Promise rejection；默认没有任何降级逻辑，一个 remote 的故障会影响整个 host 应用 |
| **应对** | ① 使用 `import()` 包裹远程模块加载，增加 `.catch()` 降级逻辑（显示静态占位、错误提示、或跳过该模块）；② 配置多个 `remoteEntry.js` 的 URL（主 CDN + 备用 CDN），通过 `get` 函数动态切换；③ 使用 `ErrorBoundary` 组件捕获远程模块的渲染错误；④ 监控远程容器的加载成功率，低于阈值时自动切换到降级方案 |

### 6.3 SSR 场景不适用

| 项目 | 内容 |
|------|------|
| **场景** | 在 Next.js/Nuxt 等 SSR 框架中使用 Module Federation |
| **表现** | 服务端渲染时 `__webpack_init_sharing__` 不存在、`remoteEntry.js` 的 JSONP 加载机制在 Node.js 环境下无法工作、hydration 时出现不一致 |
| **风险** | Module Federation 的核心设计假设运行在浏览器环境中：① `remoteEntry.js` 通过 `<script>` 标签加载，依赖全局变量注册容器；② 共享模块的版本协商依赖运行时的 `__webpack_share_scopes__`，SSR 环境下没有浏览器的模块加载机制；③ 服务端渲染的 HTML 与客户端 hydration 的模块状态不一致，导致 React hydration mismatch |
| **应对** | ① SSR 场景下使用 `@module-federation/node` 插件，提供 Node.js 环境的容器加载机制；② 对远程模块在 SSR 时使用动态 `import()` + `Suspense` fallback，避免服务端尝试加载远程容器；③ 将 Module Federation 限制在客户端路由的子页面，主入口和 SSR 关键路径不依赖远程模块；④ 考虑使用 build-time federation（如 `@softarc/native-federation`）替代 runtime federation |

---

## 7 综合防御策略

1. **构建产物验证**：每次构建后自动运行 `webpack-bundle-analyzer`，将 chunk 体积与基线对比，超过阈值（如 +10%）则 CI 失败
2. **Tree Shaking 确认**：定期用 `npx source-map-explorer dist/*.js` 检查预期被删除的代码是否真的不在产物中
3. **缓存命中监控**：在构建日志中输出 `stats.cacheHit`，缓存命中率低于 80% 时告警
4. **依赖审计**：使用 `depcheck` 检测未使用的依赖，`bundlephobia` 评估新增依赖的体积影响
5. **多环境一致性**：确保 CI/CD 的 Node.js 版本、操作系统、构建配置与本地开发一致，避免"本地能跑 CI 挂"的问题
6. **渐进式优化**：不要一次性做所有优化——先建立体积基线，再逐项优化，每项优化后验证效果和副作用

---

*最后更新：2026-05-05*
