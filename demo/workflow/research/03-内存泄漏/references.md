# 参考资料：内存泄漏——长时间运行页面的性能退化排查

> 分级说明：T1 = 必读核心，T2 = 深入理解，T3 = 扩展补充

---

## T1 · 必读核心

### 1. Memory Management — MDN
- **链接**：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management
- **内容**：JavaScript 内存生命周期（分配 → 使用 → 释放）、引用计数与标记-清除两种 GC 策略的原理与局限、常见泄漏模式（意外全局变量、被遗忘的定时器/回调、闭包持有外部引用、DOM 引用未清理）。
- **为什么是 T1**：所有后续排查手段的前提是理解「内存为什么泄漏」。本文是最权威、最简洁的概念入门。

### 2. Fix Memory Problems — Chrome DevTools
- **链接**：https://developer.chrome.com/docs/devtools/memory-problems
- **内容**：Chrome DevTools 内存面板全景——Performance Monitor 实时观测 JS 堆大小、Memory 面板的三种快照类型（Heap Snapshot / Allocation Timeline / Allocation Sampling）、如何判断是否存在泄漏（堆大小持续增长且 GC 后不回落）。
- **为什么是 T1**：排查流程的「工具入口」，必须能独立操作。

### 3. Memory Leaks — Chrome DevTools
- **链接**：https://developer.chrome.com/docs/devtools/memory-problems/memory-leaks
- **内容**：以三个真实场景（全局变量积累、DOM 节点未移除、闭包引用）演示完整的「发现 → 定位 → 修复」流程；重点讲解 Detached DOM tree 的识别方法和堆快照对比（Comparison view）技巧。
- **为什么是 T1**：直接对应面试命题中的「排查」关键词，提供可复现的排查步骤。

### 4. Memory Leaks — web.dev
- **链接**：https://web.dev/articles/memory-leaks
- **内容**：Google 官方对前端内存泄漏的系统性总结——JS 四种 GC root 类型、事件监听器 / 定时器 / WebSocket / 全局缓存等高频泄漏源、WeakRef 与 FinalizationRegistry 的现代防御手段。
- **为什么是 T1**：覆盖了面试中 80% 的高频问答点，结构清晰适合快速复习。

---

## T2 · 深入理解

### 5. Diagnose Memory Leaks with Heap Snapshots — web.dev
- **链接**：https://web.dev/articles/diagnose-memory-leaks-with-heap-snapshots
- **内容**：以一个 TODO 应用为案例，手把手演示「录制分配时间线 → 发现锯齿上升 → 拍两次快照做 Comparison → 在 Retained Size 列找出泄漏对象 → 通过 Retainers 链追踪引用路径」的完整流程。
- **为什么是 T2**：在 T1 的基础上深入到堆快照的对比分析，是面试追问「具体怎么定位到那一行代码」的标准答案。

### 6. WeakMap — MDN
- **链接**：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap
- **内容**：WeakMap 的键必须是对象、值被自动垃圾回收的语义；典型用途：为 DOM 节点附加私有数据而不阻止节点被回收；与 Map 的行为差异对比。
- **为什么是 T2**：WeakMap 是前端防泄漏的核心数据结构，理解其 GC 友好语义是回答「如何避免泄漏」的关键。

### 7. WeakRef — MDN
- **链接**：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef
- **内容**：WeakRef 允许持有对对象的「弱引用」，不阻止 GC 回收；`deref()` 方法在对象已被回收时返回 `undefined`；与 WeakMap 的互补关系。
- **为什么是 T2**：面试中追问「ES2021 新增了哪些防泄漏手段」时的核心答案。

### 8. FinalizationRegistry — MDN
- **链接**：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
- **内容**：注册回调函数，在对象被 GC 回收后执行清理逻辑（如关闭文件句柄、释放外部资源）；`unregister` 取消注册；注意事项：回调执行时机不确定，不应依赖它做关键业务逻辑。
- **为什么是 T2**：与 WeakRef 配合使用，是回答「弱引用 + 清理回调」组合方案的必备知识。

---

## T3 · 扩展补充

### 9. Trash Talk — V8 Blog
- **链接**：https://v8.dev/blog/trash-talk
- **内容**：V8 团队对垃圾回收机制的深度讲解——年轻代（Scavenge）与老生代（Mark-Sweep / Mark-Compact）的分代回收策略、增量标记（Incremental Marking）如何避免长 GC 暂停、并发标记（Concurrent Marking）的实现。
- **为什么是 T3**：理解引擎底层 GC 策略，可用于回答「为什么有时候 GC 没有及时回收」或解释堆锯齿形态。属于加分项。

### 10. Orinoco: The V8 Garbage Collector — V8 Blog
- **链接**：https://v8.dev/blog/orinoco-parallel-scavenger
- **内容**：V8 的并行 Scavenger（Parallel Scavenger）优化——如何通过多线程并行处理年轻代回收、减少主线程暂停时间、Orinoco 项目的整体架构与演进方向。
- **为什么是 T3**：面试中如被追问「V8 GC 最新优化」可引用，属于深度加分项，日常排查不直接需要。

---

## 速查索引

| 主题 | 首选资料 | 级别 |
|------|---------|------|
| 内存生命周期与泄漏类型 | MDN Memory Management | T1 |
| DevTools 内存面板操作 | Chrome DevTools Memory | T1 |
| 堆快照对比定位泄漏 | web.dev memory-leaks | T1 |
| 完整排查流程演示 | Chrome DevTools Memory Leaks | T1 |
| 堆快照深度分析 | web.dev diagnose-memory-leaks | T2 |
| WeakMap 防泄漏 | MDN WeakMap | T2 |
| WeakRef / FinalizationRegistry | MDN WeakRef + FinalizationRegistry | T2 |
| V8 分代 GC 原理 | V8 Trash Talk | T3 |
| V8 并行 Scavenger | V8 Orinoco | T3 |
