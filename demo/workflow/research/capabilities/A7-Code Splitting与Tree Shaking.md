# Code Splitting 与 Tree Shaking

> ID: A7 | 扇出: 2/8 | 耦合度: 2 | 战略价值: 1.0 | 🏕️ 三级能力

## 核心机制

**Code Splitting（代码分割）**：
- **动态 import()**：`import('./HeavyModule')` 触发构建工具生成独立 chunk
- **路由级分割**：每个路由一个 chunk，首屏只加载当前路由的代码
- **chunk 划分策略**：vendor chunk（第三方库）+ app chunk（业务代码）+ async chunk（按需加载）

**Tree Shaking（摇树优化）**：
- 基于 ESM 的静态分析：`import { foo } from './utils'` → 只打包 `foo`，删除 `bar`
- **前提条件**：必须使用 ESM（import/export），CommonJS（require/module.exports）无法 tree shake
- **副作用标记**：`package.json` 的 `sideEffects: false` 告诉打包器模块无副作用，可安全删除未使用代码

**持久化缓存**：
- 文件名带 contenthash：内容不变 → hash 不变 → 浏览器命中缓存
- 将 runtime 代码内联到 HTML，避免 chunk hash 链式失效

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|---------|---------|---------|---------|
| 1 | 动态 import 被打包工具忽略 | babel/tsconfig 配置错误，import() 被转译为 require | 首屏加载全部代码 | 构建产物分析（webpack-bundle-analyzer）| 检查 babel 配置，确保 dynamic import 不被转译 |
| 2 | Tree Shaking 失效 | 使用了 CommonJS 模块或 sideEffects 未正确配置 | 未使用的代码仍在产物中 | 构建产物分析 + source-map-explorer | 确保 ESM + sideEffects: false |
| 3 | chunk 粒度太细 | 过度分割导致大量小 chunk | HTTP 请求数过多，HTTP/1.1 下瀑布流 | Network 面板 → 请求数 | 配置 minSize/maxSize，合并小 chunk |
| 4 | vendor chunk 膨胀 | 一个大库（如 moment.js + locales）污染整个 vendor | vendor.js > 500KB | webpack-bundle-analyzer | 拆分大库为独立 chunk，或替换为轻量库 |

## 调试工具

| 工具 | 用法 |
|------|------|
| webpack-bundle-analyzer | 可视化 chunk 组成，定位大模块 |
| `npx source-map-explorer bundle.js` | 分析 bundle 中各模块占比 |
| Vite `vite-plugin-visualizer` | Vite 生态的构建分析插件 |
| Network 面板 | 检查 chunk 数量和加载瀑布流 |

## 典型权衡

| 维度 | 方案 A | 方案 B | 选择建议 |
|------|--------|--------|---------|
| 分割粒度 | 路由级分割（简单，每个路由一个 chunk）| 组件级分割（精细，但配置复杂）| 默认路由级，对大组件再做组件级 |
| vendor 策略 | 单一 vendor chunk（缓存稳定但体积大）| 拆分 vendor（缓存命中率低但体积小）| 第三方库变化不频繁时用单一 vendor |

## 参考资料

- [T1] Webpack Code Splitting: https://webpack.js.org/guides/code-splitting/
- [T2] web.dev: Tree Shaking: https://web.dev/articles/reduce-javascript-payloads-with-tree-shaking
