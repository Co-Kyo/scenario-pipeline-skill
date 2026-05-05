# W2 - Module Federation

## 核心机制

Module Federation 是 Webpack 5 引入的架构模式，允许独立构建的应用在运行时共享模块，是微前端场景的核心解决方案。

### 核心概念

**Container（容器）**：
- 每个独立构建的应用是一个 container
- 通过 `ModuleFederationPlugin` 配置，可以暴露（expose）和消费（consume）模块
- Container 入口文件（`remoteEntry.js`）包含模块清单和加载逻辑

**Local vs Remote Modules**：
- **Local Modules**：当前构建中的常规模块
- **Remote Modules**：运行时从其他 container 加载的模块
- Remote 模块加载是异步操作，需要通过 `import()` 触发

**Shared Modules（共享模块）**：
- 多个 container 共同使用的模块（如 React、Vue）
- 运行时版本协商：选择满足 `requiredVersion` 的最高版本
- 避免同一库被打包多次

### 配置示例

```js
// host 应用
new ModuleFederationPlugin({
  name: 'host',
  remotes: {
    app1: 'app1@http://localhost:3001/remoteEntry.js',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
  },
});

// app1 应用
new ModuleFederationPlugin({
  name: 'app1',
  filename: 'remoteEntry.js',
  exposes: {
    './Button': './src/components/Button',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
  },
});
```

### 动态远程容器

```js
async function loadComponent(scope, module) {
  await __webpack_init_sharing__('default');
  const container = window[scope];
  await container.init(__webpack_share_scopes__.default);
  const factory = await container.get(module);
  return factory();
}

// 动态加载远程模块
const Button = await loadComponent('app1', './Button');
```

- `__webpack_init_sharing__`：初始化共享作用域
- `container.init()`：将宿主的共享模块注入远程容器
- `container.get()`：获取远程模块的工厂函数

### 嵌套容器与循环依赖

- 容器可以嵌套：A 使用 B 的模块，B 使用 C 的模块
- 支持循环依赖：A ↔ B 互相使用对方的模块
- 共享模块的版本协商在所有容器间传播

## 工程瓶颈

1. **版本协商失败**：当共享模块的 `requiredVersion` 不一致时，可能导致运行时加载错误或重复打包
2. **远程容器的可用性**：`remoteEntry.js` 加载失败时，整个远程应用不可用，需要降级策略
3. **TypeScript 类型支持**：远程模块的类型定义需要额外配置（如 `@module-federation/typescript` 插件）
4. **CSS 隔离问题**：共享模块的样式可能泄漏到其他应用，需要 Shadow DOM 或 CSS Modules 解决
5. **构建配置复杂度**：每个应用都需要独立的 Webpack 配置，且 shared 配置需要保持一致

## 调试工具

- **Webpack Stats**：查看 remote/shared 模块的打包情况
- **`__webpack_share_scopes__`**：浏览器控制台检查共享作用域状态
- **Network 面板**：观察 `remoteEntry.js` 和远程模块的加载时序
- **`module-federation/typescript`**：TypeScript 类型生成
- **`@module-federation/utilities`**：运行时调试工具

## 典型权衡

1. **shared singleton vs 多版本**：singleton 确保只有一个版本（节省内存），但版本不兼容时会报错；多版本安全但内存占用更大
2. **eager 共享 vs 按需加载**：`eager: true` 让共享模块随主入口一起加载（减少异步边界），但增加首屏体积
3. **静态远程 vs 动态远程**：静态远程（配置文件声明）简单但不灵活；动态远程（运行时决定）灵活但需要额外的加载逻辑

## 最小验证实验

```js
// === app1 (远程应用) ===
// webpack.config.js
new ModuleFederationPlugin({
  name: 'app1',
  filename: 'remoteEntry.js',
  exposes: { './Button': './src/Button' },
  shared: { react: { singleton: true } },
});

// src/Button.jsx
export default function Button() {
  return <button>Remote Button</button>;
}

// === host (宿主应用) ===
// webpack.config.js
new ModuleFederationPlugin({
  name: 'host',
  remotes: { app1: 'app1@http://localhost:3001/remoteEntry.js' },
  shared: { react: { singleton: true } },
});

// src/App.jsx
const RemoteButton = React.lazy(() => import('app1/Button'));
function App() {
  return (
    <Suspense fallback="Loading...">
      <RemoteButton />
    </Suspense>
  );
}
```

启动两个应用后，host 应用应能加载并渲染 app1 的 Button 组件。

## 参考资料

- [Webpack: Module Federation](https://webpack.js.org/concepts/module-federation/)
- [Webpack: ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin/)
- [Module Federation Examples](https://github.com/module-federation/module-federation-examples)
- [Zack Jackson: Module Federation](https://indepth.dev/webpack-5-module-federation-a-game-changer-in-javascript-architecture/)
- [Module Federation Documentation](https://module-federation.io/)
