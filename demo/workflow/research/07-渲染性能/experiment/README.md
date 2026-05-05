# 实验：渲染性能 — 避免掉帧的 JS 执行与 DOM 操作策略

## 实验目标

通过纯浏览器原生实验，验证以下关键技术点：

1. **Layout Thrashing（布局抖动）** — 读写交替 vs 批量读写，强制同步回流的性能差异
2. **rAF 任务切片** — requestAnimationFrame 时间分片 vs setTimeout，长任务不阻塞渲染
3. **Long Task 检测** — PerformanceObserver 监听 Long Task，量化主线程阻塞
4. **帧预算可视化** — 实时 FPS + 帧耗时柱状图，直观感受掉帧

## 能力ID对照

| 能力ID | 实验模块 | 说明 |
|--------|----------|------|
| A3 | 重绘与回流 | Layout Thrashing 触发与规避、读写分离 |
| A30 | rAF 调度 | 帧同步、时间分片、任务切片策略 |
| A31 | 事件循环 | macrotask/microtask 对渲染的阻塞 |
| A33 | Performance API | Long Task 监听、User Timing 标记 |
| A32 | Web Worker | 计算卸载对比（主线程 vs Worker） |
| A1 | 浏览器渲染管线 | 帧生命周期、各阶段耗时分配 |

## 验证检查点

| # | 检查点 | 预期结果 | 验证方法 |
|---|--------|----------|----------|
| CP1 | Layout Thrashing 性能差异 | 批量读写耗时远低于读写交替 | 点击"运行对比"查看耗时数据 |
| CP2 | rAF 切片不阻塞渲染 | 切片期间 FPS 保持 ≥50，同步版本 FPS 掉至 <20 | 观察 FPS 仪表盘 |
| CP3 | Long Task 被正确捕获 | >50ms 的任务被 PerformanceObserver 记录 | 查看 Long Task 计数器 |
| CP4 | rAF 切片期间帧耗时分布 | 大部分帧 <16ms，无超长帧 | 观察帧耗时柱状图 |
| CP5 | Worker 不阻塞主线程 | 大计算任务期间 FPS 不下降 | 对比主线程计算 vs Worker |

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
