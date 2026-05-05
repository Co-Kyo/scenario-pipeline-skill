# 实验：长列表渲染 — 万级数据的流畅滚动方案

## 实验目标

通过纯浏览器原生实验，验证以下关键技术点：

1. **虚拟列表核心算法** — 10万项数据下仅渲染可视区域 DOM 节点
2. **布局抖动（Layout Thrashing）** — 逐个 appendChild vs DocumentFragment 批量插入
3. **滚动节流策略** — requestAnimationFrame 节流 vs 直接 scrollTop 响应
4. **CSS contain/content-visibility** — 渲染隔离对首屏性能的影响
5. **帧率监控** — 实时 FPS 显示，量化滚动流畅度

## 能力ID对照

| 能力ID | 实验模块 | 说明 |
|--------|----------|------|
| A4 | 虚拟化算法 | 可视区域计算、复用池、overscan、动态高度 |
| A3 | 重绘与回流 | Layout 次数、DOM 批量操作、contain 属性 |
| A30 | rAF 节流 | 帧率显示、掉帧检测、计算负载调节 |
| A27 | contain/content-visibility | CSS 渲染隔离优化 |

## 验证检查点

| # | 检查点 | 预期结果 | 验证方法 |
|---|--------|----------|----------|
| CP1 | 10万项虚拟列表 DOM 节点数 | 可视区域 + overscan 范围内（通常 20~40 个） | 开发者工具 Elements 面板计数 `container.children` |
| CP2 | DocumentFragment 批量插入性能 | 耗时远低于逐个 appendChild | 点击"运行对比"后查看耗时数据 |
| CP3 | rAF 节流下 FPS | 滚动时稳定 ≥50 FPS | 观察 FPS 仪表盘 |
| CP4 | contain 属性对渲染的影响 | 有 contain 的列表渲染更快 | 切换 contain 开关后对比 FPS |
| CP5 | 10万项列表滚动无卡顿 | 滚动操作 < 16ms/帧 | FPS 仪表盘 + Performance 面板 |

## 使用方法

1. 直接用浏览器打开 `index.html`（推荐 Chrome）
2. 各实验模块独立运行，互不干扰
3. 按需切换参数，观察指标变化
4. 可配合 Chrome DevTools Performance 面板深入分析

## 文件结构

```
experiment/
├── README.md          # 本文件
└── index.html         # 可运行实验（纯 HTML/CSS/JS）
```
