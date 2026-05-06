# 构建产物优化：Edge Cases 与深坑排查

> **命题**：Webpack/Vite 打包体积过大——首屏 JS 超过 500KB
> **覆盖能力**：HTTP 缓存策略（A6）、Code Splitting 与 Tree Shaking（A7）

---

## 一、开篇：构建优化里的那些「反直觉坑」

构建产物优化最容易踩的坑，不是不会做，而是**做了反而更糟**。

很多团队在面对首屏 JS 超标的警报时，第一反应是「加 Code Splitting」「开 Tree Shaking」「配缓存策略」——这些手段本身没问题，但如果忽略了底层的边界条件和隐式假设，优化手段本身就会变成新的瓶颈：

- **开了 Tree Shaking，产物反而更大**——因为入口模块是 CommonJS，打包器根本无法做静态分析，Tree Shaking 名存实亡。
- **配了缓存策略，上线后全量回源**——一个无关紧要的模块改了一行注释，content hash 变了，vendor chunk 的缓存全部失效。
- **加了 Code Splitting，首屏更慢了**——chunk 拆得太细，一个页面要并行请求 30+ 个小文件，HTTP 开销反而盖过了拆分收益。

这些不是理论推演，而是真实项目中反复出现的「优化悖论」。本文聚焦 4 个高频 edge case，从触发条件、排查原理到防御方案，逐一拆解。

---

## 二、Edge Case 详解

### Edge Case 1：Tree Shaking 失效——CommonJS 污染与 sideEffects 误配

#### 触发条件

| 因素 | 说明 |
|------|------|
| 入口或依赖使用 CommonJS | `require()` / `module.exports` 的模块无法被 Webpack/Vite 的静态分析标记为可摇树 |
| `package.json` 未声明 `sideEffects` | 打包器保守假设每个模块都有副作用，不敢删除任何未引用导出 |
| `sideEffects` 声明了但不准确 | 声明 `false` 但模块实际有全局副作用（polyfill、注册全局变量），摇树后运行时崩溃 |

#### 排查原理

**为什么 CommonJS 会杀死 Tree Shaking？**

ES Modules 的 `import`/`export` 是**声明式的静态结构**，打包器在编译阶段就能知道一个模块导出了什么、哪些导出被引用了。而 CommonJS 的 `require()` 是**运行时表达式**，模块可以动态拼接路径、条件导入、甚至在运行时修改 `module.exports`，打包器无法在编译阶段确定哪些导出是「死代码」。

Webpack 5 虽然引入了对部分 CommonJS 模式的静态分析（`exports.xxx =` 模式），但覆盖率远不及 ESM。实际项目中，一个 CommonJS 依赖如果位于依赖链的关键路径上，整条链的 Tree Shaking 都会退化。

**`sideEffects` 的误判机制**

Webpack 的 Tree Shaking 分两步：
1. **标记阶段**（`usedExports`）：标记每个模块中哪些导出被引用了
2. **删除阶段**（`sideEffects` 配置决定）：对未引用的导出，如果模块被声明为无副作用，才真正删除

如果 `sideEffects` 未配置，Webpack 会保守保留所有模块代码。如果配置为 `false` 但模块实际有副作用（比如在模块顶层执行 `window.__INIT__ = true`），摇树后运行时会缺少关键初始化逻辑。

#### 排查步骤

```bash
# 1. 检查产物中是否有 CommonJS 包未被转换
npx webpack-bundle-analyzer stats.json
# 观察 vendor chunk 中哪些大体积模块是 CJS 格式

# 2. 用 Webpack 的 --stats-error-details 看 Tree Shaking 警告
npx webpack --mode production --stats-error-details 2>&1 | grep -i "side effect\|commonjs\|harmony"

# 3. 针对特定模块检查格式
node -e "const m = require.resolve('lodash'); console.log(m)"
# 如果路径指向 .js 而非 .mjs，大概率是 CJS

# 4. 用 source-map-explorer 验证实际摇树效果
npx source-map-explorer dist/assets/index-*.js
```

#### 防御方案

1. **强制 ESM 入口**：在构建配置中为关键依赖指定 `resolve.mainFields: ['module', 'main']`，优先使用 ESM 版本
2. **准确声明 sideEffects**：在自己项目的 `package.json` 中按实际配置，不要无脑设 `false`；对第三方库用 Webpack 的 `module.rules` 配置 `sideEffects` 覆盖
3. **CJS → ESM 替换策略**：对不支持 ESM 的老库，评估是否有 ESM 替代品（如 `lodash` → `lodash-es`）；如果无替代，用 `babel-plugin-transform-commonjs` 做编译时转换
4. **CI 卡口**：在 CI 中加入产物体积对比步骤，如果 Tree Shaking 失效导致体积异常增长，直接阻断合并

