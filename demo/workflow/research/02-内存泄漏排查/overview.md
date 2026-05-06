# 内存泄漏排查：SPA 长时间运行后卡顿——事件监听/定时器/Detached DOM

## 链路全景图

```
用户反馈 "SPA 越用越卡"
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│ ① 现象确认：Performance 面板录制时间线                     │
│    能力: A4-DevTools 性能分析                              │
│    输入: 用户操作录屏 / 时间线录制                          │
│    输出: Long Task 定位、FPS 下降趋势、内存爬升曲线          │
└────────────────────────┬────────────────────────────────┘
                         │ 发现内存持续上升，GC 无法回收
                         ▼
┌─────────────────────────────────────────────────────────┐
│ ② 堆快照对比：Heap Snapshot Diff 定位泄漏源                │
│    能力: A4-DevTools 性能分析                              │
│    输入: 两次 Heap Snapshot（操作前后）                     │
│    输出: #Delta 最大的对象类型、Detached DOM 节点列表       │
└────────────────────────┬────────────────────────────────┘
                         │ 定位到未释放的 DOM/事件/定时器引用
                         ▼
┌─────────────────────────────────────────────────────────┐
│ ③ Retainers 链追踪：找出阻止 GC 的引用路径                 │
│    能力: A3-V8 GC 机制与堆内存管理                        │
│    输入: 泄漏对象的 Retainers 面板                         │
│    输出: 完整引用链（从 GC Root → 泄漏对象）               │
└────────────────────────┬────────────────────────────────┘
                         │ 引用链指向未清理的事件监听/定时器/缓存
                         ▼
┌─────────────────────────────────────────────────────────┐
│ ④ 资源生命周期审计：逐一排查绑定-清理配对                   │
│    能力: A14-资源生命周期管理                              │
│    输入: 组件代码中的 addEventListener / setInterval /      │
│          new IntersectionObserver / fetch 等调用           │
│    输出: 未配对清理的资源清单                              │
└────────────────────────┬────────────────────────────────┘
                         │ 补全清理逻辑，验证 GC 可回收
                         ▼
┌─────────────────────────────────────────────────────────┐
│ ⑤ 修复落地：框架级 cleanup 机制绑定                        │
│    能力: A14-资源生命周期管理 + A3-V8 GC 机制              │
│    输入: 资源清单 + 框架生命周期钩子                        │
│    输出: useEffect cleanup / onUnmounted 完整清理代码      │
└─────────────────────────────────────────────────────────┘
```

---

## 各节点详解

### 节点 ① 现象确认——用数据说话

**引用能力**: A4-DevTools 性能分析

用户反馈"页面用久了就卡"是最常见的 SPA 性能投诉，但卡顿的根因可能完全不同——是 CPU 密集计算阻塞主线程，还是内存泄漏导致 GC 频繁停顿？第一步必须用 Performance 面板录制时间线来区分。

操作步骤：
1. 打开 Chrome DevTools → Performance 面板
2. 点击 Record，模拟用户正常使用场景（切换路由、打开弹窗、浏览列表等）
3. 停止录制后观察两条关键曲线：
   - **Memory 曲线**：如果呈锯齿上升且基线不断抬高，说明有内存泄漏
   - **FPS / Main 线程**：如果出现周期性掉帧，可能是老生代 GC 停顿

**瓶颈识别**：
- **B1 未识别 Long Task**（A4，资源边界，P0）：如果只看表面卡顿而不录制时间线，就无法区分"代码慢"和"内存泄漏导致的 GC 停顿"，后续排查方向会完全错误。

> **判断标准**：Memory 曲线持续上升 + GC 后基线不回落 → 进入内存泄漏排查流程。

---

### 节点 ② 堆快照对比——精确定位泄漏对象

**引用能力**: A4-DevTools 性能分析

确认内存泄漏后，需要知道"什么东西在泄漏"。Memory 面板的 Heap Snapshot 是唯一的精确工具。

操作步骤：
1. 打开 Memory 面板 → 选择 "Heap snapshot"
2. 在应用初始状态拍一次快照（Baseline）
3. 执行若干次触发泄漏的操作（如反复切换路由 10 次）
4. 拍第二次快照
5. 在 Comparison 视图中按 `#Delta` 降序排列

重点观察：
- **(detached) DOM 节点**：已从 DOM 树移除但仍被 JS 引用的节点，这是 SPA 中最常见的泄漏源
- **EventListener** 数量异常增长：每个事件监听器都是一条从 GC Root 出发的引用链
- **闭包（Closure）** 中捕获了大对象或 DOM 引用

**瓶颈识别**：
- **B2 Detached DOM 未检测**（A4，资源边界，P0）：如果不在 Heap Snapshot 中搜索 `detached`，这些幽灵节点会悄无声息地累积，直到内存溢出或严重卡顿。

---

