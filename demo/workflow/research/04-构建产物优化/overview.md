# 构建产物优化：首屏 JS 超过 500KB 的系统性解法

## 问题切入点：500KB 的 JS 到底在慢什么

首屏 JS 超过 500KB，最直接的后果是 **LCP（Largest Contentful Paint）飙升**。浏览器必须完成下载 → 解析 → 执行三步，才能渲染首屏关键内容。500KB 的 JavaScript 在 4G 网络下需要 1-2 秒下载，再加 200-500ms 的主线程解析时间，LCP 轻易突破 4 秒——远超 Google 推荐的 2.5 秒红线。

这个问题的根源不是"代码写多了"，而是 **构建产物的组织方式出了问题**：该拆的没拆，该摇掉的没摇掉，该缓存的没缓存住。本文从通用原理出发，讲清楚三个核心机制如何协同控制产物体积，最后落到 Webpack / Vite 的具体配置。

---

## 一、Code Splitting：把大包拆成按需加载的小块

### 通用原理

Code Splitting 的本质是 **延迟加载**：把首屏不需要的代码推迟到用户真正需要时再下载。构建工具将依赖图切割为多个 chunk，浏览器只加载当前路由所需的 chunk，其余的在路由切换时异步拉取。

动态 `import()` 是实现 Code Splitting 的标准语法。它告诉构建工具："这段代码可以独立成一个 chunk，运行时按需加载。"

### 两种粒度的权衡

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **路由级分割** | 每个页面独立 chunk，首屏只加载当前页 | 页面内组件无法进一步拆分 | 中大型 SPA，路由清晰 |
| **组件级分割** | 粒度更细，弹窗/面板等按需加载 | chunk 数量膨胀，管理复杂 | 重型组件（编辑器、图表库） |

过度分割（chunk 粒度太细）会带来反效果：HTTP 请求数过多，在 HTTP/1.1 下尤其严重（浏览器并发连接数限制为 6），小 chunk 的请求开头占比反而变大。**合理的策略是路由级分割为主，组件级分割为辅**——只对重量级组件（>50KB）做独立分割。

### 共享 chunk 的陷阱

当多个路由 chunk 都依赖同一个第三方库时，如果不做处理，这个库会被重复打包到每个 chunk 中。解决方案是将公共依赖提取为独立的 **vendor chunk** 和 **runtime chunk**，确保第三方代码只下载一次。

但 vendor chunk 本身也可能膨胀——一个 `moment.js` 加上所有 locale 文件就能占 300KB+。此时需要进一步拆分：将大库单独成 chunk，或替换为更轻量的替代方案（如 `dayjs` 替代 `moment`，体积缩小 97%）。

---

## 二、Tree Shaking：删除未使用的代码

### 通用原理

Tree Shaking 的核心思想是 **静态分析**：构建工具在打包时分析 ES Module 的 `import` / `export` 语句，找出哪些导出实际被使用了，然后删除未使用的导出。这要求代码必须是 **ESM 格式**（`import` / `export`），因为 CommonJS 的 `require` 是动态的，构建工具无法静态分析其依赖关系。

`sideEffects` 标记是 Tree Shaking 的关键补充。它告诉构建工具："这个模块没有副作用（不会修改全局状态），如果它的导出没被使用，整个模块都可以删除。" 在 `package.json` 中设置：

```json
{
  "sideEffects": false
}
```

或更精确地列出有副作用的文件：

```json
{
  "sideEffects": ["*.css", "*.global.js"]
}
```

### Tree Shaking 失效的常见原因

1. **CommonJS 混入**：项目中使用了 `require()` 或 `module.exports`，构建工具无法静态分析，Tree Shaking 直接失效。
2. **未标记 sideEffects**：模块被标记为有副作用，构建工具不敢删除未使用的导出。
3. **Babel 转译破坏 ESM**：Babel 默认将 ESM 转为 CommonJS，需配置 `modules: false` 保留 ESM 语法。
4. **全局副作用**：模块在顶层执行了副作用代码（如 `window.xxx = ...`），构建工具保守地保留整个模块。

**验证方法**：使用构建工具的 bundle 分析插件（如 `webpack-bundle-analyzer`、`rollup-plugin-visualizer`）检查产物中是否包含未使用的代码。

---

## 三、HTTP 缓存策略：让用户不重复下载

### 通用原理

即使产物体积优化到极致，如果每次都从服务器重新下载，用户体验仍然差。HTTP 缓存策略的核心是 **让浏览器复用已下载的资源**。

**两层缓存机制**：

- **强缓存（Strong Cache）**：浏览器直接使用本地缓存，不发送请求。通过 `Cache-Control: max-age=31536000` 或 `Expires` 头控制。适用于长期不变的静态资源。
- **协商缓存（Negotiated Cache）**：浏览器发送请求询问服务器资源是否变化，未变化则返回 304 使用本地缓存。通过 `ETag` / `Last-Modified` 头控制。适用于频繁变化的资源。

