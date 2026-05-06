# DevTools 性能分析

> ID: A4 | 扇出: 4/8 | 耦合度: 1 | 战略价值: 4.0 | 🏔️ 一级高地

## 核心机制

Chrome DevTools 提供两个核心性能面板：

**Performance 面板**：
- 录制页面操作，生成时间线火焰图
- 识别 Long Task（>50ms 的任务，红色标记）
- 分析 Rendering → Layout/Paint/Composite 各阶段耗时
- FPS 图表可直观看到掉帧
- 支持 Simulate Slow CPU / Network Throttling

**Memory 面板**：
- **Heap Snapshot**：拍摄堆内存快照，可对比两个快照找出增量
- **Allocation Instrumentation**：录制内存分配时间线，定位分配热点
- **Allocation Sampling**：低开销采样模式，适合长时间录制
- 关注 **Retainers** 链：理解对象为何无法被 GC 回收

**Lighthouse**：
- 自动化性能审计，输出 Core Web Vitals 评分
- 给出优化建议（减少未使用的 JS、优化图片等）

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|---------|---------|---------|---------|
| 1 | 未识别 Long Task | 不知道哪些代码阻塞主线程 | 用户反馈卡顿但无法定位 | Performance 面板录制 → Long Task 标记 | 定位到具体函数，拆分或移入 Worker |
| 2 | Detached DOM 未检测 | 不知道有 DOM 节点泄漏 | 内存持续增长 | Memory 面板 → Heap Snapshot → 搜索 "Detached" | 定位 Retainers 链，断开引用 |
| 3 | 闭包泄漏难定位 | 闭包隐式持有大对象 | 快照中看到不该存活的对象 | Heap Snapshot → Retainers → 展开闭包作用域 | 闭包内及时置空引用 |
| 4 | 生产环境无法复现 | 开发环境性能正常但生产卡顿 | 真实用户反馈 | RUM（Real User Monitoring）+ Lighthouse CI | 部署 Lighthouse CI + Web Vitals 上报 |

## 调试工具

| 工具 | 用法 |
|------|------|
| Performance 面板 | 录制 → 分析火焰图 → 定位 Long Task 和 Layout 热点 |
| Memory 面板 | Heap Snapshot 对比 → 定位内存泄漏源 |
| Rendering 面板 | Paint Flashing / Layout Shift Regions / FPS Meter |
| Lighthouse | 一键审计 → 输出优化建议和评分 |
| `web-vitals` 库 | `onLCP()`, `onINP()`, `onCLS()` 上报真实用户指标 |

## 典型权衡

| 维度 | 方案 A | 方案 B | 选择建议 |
|------|--------|--------|---------|
| 分析方式 | Performance 面板（精确但需要手动操作）| Lighthouse（自动化但可能不够精确）| 开发阶段用 Performance 深入分析，CI 用 Lighthouse 回归 |
| 内存分析 | Heap Snapshot（精确但暂停页面）| Allocation Sampling（低开销但采样）| 泄漏定位用 Snapshot，长时间监控用 Sampling |

## 参考资料

- [T1] Chrome DevTools Performance: https://developer.chrome.com/docs/devtools/performance
- [T2] web.dev: DevTools Memory: https://web.dev/articles/devtools-memory
