# 渲染性能：避免掉帧的 JS 执行与 DOM 操作策略 — 参考资料

> 命题：如何在前端开发中避免掉帧，优化 JS 执行与 DOM 操作策略以实现流畅的 60fps 渲染。

## T1 · 核心参考资料（必读）

### 1. Critical Rendering Path（关键渲染路径）
- **来源**：MDN
- **链接**：https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path
- **核心内容**：
  - 浏览器渲染流水线：HTML → DOM → CSSOM → Render Tree → Layout → Paint
  - CSS 是渲染阻塞的（render-blocking）：浏览器必须等到 CSSOM 完成才能构建渲染树
  - Layout 性能受 DOM 节点数量影响，节点越多 layout 越慢
  - 批量更新（batch updates）和避免动画化盒模型属性（box model properties）可减少 layout 次数
- **关联知识点**：渲染流水线、DOM 树构建、CSSOM、渲染树、Layout（布局）、Paint（绘制）

### 2. Reflow（重排/回流）
- **来源**：MDN Glossary
- **链接**：https://developer.mozilla.org/en-US/docs/Glossary/Reflow
- **核心内容**：
  - Reflow 是浏览器重新计算页面某些部分的位置和几何信息的过程
  - 通常由交互操作触发，随后会引发 Repaint（重绘）
  - Reflow 是渲染性能的主要瓶颈之一，尤其在动画和滚动场景中
- **关联知识点**：Reflow vs Repaint、触发 reflow 的操作（修改尺寸/位置/display 等）

### 3. Avoid Large, Complex Layouts and Layout Thrashing
- **来源**：web.dev
- **链接**：https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing
- **核心内容**：
  - Layout thrashing（布局抖动）：在 JS 中交替读取和写入布局属性，强制浏览器同步计算布局
  - 典型反模式：循环中先读 `offsetHeight` 再写 `style.height`，每轮都触发 reflow
  - 解决方案：批量读取 → 批量写入；使用 `requestAnimationFrame` 分离读写阶段
  - Flexbox 布局比传统布局更高效，但嵌套过深仍会产生性能问题
- **关联知识点**：layout thrashing、forced synchronous layout、读写分离策略

### 4. Stick to Compositor-Only Properties and Manage Layer Count
- **来源**：web.dev
- **链接**：https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count
- **核心内容**：
  - 只有 `transform` 和 `opacity` 可由合成器线程（compositor）独立处理，不触发主线程的 layout/paint
  - 其他属性（如 `width`、`height`、`top`、`left`、`margin` 等）会触发主线程重排或重绘
  - `will-change` 提示浏览器提升元素为独立层，但滥用会导致过多层（layer explosion），消耗内存
  - 合理管理层数量，避免不必要的层提升
- **关联知识点**：compositor-only properties、GPU 合成、`will-change`、层管理

### 5. Optimize Long Tasks
- **来源**：web.dev
- **链接**：https://web.dev/articles/optimize-long-tasks
- **核心内容**：
  - 主线程上超过 50ms 的连续任务称为 Long Task，会阻塞用户交互导致掉帧
  - 拆分策略：`setTimeout` 分片、`requestIdleCallback` 利用空闲时间、`scheduler.yield()`（新 API）
  - `isInputPending()` API：在任务执行中检查是否有待处理的用户输入，据此决定是否让出主线程
  - 优先处理用户交互相关的任务（事件处理 > 动画 > 非紧急工作）
- **关联知识点**：Long Tasks、任务拆分、`requestIdleCallback`、`scheduler.yield()`、输入优先级

---

## T2 · 重要参考资料（深入理解）

### 6. Window.requestAnimationFrame()
- **来源**：MDN
- **链接**：https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- **核心内容**：
  - `requestAnimationFrame(callback)` 在下一次重绘前调用回调，频率通常匹配屏幕刷新率（60Hz = 16.7ms/帧）
  - 后台标签页中自动暂停，节省资源
  - 回调接收 `DOMHighResTimeStamp` 参数，用于基于时间的动画计算（而非基于帧数，避免高刷屏动画过快）
  - 是实现流畅动画的标准方式，替代 `setInterval`/`setTimeout`
- **关联知识点**：帧预算（16.7ms）、时间戳驱动动画、`cancelAnimationFrame`

