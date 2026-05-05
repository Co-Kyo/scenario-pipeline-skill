# A29 - 持久化缓存（contenthash）

## 核心机制

持久化缓存的目标：文件内容不变时，产出的文件名也不变，从而让浏览器和 CDN 长期缓存静态资源。

### contenthash 策略

```js
output: {
  filename: '[name].[contenthash].js',
  // contenthash 基于文件内容计算，内容不变 hash 不变
}
```

Webpack 提供三种 hash 占位符：
- `[hash]`：整个构建的 hash（所有文件共享），任何变化都会改变（Webpack 5 已废弃）
- `[chunkhash]`：基于 chunk 内容计算，同一 chunk 内文件共享
- `[contenthash]`：基于文件内容计算，最精确，推荐使用

### 缓存失效边界

理想情况：修改 `src/utils.js` 只应导致 `main.*.hash1.js` 变为 `main.*.hash2.js`，`vendor.*.js` 不变。

实际问题：Webpack 默认将 runtime（模块加载器）打包进 entry chunk，runtime 的变化会导致整个 entry chunk 的 hash 改变，即使业务代码没变。

### Runtime Chunk 分离

```js
optimization: {
  runtimeChunk: 'single',  // 将 runtime 提取为独立 chunk
}
```

分离后：
- `runtime.*.hash.js`：Webpack 运行时，几乎每次构建都会变
- `vendors.*.hash.js`：第三方库，依赖不变则 hash 不变
- `main.*.hash.js`：业务代码，只在业务代码变化时改变

### Webpack 5 的确定性模块 ID

```js
optimization: {
  moduleIds: 'deterministic',   // 确定性模块 ID
  chunkIds: 'deterministic',    // 确定性 chunk ID
}
```

Webpack 5 默认使用确定性 ID 策略，相同输入始终产生相同输出，解决了旧版本中模块 ID 基于解析顺序递增导致的缓存失效问题。

## 工程瓶颈

1. **runtime chunk 导致的 hash 传递污染**：不分离 runtime 时，任何模块变化都可能导致所有 chunk 的 hash 改变
2. **模块 ID 不确定性**：Webpack 4 默认使用递增数字 ID，模块增删会导致其他模块 ID 变化，破坏缓存
3. **第三方库更新导致 vendor chunk 失效**：`npm update` 改变 `node_modules` 内容，vendor chunk hash 全部变化
4. **CSS 提取的 hash 同步问题**：使用 MiniCssExtractPlugin 时，CSS 的 contenthash 需要与 JS 独立计算
5. **source map 的缓存策略**：source map 文件不应被长期缓存（通常使用 `nosniff` 或短缓存）

## 调试工具

- **Webpack `--stats`**：查看文件 hash 和 chunk 关系
- **diff 比较**：`diff <(ls dist/old) <(ls dist/new)` 检查哪些文件 hash 变化
- **`webpack.config.js` 中的 `output.hashDigestLength`**：控制 hash 长度（默认 20 字符）
- **Cache-Control 头验证**：`curl -I` 检查 CDN/服务器的缓存头配置

## 典型权衡

1. **hash 长度**：越长碰撞概率越低，但文件名更长；20 字符（80 bit）已足够安全
2. **runtime 分离**：`runtimeChunk: 'single'` 增加一个额外请求，但获得更好的缓存粒度
3. **vendor 策略**：将所有第三方库打包为单一 vendor chunk（缓存命中率高但单次更新代价大）vs 拆分为多个 vendor chunk（更新粒度更细但请求更多）

## 最小验证实验

```js
// webpack.config.js
module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
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

// 第一次构建：记录所有文件的 contenthash
// 修改 src/index.js（不改第三方库）
// 第二次构建：只有 main 和 runtime 的 hash 变化，vendors 不变
```

验证步骤：
```bash
npm run build
ls dist/  # 记录 hash
echo "// comment" >> src/index.js
npm run build
ls dist/  # 对比 hash，vendors 应不变
```

## 参考资料

- [Webpack: Caching](https://webpack.js.org/guides/caching/)
- [Webpack: output.filename](https://webpack.js.org/configuration/output/#outputfilename)
- [Webpack: deterministic module IDs](https://webpack.js.org/blog/2020-10-10-webpack-5-release/#deterministic-chunk-module-and-export-ids)
- [Jake Archibald: Caching best practices](https://jakearchibald.com/2016/caching-best-practices/)
