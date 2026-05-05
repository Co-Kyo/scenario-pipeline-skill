# 边界条件与陷阱清单：内存泄漏——长时间运行页面的性能退化排查

> 共 3 大类、16 个坑点。每个坑点包含：现象、触发条件、检测方法、缓解方案、关联能力 ID。

---

## 一级：致命

### 1. 新生代 Scavenge 存活过多导致长时间停顿

- **现象**：页面明显卡顿，帧率骤降至个位数，GC 暂停时间从亚毫秒级飙升至数十毫秒
- **触发条件**：短时间内创建大量短生命周期对象，但其中相当比例被意外引用（如闭包捕获、全局缓存），导致 Scavenge 回收时存活集过大，需反复复制
- **检测**：Chrome DevTools → Performance 面板录制，观察 GC 蓝色竖条的持续时间；Heap Snapshot 对比两次快照中 `Array`、`Object` 等临时对象是否大量驻留
- **缓解**：① 减少临时对象创建（对象池、复用）；② 缩小闭包捕获范围，避免意外持有大对象；③ 拆分大数组为分片处理；④ 使用 `WeakRef` 代替强引用持有临时数据
- **能力 ID**：A12

### 2. 老生代 Full GC 超 100ms 引发可感知卡顿

- **现象**：页面运行一段时间后出现规律性卡顿，间隔约数十秒到数分钟，每次卡顿持续 100ms 以上
- **触发条件**：老生代堆内存持续增长（泄漏），达到堆上限时触发 Mark-Sweep-Compact 全量回收，碎片化严重时还需内存整理
- **检测**：① DevTools Performance 录制中 GC 标记显示 "Major GC"；② `performance.memory.usedJSHeapSize` 持续增长不回落；③ 堆快照中 Retained Size 排序找出大对象链
- **缓解**：① 定位并修复泄漏源；② 设置合理的 `--max-old-space-size`（Node.js 环境）；③ 对大数据集使用 `ArrayBuffer` + 手动管理生命周期；④ 考虑 Web Worker 隔离长生命周期数据处理
- **能力 ID**：A12

### 3. 堆快照拍摄本身导致页面长时间冻结

- **现象**：点击 "Take heap snapshot" 后页面无响应数秒到数十秒，大型应用可能超过 30 秒
- **触发条件**：堆内存超过数百 MB 时拍摄快照需要遍历整个对象图并序列化，期间 JavaScript 主线程完全阻塞
- **检测**：拍摄前记录时间戳，拍摄后对比；DevTools 底部状态栏会显示快照大小和耗时
- **缓解**：① 使用 Allocation Instrumentation on Timeline 替代全量快照（增量采样，开销更低）；② 在测试环境而非生产环境拍摄快照；③ 缩小快照范围：先强制 GC 再拍摄；④ 使用 `--sampling-heap-profiler`（Node.js）进行低开销采样
- **能力 ID**：A13

### 4. 大型堆快照文件超出分析工具处理能力

- **现象**：导出的 `.heapsnapshot` 文件超过 500MB，DevTools 加载时崩溃或极度缓慢，无法完成 Comparison 视图渲染
- **触发条件**：SPA 长时间运行后对象数量达千万级，或存在大量重复字符串/闭包导致快照膨胀
- **检测**：导出后查看文件大小；DevTools Memory 面板加载进度条长时间不动或报错
- **缓解**：① 在拍摄前手动触发 GC（DevTools Memory 面板左上角垃圾桶图标）减少噪声；② 使用 `heapdump`（Node.js）+ 专用分析工具（如 `devtools-frontend` 命令行版本）；③ 分段拍摄：在关键操作前后各拍一张，用 Comparison 视图只看增量；④ 使用 Chrome Canary 的 `--heap-snapshot-on-oom` 仅在 OOM 前自动拍摄
- **能力 ID**：A13

---

## 二级：严重

### 5. 匿名函数注册事件监听器无法移除

