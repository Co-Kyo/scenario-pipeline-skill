# V8 GC机制

> ID: A3 | 扇出: 2/8 | 耦合度: 1 | 战略价值: 2.0

## 核心机制

### 分代 GC (Generational GC)

V8 将堆（Heap）划分为**新生代（Young Generation）**和**老生代（Old Generation）**两个区域，基于「分代假说」——大多数对象生命周期极短（"most objects die young"）。

- **新生代**：又细分为 Nursery（初始分配区）和 Intermediate（存活一次 GC 后的过渡区）。采用 **Semi-Space** 设计，一半空间始终为空用于 evacuation。
- **老生代**：存放多次 GC 后仍然存活的长生命周期对象。

对象晋升路径：`Nursery → Intermediate → Old Generation`

### 新生代 Scavenge (Minor GC)

Scavenge 是新生代的专用 GC，采用 **Cheney's Semi-Space** 算法：

1. **标记（Marking）**：从 root set（栈、全局对象）和 old-to-new 引用出发，标记所有可达对象
2. **疏散（Evacuation）**：将存活对象从 From-Space 复制到 To-Space，连续排列消除碎片
3. **指针更新（Pointer Updating）**：通过 forwarding address 更新所有引用到新位置

关键优化：
- **Write Barrier**：维护 old-to-new 引用列表，避免每次 Scavenge 遍历整个老生代
- **Thread-Local Allocation Buffers (TLAB)**：每个线程独立分配缓冲，无锁快速分配
- **并行 Scavenger**：多个 helper 线程同时处理 evacuation，通过 atomic CAS 同步

Scavenge 速度取决于存活对象数量，大多数情况下 < 1ms。

### 老生代 Mark-Sweep / Mark-Compact (Major GC)

Major GC 收集整个堆，分三个阶段：

1. **并发标记（Concurrent Marking）**：helper 线程在后台标记对象，主线程继续执行 JS。Write barrier 追踪标记期间新创建的引用
2. **标记终结（Mark Finalization）**：主线程暂停，重新扫描 root set 确保完整性。这是 Major GC 的主要暂停时间
3. **清扫与压缩（Sweeping & Compaction）**：
   - **Sweeping**：将死对象占用的内存加入 free-list（按大小分类），由专用 sweeper 线程并发执行
   - **Compaction**：基于碎片化启发式选择部分页面进行压缩，将存活对象迁移到其他页面。只对高碎片页面执行，避免复制长生命周期对象的高开销

### 并发 GC (Orinoco 项目)

V8 的 Orinoco 项目将 GC 从 stop-the-world 演进为三种并行策略：

| 策略 | 描述 | 主线程影响 |
|------|------|-----------|
| **Parallel** | 主线程 + helper 线程同时工作，仍 stop-the-world | 暂停时间 ÷ 线程数 |
| **Incremental** | 主线程分多次小片段完成 GC 工作 | 每片段 < 5ms，可响应用户输入 |
| **Concurrent** | helper 线程后台执行 GC，主线程完全自由 | 仅少量同步开销 |

当前 V8 的实际组合：
- **Scavenger**：Parallel（多线程并行疏散）
- **Major GC 标记**：Concurrent + Incremental fallback
- **Major GC 清扫**：Concurrent
- **Major GC 压缩**：Parallel

### Idle-Time GC

V8 利用浏览器空闲时间（如 60fps 动画帧间剩余时间）执行 GC 任务。Chrome 的任务调度器估算空闲时长，V8 据此决定执行何种 GC 操作。在桌面端约 43% 的 GC 工作可在空闲时间完成，移动端约 31%。

### WeakRef / WeakMap / WeakSet

- **WeakRef**：持有对象的弱引用，不阻止 GC 回收目标对象。通过 `deref()` 访问，可能返回 `undefined`
- **FinalizationRegistry**：在对象被 GC 回收后执行清理回调（不保证时机）
- **WeakMap**：key 为弱引用的 Map，key 被 GC 回收后 entry 自动移除。使用 **Ephemeron** 机制处理 key-value 间的循环引用
- **WeakSet**：value 为弱引用的 Set，仅存储对象或 Symbol

约束：WeakMap/WeakSet 不可迭代，防止泄漏弱引用对象的存活状态。

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|----------|----------|----------|----------|
| 1 | 新生代 Scavenge 停顿 | 大量短生命周期对象存活 | 主线程卡顿，动画丢帧 | DevTools Performance 面板 GC 标记 | 减少临时对象分配，使用对象池 |
| 2 | Major GC 长暂停 | 老生代接近动态堆限制，碎片化严重 | 页面明显卡顿（>100ms） | `--trace-gc` 标记 "Mark-Compact" 耗时 | 控制长生命周期对象数量，及时解除引用 |
| 3 | 内存泄漏 | 闭包持有大对象引用、全局缓存无上限、事件监听器未移除 | 内存持续增长，RSS 不断上升 | Heap Snapshot 对比、Timeline 内存曲线 | WeakMap 缓存、清理事件监听器、限制缓存大小 |
| 4 | 堆碎片化 | 频繁分配/释放不同大小对象 | 内存占用高但可用少，频繁触发 Compaction | `--trace-gc` 观察 Compaction 频率 | 统一对象大小，使用 TypedArray |
| 5 | GC 与渲染竞争 | Concurrent GC 的同步开销叠加高渲染压力 | FPS 不稳定，偶发掉帧 | Performance 面板 Long Task 检测 | 减少堆压力，拆分大任务 |
| 6 | WeakRef 悬空 | 对象被 GC 回收后仍尝试 deref | `undefined` 异常或逻辑错误 | 代码审查，检查 `deref()` 返回值 | 始终检查 `deref()` 结果，提供 fallback |

