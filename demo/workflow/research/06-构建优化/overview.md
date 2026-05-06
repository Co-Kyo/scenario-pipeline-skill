# P6-构建产物：Code Splitting / Tree Shaking 工程化配置

## 链路总览

```
ES Module 静态分析
        │
        ▼
  Tree Shaking（死代码消除）
        │
        ▼
  Code Splitting（代码分割）
        │
        ▼
  动态 import()（按需加载）
        │
        ▼
  资源加载策略（优先级调度）
```

构建产物优化不是单一技术，而是一条从**编译期静态分析**到**运行时资源调度**的完整链路。每一环的输出是下一环的输入，任何一环失效都会导致最终产物膨胀。

---

## 一、ES Module 静态分析 — 一切的前提

ES Module 的 `import`/`export` 语法是**静态可分析**的：import 语句必须出现在模块顶层，不能嵌套在条件分支中，导出标识符在编译期即可确定。

```js
// ✅ 静态 import — 构建工具可完整分析依赖图
import { add } from './math.js';

// ❌ 动态 require — 构建工具无法静态分析依赖
const mod = require(condition ? './a' : './b');
```

**为什么这很重要？**
- 构建工具（Webpack/Rollup/esbuild）在编译期构建完整的模块依赖图
- 静态分析是 Tree Shaking 的前提——只有知道哪些导出被使用，才能安全消除未使用的代码
- Vite 的开发模式利用浏览器原生 ESM 实现毫秒级 HMR，因为模块边界天然清晰

**CommonJS 的困境**：CJS 的 `require()` 是运行时动态的，构建工具必须保守地保留所有代码。这也是为什么 ESM 优先的库（如 lodash-es）Tree Shaking 效果远好于 CJS 版本（lodash）。

---

## 二、Tree Shaking — 死代码消除

Tree Shaking 是 Rollup 首创、Webpack 跟进的术语，本质是**编译期死代码消除（DCE）**。

### 工作机制

```
源码 → 依赖图分析 → 标记 usedExports → 未使用的 export → 标记为 dead code → 压缩阶段移除
```

Webpack 的 Tree Shaking 分两层：
1. **usedExports**：标记每个模块中哪些导出被实际使用，未标记的在 terser 压缩时移除
2. **sideEffects**：`package.json` 中声明 `"sideEffects": false`，允许跳过整个无副作用模块子树的分析

### 关键约束

| 条件 | 说明 |
|------|------|
| 必须是 ESM | `import`/`export` 语法，CJS 的 `require()` 无法 Tree Shaking |
| 生产模式 | Webpack 需要 `mode: 'production'`，开发模式默认不做 |
| 压缩器配合 | usedExports 标记后需要 terser/esbuild 实际删除代码 |
| 无副作用 | 模块顶层不能有副作用代码（如 `console.log`、polyfill 赋值） |

### sideEffects 声明策略

```json
// package.json — 激进声明（项目代码推荐）
{ "sideEffects": false }

// 逐文件声明（第三方库需要验证）
{ "sideEffects": ["./src/polyfill.js", "*.css"] }
```

> ⚠️ 错误的 `sideEffects: false` 声明会导致副作用代码被意外消除，引发运行时 bug。

---

## 三、Code Splitting — 代码分割策略

Code Splitting 将单一 bundle 拆分为多个 chunk，实现按需加载。三种核心策略：

### 策略一：Entry Points（手动分割）

```js
// webpack.config.js
module.exports = {
  entry: {
    main: './src/index.js',
    admin: './src/admin.js',
  },
};
```

简单直接，但容易产生重复依赖——main 和 admin 共用的 lodash 会被打包两次。

### 策略二：SplitChunksPlugin（自动提取）

```js
// webpack.config.js
optimization: {
  splitChunks: {
    chunks: 'all',
    minSize: 20000,      // 最小 20KB 才拆分
    maxSize: 244000,     // 超过 244KB 尝试进一步拆分
    cacheGroups: {
      vendors: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
        priority: 10,
      },
      common: {
        minChunks: 2,    // 至少被 2 个 chunk 引用
        name: 'common',
        chunks: 'all',
        priority: 5,
      },
    },
  },
}
```

