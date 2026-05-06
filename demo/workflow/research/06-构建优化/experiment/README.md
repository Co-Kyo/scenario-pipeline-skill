# 实验：Code Splitting + Tree Shaking 验证

## 目标

通过一个最小化项目验证两个核心机制：
1. **Tree Shaking**：未使用的导出是否被消除
2. **Code Splitting**：动态 import 是否生成独立 chunk

## 实验结构

```
experiment/
├── src/
│   ├── index.html          ← 入口页面，加载 main.js
│   ├── main.js             ← 入口，仅使用 math.js 的 add
│   ├── math.js             ← 工具模块，导出 add/subtract/multiply/divide
│   ├── heavy.js            ← 重型模块，动态 import 按需加载
│   └── utils.js            ← 带副作用的模块，验证 sideEffects
└── README.md               ← 本文件
```

## 实验步骤

### 实验一：Tree Shaking 验证

1. `math.js` 导出 4 个函数：`add`、`subtract`、`multiply`、`divide`
2. `main.js` 仅 `import { add } from './math.js'`
3. 用 Webpack production 模式构建
4. 检查 bundle 中 `subtract`、`multiply`、`divide` 是否被消除
5. 对比 `package.json` 中 `"sideEffects": false` 前后的效果

### 实验二：Code Splitting 验证

1. `main.js` 中使用 `import('./heavy.js')` 动态导入
2. 构建后检查是否生成独立的 `heavy.[hash].js` chunk
3. 打开 Network 面板，观察点击按钮后才加载 heavy chunk

### 实验三：副作用验证

1. `utils.js` 有副作用代码（`console.log` + 全局变量赋值）
2. `main.js` 不 import utils.js
3. 对比 `"sideEffects": false` 和 `"sideEffects": ["./src/utils.js"]` 的构建结果

## 运行方式

```bash
# 安装依赖（如使用 Webpack）
npm init -y
npm install webpack webpack-cli webpack-dev-server html-webpack-plugin --save-dev

# 构建
npx webpack --mode production

# 分析 bundle
npx webpack-bundle-analyzer dist/stats.json
```

## 预期结果

| 场景 | 预期 |
|------|------|
| Tree Shaking（仅用 add） | bundle 中只有 `add` 函数，`subtract`/`multiply`/`divide` 被消除 |
| Code Splitting（动态 import） | 生成 `main.[hash].js` + `heavy.[hash].js` 两个 chunk |
| sideEffects: false | utils.js 未被 import 时不进入 bundle |
| sideEffects 未声明 | utils.js 可能进入 bundle（构建工具保守处理） |