### 7. PerformanceLongTaskTiming（Long Tasks API）
- **来源**：MDN
- **链接**：https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming
- **核心内容**：
  - Long Task 定义：主线程连续忙碌 ≥50ms 的不间断时段
  - 常见来源：长时间事件处理器、昂贵的 reflow/重绘、事件循环轮次间超过 50ms 的浏览器工作
  - 配合 `PerformanceObserver` 监听 `longtask` 类型条目
  - `attribution` 属性可追踪任务来源（`self`、`same-origin`、`cross-origin` 等）
- **关联知识点**：Long Tasks API、`TaskAttributionTiming`、性能监控

### 8. Main Thread Breakdown
- **来源**：web.dev
- **链接**：https://web.dev/articles/main-thread-breakdown
- **核心内容**：
  - 主线程是浏览器执行 JS、样式计算、布局、绘制的核心线程
  - 主线程被阻塞时无法响应用户输入（点击、滚动、键盘），造成"卡顿"
  - 关键概念：帧预算（60fps = 每帧 ~16.7ms，其中 JS 执行时间应远小于此）
  - 工具：Chrome DevTools Performance 面板可可视化主线程任务
- **关联知识点**：主线程模型、帧预算、DevTools Performance 分析

### 9. Web Workers API
- **来源**：MDN
- **链接**：https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- **核心内容**：
  - Worker 在独立线程运行 JS，不阻塞主线程
  - 不能直接操作 DOM，通过 `postMessage`/`onmessage` 与主线程通信（数据是复制而非共享）
  - 类型：Dedicated Worker（单脚本独占）、Shared Worker（多脚本共享）、Service Worker（网络代理）
  - 适用场景：大数据计算、图片处理、复杂算法等 CPU 密集型任务卸载
- **关联知识点**：Worker 线程模型、`postMessage` 通信、`Transferable` 对象（零拷贝传输）

---

## T3 · 补充参考资料（拓展视野）

### 10. PerformanceObserver
- **来源**：MDN
- **链接**：https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver
- **核心内容**：
  - 异步观察性能时间线中的新条目，替代轮询 `performance.getEntries()`
  - 可监听多种条目类型：`mark`、`measure`、`longtask`、`paint`、`navigation`、`resource` 等
  - `buffered: true` 选项可获取观察者创建前已记录的条目
  - 是构建性能监控系统的基础 API
- **关联知识点**：Performance Timeline、`PerformanceEntry`、`supportedEntryTypes`

### 11. Performance API 补充
- **链接**：https://developer.mozilla.org/en-US/docs/Web/API/Performance
- **核心内容**：
  - `performance.now()`：高精度时间戳，用于性能测量
  - `performance.mark()` / `performance.measure()`：自定义性能标记和测量
  - `performance.getEntriesByType()`：获取特定类型的性能条目
- **关联知识点**：自定义性能指标、User Timing API

### 12. Intersection Observer / MutationObserver / ResizeObserver
- **链接**：
  - https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
  - https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
  - https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
- **核心内容**：
  - `IntersectionObserver`：异步监听元素可见性变化，替代滚动事件中的 `getBoundingClientRect()`
  - `MutationObserver`：异步监听 DOM 变化，替代突变事件
  - `ResizeObserver`：异步监听元素尺寸变化，替代 `resize` 事件 + 手动计算
  - 三者都是避免同步布局查询、减少 reflow 的关键工具
- **关联知识点**：异步观察模式、避免强制同步布局

---

## 知识图谱总览

```
渲染流水线 (CRP)
├── JS 执行优化
│   ├── requestAnimationFrame — 动画调度
│   ├── Long Tasks API — 检测阻塞任务
│   ├── 任务拆分策略 — setTimeout / rIC / scheduler.yield
│   ├── Web Workers — 卸载 CPU 密集任务
│   └── isInputPending — 输入优先调度
├── DOM 操作优化
│   ├── Layout Thrashing 避免 — 读写分离
│   ├── Reflow/Repaint 最小化 — compositor-only 属性
│   ├── 批量 DOM 更新 — DocumentFragment / innerHTML
│   └── 异步观察者 — IntersectionObserver / MutationObserver / ResizeObserver
└── 性能监控
    ├── PerformanceObserver — 实时性能数据采集
    ├── Long Tasks 检测 — 50ms 阈值告警
    └── DevTools Performance 面板 — 主线程可视化分析
```

---

*组装时间：2026-05-05*
*素材来源：MDN Web Docs、web.dev*