自动提取公共依赖，避免重复打包。`minSize`/`maxSize` 控制分割粒度。

### 策略三：Dynamic Import（按需加载）

```js
// 路由级 Code Splitting
const Home = () => import(/* webpackChunkName: "home" */ './pages/Home');
const About = () => import(/* webpackChunkName: "about" */ './pages/About');

// 功能级 Code Splitting
async function loadChart() {
  const { Chart } = await import(/* webpackChunkName: "chart" */ './Chart');
  return Chart;
}
```

构建工具将 `import()` 识别为 split point，自动生成独立 chunk。运行时按需加载，首屏不加载的代码不会出现在 initial bundle 中。

---

## 四、动态 import() — 运行时按需加载

`import()` 返回 Promise，是 ES Module 规范中的动态加载机制：

```js
// 基础用法
const module = await import('./heavy-module.js');

// 带错误处理
try {
  const { default: HeavyComponent } = await import('./HeavyComponent.vue');
  // 使用组件
} catch (err) {
  console.error('Chunk 加载失败:', err);
  // 降级方案：显示错误提示或加载缓存版本
}
```

### 配合预加载提升体验

```js
// 用户 hover 时预加载，点击时已缓存
link.addEventListener('mouseenter', () => {
  import('./pages/Dashboard');
});
```

### Vite 中的 Glob Import

```js
// Vite 特有：批量动态导入
const modules = import.meta.glob('./pages/*.vue');
// 等价于多个 import()，每个文件生成独立 chunk
```

---

## 五、资源加载策略 — 优先级调度

构建产物生成后，需要通过资源加载策略控制浏览器的请求优先级。

### Resource Hints 优先级矩阵

| 机制 | 优先级 | 用途 | 数量建议 |
|------|--------|------|----------|
| `<link rel="preload">` | 高 | 当前导航关键资源 | ≤ 5 个 |
| `<link rel="prefetch">` | 低 | 未来导航资源 | 不限但需控制 |
| `<link rel="preconnect">` | 中 | 提前握手第三方域名 | ≤ 6 个 |
| `fetchpriority="high"` | 高 | LCP 关键资源提权 | 仅 LCP 元素 |
| `loading="lazy"` | 低 | 非首屏图片延迟 | 非首屏资源 |

### Code Splitting + 资源加载联动

```html
<!-- 首屏 chunk：preload 高优先级加载 -->
<link rel="preload" href="/assets/main.[hash].js" as="script">

<!-- 路由 chunk：prefetch 低优先级预获取 -->
<link rel="prefetch" href="/assets/about.[hash].js" as="script">

<!-- 第三方域名：preconnect 提前握手 -->
<link rel="preconnect" href="https://cdn.example.com" crossorigin>
```

### 动态 import 的加载降级

```js
// 网络不稳定时的 chunk 加载重试
async function loadWithRetry(importFn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await importFn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

const HeavyModule = await loadWithRetry(() => import('./HeavyModule'));
```

---

## 六、构建工具差异

### Webpack

- Tree Shaking 依赖 `mode: 'production'` + terser 配合
- SplitChunksPlugin 功能强大，配置项多
- 支持 Module Federation 微前端方案
- 启动慢（全量打包），HMR 有延迟

### Vite

- 开发模式：浏览器原生 ESM + esbuild 预构建，启动毫秒级
- 生产模式：基于 Rollup 打包，Tree Shaking 更激进
- `import.meta.glob` 批量动态导入
- 配置更简洁，但高级分割需手动配置 Rollup

### Rollup

- Tree Shaking 最激进（首创此概念）
- 输出 ESM 为主，适合库打包
- 不支持代码分割到同级 chunk（需手动配置）

---

## 关键指标

| 指标 | 目标值 | 检测方式 |
|------|--------|----------|
| Initial JS 体积 | ≤ 200KB (gzip) | webpack-bundle-analyzer |
| Tree Shaking 消除率 | ≥ 30% 未使用代码 | source-map-explorer |
| Chunk 数量 | 5-15 个（中等规模项目） | 构建产物统计 |
| 首屏 JS 加载时间 | ≤ 1s (4G 网络) | Lighthouse |
| Chunk 加载失败率 | ≤ 0.1% | PerformanceObserver |
