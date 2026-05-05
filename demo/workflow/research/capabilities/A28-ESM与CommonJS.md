# A28 - ESM 与 CommonJS

## 核心机制

### 模块系统对比

**CommonJS (CJS)**：
- 运行时加载，`require()` 是同步函数调用
- 模块导出是值的拷贝（原始类型）或引用的拷贝（对象）
- 支持条件加载：`if (condition) { require('module') }`
- `module.exports` / `exports.xxx` 导出，动态赋值

**ES Modules (ESM)**：
- 编译时静态分析，`import` / `export` 是声明式语法
- 模块导出是活绑定（live binding），读取的是引用而非值拷贝
- `import` 必须在模块顶层，不能放在条件语句中
- 支持 Named Export 和 Default Export

### Tree Shaking 前提

ESM 的静态结构是 Tree Shaking 的基石：
- `import { a } from './module'` — 编译期可知 `a` 被使用
- `export const b = ...` — 编译期可知 `b` 被导出
- CommonJS 的 `require()` 和 `module.exports` 是动态的，无法在编译期确定依赖图

### import() 动态导入

```js
// 返回 Promise，运行时按需加载
const module = await import('./heavy-module.js');

// Webpack 会自动创建独立 chunk
import(/* webpackChunkName: "admin" */ './admin.js');
```

- `import()` 是唯一兼具 ESM 语法和动态加载能力的方式
- Webpack/Vite 会将其作为 Code Splitting 的边界

### Node.js 双模块系统

- `.mjs` 文件强制 ESM，`.cjs` 文件强制 CJS
- `package.json` 的 `"type": "module"` 控制默认行为
- ESM 可以 `import` CJS（只支持 default export），CJS 不能 `require()` ESM（异步）

## 工程瓶颈

1. **CJS 无法 Tree Shaking**：lodash（CJS 版本）整个包 70KB 无法被裁剪，必须使用 lodash-es（ESM 版本）
2. **混合模块系统兼容性**：某些 npm 包同时提供 CJS 和 ESM，但行为不一致（如 React 的 `require('react')` 返回的是 ESM namespace 对象而非模块本身）
3. **循环依赖处理差异**：CJS 返回未完成的导出对象（部分初始化），ESM 的活绑定可能导致 TDZ（Temporal Dead Zone）错误
4. **动态 `require()` 阻碍静态分析**：`require(variable)` 无法被 bundler 解析，导致无法生成正确的依赖图
5. **Bundler 对 CJS 的转换不完美**：Webpack 通过 `__esModule` 标记识别 CJS-to-ESM 转换，但某些库不设置此标记导致 named import 失败

## 调试工具

- **webpack --stats**：查看模块类型和依赖关系
- **webpack-bundle-analyzer**：可视化 chunk 内容，识别 CJS 模块
- **source-map-explorer**：分析 bundle 中各模块占比
- **madge**：生成模块依赖图，识别循环依赖
- **`import.meta.url`**：ESM 中获取当前模块 URL（替代 CJS 的 `__filename`）

## 典型权衡

1. **兼容性 vs 性能**：使用 ESM 可获得 Tree Shaking，但需要目标环境支持或 bundler 转译；纯 CJS 兼容性最好但无法优化
2. **开发体验 vs 构建复杂度**：`import()` 动态导入减少首屏体积，但增加了异步边界和加载状态管理的复杂度
3. **npm 包分发策略**：同时提供 CJS + ESM（dual package）增加维护成本，但最大化兼容性；仅 ESM 会阻断 CJS 用户

## 最小验证实验

```js
// math.js - ESM
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }

// index.js
import { add } from './math.js';
console.log(add(1, 2));
// subtract 未被引用，Tree Shaking 后不会出现在 bundle 中

// 对比：math-cjs.js - CommonJS
exports.add = function(a, b) { return a + b; };
exports.subtract = function(a, b) { return a - b; };
// require('./math-cjs').add(1, 2) — subtract 仍会出现在 bundle 中
```

构建命令：`npx webpack --mode production --entry ./index.js`，观察 `subtract` 是否被移除。

## 参考资料

- [MDN: JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Node.js: Differences between ES modules and CommonJS](https://nodejs.org/api/esm.html#differences-between-es-modules-and-commonjs)
- [Webpack: Tree Shaking](https://webpack.js.org/guides/tree-shaking/)
- [2ality: ECMAScript modules in Node.js](https://2ality.com/2021/06/esm-nodejs-interop.html)
