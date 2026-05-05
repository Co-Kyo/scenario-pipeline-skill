# A11 - Tree Shaking

## 核心机制

Tree Shaking 是一种 Dead Code Elimination 技术，基于 ESM 的静态结构，在构建阶段移除未被引用的导出。

### 工作原理

1. **标记阶段（Mark）**：Webpack 分析模块的 `import` / `export`，标记哪些导出被使用（used exports）和哪些未被使用（unused exports）
2. **清除阶段（Sweep）**：Terser 等 minifier 在压缩阶段移除被标记为 unused 的代码
3. **sideEffects 配置**：`package.json` 中声明 `"sideEffects": false` 告诉 Webpack 整个包没有副作用，未使用的模块可以整个跳过

### 两个层次的优化

**usedExports（标记级别）**：
```js
// webpack.config.js
optimization: {
  usedExports: true,  // 标记未使用的导出
}
```
Webpack 在 bundle 中添加 `/* unused harmony export */` 注释，Terser 据此删除。

**sideEffects（模块级别）**：
```json
// package.json
{ "sideEffects": false }
```
更激进：整个文件如果未被引用，直接跳过不打包，效率远高于 usedExports。

### 关键前提

- 必须使用 ESM（`import` / `export`）
- CommonJS 的 `require()` 和 `module.exports` 无法被静态分析
- 模块不能有副作用（或正确声明 sideEffects）
- 生产模式（`mode: 'production'`）自动启用

## 工程瓶颈

1. **副作用检测困难**：Terser 需要判断函数调用是否有副作用，动态语言（JavaScript）难以可靠判断。如 `withAppProvider()(Button)` 这种链式调用，Terser 无法确定是否安全删除
2. **CommonJS 库无法 Tree Shaking**：lodash（CJS 版）整个 70KB 无法裁剪，必须使用 lodash-es（ESM 版）
3. **Babel 转换破坏 ESM 结构**：Babel 默认将 ESM 转为 CJS，需配置 `modules: false` 保留 ESM
4. **CSS Tree Shaking 需额外工具**：Webpack 原生不支持 CSS Tree Shaking，需要 PurgeCSS 等工具配合
5. **Re-export 场景的误删风险**：`export * from './module'` 可能导致某些导出被误判为未使用

## 调试工具

- **Webpack `--stats`**：查看 usedExports 和 sideEffects 的分析结果
- **`stats.usedExports`**：在 stats 输出中显示哪些导出被标记为未使用
- **webpack-bundle-analyzer**：可视化检查未使用代码是否被移除
- **Terser 的 `compress.pure_funcs`**：手动标记无副作用函数
- **`/*#__PURE__*/` 注释**：标记函数调用无副作用，帮助 Terser 判断

## 典型权衡

1. **sideEffects vs usedExports**：sideEffects 更高效（跳过整个文件），usedExports 更精细（标记单个导出）；两者互补，建议同时启用
2. **全面 Tree Shaking vs 兼容性**：激进的 Tree Shaking 需要所有依赖都使用 ESM 并正确声明 sideEffects，某些第三方库可能不满足条件
3. **开发模式 vs 生产模式**：开发模式不启用 Tree Shaking（加快构建），生产模式自动启用；但开发时无法感知未使用代码

## 最小验证实验

```js
// src/math.js
export function square(x) { return x * x; }
export function cube(x) { return x * x * x; }

// src/index.js
import { cube } from './math.js';
console.log(cube(5));
// square 未被引用

// webpack.config.js
module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: { filename: 'bundle.js' },
};
```

构建后检查 `dist/bundle.js`：
- `cube` 函数应存在
- `square` 函数应被移除
- 使用 `mode: 'development'` + `optimization: { usedExports: true }` 可看到 `/* unused harmony export square */` 注释

## 参考资料

- [Webpack: Tree Shaking](https://webpack.js.org/guides/tree-shaking/)
- [Webpack: sideEffects](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free)
- [MDN: Tree Shaking](https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking)
- [Rollup: Tree Shaking](https://rollupjs.org/guide/en/#tree-shaking)