- **现象**：事件监听器数量持续增长，`getEventListeners(document)` 输出越来越长，页面响应变慢
- **触发条件**：使用 `addEventListener(type, function() {...})` 注册匿名回调，组件销毁时无法通过相同引用调用 `removeEventListener`，在 SPA 路由切换时反复注册
- **检测**：① DevTools → Elements → Event Listeners 面板查看监听器数量；② 控制台 `getEventListeners($0)` 检查单个元素；③ Heap Snapshot 搜索 `EventListener` 对象数量趋势
- **缓解**：① 将事件处理函数提取为命名函数或类方法；② 使用 `AbortController` 传入 `{ signal }` 选项，`controller.abort()` 一键移除；③ 框架层面利用生命周期钩子自动清理（React `useEffect` 返回函数、Vue `onUnmounted`）；④ 封装事件管理器，统一注册/注销
- **能力 ID**：A14

### 6. SPA 路由切换未清理副作用

- **现象**：每次路由切换后内存基线上升，多次导航后页面明显变慢，最终崩溃
- **触发条件**：路由组件未在卸载时清理：事件监听器、定时器、WebSocket 连接、IntersectionObserver、MutationObserver、全局状态订阅等
- **检测**：① 反复切换路由 10 次，对比前后 Heap Snapshot 的 Object Count；② Performance Monitor（DevTools → ⋯ → More tools）观察 DOM Nodes、JS Heap 持续增长；③ 检查 `PerformanceObserver`、`ResizeObserver` 等 API 是否被重复创建
- **缓解**：① 框架路由守卫中统一执行清理逻辑；② 使用 `WeakRef` + `FinalizationRegistry` 自动感知组件销毁；③ 建立"副作用注册表"模式：所有副作用集中注册，路由切换时统一注销；④ CI 中集成内存回归测试
- **能力 ID**：A14

### 7. once/passive 选项误用导致监听器残留

- **现象**：设置 `{ once: true }` 的监听器在预期触发前被移除后仍残留；`{ passive: true }` 的监听器被错误地用于需要 `preventDefault()` 的场景
- **触发条件**：① `once` 监听器注册后，组件在事件触发前卸载，但未手动移除（`once` 只在触发后自动移除）；② `passive` 监听器中调用 `preventDefault()` 被静默忽略，滚动穿透未被阻止，开发者误以为是内存问题反复添加新监听器
- **检测**：① 控制台警告 "Unable to preventDefault inside passive event listener"；② Heap Snapshot 中 `EventListener` 对象的 `type` 字段分析；③ `getEventListeners()` 检查目标元素上实际存活的监听器
- **缓解**：① 对 `once` 监听器同样在组件卸载时手动移除，不依赖自动触发；② 明确区分 `passive` 使用场景（仅用于 `touchstart`/`touchmove`/`wheel` 等不需要 `preventDefault` 的场景）；③ 使用 `AbortController` 统一管理，`once` 和普通监听器用同一个 signal
- **能力 ID**：A14

### 8. setInterval 闭包引用大对象导致无法回收

- **现象**：页面运行时间越长，Heap 中 `ArrayBuffer`、`ImageData`、大型 `Object` 等的 Retained Size 持续增长
- **触发条件**：`setInterval` 回调闭包捕获了外部大对象（如图片数据、缓存数组），即使页面其他部分已不再使用这些数据，闭包仍保持强引用
- **检测**：① Heap Snapshot → Computed views → 按 Retained Size 排序，查看 "Retainer" 链是否指向 `setInterval` 的闭包；② 搜索 "Timer" 相关对象数量
- **缓解**：① 回调中仅引用必要数据，大对象通过 ID 间接引用；② 使用 `WeakRef` 持有大对象，回调中先 `deref()` 检查；③ 定时器任务完成后立即 `clearInterval`；④ 用 `requestAnimationFrame` + 时间检查替代高频 `setInterval`
- **能力 ID**：A15

### 9. 定时器堆叠——重复 setInterval 未清理

- **现象**：同一个操作被执行越来越频繁，CPU 占用持续走高，内存中出现大量重复的定时器回调闭包
- **触发条件**：① 组件重复挂载时多次调用 `setInterval` 但仅在某一分支调用 `clearInterval`；② 热重载（HMR）后旧定时器未清理；③ `setInterval` 的 ID 未持久化，导致无法 `clearInterval`
- **检测**：① Performance 面板的 Bottom-Up 视图中查看同一函数被调用频率异常高；② 控制台 `let count = 0; const orig = window.setInterval; window.setInterval = function(...a) { count++; return orig.apply(this, a); };` 监控创建数量；③ Heap Snapshot 搜索闭包对象数量
- **缓解**：① 将定时器 ID 存储在组件实例或闭包中，确保清理路径可达；② 使用 `requestAnimationFrame` + 手动时间检查（天然不堆叠）；③ 封装 `useInterval` Hook，自动处理挂载/卸载；④ 开发环境开启 StrictMode 暴露重复挂载问题
- **能力 ID**：A15

