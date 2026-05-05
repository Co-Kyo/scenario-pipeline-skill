# A10 - Code Splitting

## 核心机制

Code Splitting 是 Webpack 的核心特性，允许将代码拆分为多个 bundle，按需或并行加载，从而减少首屏 JS 体积。

### 三种拆分方式

**1. Entry Points（入口拆分）**：
```js
entry: {
  index: './src/index.js',
  another: './src/another-module.js',
}
```
手动配置多个入口，但存在模块重复打包问题。

**2. SplitChunksPlugin（公共依赖提取）**：
```js
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
      },
    },
  },
}
```
自动将公共依赖提取为独立 chunk，Webpack 5 内置。

**3. Dynamic Import（动态导入）**：
```js
// 返回 Promise，Webpack 自动创建独立 chunk
const module = await import('./heavy-module.js');

// 路由级 Code Splitting
const AdminPage = React.lazy(() => import('./pages/Admin'));

// Magic Comments 控制 chunk 名称
import(/* webpackChunkName: "charts" */ './Chart');
```

### Chunk 类型

- **Entry Chunk**：入口模块及其同步依赖
- **Async Chunk**：通过 `import()` 懒加载的模块
- **Vendor Chunk**：第三方库（通过 SplitChunksPlugin 提取）
- **Runtime Chunk**：Webpack 运行时代码（通过 `runtimeChunk: 'single'` 分离）

## 工程瓶颈

1. **过度拆分导致 HTTP 请求过多**：每个 chunk 是一个独立请求，过多小 chunk 反而增加网络开销，需要平衡 chunk 数量和大小
2. **chunk 间的依赖关系复杂**：共享模块的版本不一致可能导致重复打包，需要合理配置 `splitChunks.cacheGroups`
3. **动态导入的加载状态管理**：React.lazy 需要配合 Suspense 处理加载中状态，增加了 UI 复杂度
4. **首屏 vs 非首屏的边界判断**：哪些模块应该首屏加载、哪些可以懒加载，需要结合业务场景分析
5. **预加载/预取的时机控制**：`webpackPrefetch` 和 `webpackPreload` 的使用场景不同，误用会导致带宽浪费

## 调试工具

- **webpack-bundle-analyzer**：可视化 chunk 组成，识别重复模块
- **Webpack Stats**：`npx webpack --stats` 查看 chunk 大小和依赖
- **Chrome DevTools Network**：观察 chunk 加载时序和大小
- **`import()` 魔法注释**：`webpackChunkName`、`webpackPrefetch`、`webpackPreload`
- **Webpack Dashboard**：实时监控构建产物

## 典型权衡

1. **chunk 粒度**：过细增加请求数，过粗增加单次传输量；一般建议首屏 chunk < 100KB gzip
2. **SplitChunks vs 手动 Entry**：SplitChunks 自动化但粒度粗，手动 Entry 灵活但维护成本高
3. **预加载策略**：`webpackPreload` 在当前页面可能用到（高优先级），`webpackPrefetch` 在将来可能用到（空闲时加载）

## 最小验证实验

```js
// webpack.config.js
module.exports = {
  entry: './src/index.js',
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
};

// src/index.js
import _ from 'lodash';
const btn = document.createElement('button');
btn.onclick = () => import('./lazy-module.js').then(m => m.default());
document.body.appendChild(btn);
```

构建后检查 `dist/` 目录，应有 `vendors.*.js`、`main.*.js`、`lazy-module.*.js` 等独立 chunk。

## 参考资料

- [Webpack: Code Splitting](https://webpack.js.org/guides/code-splitting/)
- [Webpack: SplitChunksPlugin](https://webpack.js.org/plugins/split-chunks-plugin/)
- [Webpack: Lazy Loading](https://webpack.js.org/guides/lazy-loading/)
- [Web.dev: Reduce JavaScript payloads with code splitting](https://web.dev/reduce-javascript-payloads-with-code-splitting/)
