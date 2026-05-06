# P6-构建产物 — 坑点提取

## 一、Tree Shaking 失效

### E1. CommonJS 混入导致 Tree Shaking 完全失效

**现象**：引入一个 CJS 库后，整个 bundle Tree Shaking 效果骤降，未使用的导出大量残留。

**根因**：CJS 的 `require()` 是运行时动态的，构建工具无法静态分析哪些导出被使用，必须保守保留所有代码。

```js
// ❌ 这个 import 背后的模块是 CJS 格式
// 构建工具无法 Tree Shaking，整个模块被打包
import _ from 'lodash'; // lodash 主包是 CJS

// ✅ 使用 ESM 版本
import { debounce } from 'lodash-es'; // lodash-es 是 ESM，可 Tree Shaking
```

**排查方法**：
```bash
# Webpack 构建时添加 stats 分析
npx webpack --stats-reasons --stats-error-details

# 查看模块格式
npx are-you-es5 check .
```

**修复**：优先选择 ESM 版本的库（如 lodash-es、date-fns 而非 moment），或在 Webpack 中配置 `module.rules` 将 CJS 转为 ESM。

---

### E2. 模块顶层副作用阻止消除

**现象**：明明没有使用某个模块的导出，但该模块的代码仍出现在 bundle 中。

**根因**：模块顶层有副作用代码（如 polyfill 赋值、全局变量修改），构建工具不敢安全删除。

```js
// utils.js — 有副作用
console.log('模块加载');           // 副作用
window.__GLOBAL_FLAG = true;       // 副作用

export function helper() { ... }   // 未使用，但模块不能被删除
```

**修复**：
1. 将副作用代码显式标记：`"sideEffects": ["./src/polyfill.js"]`
2. 或移除副作用代码，改为按需调用

---

### E3. Babel 转换破坏 ESM 语法

**现象**：源码是 ESM，但 Babel 将 `import` 转成了 `require()`，Tree Shaking 失效。

**根因**：Babel 默认将 ESM 转为 CJS，破坏了静态分析的前提。

```json
// babel.config.json
{
  "presets": [
    ["@babel/preset-env", {
      "modules": false  // ← 关键：保留 ESM 语法，交给 Webpack 处理
    }]
  ]
}
```

---

### E4. Webpack mode 未设为 production

**现象**：开发环境 Tree Shaking 不生效。

**根因**：Webpack 开发模式默认不做 usedExports 标记，Tree Shaking 需要 production 模式。

```js
// webpack.config.js
module.exports = {
  mode: 'production', // ← 必须
  optimization: {
    usedExports: true,  // 标记未使用的导出
    minimize: true,     // terser 实际删除代码
  },
};
```

---

## 二、Code Splitting 过度分割

### E5. minSize 过小导致 chunk 爆炸

**现象**：构建产物出现几十甚至上百个 tiny chunk，首屏请求数激增，加载反而变慢。

**根因**：`splitChunks.minSize` 设置过小（如 1KB），每个小组件都生成独立 chunk。

```js
// ❌ 过度分割
splitChunks: {
  minSize: 1000,  // 1KB 就拆分 → chunk 爆炸
}

// ✅ 合理设置
splitChunks: {
  minSize: 20000,  // 20KB 以下不拆分
  maxSize: 244000, // 超过 244KB 才进一步拆分
}
```

**排查**：构建后统计 chunk 数量和大小分布，单个 chunk < 5KB 且数量 > 20 个即为过度分割。

---

### E6. 重复依赖被打包多次

**现象**：同一库（如 react）在多个 chunk 中重复出现，bundle 总体积膨胀。

**根因**：多 entry 或 dynamic import 引用同一依赖的不同版本，或 SplitChunks 未正确配置。

```js
// 检查重复依赖
// webpack.config.js
optimization: {
  splitChunks: {
    chunks: 'all',  // ← 必须是 'all'，否则 async chunk 的公共依赖不会被提取
    cacheGroups: {
      vendors: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
        priority: 10,
      },
    },
  },
}
```

**排查工具**：
```bash
# webpack-bundle-analyzer 可视化
npx webpack-bundle-analyzer stats.json

# 检查重复包
npx duplicate-package-checker-webpack-plugin
```

---

### E7. Runtime Chunk 未独立导致缓存失效

**现象**：每次发版所有 chunk 的 hash 都变化，CDN 缓存全部失效。

**根因**：Webpack runtime（模块加载器代码）内联在 entry chunk 中，runtime 变化导致 entry hash 变化，进而级联影响所有 chunk。

```js
// ✅ 独立 runtime chunk
optimization: {
  runtimeChunk: 'single',  // runtime 独立为单独文件
}

// 配合 contenthash
output: {
  filename: '[name].[contenthash:8].js',
  chunkFilename: '[name].[contenthash:8].js',
}
```