### 10. 忘记 clearInterval / clearTimeout

- **现象**：页面空闲时 CPU 仍不为零，Network 面板持续有请求，内存缓慢增长
- **触发条件**：定时器在组件销毁、条件分支变化、用户操作完成后未被清理，回调持续执行并可能触发级联操作（如轮询请求、DOM 更新）
- **检测**：① `clearInterval`/`clearTimeout` 调用次数与 `setInterval`/`setTimeout` 创建次数对比；② 断开网络后观察是否仍有请求发出（定时器驱动的轮询）；③ 空闲页面的 Performance Monitor 是否有 CPU 活动
- **缓解**：① 使用 `AbortController` 统一管理异步操作生命周期；② 封装 `useTimer` 自动清理 Hook；③ 编写 ESLint 规则检测 `setInterval`/`setTimeout` 返回值是否被使用；④ 开发模式下安装 `timer-check` 等工具监控泄漏
- **能力 ID**：A15

---

## 三级：隐蔽

### 11. WeakMap 键必须是对象——原始类型导致静默失败

- **现象**：`WeakMap` 中的条目预期被回收但实际仍占用内存，或 `WeakMap.set()` 对原始类型键抛出 `TypeError`
- **触发条件**：① 使用数字、字符串、Symbol 等原始类型作为 `WeakMap` 键；② 误将 `WeakMap` 当作通用缓存，期望所有键都能被 GC 回收；③ 框架内部使用 `WeakMap` 关联 DOM 节点，但节点被 `innerHTML` 替换后引用断裂
- **检测**：① `try { weakMap.set(1, 'value') } catch(e) { console.log(e) }` 验证键类型；② Heap Snapshot 中搜索 `WeakMap` 对象，检查 `WeakCell` 数量是否符合预期；③ 单元测试覆盖非对象键场景
- **缓解**：① 文档化 `WeakMap` 的对象键约束；② 对需要使用原始类型键的场景，包装为对象（如 `{ value: key }`）或使用 `Map` + 手动清理；③ 对 DOM 关联数据，优先使用 `dataset` 或 `WeakRef` + `FinalizationRegistry`
- **能力 ID**：A16

### 12. WeakRef.deref() 返回 undefined 时未处理

- **现象**：应用偶发 `TypeError: Cannot read properties of undefined`，或缓存命中率意外下降
- **触发条件**：通过 `WeakRef` 持有对象引用，GC 回收后 `deref()` 返回 `undefined`，但代码未做空值检查直接访问属性
- **检测**：① 代码审查中搜索所有 `.deref()` 调用点，检查是否有空值保护；② 使用 `WeakRef` 回调模式（`.deref() ?? fallback`）；③ 单元测试中模拟 GC 后的 `undefined` 场景
- **缓解**：① 所有 `deref()` 调用必须有 `undefined` 检查或使用 `??` 运算符；② 封装 `SafeWeakRef` 类，提供 `.get()` 方法自动处理 undefined；③ 在缓存场景中，`deref()` 返回 undefined 时触发重新加载逻辑
- **能力 ID**：A16

### 13. FinalizationRegistry 回调时机不确定——清理逻辑不可靠

- **现象**：依赖 FinalizationRegistry 的资源清理（如关闭 WebSocket、释放 GPU 资源）时有时无，资源残留不稳定
- **触发条件**：① 回调执行时机取决于 GC 调度，可能延迟数秒到数分钟；② 页面关闭前回调可能根本不会执行；③ 回调中抛出的异常被静默吞掉；④ 多个回调的执行顺序不确定
- **检测**：① 在回调中添加 `console.log` 观察执行时机和频率；② 使用 `performance.measureUserAgentSpecificMemory()`（需要隔离环境）间接观察 GC 行为；③ 压力测试中统计资源释放率
- **缓解**：① 不将 FinalizationRegistry 作为主要清理机制，仅作为兜底/统计手段；② 关键资源（网络连接、GPU buffer）必须在确定性生命周期点手动释放；③ 配合 `beforeunload`/`pagehide` 事件做最终清理；④ 回调中做好异常处理，避免影响后续回调
- **能力 ID**：A16

