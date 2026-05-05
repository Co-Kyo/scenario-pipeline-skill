# W1 - Webpack Loader/Plugin 链

## 核心机制

Webpack 的构建流程由 Loader 和 Plugin 两大机制驱动，分别处理模块转换和构建生命周期钩子。

### Loader（模块转换器）

Loader 是函数，接收源文件内容，返回转换后的结果。

**执行顺序**：从右到左、从下到上（配置数组中靠后的先执行）。

```js
module: {
  rules: [
    {
      test: /\.scss$/,
      use: ['style-loader', 'css-loader', 'sass-loader'],
      // 执行顺序：sass-loader → css-loader → style-loader
    },
  ],
}
```

**Loader 类型**：
- **同步 Loader**：直接返回结果 `return content`
- **异步 Loader**：通过 `this.async()` 获取 callback
- **Pitching Loader**：从左到右执行的 `pitch` 方法，可以提前终止后续 loader

**常用 Loader**：
- `babel-loader`：ES6+ → ES5 转译
- `css-loader`：解析 CSS 中的 `@import` 和 `url()`
- `style-loader`：将 CSS 注入 DOM（`<style>` 标签）
- `file-loader` / `asset/resource`：处理文件资源
- `ts-loader` / `esbuild-loader`：TypeScript 转译

### Plugin（构建生命周期钩子）

Plugin 是一个包含 `apply(compiler)` 方法的类，通过 Tapable 事件系统挂载到构建流程的各个阶段。

**Compiler Hooks**（全局，构建开始到结束）：
- `compile`：开始编译
- `emit`：输出资源到目录前（最后修改产物的机会）
- `done`：构建完成

**Compilation Hooks**（单次编译，增量构建时会重新触发）：
- `buildModule`：模块开始构建
- `seal`：编译结果封存
- `optimize`：优化阶段开始

```js
class MyPlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('MyPlugin', (compilation, callback) => {
      // 修改输出资源
      callback();
    });
  }
}
```

**常用 Plugin**：
- `HtmlWebpackPlugin`：自动生成 HTML 文件
- `MiniCssExtractPlugin`：CSS 提取为独立文件
- `DefinePlugin`：注入环境变量
- `TerserPlugin`：代码压缩
- `CopyWebpackPlugin`：复制静态资源

### 构建流程概览

```
初始化参数 → 创建 Compiler → 确定入口 → 编译模块（Loader 链）
→ 完成模块编译 → 输出资源（Plugin Hooks）→ 写入文件系统
```

## 工程瓶颈

1. **Loader 执行顺序容易搞反**：配置中 `use: ['a', 'b', 'c']` 实际执行顺序是 `c → b → a`，新手常犯错
2. **Plugin 的 Hook 选择错误**：在 `compile` 阶段访问产出资源会失败，需要选择正确的 Hook 时机
3. **Loader 之间的数据传递困难**：Loader 之间通过字符串传递数据，复杂的转换链需要设计好中间格式
4. **Pitching Loader 的副作用**：`pitch` 方法可以跳过后续 loader，但调试困难
5. **Plugin 的性能影响**：某些 Plugin（如 `CompressionPlugin`）在 `emit` 阶段执行大量计算，拖慢构建

## 调试工具

- **`--stats` 标志**：查看 loader 执行顺序和耗时
- **`stats: 'verbose'`**：详细输出每个模块经过的 loader 链
- **`loader-utils`**：loader 开发辅助工具
- **`this.debug` / `this.getLogger()`**：loader 内部调试日志
- **Webpack DevTools**：Chrome 扩展，可视化 plugin hook 触发时序
- **`profile: true`**：启用性能分析，输出各阶段耗时

## 典型权衡

1. **Loader vs Plugin**：Loader 处理单个文件转换，Plugin 处理全局构建流程；混淆使用会导致架构混乱
2. **Loader 数量 vs 构建速度**：每个 loader 增加一次文件读写和处理，过多 loader 链拖慢构建；考虑使用 `esbuild-loader` 替代 `babel-loader` 提速
3. **同步 vs 异步 Plugin Hook**：`tap`（同步）性能好但阻塞，`tapAsync` / `tapPromise`（异步）灵活但有额外开销

## 最小验证实验

```js
// 自定义 Loader：my-loader.js
module.exports = function(source) {
  console.log('[my-loader] processing:', this.resourcePath);
  return source.replace(/TODO/g, 'DONE');
};

// webpack.config.js
module.exports = {
  module: {
    rules: [
      { test: /\.js$/, use: ['./my-loader.js'] },
    ],
  },
  plugins: [
    {
      apply(compiler) {
        compiler.hooks.emit.tap('LogPlugin', (compilation) => {
          console.log('[LogPlugin] Assets:', Object.keys(compilation.assets));
        });
      },
    },
  ],
};
```

运行 `npx webpack`，观察 loader 和 plugin 的输出顺序。

## 参考资料

- [Webpack: Loader](https://webpack.js.org/concepts/loaders/)
- [Webpack: Plugin](https://webpack.js.org/concepts/plugins/)
- [Webpack: Module Resolution](https://webpack.js.org/concepts/module-resolution/)
- [Tapable](https://github.com/webpack/tapable)
- [Webpack: Compiler Hooks](https://webpack.js.org/api/compiler-hooks/)
