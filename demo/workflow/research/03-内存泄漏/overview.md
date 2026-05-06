# P3-内存泄漏 — 链路编排

> 内存泄漏：长时间运行页面的内存泄漏排查与治理——H5/SPA场景

## 链路总览

```
H5/SPA 痛点（入口）
    ↓
JS 引擎 GC → V8 分代回收 → 何时能回收、何时不能
    ↓
DOM 生命周期 → 节点创建/挂载/卸载 → Detached DOM 与闭包陷阱
    ↓
DevTools 诊断 → Heap Snapshot / Allocation Timeline → 定位泄漏源
    ↓
治理方案 → WeakRef / AbortController / 组件卸载清理
    ↓
H5/SPA 落地（出口）
```

---

## 节点 1：V8 GC 机制（A3）

**在链路中的角色**：理解"什么能被回收、什么不能"的底层基础。

### 机制

V8 采用分代 GC 架构，将堆划分为两个区域：

- **新生代（Young Generation）**：存放短生命周期对象（临时变量、事件回调闭包等）。采用 Scavenge（Semi-Space evacuation）算法——将存活对象从 From-Space 复制到 To-Space，然后交换。Parallel Scavenger 多线程并行加速。
- **老生代（Old Generation）**：存放经过两次 Scavenge 仍存活的对象。采用 Mark-Sweep（标记-清除）或 Mark-Compact（标记-整理）算法。Orinoco 项目引入 Concurrent Marking（并发标记，在后台线程执行）+ Incremental Marking（增量标记，分片执行）+ Parallel Compaction（并行压缩），将暂停时间从 >100ms 降至 <10ms。

**内存泄漏的本质**：GC 只能回收不可达（unreachable）对象。只要存在一条从 GC Root（全局对象、调用栈、DOM 树）到目标对象的引用路径，该对象就不会被回收。

### 命题特有瓶颈

- **闭包捕获导致隐式泄漏**（A3-B3，P0）：SPA 组件中回调函数闭包捕获了已卸载组件的状态 → 整个作用域链无法 GC → 内存持续增长
- **Scavenge 停顿**（A3-B1，P1）：H5 页面频繁创建临时对象（滚动事件、动画帧回调）→ 新生代 GC 频繁 → 主线程暂停 >10ms → 掉帧
- **Major GC 长暂停**（A3-B2，P1）：长时间运行后老生代碎片化 → Mark-Compact 暂停超 100ms → 页面明显卡顿

### H5/SPA 场景放大

移动端设备内存有限（iOS Safari 约 1GB，Android WebView 约 512MB-1GB），V8 堆上限更低。H5 页面如果存在缓慢泄漏，可能在用户浏览 5-10 分钟后就触发标签页崩溃（iOS）或 OOM Kill（Android）。

---

## 节点 2：DOM 生命周期（A2）

**在链路中的角色**：理解"节点何时创建、何时销毁、何时变成幽灵"。

### 机制

DOM 节点的五阶段生命周期：

1. **创建**：`document.createElement()` / `document.createTextNode()`
2. **挂载**：`appendChild()` / `insertBefore()` → 节点进入文档树，`isConnected === true`
3. **更新**：属性/子树变更 → 触发 MutationObserver 回调
4. **卸载**：`removeChild()` / `remove()` → 节点离开文档树，`isConnected === false`
5. **垃圾回收**：当节点不可达时（无 JS 引用 + 不在文档树），GC 回收

**Detached DOM**：节点已从文档树移除（阶段 4），但 JS 仍持有引用（闭包、全局缓存、事件监听器），导致无法进入阶段 5。这是内存泄漏最常见的形式。

### 命题特有瓶颈

- **Detached DOM 泄漏**（A2-B1，P0）：SPA 路由切换时旧页面组件 DOM 被移除，但事件监听器、闭包回调、框架内部缓存仍持有引用 → Detached DOM 树在内存中持续存在
- **事件监听器泄漏**（A2-B2，P0）：`addEventListener` 后未配套 `removeEventListener`，SPA 路由切换时尤为突出 → 事件回调重复执行，闭包链无法释放
- **闭包持有过期 DOM 引用**（隐式泄漏）：`const el = document.getElementById('xxx'); el.addEventListener('click', () => doSomething(el))` → 即使 el 被 remove，闭包仍持有 el 引用

