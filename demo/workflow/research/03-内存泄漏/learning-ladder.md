# P3-内存泄漏 — 学习阶梯

> 基于 capability-graph.json 中 P3 涉及的能力依赖关系（A3 → A2 → A8），拓扑排序归纳为 3 个阶段。

---

## 能力依赖关系

```
A3 (V8 GC机制) ──→ A2 (DOM节点生命周期) ──→ A8 (DevTools性能分析)
   底层原理              应用层现象              诊断工具
```

**依赖逻辑**：
- 不理解 GC 机制（A3），就不知道为什么 Detached DOM 不会被自动回收
- 不理解 DOM 生命周期（A2），就不知道哪些操作会产生泄漏
- 不理解 DevTools 诊断方法（A8），就无法从"怀疑泄漏"到"定位根因"

---

## 阶段 1：理解 GC — 什么能回收、什么不能

**能力**：A3-V8 GC机制

### 做什么
- 理解 V8 分代 GC 架构：新生代（Scavenge）vs 老生代（Mark-Sweep/Mark-Compact）
- 理解 GC Root 和可达性（reachability）判断
- 理解 WeakRef/WeakMap/WeakSet 的语义

### 看到什么
- 读完 `v8.dev/blog/trash-talk` 后，能画出新生代/老生代的对象流转图
- 能解释：为什么 `let obj = {}; obj = null;` 之后 obj 指向的对象可以被 GC
- 能解释：为什么闭包中的变量不会被 GC（作用域链可达）

### 说明什么
- **核心概念已建立**：内存泄漏 = 存在一条从 GC Root 到目标对象的不可预期的引用路径
- 分代 GC 的存在意味着短生命周期对象（临时变量、事件回调）不会立即占用老生代空间

### 接下来去哪
- 进入阶段 2，学习 DOM 节点生命周期——理解浏览器中最大的 GC Root 来源

### 做到才算过
- [ ] 能手画 V8 分代 GC 流程图（新生代 Scavenge → 晋升 → 老生代 Mark-Sweep/Compact）
- [ ] 能用一句话解释 WeakRef 和强引用的区别
- [ ] 能解释为什么 `Map` 缓存会导致内存泄漏，而 `WeakMap` 不会

---

## 阶段 2：理解 DOM 生命周期 — 泄漏从哪来

**能力**：A2-DOM节点生命周期（依赖 A3）

### 做什么
- 理解 DOM 节点五阶段生命周期：创建 → 挂载 → 更新 → 卸载 → GC
- 理解 Detached DOM 的形成条件和检测方法
- 掌握事件监听器泄漏模式和 AbortController 清理方案
- 理解闭包持有 DOM 引用的隐式泄漏

### 看到什么
- 写一段创建 1000 个 DOM 节点并移除的代码，但保留引用
- 在 DevTools Memory 面板中看到 `Detached HTMLElement` 对象
- 用 `isConnected` 属性判断节点是否在文档树中
- 用 AbortController 一行代码清理所有事件监听器

### 说明什么
- **泄漏的根因找到了**：SPA 组件卸载时，事件监听器、闭包、框架缓存可能仍持有已移除 DOM 节点的引用
- 浏览器的 DOM 树本身就是最大的 GC Root——挂载在文档树上的节点永远不会被 GC
- Detached DOM 是"半死不活"的状态：不在文档树中（不可见），但有 JS 引用（不可回收）

### 接下来去哪
- 进入阶段 3，学习 DevTools 诊断方法——从"怀疑有泄漏"到"精确定位泄漏源"

### 做到才算过
- [ ] 能写出一个产生 Detached DOM 泄漏的代码，并解释为什么泄漏
- [ ] 能用 `AbortController.signal` 重写一个事件监听器泄漏的修复方案
- [ ] 能解释 `isConnected` 属性的含义和用途
- [ ] 能区分框架组件卸载时需要手动清理的 5 种副作用

---

## 阶段 3：掌握诊断 — 从怀疑到定位

**能力**：A8-DevTools性能分析（依赖 A2 + A3）

### 做什么
- 掌握 Heap Snapshot 的三种视图：Summary / Comparison / Containment
- 掌握 Allocation Timeline 的读图方法
- 建立标准诊断流程：Snapshot #1 → 操作 → GC → Snapshot #2 → Comparison
- 学会追踪 Closure 对象的 `[[Scopes]]` 查找被捕获的变量

### 看到什么
- 打开实验页面 `experiment/src/index.html`
- 触发 3 种泄漏模式
- 在 Heap Snapshot Comparison 视图中看到增量对象
- 在 Containment 视图中追踪引用链，找到 GC Root → 泄漏对象的完整路径
- 修复后重新拍快照，确认泄漏对象被回收

### 说明什么
- **诊断闭环已建立**：能从内存异常 → 定位泄漏类型 → 追踪引用链 → 确认修复
- Heap Snapshot 的 Comparison 视图是最强的泄漏定位工具——两个快照的差异就是泄漏增量
- Allocation Sampling 适合线上监控，Heap Snapshot 适合开发调试

### 接下来去哪
- 结合 SPA 框架（React/Vue）的实际场景，建立组件级别的内存清理 checklist
- 探索 Memlab 等自动化泄漏检测工具

### 做到才算过
- [ ] 能独立完成：打开实验页面 → 触发泄漏 → 拍 Snapshot → Comparison → 定位泄漏 → 修复 → 验证
- [ ] 能在 Containment 视图中找到 Detached DOM 的引用链并解释每个节点
- [ ] 能在 Closure 对象中找到 `[[Scopes]]` 并识别被捕获的变量
- [ ] 能解释 Heap Snapshot 和 Allocation Sampling 的适用场景差异

---

## 阶段总览

```
阶段 1: GC 原理          阶段 2: DOM 泄漏模式        阶段 3: DevTools 诊断
┌─────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ V8 分代 GC   │ ──→  │ Detached DOM     │ ──→  │ Heap Snapshot    │
│ 可达性判断    │      │ 事件监听器泄漏    │      │ Comparison 视图  │
│ WeakRef 语义  │      │ 闭包捕获泄漏     │      │ Containment 追踪 │
└─────────────┘      └─────────────────┘      └─────────────────┘
  底层原理              应用层现象              诊断工具
  "为什么"              "是什么"               "怎么找"
```