---

### Edge Case 2：vendor chunk 膨胀——大库污染与分包策略失衡

#### 触发条件

| 因素 | 说明 |
|------|------|
| 将所有 `node_modules` 打入单一 vendor chunk | 一个大依赖（如 `antd` 全量引入、`moment` + locales）直接撑爆 vendor |
| 动态导入未正确分包 | 路由级懒加载的页面组件，其依赖的大型库仍留在 vendor 而非异步 chunk 中 |
| 依赖版本升级引入意外体积 | 如升级 `echarts` 大版本，默认注册了所有图表类型 |

#### 排查原理

**vendor 膨胀的根因：分包粒度与依赖拓扑不匹配**

Webpack/Vite 默认的 `splitChunks` 配置通常会把 `node_modules` 中被多个 chunk 共享的模块提取到 `vendor`（或 `chunk-vendors`）。问题是：

- 如果某个大库（如 `antd` 的全量样式 + 组件）只被一个页面使用，但被错误地提取到了 vendor 中，会导致所有页面都下载这个大库的代码
- 反过来，如果分包策略过于激进，将每个库拆成独立 chunk，会导致 HTTP 请求数暴涨（见 Edge Case 3）

**moment.js 的经典案例**

`moment` 在 `require('moment')` 时会自动引入所有 locale 文件（约 300KB minified）。即使 Tree Shaking 开启，由于 `moment` 是 CommonJS 且有副作用声明，locale 文件无法被摇掉。这个问题在 `dayjs` 推出后才被广泛意识到。

#### 排查步骤

```bash
# 1. 可视化分析各 chunk 组成
npx webpack-bundle-analyzer stats.json
# 重点关注 vendor chunk 的内部模块构成

# 2. 检查特定大库的实际引入路径
npx depcheck --json | jq '.dependencies'
# 找出未使用但被打包的依赖

# 3. 分析 chunk 间的依赖关系
npx webpack --mode production --stats-reasons --stats-modules-space 999
# 查看哪些模块被提取到了 vendor，以及为什么

# 4. 对比升级前后的体积差异
git stash && npm run build && du -sh dist/assets/*.js
git stash pop && npm run build && du -sh dist/assets/*.js
```

#### 防御方案

1. **按页面/功能分包**：用 `splitChunks.cacheGroups` 将路由级页面的依赖独立打包，避免大库被错误提取到全局 vendor
   ```js
   // webpack.config.js
   splitChunks: {
     cacheGroups: {
       vendor: {
         test: /[\\/]node_modules[\\/]/,
         name: 'vendor',
         chunks: 'initial',
         // 限制：只提取被 2+ 个入口点共享的模块
         minChunks: 2,
       },
       // 页面级分包
       pages: {
         test: /[\\/]src[\\/]pages[\\/]/,
         name(module) {
           const match = module.resource.match(/pages\/(\w+)/);
           return match ? `page-${match[1]}` : 'page-unknown';
         },
         chunks: 'async',
       },
     },
   }
   ```
2. **替代大体积依赖**：`moment` → `dayjs`，`lodash` → `lodash-es` 或按需引入，`antd` → 按需加载（`babel-plugin-import` 或 Tree Shaking）
3. **体积预算机制**：在 CI 中设置单 chunk 体积上限（如 250KB gzip），超限即阻断

---

### Edge Case 3：chunk 粒度太细——过度分割导致 HTTP 请求风暴

#### 触发条件

| 因素 | 说明 |
|------|------|
| 过度使用动态 `import()` | 每个组件、每个工具函数都做懒加载，产生大量微小 chunk |
| `splitChunks.minSize` 配置过低 | 将很小的共享模块也拆成独立 chunk |
| 多个异步 chunk 共享同一个页面 | 一个页面渲染需要串行加载 5-8 个 chunk，瀑布式请求 |

#### 排查原理

**HTTP 请求数的隐性成本**

每个 HTTP 请求（即使是 HTTP/2 多路复用）都有固定开销：
- TCP/TLS 握手（首次连接）
- 服务端处理延迟
- 浏览器解析响应头
- 优先级调度竞争

当一个页面需要加载 30+ 个 JS chunk 时，即使总大小不变，实际加载时间也会显著增加。浏览器对同一域名的并发连接数有限制（HTTP/1.1 约 6 个，HTTP/2 虽然多路复用但仍有优先级队列），小 chunk 会互相抢占带宽，导致关键 chunk 的加载被延迟。

