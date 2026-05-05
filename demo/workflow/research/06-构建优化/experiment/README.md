# 实验：构建优化 — Webpack/Vite 产物体积与加载速度

## 实验目标

通过交互式可视化演示，理解前端构建优化的四个核心维度：
1. **ESM vs CJS 模块加载行为** — 为什么 ESM 是 Tree Shaking 的前提
2. **Code Splitting** — 动态 `import()` 如何实现按需加载，减少首屏体积
3. **Tree Shaking** — 未引用导出如何被静态分析并消除
4. **持久化缓存** — contenthash 策略如何最大化缓存命中率

## 文件结构

```
experiment/
├── index.html    # 交互式实验主页面（纯 HTML/CSS/JS，零依赖）
└── README.md     # 本文件
```

## 使用方式

直接在浏览器中打开 `index.html`，无需构建工具或服务器。

## 验证检查点

| # | 检查点 | 预期现象 |
|---|--------|----------|
| CP-1 | ESM `export` 语句被静态分析 | 模块声明的导出列表在解析阶段即可确定，无需执行代码 |
| CP-2 | 动态 `import()` 创建独立 chunk | 触发懒加载时，只有对应 chunk 被请求，首屏体积不变 |
| CP-3 | Tree Shaking 移除未引用导出 | 点击"执行 Tree Shaking"后，未使用的导出变为灰色/删除线 |
| CP-4 | contenthash 变化范围与修改内容一致 | 仅修改某个模块时，只有该模块及其依赖链的 chunk hash 变化 |
| CP-5 | 构建产物分析面板数据自洽 | 各面板显示的体积、chunk 数量、缓存命中率相互一致 |

## 知识点索引

- **A28** — ESM vs CJS 模块系统差异
- **A10** — Code Splitting 与动态导入
- **A11** — Tree Shaking 原理与前提条件
- **A29** — 持久化缓存与 contenthash 策略
