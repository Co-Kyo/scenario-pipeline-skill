# P6-构建产物 — 方案对比

## 一、Code Splitting 分割粒度

### 问题

如何确定代码分割的粒度？太粗导致首屏 bundle 过大，太细导致 chunk 数量爆炸。

### 方案对比

| 维度 | 粗粒度（少量大 chunk） | 中等粒度（路由级） | 细粒度（组件级） |
|------|----------------------|-------------------|-----------------|
| Chunk 数量 | 2-5 个 | 5-15 个 | 20-100+ 个 |
| 首屏体积 | 大（>300KB） | 中（100-200KB） | 小（<100KB） |
| HTTP 请求数 | 少 | 适中 | 多 |
| 缓存命中率 | 低（一处改动全量失效） | 高（路由隔离） | 最高（组件隔离） |
| 首屏 TTI | 差（解析时间长） | 良好 | 好（但请求数抵消） |
| 实现复杂度 | 低 | 中 | 高 |

### 推荐：路由级中等粒度

```
entry.[hash].js          ← 核心框架 + 路由配置（initial）
vendor.[hash].js         ← 第三方公共依赖（initial）
page-home.[hash].js      ← 首页（initial）
page-about.[hash].js     ← 关于页（prefetch）
page-dashboard.[hash].js ← 仪表盘（prefetch）
```

**理由**：
- 路由是用户交互的天然边界，缓存隔离效果好
- 首屏只加载当前路由的 chunk，体积可控
- 实现成本适中，`React.lazy` / `defineAsyncComponent` 直接支持

**何时需要更细粒度**：
- 大型富文本编辑器、图表库等重型组件，需要独立 chunk
- 功能模块被多个路由共享但使用频率低

---

## 二、首屏 vs 按需加载

### 问题

哪些代码放在 initial bundle（首屏加载），哪些用动态 import 按需加载？

### 决策矩阵

| 代码类型 | 策略 | 理由 |
|----------|------|------|
| 框架核心（React/Vue Runtime） | initial | 所有页面都依赖 |
| 路由配置 | initial | 首屏需要确定加载哪个页面 |
| 首屏页面组件 | initial | 用户首先看到的内容 |
| UI 组件库（按需引入） | initial（按需） | 只打包使用的组件 |
| 非首屏路由页面 | dynamic import | 用户不一定访问 |
| 重型功能（编辑器/图表） | dynamic import | 体积大，按需加载 |
| Polyfill | initial（条件） | 目标浏览器需要 |
| 数据可视化库 | dynamic import | 通常非首屏必需 |

### 实践模式

```js
// 路由配置中声明加载策略
const routes = [
  {
    path: '/',
    component: () => import('./pages/Home'),  // 首页也可按需，取决于体积
  },
  {
    path: '/dashboard',
    // 预加载：用户 hover 导航时开始加载
    component: () => import(/* webpackPrefetch: true */ './pages/Dashboard'),
  },
  {
    path: '/admin',
    // 懒加载：仅访问时加载
    component: () => import('./pages/Admin'),
  },
];
```

---

## 三、Tree Shaking vs 兼容性

### 问题

选择 ESM 优先的库以获得最佳 Tree Shaking，还是选择 CJS 版本以保证兼容性？

### 方案对比

| 维度 | ESM 优先 | CJS 优先 | 混合策略 |
|------|----------|----------|----------|
| Tree Shaking | ✅ 最佳 | ❌ 基本无效 | ⚠️ 部分有效 |
| Node.js 兼容 | 需要 ESM 支持 | 全版本兼容 | 需要条件配置 |
| 浏览器兼容 | 原生支持 | 需要打包器 | 需要打包器 |
| 包体积 | 小（消除死代码） | 大（全量打包） | 中 |
| 生态成熟度 | 快速增长 | 最成熟 | - |

### 推荐：ESM 为主，CJS 兜底

```json
// package.json — 库作者推荐
{
  "main": "./dist/index.cjs.js",     // CJS 入口（兜底）
  "module": "./dist/index.esm.js",    // ESM 入口（构建工具优先）
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.cjs.js"
    }
  }
}
```

**实际操作**：
1. 选择有 ESM 版本的库（lodash-es、date-fns、rxjs）
2. 通过 `resolve.alias` 强制映射到 ESM 版本
3. 必须使用 CJS 库时，在 Webpack 中用 `module.noParse` 跳过解析

