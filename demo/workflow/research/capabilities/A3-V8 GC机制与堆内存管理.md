# V8 GC 机制与堆内存管理

> ID: A3 | 扇出: 2/8 | 耦合度: 1 | 战略价值: 1.0 | 🏕️ 三级能力

## 核心机制

V8 引擎的垃圾回收采用**分代式 GC**：

**新生代（Young Generation / Nursery）**：
- 空间小（1-8MB），存放短生命周期对象
- 使用 **Scavenge 算法**（Cheney's semi-space）：将存活对象复制到另一空间，原空间整体回收
- 速度快（<1ms），但空间利用率仅 50%

**老生代（Old Generation / Tenured）**：
- 空间大（默认 700MB-1.4GB），存放长生命周期对象
- 使用 **Mark-Sweep-Compact**：标记存活 → 清除死亡 → 压缩碎片
- 采用增量标记（Incremental Marking）和并发标记（Concurrent Marking）减少停顿

**晋升规则**：新生代对象经历两次 Scavenge 仍存活 → 晋升到老生代。

**WeakRef / WeakMap**：弱引用不阻止 GC 回收。当对象只被 WeakRef/WeakMap 引用时，GC 可以自由回收。

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|---------|---------|---------|---------|
| 1 | Detached DOM 节点 | DOM 从文档移除但 JS 仍持有引用 | 内存持续增长不回落 | Memory 面板 → Heap Snapshot → 搜索 Detached | 移除 DOM 后断开所有 JS 引用（赋 null） |
| 2 | 全局缓存无界增长 | Map/Set 持久保存对象无淘汰策略 | 老生代占用持续上升 | Memory 面板 → Allocation Timeline | 使用 WeakMap 或 LRU/TTL 策略 |
| 3 | 闭包持有大对象 | 组件销毁后闭包仍引用大数组/DOM | 内存无法释放 | Heap Snapshot → Retainers 链 | 闭包内及时置空引用 |
| 4 | 事件监听器泄漏 | addEventListener 未配对 removeEventListener | 回调持有对象无法回收 | Memory 面板 → Detached + EventListener 计数 | 成对清理，或用 AbortController |
| 5 | GC 停顿导致掉帧 | 老生代 GC 标记-清除阶段停顿 | 周期性帧率下降（GC spike） | Performance 面板 → 绿色 GC 任务 | 减少长生命周期对象分配，避免频繁创建大对象 |

## 调试工具

| 工具 | 用法 |
|------|------|
| Chrome DevTools Memory 面板 | Heap Snapshot 对比、Allocation Instrumentation |
| `performance.measureUserAgentSpecificMemory()` | 新 API，精确测量页面内存（需 HTTPS） |
| Performance 面板 → Memory 勾选 | 录制时观察 JS Heap 曲线和 GC 回收情况 |

## 典型权衡

| 维度 | 方案 A | 方案 B | 选择建议 |
|------|--------|--------|---------|
| 引用类型 | 强引用（Map，保证不被回收）| 弱引用（WeakMap，允许 GC 回收）| 缓存/关联数据用 WeakMap，业务状态用 Map |
| 清理策略 | 手动 removeEventListener（精确但易遗漏）| AbortController（统一取消，但需封装）| 多个请求/监听统一用 AbortController |

## 参考资料

- [T1] V8 Blog: Garbage Collection: https://v8.dev/blog/garbage-collection-2024
- [T2] Chrome DevTools Memory Problems: https://developer.chrome.com/docs/devtools/memory-problems
