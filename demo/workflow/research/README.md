# 前端性能场景分析 — 命题研究

> 目标人群：3-5年前端Web开发经验（L2）
> 扫描时间：2026-05-06
> 扫描范围：掘金/CSDN/腾讯云/阿里云/简书 前端性能面试高频场景

## 命题索引

| # | 命题 | 四维评分 | 优先级 | 研究目录 |
|---|------|---------|--------|---------|
| P1 | 长列表：万级数据的虚拟列表渲染——社交动态流/商品瀑布流场景 | 10 | high | [01-长列表渲染](01-长列表渲染/) |
| P2 | 首屏白屏：SSR/SSG/CSR混合渲染的首屏加载优化——LCP≤1s目标 | 10 | high | [02-首屏白屏](02-首屏白屏/) |
| P3 | 内存泄漏：长时间运行页面的内存泄漏排查与治理——H5/SPA场景 | 9 | high | [03-内存泄漏](03-内存泄漏/) |
| P4 | Core Web Vitals：LCP/CLS/INP三项核心指标的全链路优化 | 9 | high | [04-CoreWebVitals](04-CoreWebVitals/) |
| P5 | 缓存策略：HTTP缓存在浏览器+CDN+Service Worker三层的协作机制 | 8 | high | [05-缓存策略](05-缓存策略/) |
| P6 | 构建产物：Code Splitting/Tree Shaking/懒加载的工程化配置与效果验证 | 7 | high | [06-构建优化](06-构建优化/) |
| P7 | 渲染性能：重排重绘的触发机制与CSS Containment/合成层优化 | 7 | high | [07-渲染性能](07-渲染性能/) |
| P8 | 长任务拆分：requestIdleCallback/Web Worker的主线程卸载策略 | 8 | high | [08-长任务拆分](08-长任务拆分/) |

## 学习路径（Top 3 战略高地）

1. 🏔️ **A8-DevTools性能分析**（覆盖 6/8 命题）→ 所有诊断的起点，Performance/Memory/Lighthouse
2. 🏔️ **A1-浏览器渲染管线**（覆盖 4/8 命题）→ CRP全链路：DOM→CSSOM→Layout→Paint→Composite
3. 🏔️ **A4-事件循环与任务调度**（覆盖 4/8 命题）→ 宏任务/微任务/rAF/rIC/长任务检测

完整能力图谱：[capabilities/README.md](capabilities/README.md)
结构化数据：[.meta/capability-graph.json](.meta/capability-graph.json)

## 能力知识库

按原子能力组织的跨命题参考手册：[capabilities/](capabilities/)
