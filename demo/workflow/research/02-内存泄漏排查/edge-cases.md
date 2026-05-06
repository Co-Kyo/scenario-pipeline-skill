# 坑点提取：内存泄漏排查——SPA 长时间运行后卡顿

## 开篇：泄漏的隐蔽性

内存泄漏之所以难以排查，核心在于它的**渐进性与延迟性**。它不会像语法错误那样立即报错，也不会像网络超时那样给出明确的失败信号。一个 SPA 应用在开发环境里跑几分钟完全正常，上线后用户打开标签页放半天才开始卡顿——这种"时间炸弹"式的故障模式，使得泄漏往往逃过本地测试和 Code Review，直到用户投诉才暴露。

更棘手的是，泄漏的**表现与根因之间隔着多层抽象**。用户感知到的是"页面越来越卡"，但卡顿的直接原因可能是 V8 老生代 GC 停顿（而非某个具体的 bug），而 GC 停顿的根因又可能是某段业务代码持有了不该持有的 DOM 引用。沿着这条因果链倒推，需要开发者同时理解 JS 引擎的内存模型、浏览器的 DOM 生命周期和业务代码的资源管理逻辑——这正是排查的最大门槛。

---

## 主体：坑点象限与排查原理

以下按资源边界维度整理 8 个典型坑点，每个坑点说明"坑在哪"和"怎么排"。

### 坑点 1：Detached DOM 节点（资源边界 · P0）

**坑在哪：** 组件卸载时执行了 `el.remove()` 将节点从 DOM 树摘除，但 JS 闭包、变量或缓存仍持有对该节点的引用。浏览器无法回收这个节点及其子树的全部内存——包括绑定在其上的事件监听器、样式计算结果和图片等资源引用。

**排查原理：** Chrome DevTools → Memory → Heap Snapshot → 拍两个快照（操作前/操作后）→ 对比视图过滤 "Detached" 关键字。如果操作后的快照中出现新的 Detached DOM 节点，且 Retainer 链追溯到某个闭包或组件实例，即可定位泄漏源。

**坑点升级：** 框架层面的虚拟 DOM diff 可能隐式持有旧节点引用。例如 React 的 Fiber 节点在 commit 阶段完成前不会释放对旧 DOM 的引用，如果在 commit 前触发了异常导致 Fiber 树不完整更新，旧节点就成了 Detached 孤儿。

---

### 坑点 2：事件监听未解绑（资源边界 · P0）

**坑在哪：** SPA 路由切换时组件销毁，但注册在 `window`、`document` 或全局对象上的事件监听器未移除。后果有二：一是监听器回调函数闭包引用了已卸载组件的上下文，阻止 GC 回收；二是同一事件触发时所有历史监听器同时执行，导致重复回调、竞态和性能劣化。

**排查原理：** 在控制台执行 `getEventListeners(document)` 查看当前绑定的监听器数量。反复进出目标页面，如果 `click`/`scroll`/`resize` 等事件的监听器数量持续增长，即可确认泄漏。结合 Heap Snapshot 的 Retainer 视图，可追溯到未解绑的具体回调函数。

**坑点升级：** `addEventListener` 的第三个参数如果传入匿名函数或箭头函数，将无法用 `removeEventListener` 移除（引用不相等）。这是最常见的"解绑了但没生效"的原因。

---

### 坑点 3：定时器未清除（资源边界 · P0）

**坑在哪：** `setInterval` 或 `setTimeout` 在组件销毁时未调用 `clearInterval`/`clearCancel`。定时器回调闭包持有组件状态引用，阻止整个组件实例及其关联 DOM 的回收。如果回调中还在操作已移除的 DOM，还会产生运行时异常。

**排查原理：** Heap Snapshot 中搜索保留路径，如果某个组件实例的 Retainer 链经过 `setTimeout` 内部的 task 对象，即可确认。更直接的方法是在 `clearInterval` 处加断点，确认组件卸载时是否执行了清理逻辑。

**坑点升级：** 某些第三方库内部创建定时器（如轮询接口），组件销毁时不会自动清理。需要在 `useEffect` 的 cleanup 或 `beforeDestroy` 中手动调用库提供的 destroy/dispose 方法。

---

### 坑点 4：Observer 未 disconnect（资源边界 · P1）

**坑在哪：** `IntersectionObserver`、`MutationObserver`、`ResizeObserver` 创建后未在组件销毁时调用 `disconnect()`。Observer 持有对目标元素的引用，并持续在后台执行回调——即使元素已从 DOM 移除，回调仍然触发，消耗 CPU 且阻止关联对象的 GC 回收。

**排查原理：** Performance 面板录制时，如果在组件已卸载的阶段仍然看到 Observer 回调产生的 Long Task，即可确认。或者在 Observer 回调中打日志，确认组件销毁后回调是否仍在执行。

**坑点升级：** `MutationObserver` 监听 `document.body` 的子树变化时，每次 DOM 变更都会触发回调。如果回调内执行了重计算（如重新查询 DOM、触发重排），性能影响会被放大。

---

### 坑点 5：全局缓存无界增长（资源边界 · P0）

**坑在哪：** 使用 `Map`、`Set`、对象字典或模块级变量做缓存，但没有淘汰策略（TTL、LRU、大小上限）。随着用户浏览不同页面和数据，缓存持续膨胀，老生代堆内存单调上升，最终触发 Major GC 长停顿。