### 节点 ③ Retainers 链追踪——找到"谁在持有它"

**引用能力**: A3-V8 GC 机制与堆内存管理

知道"什么东西泄漏"还不够，必须知道"为什么它无法被 GC 回收"。V8 的分代 GC 机制决定了：只要存在从 GC Root 到对象的引用链，该对象就不会被回收。

V8 GC 机制要点：
- **新生代 Scavenge**：半空间复制算法，存活对象经过两次 Scavenge 后晋升老生代
- **老生代 Mark-Sweep-Compact**：增量/并发标记，遍历所有从 GC Root 可达的对象
- **WeakRef/WeakMap**：不构成强引用，允许 GC 自由回收

在 Heap Snapshot 中点击泄漏对象，查看 Retainers 面板：
- 最顶层是 GC Root（如 `window`、`document`）
- 沿引用链向下追踪，找到第一个"不该存在"的引用——那就是泄漏点

典型泄漏路径：
```
GC Root → window → componentInstance → eventHandler → detachedDOM
GC Root → window → timers[] → callback → closure → largeData
GC Root → window → globalCache (Map) → detachedDOM
```

**瓶颈识别**：
- **B1 Detached DOM 节点**（A3，资源边界，P0）：DOM 已从页面移除，但 JS 闭包或全局变量仍持有引用 → V8 认为"可达"，永不回收。这是 SPA 内存泄漏的第一大杀手。
- **B2 全局缓存无界增长**（A3，资源边界，P0）：`Map`/`Set` 不设上限地添加条目，老生代内存持续上升，最终触发更频繁的 Full GC。
- **B3 GC 停顿掉帧**（A3，时序竞争，P1）：老生代空间越大，Mark-Sweep-Compact 耗时越长，表现为周期性帧率骤降。

**权衡**：
| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| 强引用 `Map` | 对象不会被意外回收 | 需手动 delete，否则泄漏 | 需要保证生命周期的缓存 |
| 弱引用 `WeakMap` | GC 自动回收，无泄漏风险 | 不能枚举、不能存原始值 | DOM 节点关联数据、组件级缓存 |

> **原则**：能用 `WeakMap` 就不用 `Map`，除非你明确需要控制缓存淘汰。

---

### 节点 ④ 资源生命周期审计——绑定-清理配对检查

**引用能力**: A14-资源生命周期管理

定位到泄漏类型后，需要系统性地审查代码中所有"异步资源绑定"是否有对应的清理逻辑。这是最考验工程纪律的环节。

核心原则：**所有异步资源的绑定与清理必须成对出现。**

审计清单：

| 资源类型 | 绑定 API | 清理 API | 常见遗漏场景 |
|----------|----------|----------|--------------|
| 事件监听 | `addEventListener` | `removeEventListener` | SPA 路由切换时未解绑全局事件 |
| 定时器 | `setInterval` / `setTimeout` | `clearInterval` / `clearTimeout` | 组件销毁后定时器仍在执行 |
| IntersectionObserver | `new IntersectionObserver` | `observer.disconnect()` | 列表组件销毁后 observer 仍触发回调 |
| ResizeObserver | `new ResizeObserver` | `observer.disconnect()` | 窗口 resize 回调中持有旧组件引用 |
| 网络请求 | `fetch` / `axios` | `AbortController.abort()` | 组件卸载后响应回来更新已卸载的 state |
| WebSocket | `new WebSocket` | `ws.close()` | 页面离开后连接未断开 |

**瓶颈识别**：
- **B1 事件监听未解绑**（A14，资源边界，P0）：SPA 路由切换时，旧页面组件销毁但事件监听未移除 → 内存增长 + 重复回调（同一事件触发多次 handler）。这是 SPA 内存泄漏最经典的模式。
- **B2 Observer 未 disconnect**（A14，资源边界，P1）：`IntersectionObserver` / `MutationObserver` 在组件销毁后仍运行 → 不仅浪费 CPU，其回调中的闭包还会阻止旧组件被 GC。
- **B3 请求未取消**（A14，资源边界，P1）：`fetch` 响应在组件卸载后才回来 → `setState` on unmounted component 警告，且响应数据无处释放。

**权衡**：
| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| 手动逐个清理 | 精确控制每个资源的清理时机 | 容易遗漏，维护成本高 | 少量资源的简单组件 |
| `AbortController` 统一取消 | 一个 controller 取消多个资源，代码简洁 | 需要封装，对已发出的请求只能取消监听不能取消传输 | 多资源组件、复杂页面 |

---

### 节点 ⑤ 修复落地——框架级 cleanup 机制

**引用能力**: A14-资源生命周期管理 + A3-V8 GC 机制

最终要将清理逻辑写入框架的组件生命周期，确保组件销毁时自动释放所有资源。

#### React 方案：useEffect cleanup