**粒度与收益的拐点**

chunk 拆分的收益来自「缓存命中率提升」——公共依赖独立后，只改一个页面不会导致其他页面的缓存失效。但当 chunk 数量超过一定阈值后，HTTP 开销的增长速度会超过缓存收益。经验上，首屏所需 chunk 数量控制在 **5-8 个**以内是相对合理的平衡点。

#### 排查步骤

```bash
# 1. 统计产物中的 chunk 数量
ls dist/assets/*.js | wc -l

# 2. 找出体积 < 5KB 的 chunk（过度分割的信号）
find dist/assets -name "*.js" -size -5k | xargs ls -lh

# 3. 分析首屏加载的 chunk 依赖链
npx webpack --mode production --stats-chunks
# 或用 vite-plugin-chunk-split 的分析模式

# 4. 用 Chrome DevTools 的 Network 面板
# 观察首屏加载时的实际请求数量和瀑布图
```

#### 防御方案

1. **设置 `minSize` 下限**：`splitChunks.minSize: 20000`（20KB），低于此阈值的共享模块不单独拆分
2. **设置 `maxAsyncRequests` 上限**：`splitChunks.maxAsyncRequests: 6`，限制异步 chunk 的最大数量
3. **合并策略**：对同一页面的多个微小 chunk 使用 `webpack-merge-and-include-globally` 或 Vite 的 `manualChunks` 合并
4. **按路由分组**：将同一路由下的组件打包到同一个 chunk，而非每个组件独立拆分
   ```js
   // vite.config.js
   manualChunks(id) {
     if (id.includes('node_modules')) return 'vendor';
     // 同一页面目录下的模块合并
     const pageMatch = id.match(/src\/pages\/(\w+)/);
     if (pageMatch) return `page-${pageMatch[1]}`;
   }
   ```

---

### Edge Case 4：缓存失效全量回源——content hash 的级联崩溃

#### 触发条件

| 因素 | 说明 |
|------|------|
| 只修改了业务代码，vendor hash 也变了 | 分包策略不当，业务代码与 vendor 共享同一 chunk |
| 改了某个模块的注释或格式 | Webpack 的 hash 计算包含了模块路径、大小等元信息，微小改动导致 hash 变化 |
| 使用了 `fullhash` 而非 `chunkhash` | 任何文件改动都会导致所有 chunk 的 hash 变化 |
| webpack 运行时代码的 hash 不稳定 | 模块 ID 是数字且顺序不固定，增删模块会导致其他 chunk 的 hash 变化 |

#### 排查原理

**content hash 的级联效应**

Webpack 的产物 hash 计算链如下：

```
模块内容变化 → 模块 hash 变化 → 所在 chunk hash 变化 → 如果该 chunk 被其他 chunk 引用 → 引用方的 hash 也变化
```

在默认配置下，Webpack 使用自增数字作为模块 ID。当新增或删除一个模块时，后续所有模块的 ID 都会偏移，导致每个 chunk 的内容都发生变化，即使模块本身的代码一行没改。这就是「级联崩溃」的根源。

**`runtimeChunk` 的隐藏影响**

Webpack 的运行时代码（`__webpack_require__`、模块加载器等）默认打包在入口 chunk 中。运行时代码包含了模块 ID 到 chunk 文件的映射表，任何 chunk 拆分变化都会导致运行时代码变化，进而导致入口 chunk 的 hash 变化——即使业务代码完全没改。

#### 排查步骤

```bash
# 1. 对比两次构建的产物 hash
diff <(ls dist/assets/*.js | sort) <(ls dist-old/assets/*.js | sort)
# 如果所有文件的 hash 都变了，说明是 fullhash 或模块 ID 问题

# 2. 检查是否使用了稳定的模块 ID
grep -r "moduleIds\|chunkIds" webpack.config.js
# 应该配置为 'deterministic' 或 'natural'

# 3. 检查 runtimeChunk 配置
grep "runtimeChunk" webpack.config.js
# 应该配置为 { name: 'runtime' } 独立提取

# 4. 用 diff 工具对比两次构建的实际内容
npx webpack-bundle-analyzer stats-old.json stats-new.json --mode diff
```

#### 防御方案

1. **使用 deterministic 模块 ID**：
   ```js
   // webpack.config.js
   optimization: {
     moduleIds: 'deterministic',  // Webpack 5 推荐
     chunkIds: 'deterministic',
   }
   ```
