# VI1 - Vite 预构建与 esbuild

## 核心机制

Vite 在开发模式下使用浏览器原生 ESM，通过 esbuild 进行依赖预构建，实现极快的冷启动和 HMR。

### 依赖预构建（Dependency Pre-Bundling）

Vite 首次启动时自动执行依赖预构建，解决两个问题：

**1. CommonJS / UMD 兼容性**：
- 开发时 Vite 将所有代码作为原生 ESM 提供
- esbuild 将 CJS/UMD 依赖转换为 ESM
- 智能命名导入分析：`import React, { useState } from 'react'` 在 CJS 模块上也能正常工作

**2. 性能优化（减少 HTTP 请求）**：
- lodash-es 有 600+ 内部模块，直接加载会产生 600+ HTTP 请求
- 预构建将其打包为单个模块，只需 1 个请求
- 预构建产物缓存在 `node_modules/.vite`

### esbuild 的角色

esbuild 是用 Go 编写的超快 JavaScript bundler/转译器：

- **速度**：比 Webpack 快 10-100x（Go 原生 vs Node.js）
- **预构建转译**：将 CJS → ESM、将多模块依赖合并为单文件
- **生产构建**：Vite 生产模式使用 Rollup（现在是 Rolldown），但 esbuild 用于转译 TypeScript 和 JSX
- **限制**：esbuild 不支持 HMR，也不支持某些高级 Rollup 插件

### HMR 原理

Vite 的 HMR 基于原生 ESM：

1. **文件监听**：Vite 使用 chokidar 监听文件变化
2. **模块图更新**：文件变化时，Vite 服务器确定受影响的模块范围
3. **WebSocket 通知**：通过 WebSocket 发送 `update` 事件给浏览器
4. **浏览器请求更新**：浏览器重新请求变化的模块（利用 ESM 的模块缓存失效机制）
5. **模块替换**：Hot Module Replacement API 执行模块热替换

```js
// HMR API
if (import.meta.hot) {
  import.meta.hot.accept('./module.js', (newModule) => {
    // 模块更新后的处理逻辑
  });
}
```

### Vite vs Webpack 开发模式

| 维度 | Vite | Webpack |
|------|------|---------|
| 启动方式 | 原生 ESM，按需编译 | 全量打包后启动 |
| 冷启动速度 | 极快（< 1s） | 较慢（大项目 30s+） |
| HMR 速度 | 与项目大小无关 | 随项目增大而变慢 |
| 生产构建 | Rolldown（之前是 Rollup） | Webpack 自身 |

## 工程瓶颈

1. **预构建缓存失效判断**：lock 文件变化、`vite.config.js` 变化、`NODE_ENV` 变化都会触发重新预构建；但有时需要 `--force` 手动刷新
2. **CJS 依赖的兼容性问题**：某些 CJS 依赖的动态 `require()` 模式无法被 esbuild 完全转换，需要配置 `optimizeDeps.include`
3. **开发与生产构建的差异**：开发用 esbuild 预构建，生产用 Rolldown 构建，两者行为不完全一致，可能导致"开发正常但生产出错"
4. **esbuild 不支持装饰器（legacy）**：TypeScript 的 `experimentalDecorators` 需要额外配置
5. **大型 monorepo 的预构建性能**：linked dependencies 需要正确配置 `optimizeDeps.include`，否则启动时反复重构建

## 调试工具

- **`--debug` 标志**：输出详细的预构建和 HMR 日志
- **`node_modules/.vite`**：检查预构建产物
- **`vite --force`**：强制重新预构建
- **Chrome DevTools Network**：观察 ESM 模块请求链
- **`optimizeDeps` 配置**：`include`/`exclude`/`esbuildOptions` 精细控制
- **`vite-plugin-inspect`**：查看模块转换链和中间产物

## 典型权衡

1. **esbuild vs Babel**：esbuild 极快但不支持某些 Babel 插件（如 styled-components 的编译时优化）；可在 Vite 中通过 `@vitejs/plugin-react` 使用 Babel 作为回退
2. **开发模式原生 ESM vs 预打包**：原生 ESM 冷启动快但请求多，预打包减少请求但增加首次启动时间；Vite 的预构建策略是两者的最佳平衡
3. **Vite 生产构建选择**：Rollup（成熟、插件丰富）vs Rolldown（更快、兼容 Rollup 插件）vs esbuild（最快、功能有限）

## 最小验证实验

```bash
# 创建 Vite 项目
npm create vite@latest test-vite -- --template react
cd test-vite
npm install

# 观察预构建
ls node_modules/.vite/  # 预构建产物

# 强制重新预构建
npx vite --force

# HMR 测试
npx vite
# 修改 src/App.tsx，观察浏览器自动更新（无需手动刷新）

# 性能对比
time npx vite build  # Vite 生产构建
time npx webpack --mode production  # Webpack 构建（如有配置）
```

## 参考资料

- [Vite: Dependency Pre-Bundling](https://vite.dev/guide/dep-pre-bundling.html)
- [Vite: Why Vite](https://vite.dev/guide/why.html)
- [esbuild: Documentation](https://esbuild.github.io/)
- [Vite: HMR API](https://vite.dev/guide/api-hmr.html)
- [Vite: Performance](https://vite.dev/guide/performance.html)