---

## 三、动态 import 的运行时问题

### E8. Chunk 加载失败白屏

**现象**：用户在页面停留一段时间后点击链接，chunk 加载失败，页面白屏。

**根因**：发版后旧 HTML 仍引用旧 hash 的 chunk，但旧 chunk 已被 CDN 清除。

```js
// ❌ 无错误处理
const Page = await import('./pages/Dashboard');

// ✅ 带重试和降级
const Page = await import('./pages/Dashboard').catch(async (err) => {
  if (err.name === 'ChunkLoadError') {
    // 清除旧缓存并重试
    const { unregister } = await import('./service-worker');
    unregister();
    return import('./pages/Dashboard');
  }
  throw err;
});
```

---

### E9. 动态 import 路径拼接导致无法分析

**现象**：动态 import 中使用变量拼接路径，构建工具无法生成 split point。

```js
// ❌ 构建工具无法静态分析
const path = `./modules/${name}.js`;
const mod = await import(path);

// ✅ 使用 import.meta.glob（Vite）或 require.context（Webpack）
// Vite
const modules = import.meta.glob('./modules/*.js');
const mod = await modules[`./modules/${name}.js`]();

// Webpack
const modules = require.context('./modules', false, /\.js$/);
const mod = await modules(`./${name}.js`);
```

---

## 四、CJS/ESM 互操作

### E10. 混合模块系统产生 shim 代码

**现象**：bundle 中出现大量 `__esModule`、`module.exports`、`Object.defineProperty(exports, ...)` 等 shim 代码。

**根因**：项目中同时存在 CJS 和 ESM 模块，构建工具需要插入兼容层。

**修复**：
1. 统一使用 ESM（`"type": "module"` in package.json）
2. 在 Webpack 中配置 `resolve.mainFields` 优先 ESM 入口
3. 使用 `resolve.alias` 将 CJS 库映射到 ESM 版本

```js
resolve: {
  mainFields: ['module', 'main'],  // 优先 ESM 入口
  alias: {
    'lodash': 'lodash-es',  // 强制使用 ESM 版本
  },
}
```

---

### E11. require() 中的动态路径

**现象**：第三方库内部使用 `require(variable)`，导致 Webpack 打包整个目录。

```js
// 第三方库内部代码
const locale = require(`./locales/${lang}.js`);
// Webpack 会将 ./locales/ 下所有 .js 文件打包
```

**修复**：在 Webpack 中使用 `ContextReplacementPlugin` 限制范围：
```js
new webpack.ContextReplacementPlugin(
  /moment[/\\]locale$/,
  /zh-cn|en-gb/  // 只打包需要的 locale
)
```

---

## 五、资源加载与构建产物联动

### E12. preload 与 CORS 不匹配导致双重下载

**现象**：preload 了字体/图片资源，但实际请求时 CORS 模式不匹配，浏览器下载了两次。

```html
<!-- ❌ 缺少 crossorigin -->
<link rel="preload" href="/font.woff2" as="font">

<!-- ✅ 字体必须带 crossorigin（即使是同源） -->
<link rel="preload" href="/font.woff2" as="font" crossorigin>
```

**规则**：`font`、`fetch` 类型的 preload 必须带 `crossorigin` 属性，即使是同源资源。

---

### E13. 首屏 LCP 图片使用 lazy loading

**现象**：首屏图片设置了 `loading="lazy"`，导致 LCP 延迟数百毫秒。

```html
<!-- ❌ 首屏图片不应该 lazy -->
<img src="/hero.jpg" loading="lazy" alt="Hero">

<!-- ✅ 首屏图片：移除 lazy + 提升优先级 -->
<img src="/hero.jpg" fetchpriority="high" alt="Hero">
```

---

## 六、构建缓存

### E14. contenthash 不稳定导致缓存失效

**现象**：代码没有变化，但构建产物的 contenthash 每次不同。

**根因**：Webpack 的 contenthash 受模块 id 影响，新增/删除模块导致 id 重排，hash 变化。

```js
optimization: {
  moduleIds: 'deterministic',  // ← 确保模块 id 稳定
  chunkIds: 'deterministic',   // ← 确保 chunk id 稳定
}
```

---

### E15. 增量构建缓存命中率低

**现象**：Webpack 5 持久化缓存配置后，缓存命中率只有 50-60%。

**根因**：模块边界不合理，一个小改动导致大量缓存失效。

**修复**：
1. 合理拆分模块边界，避免巨型模块
2. 配置 `buildDependencies` 正确追踪配置文件变化
3. 使用 `cache.version` 区分不同构建环境

```js
cache: {
  type: 'filesystem',
  buildDependencies: {
    config: [__filename],  // 配置文件变化时缓存失效
  },
  version: `${process.env.NODE_ENV}_${process.env.BUILD_TARGET}`,
}
```