### 14. DevTools 自身消耗内存干扰分析结果

- **现象**：开启 DevTools 后页面内存占用明显增加，堆快照中出现大量 `DevTools` 相关对象，分析结果与实际生产环境不符
- **触发条件**：① Memory 面板保持打开状态持续记录；② Performance 面板录制过程中；③ 开启了 "Record heap allocations" 的 Allocation Timeline；④ Console 面板保留大量日志
- **检测**：① 关闭 DevTools 前后对比 `performance.memory.usedJSHeapSize`；② 在另一个浏览器实例中用 `chrome://inspect` 远程调试目标页面；③ 检查堆快照中是否存在 `InjectedScript`、`DevToolsApp` 等对象
- **缓解**：① 分析时使用独立的调试浏览器实例，避免开发环境干扰；② 分析前先关闭 Console、Network 等无关面板；③ 使用 `--headless` 模式 + CDP 协议进行自动化内存分析；④ Node.js 环境下使用 `--inspect-brk` 避免 DevTools 前端开销
- **能力 ID**：A17

### 15. Performance 面板录制本身影响页面性能

- **现象**：录制期间页面比正常运行时更卡，GC 频率异常高，录制结束后性能恢复正常
- **触发条件**：① Performance 录制需要持续收集调用栈、DOM 事件、内存快照等数据，产生额外内存分配；② 长时间录制（>30 秒）产生的 trace 数据本身可达数十 MB；③ 录制期间的 GC 事件也会被记录，形成"观测者效应"
- **检测**：① 对比录制前后的 `performance.memory` 值；② 录制后检查 trace 文件大小；③ 使用 `performance.now()` 测量录制期间关键函数的执行时间偏移
- **缓解**：① 录制时间控制在 10-15 秒内，聚焦关键操作；② 使用 `performance.mark()`/`performance.measure()` 替代全量录制做定向性能分析；③ 生产环境使用 RUM（Real User Monitoring）工具替代 DevTools 录制；④ 对内存分析优先使用 Heap Snapshot 而非 Performance 录制
- **能力 ID**：A17

### 16. Allocation Timeline 采样精度与开销的权衡

- **现象**：Allocation Timeline 要么开销太大导致页面行为变形，要么采样率太低遗漏小对象分配
- **触发条件**：① 默认采样间隔下，高频小对象分配（如每帧创建的临时对象）可能被采样遗漏；② 开启 "Allocation instrumentation on timeline" 后，每个对象分配都记录堆栈，开销约为正常运行的 2-5 倍；③ 大量短生命周期对象产生的采样数据淹没真正的大对象分配
- **检测**：① 对比开启/关闭 Allocation Timeline 时同一操作的执行时间；② 在 Allocation Timeline 视图中检查对象分配的时间分布是否合理；③ 使用 `--sampling-heap-profiler`（Node.js）设置采样间隔参数对比结果
- **缓解**：① 优先使用 Heap Snapshot Comparison（前后对比）而非 Allocation Timeline 定位泄漏；② 仅在明确需要分配来源时开启 Allocation Timeline，操作完成后立即关闭；③ Node.js 环境使用 `--heap-prof` 离线分析，避免运行时开销；④ 对高频分配场景，使用 `performance.measureUserAgentSpecificMemory()`（需 Chrome 91+，HTTPS，隔离上下文）
- **能力 ID**：A17

---

## 快速参考表

| 严重等级 | 坑点数 | 核心风险 | 关键缓解策略 |
|---------|--------|---------|-------------|
| 🔴 致命 | 4 | GC 停顿、快照冻结 | 减少存活对象、分段快照、替代采样工具 |
| 🟠 严重 | 6 | 事件/定时器泄漏 | 命名函数、AbortController、组件生命周期清理 |
| 🟡 隐蔽 | 6 | 弱引用陷阱、分析工具干扰 | 空值保护、兜底机制、隔离调试环境 |

---

*最后更新：2026-05-05*