### H5/SPA 场景放大

SPA 框架（React/Vue）的组件卸载机制并不能自动清理所有副作用。`useEffect` 返回的清理函数、`addEventListener`、`setInterval`、第三方库实例都需要手动清理。H5 页面中常见的场景：列表页→详情页→返回列表页，每次路由切换都有泄漏，反复几次后内存翻倍。

---

## 节点 3：DevTools 诊断（A8）

**在链路中的角色**：从"怀疑有泄漏"到"精确定位泄漏源"的诊断闭环。

### 机制

Chrome DevTools Memory 面板提供三种核心诊断工具：

1. **Heap Snapshot（堆快照）**：
   - 拍摄堆内存的完整快照，展示所有存活对象及其引用关系
   - 关键视图：Summary（按构造函数分组）、Comparison（两个快照对比，找出增量对象）、Containment（GC Root 引用树）
   - 过滤 Detached：在 Summary 视图中搜索 `Detached`，直接定位泄漏的 DOM 子树

2. **Allocation Timeline（分配时间线）**：
   - 实时记录对象分配，以时间轴展示内存增长曲线
   - 蓝色竖条 = 分配了对象，灰色竖条 = 已被 GC 回收
   - 蓝色持续存在 = 泄漏（分配了但从未回收）

3. **Allocation Sampling（分配采样）**：
   - 低开销采样方式记录内存分配
   - 适合线上持续监控，不适合精确泄漏定位

**诊断流程**：
1. 打开 DevTools → Memory 面板
2. 拍 Heap Snapshot #1
3. 执行可疑操作（如反复切换路由）
4. 手动触发 GC（点击垃圾桶图标）
5. 拍 Heap Snapshot #2
6. Comparison 视图对比 #1 和 #2 → #Delta 列中新增的对象就是泄漏候选
7. 在 Containment 视图中追踪引用链，找到 GC Root → 泄漏对象的路径

### 命题特有瓶颈

- **Closure 泄漏难以定位**（A8-B1 变体）：闭包捕获的变量隐藏在作用域链中，Heap Snapshot 的 Retained Size 不直观 → 需要在 Containment 视图中展开 Closure 对象逐层检查
- **框架内部缓存干扰**：React/Vue 的 Fiber/VDOM 内部缓存可能导致 Heap Snapshot 中出现大量"看似泄漏"但实际正常的对象 → 需要区分框架缓存与真正泄漏

### H5/SPA 场景放大

移动端 H5 调试受限：iOS Safari Web Inspector 远程调试 Memory 面板功能不完整，Android WebView 需要 chrome://inspect。实际生产中更依赖 Allocation Sampling + 性能监控 SDK（如 Sentry Performance）进行线上内存趋势监控。

---

## 治理方案总览

基于以上三个节点的诊断，内存泄漏的治理形成三条路径：

| 泄漏类型 | 根因 | 治理方案 | 涉及能力 |
|---------|------|---------|---------|
| Detached DOM | JS 引用未释放 | 移除后置空引用 / WeakRef | A2 + A3 |
| 事件监听器 | addEventListener 未配套清理 | AbortController.signal 统一管理 | A2 |
| 闭包捕获 | 闭包持有过期变量 | 缩小闭包作用域 / WeakMap | A3 |
| 全局缓存 | Map 缓存无上限 | WeakMap / LRU 策略 / TTL | A3 |
| 定时器 | setInterval 未 clearInterval | 组件卸载时清理 / AbortController | A2 |
| 第三方库 | 库内部状态未销毁 | 调用 destroy()/dispose() 方法 | A2 |

---

## 链路依赖关系

```
A3 (V8 GC) ──理解什么能回收──→ A2 (DOM 生命周期) ──理解什么在泄漏──→ A8 (DevTools) ──定位泄漏源──→ 治理方案
```

**拓扑序**：A3 → A2 → A8

- 不理解 GC 机制，就不知道为什么 Detached DOM 不会被回收
- 不理解 DOM 生命周期，就不知道哪些操作会产生 Detached DOM
- 不理解 DevTools 诊断方法，就无法从"怀疑泄漏"到"定位根因"