**排查原理：** Memory 面板连续拍多个 Heap Snapshot，如果某个 `Map`/`Set` 实例的 `shallow size` 持续增长且从未缩小，即可确认。通过 Retainer 视图追溯缓存的创建者，定位业务代码中的缓存逻辑。

**坑点升级：** `WeakMap`/`WeakRef` 可以避免强引用泄漏，但不能用于需要按 key 查询的场景。真正的解法是实现 LRU 缓存或设置 TTL + 定期清理。

---

### 坑点 6：请求未取消（资源边界 · P1）

**坑在哪：** 组件卸载后，之前发起的 `fetch`/`XMLHttpRequest` 响应回来，回调中执行 `setState` 或操作已卸载的组件。虽然 React 18+ 的 Strict Mode 会警告，但不会阻止闭包对组件实例的持有，GC 仍然无法回收。

**排查原理：** 在请求回调入口处加断点，确认组件卸载后回调是否仍然执行。或者在回调中检查 `this.isMounted`（类组件）或 ref 标志（函数组件），确认状态。

**坑点升级：** `AbortController` 是标准解法，但需要在 `useEffect` 的 cleanup 中调用 `controller.abort()`。如果 useEffect 依赖项写错导致 effect 重复创建但旧的 cleanup 未执行，会出现"多个 controller 实例同时挂起"的问题。

---

### 坑点 7：V8 GC 停顿导致帧率下降（时序竞争 · P1）

**坑在哪：** 即使没有明确的泄漏，大量短生命周期对象的频繁创建也会导致 Minor GC（Scavenge）过于频繁。而老生代对象积累到一定阈值后触发 Major GC（Mark-Sweep-Compact），单次停顿可达数十到数百毫秒，表现为周期性卡顿。

**排查原理：** Performance 面板录制后，关注 "GC" 事件块：颜色为黄色，标注 "Major GC" 或 "Minor GC"，停顿时长超过 16ms 即可能导致丢帧。结合 Memory 面板的堆内存曲线，如果呈锯齿状持续上升（老生代），说明 GC 压力来自长生命周期对象积累。

**坑点升级：** V8 的 Incremental Marking 和 Concurrent GC（Orinoco）可以将部分 GC 工作移到后台线程，但如果主线程长时间无空闲（Long Task 连续执行），增量标记无法推进，会退化为同步 GC 停顿。

---

### 坑点 8：Long Task 阻塞主线程（资源边界 · P0）

**坑在哪：** 某段同步 JS 执行超过 50ms，阻塞主线程，导致用户交互无响应、动画卡顿。常见来源：大型列表的同步渲染、复杂计算未分片、JSON.parse 大对象、同步布局抖动（layout thrashing）。

**排查原理：** Performance 面板中的 Long Task 条（红色三角标记），点击可展开查看调用栈。或使用 `PerformanceObserver` API 的 `longtask` 类型在代码中监听：
```js
new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    console.warn('Long Task:', entry.duration, entry.attribution);
  });
}).observe({ entryTypes: ['longtask'] });
```

**坑点升级：** Long Task 和内存泄漏存在恶性循环——GC 停顿本身就是 Long Task，而 Long Task 阻塞主线程又会阻碍增量 GC，导致后续 GC 停顿更长。

---

## 收尾：防御方案

### 编码规范层

| 防御手段 | 适用场景 | 实现要点 |
|---------|---------|---------|
| `useEffect` cleanup 函数 | React 组件资源清理 | 所有 `addEventListener`、`setInterval`、`Observer`、`AbortController` 必须在 cleanup 中清理 |
| `AbortController` | fetch 请求生命周期 | 在 effect cleanup 中调用 `controller.abort()`，回调中检查 `signal.aborted` |
| LRU/TTL 缓存 | 全局数据缓存 | 限制缓存大小或过期时间，避免 Map/Set 无界增长 |
| `WeakRef`/`WeakMap` | 临时关联数据 | 配合 `FinalizationRegistry` 做清理，避免强引用环 |
| 分片渲染 | 大列表/长任务 | 使用 `requestIdleCallback`、`requestAnimationFrame` 或 `scheduler` 将长任务拆分为 5ms 以内的小块 |

### 工程治理层

1. **CI 内存基线检测**：在 E2E 测试中注入内存检查——操作前后拍 Heap Snapshot 对比，Detached DOM 节点数量和堆增量超过阈值即失败。
2. **生产环境监控**：接入 `PerformanceObserver` 的 `longtask` 和 `measure` 类型，上报 Long Task 频率和内存趋势到监控平台。
3. **Code Review Checklist**：每次 PR 中检查 `useEffect` 是否有 cleanup、全局事件是否解绑、缓存是否有上限、Observer 是否 disconnect。
4. **定期 Heap Snapshot 审计**：在典型用户操作流程下拍摄 Timeline + Heap Snapshot，作为版本发布前的必查项。

### 心智模型

牢记一个原则：**在 SPA 中，组件的"死亡"不仅是 DOM 的移除，更是所有关联资源的释放**。事件监听器、定时器、Observer、网络请求、缓存引用——这些都是组件的"遗产"，如果不显式清理，就会成为 GC 无法回收的"幽灵"，在内存中游荡，直到浏览器崩溃。

防御的最高境界不是"会排查"，而是"建机制"——让泄漏在编码阶段就被拦截，在 CI 阶段就被检测，在生产阶段就被监控。