## 调试工具

| 工具 | 用法 |
|------|------|
| **Chrome DevTools → Memory** | Heap Snapshot 拍摄快照对比；Allocation Timeline 追踪分配；Allocation Sampling 采样热点 |
| **Chrome DevTools → Performance** | 录制时间线，查看 GC 事件标记、暂停时长、内存曲线 |
| **`node --trace-gc`** | 输出每次 GC 的类型（Scavenge/Mark-Compact）、耗时、堆大小变化 |
| **`node --trace-gc-verbose`** | 输出更详细的 GC 信息，包括并行/并发标记 |
| **`node --expose-gc --inspect`** | 暴露 `global.gc()` 手动触发 GC，配合 inspect 调试 |
| **`node --max-old-space-size=N`** | 调整老生代堆上限（MB），缓解 OOM |
| **`process.memoryUsage()`** | 返回 `rss`/`heapTotal`/`heapUsed`/`external` 实时内存数据 |
| **Heapdump (npm)** | 生产环境堆快照导出，离线分析 |
| **WeakRef + FinalizationRegistry** | 监控对象回收时机（调试用，不保证触发） |

## 典型权衡

| 维度 | 方案A | 方案B | 选择建议 |
|------|-------|-------|----------|
| 缓存策略 | Map（强引用） | WeakMap（弱引用） | 需要持久缓存用 Map；临时缓存/避免内存泄漏用 WeakMap |
| 对象生命周期 | 长生命周期对象集中管理 | 短生命周期对象频繁创建销毁 | 减少不必要的长生命周期引用；短生命周期对象利用分代 GC 天然优势 |
| 大数据处理 | 单个大 ArrayBuffer | 分片多个小 Buffer | 分片减少单次 GC 标记压力；但增加对象数量开销 |
| GC 调优 | 增大 `max-old-space-size` | 优化代码减少内存使用 | 优先优化代码；堆上限只是缓解手段，不是解决方案 |
| 并发模型 | 多 Worker 共享 SharedArrayBuffer | 单线程 + 异步 | SharedArrayBuffer 不受 GC 管理，避免 GC 开销但增加同步复杂度 |
| 清理机制 | 手动 `= null` 解除引用 | 依赖 GC 自动回收 | 关键路径上的大对象手动解除引用加速回收；普通场景信任 GC |

## 最小验证实验

### 实验 1：观察分代 GC 行为

```bash
node --trace-gc -e "
  // 创建大量短生命周期对象，观察 Scavenge
  for (let i = 0; i < 100000; i++) {
    const obj = { data: new Array(100).fill(i) };
  }
  // 创建长生命周期对象，观察晋升到老生代
  const longLived = [];
  for (let i = 0; i < 50000; i++) {
    longLived.push({ data: new Array(100).fill(i) });
  }
  global.gc && global.gc();
"
```

### 实验 2：WeakRef 行为验证

```bash
node --expose-gc -e "
  let ref;
  (function() {
    const obj = { data: 'test' };
    ref = new WeakRef(obj);
    console.log('Inside scope:', ref.deref()); // { data: 'test' }
  })();
  global.gc();
  console.log('After GC:', ref.deref()); // undefined
"
```

### 实验 3：内存泄漏检测

```bash
node --expose-gc -e "
  const cache = new Map();
  // 模拟泄漏：Map 持续增长
  for (let i = 0; i < 100000; i++) {
    cache.set(i, { data: new Array(100) });
  }
  console.log('Before:', process.memoryUsage());
  global.gc();
  console.log('After GC:', process.memoryUsage());
  // 对比：使用 WeakMap
  const wCache = new WeakMap();
  for (let i = 0; i < 100000; i++) {
    const key = {};
    wCache.set(key, { data: new Array(100) });
  }
  global.gc();
  console.log('WeakMap after GC:', process.memoryUsage());
"
```

## 参考资料

1. [Trash Talk — V8 官方博客](https://v8.dev/blog/trash-talk) — V8 GC 架构全面解析，Orinoco 项目详解
2. [Free Garbage Collection — V8 官方博客](https://v8.dev/blog/free-garbage-collection) — Idle-Time GC 机制
3. [Memory Management — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management) — JavaScript 内存生命周期与 GC 算法
4. [Orinoco: V8's garbage collector — V8 Blog](https://v8.dev/blog/orinoco) — 并发/并行 GC 设计
5. [Orinoco parallel scavenger — V8 Blog](https://v8.dev/blog/orinoco-parallel-scavenger) — 并行 Scavenger 细节
6. [WeakRef and FinalizationRegistry — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef) — WeakRef API 文档