2. **独立提取 runtime**：
   ```js
   optimization: {
     runtimeChunk: { name: 'runtime' },
   }
   ```
3. **使用 chunkhash 而非 fullhash**：
   ```js
   output: {
     filename: '[name].[chunkhash:8].js',
     // 而非 [name].[fullhash:8].js
   }
   ```
4. **稳定的分包策略**：将 `splitChunks` 的 `name` 配置为确定性值（基于内容而非路径），避免路径变化导致 chunk 名称变化
5. **缓存验证机制**：在部署流水线中对比新旧构建产物的 hash，如果业务代码未改动但 vendor hash 变了，触发告警

---

## 三、系统性防御方案

### 3.1 构建配置基线

以下配置覆盖了上述 4 个 edge case 的防御要点：

```js
// webpack.config.js (生产环境基线)
module.exports = {
  mode: 'production',
  output: {
    // 稳定的 chunk 命名
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].js',
  },
  optimization: {
    // 稳定的模块 ID，避免级联 hash 崩溃
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
    // 独立 runtime，隔离 hash 变化
    runtimeChunk: { name: 'runtime' },
    // 开启 Tree Shaking
    usedExports: true,
    sideEffects: true,
    splitChunks: {
      chunks: 'all',
      // 防止过度分割
      minSize: 20000,
      maxSize: 250000,
      maxAsyncRequests: 6,
      maxInitialRequests: 4,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'initial',
          // 只提取被多入口共享的模块
          minChunks: 2,
          priority: 10,
        },
      },
    },
  },
  resolve: {
    // 优先使用 ESM 入口
    mainFields: ['module', 'main'],
  },
};
```

### 3.2 体积监控流水线

```
┌─────────────────────────────────────────────────────────┐
│                    CI/CD 流水线                          │
├──────────┬──────────┬──────────┬────────────────────────┤
│  构建    │  体积    │  对比    │  决策                  │
│  npm run │  统计    │  与基线  │                        │
│  build   │  gzip   │  比较    │  超限 → 阻断 + 告警    │
│          │  size   │          │  正常 → 通过            │
└──────────┴──────────┴──────────┴────────────────────────┘

基线指标（建议值）：
- 首屏 JS (gzip)：≤ 200KB
- 首屏 JS (raw)：≤ 500KB
- 单 chunk (gzip)：≤ 100KB
- vendor chunk (gzip)：≤ 150KB
- 异步 chunk 数量（首屏）：≤ 8
```

### 3.3 日常排查 Checklist

| 检查项 | 工具/命令 | 告警阈值 |
|--------|-----------|----------|
| 首屏 JS 体积 | `npm run build && du -sh dist/assets/*.js` | > 500KB raw |
| Tree Shaking 有效性 | `source-map-explorer` | 未引用导出 > 10% |
| vendor chunk 构成 | `webpack-bundle-analyzer` | 单库占比 > 30% |
| chunk 数量 | `ls dist/assets/*.js \| wc -l` | > 20 |
| hash 稳定性 | 两次构建 diff | 未改动模块 hash 变化 |
| CommonJS 污染 | `--stats-error-details` | 存在 CJS 警告 |

### 3.4 长期演进建议

1. **迁移 Vite**：如果项目仍使用 Webpack，评估迁移 Vite 的可行性。Vite 在开发模式下使用原生 ESM，生产构建基于 Rollup，天然对 Tree Shaking 更友好
2. **依赖审计自动化**：定期运行 `npx bundlephobia` 或 `npx packagephobia` 检查依赖体积，引入新依赖时必须过体积审批
3. **渐进式拆分**：对大型 monorepo 项目，逐步将构建从单体拆分为微前端/模块联邦，每个子应用独立构建，从根本上控制单次加载体积
4. **SSR/SSG 转移**：将首屏关键内容通过服务端渲染或静态生成提前输出，减少客户端 JS 的首屏依赖

---

## 四、总结

构建产物优化的核心矛盾是**三个维度的平衡**：

```
缓存命中率（拆得越细，缓存越精准）
        ↕
HTTP 开销（拆得越细，请求越多）
        ↕
Tree Shaking 效率（依赖拓扑决定摇树上限）
```

没有银弹配置，只有针对具体项目特征的「最不坏」选择。关键在于：

1. **建立量化基线**——没有数据就没有优化方向
2. **自动化检测**——人工检查不可持续，把体积卡口嵌入 CI
3. **理解底层机制**——知道「为什么」比知道「怎么配」更重要，因为配置会过时，原理不会