### 文件名哈希：缓存失效的精确控制

静态资源的最佳实践是 **contenthash 文件名 + 长期缓存**：

```
main.a1b2c3d4.js    ← 文件内容变化 → hash 变化 → 新文件名
vendor.e5f6g7h8.js   ← 文件内容不变 → hash 不变 → 缓存命中
```

这样做的好处是：
- 文件内容没变 → 浏览器直接用缓存（强缓存命中）
- 文件内容变了 → 新文件名 → 浏览器下载新文件（缓存自然失效）
- 不需要手动管理版本号，不需要清理 CDN 缓存

**缓存失效的 P0 风险**：hash 配置错误会导致两个极端——要么用户看到旧版本（缓存未失效），要么每次都重新下载（hash 不稳定）。关键点是确保 hash 基于文件内容而非构建时间或随机值。

---

## 四、落地方案：Webpack / Vite 配置实践

### Webpack 配置示例

```javascript
// webpack.config.js
module.exports = {
  // 1. Code Splitting：路由级分割 + 公共 chunk 提取
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // 第三方库单独成 chunk
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
          priority: 10,
        },
        // 大库单独拆分（如 moment.js）
        heavyLibs: {
          test: /[\\/]node_modules[\\/](moment|lodash|antd)[\\/]/,
          name: 'heavy-libs',
          chunks: 'all',
          priority: 20,
        },
        // 公共业务代码
        common: {
          minChunks: 2,
          name: 'common',
          chunks: 'all',
          priority: 5,
        },
      },
    },
    // runtime chunk 独立，避免频繁变更影响 vendor 缓存
    runtimeChunk: 'single',
  },

  // 2. 输出文件名带 contenthash
  output: {
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].js',
    clean: true,
  },

  // 3. Tree Shaking 优化（mode: 'production' 默认开启）
  mode: 'production',
  // 确保 Babel 不破坏 ESM
  // 在 babel-loader 配置中：presets: [['@babel/preset-env', { modules: false }]]
};
```

**关键注意点**：
- `splitChunks.chunks: 'all'` 同时处理异步和同步 chunk
- `runtimeChunk: 'single'` 将 webpack runtime 独立，避免业务代码变更导致 vendor hash 变化
- 生产模式下 `mode: 'production'` 自动启用 Tree Shaking 和代码压缩

### Vite 配置示例

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // 1. Rollup 分包策略
    rollupOptions: {
      output: {
        // 手动分包：大库独立 chunk
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-heavy': ['moment', 'lodash', 'antd'],
        },
        // 文件名带 hash
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    // 2. chunk 大小警告阈值
    chunkSizeWarningLimit: 500,
    // 3. 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,    // 生产环境移除 console
        drop_debugger: true,
      },
    },
  },

  // 4. 依赖预构建优化（Vite 特有）
  optimizeDeps: {
    include: ['react', 'react-dom'],  // 预构建常用依赖
  },
});
```

**Vite 特有优势**：
- **预构建（Pre-bundling）**：Vite 在开发阶段用 esbuild 将 CommonJS 依赖预构建为 ESM，既解决 Tree Shaking 的 CJS 问题，又减少请求数
- **CSS Code Splitting**：Vite 默认按路由分割 CSS，首屏只加载当前页的样式
- **动态导入**：Vite 原生支持 `import()` 语法，无需额外配置

### 缓存配置（Nginx 示例）

```nginx
# 带 hash 的静态资源：长期缓存
location ~* \.(js|css|woff2|png|jpg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML 文件：协商缓存（确保用户能拿到最新入口）
location ~* \.html$ {
    add_header Cache-Control "no-cache";
}
```

---

## 五、优化检查清单

| 检查项 | 预期效果 | 验证方法 |
|--------|----------|----------|
| 路由级 Code Splitting | 首屏 JS < 200KB | `webpack-bundle-analyzer` 或 `rollup-plugin-visualizer` |
| Tree Shaking 生效 | 未使用代码被删除 | 构建产物中搜索未使用的导出名 |
| Vendor 独立 chunk | 第三方库不重复打包 | 分析 chunk 内容 |
| contenthash 文件名 | 内容不变时缓存命中 | 对比两次构建的文件名 |
| HTML 协商缓存 | 用户始终拿到最新入口 | 检查 Nginx 响应头 |
| 大库替换或按需加载 | vendor chunk < 200KB | 构建分析 + `import()` 按需引入 |

**最终目标**：首屏 JS（HTML + 关键路由 chunk + vendor chunk + runtime）控制在 200KB 以内，配合 contenthash 长期缓存和按需加载，LCP 稳定在 2.5 秒以内。