```jsx
useEffect(() => {
  // ✅ 绑定
  const handler = () => { /* ... */ };
  window.addEventListener('scroll', handler);

  const timer = setInterval(() => { /* ... */ }, 1000);

  const observer = new IntersectionObserver(callback);
  observer.observe(targetEl);

  const controller = new AbortController();
  fetch('/api/data', { signal: controller.signal });

  // ✅ 清理函数（组件卸载或依赖变化时自动执行）
  return () => {
    window.removeEventListener('scroll', handler);
    clearInterval(timer);
    observer.disconnect();
    controller.abort();
  };
}, [deps]);
```

关键点：
- 每个 `useEffect` 的 cleanup 函数中，必须清理该 effect 内创建的所有资源
- 多个 effect 的 cleanup 独立执行，不需要合并
- `AbortController` 可以跨 effect 共享，但要注意在正确的 effect 中 abort

#### Vue 方案：onUnmounted

```vue
<script setup>
import { onMounted, onUnmounted } from 'vue';

let timer = null;
let observer = null;
const controller = new AbortController();

onMounted(() => {
  // ✅ 绑定
  window.addEventListener('resize', resizeHandler);
  timer = setInterval(pollData, 5000);
  observer = new IntersectionObserver(onIntersect);
  observer.observe(el.value);
  fetchData(controller.signal);
});

onUnmounted(() => {
  // ✅ 清理
  window.removeEventListener('resize', resizeHandler);
  clearInterval(timer);
  observer?.disconnect();
  controller.abort();
});
</script>
```

关键点：
- Vue 3 Composition API 中，`onUnmounted` 是主要的清理入口
- `watchEffect` 返回的 stop 函数可自动停止响应式追踪，但不影响手动绑定的资源
- 对于 `watch` 创建的 watcher，返回的 stop 函数需手动调用或在 `onUnmounted` 中调用

#### 通用最佳实践

1. **WeakMap 替代 Map**：组件关联数据用 `WeakMap<ComponentNode, Data>` 存储，组件销毁后数据自动回收
2. **WeakRef 缓存**：对大对象缓存使用 `WeakRef`，配合 `FinalizationRegistry` 实现自动淘汰
3. **AbortController 统一取消**：一个 controller 管理页面内所有异步资源，组件卸载时一次 abort 全部取消
4. **全局事件最小化**：避免在组件内 `addEventListener(window, ...)`，改用事件总线或框架内置的事件系统

---

## 关键瓶颈总结

| 瓶颈 | 来源 | 优先级 | 本质 | 解决方案 |
|------|------|--------|------|----------|
| Detached DOM 节点 | A3-B1 | P0 | 资源边界：DOM 移除但 JS 持有引用 | WeakMap 存储组件数据 + cleanup 清除引用 |
| 全局缓存无界增长 | A3-B2 | P0 | 资源边界：Map/Set 无淘汰策略 | LRU 缓存 / WeakMap / 大小上限 |
| 事件监听未解绑 | A14-B1 | P0 | 资源边界：SPA 路由切换未清理 | useEffect cleanup / onUnmounted |
| Detached DOM 未检测 | A4-B2 | P0 | 资源边界：不知道有 DOM 泄漏 | Heap Snapshot 对比搜索 detached |
| Observer 未 disconnect | A14-B2 | P1 | 资源边界：组件销毁后 Observer 仍运行 | cleanup 中 disconnect |
| 请求未取消 | A14-B3 | P1 | 资源边界：卸载后 fetch 响应仍回来 | AbortController |
| GC 停顿掉帧 | A3-B3 | P1 | 时序竞争：老生代 GC 耗时随堆增大 | 减少老生代存活对象（修复上述泄漏） |
| 未识别 Long Task | A4-B1 | P0 | 资源边界：不知哪些代码阻塞主线程 | Performance 面板录制分析 |

---

## 总结

SPA 内存泄漏的本质是**资源生命周期管理失配**：组件销毁了，但它创建的事件监听、定时器、Observer、网络请求、DOM 引用没有随之清理。V8 的 GC 是精确的——它只回收"不可达"的对象，而这些未清理的资源恰恰构成了一条条从 GC Root 出发的强引用链，让泄漏对象永远"可达"。

排查链路的核心思路是**从现象到根因的五步推进**：
1. **确认**：Performance 面板确认是内存问题而非 CPU 问题
2. **定位**：Heap Snapshot 对比找到泄漏对象类型
3. **追踪**：Retainers 链找到阻止 GC 的引用路径
4. **审计**：逐一检查资源绑定-清理配对
5. **修复**：在框架生命周期钩子中补全清理逻辑

> 最后一公里永远是工程纪律：写 `addEventListener` 时就写好 `removeEventListener`，写 `setInterval` 时就写好 `clearInterval`。把清理逻辑和绑定逻辑写在同一段代码中，而不是"以后再补"——因为"以后"永远不会来。