---

## 四、sideEffects 声明策略

### 问题

如何正确声明 `sideEffects` 以最大化 Tree Shaking 效果？

### 方案对比

| 策略 | 配置 | 效果 | 风险 |
|------|------|------|------|
| 激进 false | `"sideEffects": false` | 最大化消除 | 副作用代码被误删 |
| 逐文件声明 | `"sideEffects": ["./polyfill.js"]` | 精确控制 | 维护成本高 |
| 保守不声明 | 不设置 | 安全 | 无法 Tree Shaking |

### 推荐策略

```
项目代码 → "sideEffects": false（开发者控制代码无副作用）
第三方库 → 逐文件声明（只标记确认有副作用的文件）
CSS/SCSS → 必须声明 "*.css"（CSS 导入是副作用）
Polyfill → 必须声明（全局赋值是副作用）
```

```json
// 项目 package.json
{
  "sideEffects": false
}

// 或更精确
{
  "sideEffects": [
    "*.css",
    "*.scss",
    "./src/polyfills.js",
    "./src/global-styles.js"
  ]
}
```

---

## 五、Runtime Chunk 策略

### 问题

Webpack 的 runtime 代码应该独立为单独 chunk，还是内联到 entry？

### 方案对比

| 维度 | 独立 runtimeChunk | 内联到 entry |
|------|-------------------|-------------|
| 缓存稳定性 | ✅ 高（entry hash 不受 runtime 影响） | ❌ 低（runtime 变化影响 entry hash） |
| HTTP 请求数 | +1 个请求 | 不增加 |
| 适用场景 | 多入口、长期缓存 | 单入口、简单项目 |
| CDN 缓存效率 | 高（chunk 隔离） | 低（一处变化全量失效） |

### 推荐

```js
// 多入口项目 → 必须独立
optimization: {
  runtimeChunk: 'single',  // 所有入口共享一个 runtime
}

// 单入口项目 → 可以内联（减少一个请求）
optimization: {
  runtimeChunk: false,  // 默认值
}

// 微前端场景 → 每个子应用独立 runtime
optimization: {
  runtimeChunk: 'multiple',  // 每个入口独立 runtime
}
```

---

## 六、缓存策略：contenthash vs 版本号

### 问题

如何选择构建产物的缓存失效策略？

### 方案对比

| 维度 | contenthash | 版本号 |
|------|-------------|--------|
| 缓存精确度 | 精确（内容变化才失效） | 粗糙（发版全量失效） |
| CDN 命中率 | 高 | 低 |
| 部署复杂度 | 需要配合 HTML 更新 | 简单 |
| 回滚难度 | 高（旧 hash 需保留） | 低 |
| 实现方式 | `[name].[contenthash:8].js` | `[name].v${version}.js` |

### 推荐：contenthash + 长期缓存

```js
output: {
  // JS：contenthash
  filename: '[name].[contenthash:8].js',
  chunkFilename: '[name].[contenthash:8].js',
},

// CSS
new MiniCssExtractPlugin({
  filename: '[name].[contenthash:8].css',
}),

// 关键：runtime 独立，确保 contenthash 稳定
optimization: {
  runtimeChunk: 'single',
  moduleIds: 'deterministic',
  chunkIds: 'deterministic',
}
```

**部署配合**：
- HTML 文件不缓存（`Cache-Control: no-cache`）
- 静态资源长期缓存（`Cache-Control: max-age=31536000, immutable`）
- 部署时先传新资源，再更新 HTML

---

## 七、Webpack vs Vite 选型

### 维度对比

| 维度 | Webpack | Vite |
|------|---------|------|
| 开发启动速度 | 慢（全量打包） | 快（原生 ESM，毫秒级） |
| HMR 速度 | 中等 | 快（精确模块级更新） |
| 生产构建 | 成熟稳定 | 基于 Rollup，同样稳定 |
| 生态插件 | 最丰富 | 快速增长 |
| 配置复杂度 | 高 | 低（合理默认值） |
| 适用规模 | 大型项目、微前端 | 中小型项目、新项目 |
| Tree Shaking | 依赖 terser | Rollup 原生更激进 |

### 推荐

```
新项目 / 中小型项目 → Vite
大型存量项目 → Webpack（迁移成本高）
微前端 / Module Federation → Webpack
库开发 → Rollup（或 Vite library mode）
```
