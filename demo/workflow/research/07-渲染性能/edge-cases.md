# Edge Cases：渲染性能 — 避免掉帧的 JS 执行与 DOM 操作策略

## 1. 布局抖动（Layout Thrashing）的隐蔽变体

### 1.1 动画使用几何属性触发每帧 Reflow

使用 `width`、`height`、`top`、`left`、`margin`、`padding` 等几何属性做动画，每一帧都会触发完整的 Layout → Paint → Composite 流水线。当页面 DOM 节点数量较大时，单次 Reflow 耗时可轻松突破 16ms 帧预算。

**隐蔽点**：开发者常在 CSS transition 中使用这些属性（如 `transition: left 0.3s`），看起来是"纯 CSS 动画"，但底层仍然每帧触发 Layout。与 `transform` / `opacity` 仅触发 Composite 的路径相比，性能差距可达 10–50 倍。

### 1.2 `getComputedStyle()` 强制同步回流

在已有的样式修改之后调用 `getComputedStyle()`、`offsetWidth`、`scrollTop` 等属性，会强制浏览器立即执行一次同步 Layout（forced synchronous layout），打断浏览器的批量更新策略。

**隐蔽点**：这类调用往往藏在工具函数或第三方库中。例如：

```js
el.style.width = '100px';
// 第三方库内部读取布局信息 → 强制同步回流
const h = someLibrary.getHeight(el);
el.style.height = h + 'px';
```

单次调用可能无感，但在循环中反复"写-读-写"就会形成经典的布局抖动模式，帧率可直接归零。

### 1.3 CSS 选择器复杂度过高

深层嵌套选择器（如 `.nav > ul > li > a > span::before`）或通配符组合会增加样式计算的开销。虽然现代浏览器已大幅优化，但在以下场景仍可感知：

- 页面 DOM 节点数 > 5000
- 频繁动态增删节点（SPA 路由切换）
- 配合 `:nth-child`、`[attribute]` 等复杂匹配

**隐蔽点**：选择器复杂度的影响通常在"大规模"场景下才暴露，小页面测试完全看不出问题。

---

## 2. requestAnimationFrame（rAF）的陷阱

### 2.1 rAF 回调耗时超过帧预算

rAF 回调在每帧的开始执行，预算约 16ms（60Hz）或 8ms（120Hz）。如果回调本身耗时过长，直接导致掉帧。

**隐蔽点**：开发者常在 rAF 中放入"看起来轻量"的操作，但未考虑累计效应：

```js
function animate() {
  // 每帧更新 200 个元素的样式
  items.forEach(el => {
    el.style.transform = `translateY(${computeOffset(el)}px)`;
  });
  requestAnimationFrame(animate);
}
```

当 `items` 数量增长或 `computeOffset` 变复杂时，帧预算悄然超支。

### 2.2 rAF 嵌套导致帧预算超支

在 rAF 回调内部再次调用 `requestAnimationFrame`，形成嵌套。虽然技术上两次 rAF 不会在同一帧执行（外层先执行，内层排到下一帧），但以下模式会导致问题：

```js
function outer() {
  heavyWork();
  requestAnimationFrame(() => {
    moreHeavyWork(); // 这一帧：外层的 heavyWork + 内层的 moreHeavyWork
    requestAnimationFrame(outer);
  });
}
```

内层回调在同一帧内被调度执行，导致该帧的工作量翻倍。

### 2.3 忘记 `cancelAnimationFrame`

组件卸载或动画结束时未调用 `cancelAnimationFrame`，回调持续执行并尝试操作已销毁的 DOM 节点。

**隐蔽点**：在 SPA 中，页面切换时旧组件的 rAF 回调可能仍在运行。由于已卸载的节点不在渲染树中，开发者不会看到视觉异常，但 CPU 占用不会下降，且可能抛出难以追踪的错误。

### 2.4 高刷屏（120Hz）下反而更卡

120Hz 屏幕的帧预算仅约 8ms。原本在 60Hz 下刚好不掉帧的动画，在 120Hz 下每帧预算减半，可能从"流畅"变为"卡顿"。

**隐蔽点**：开发者在 60Hz 显示器上测试一切正常，但用户在高刷设备上体验急剧下降。更糟的是，rAF 在高刷屏上调用频率翻倍，意味着 JS 执行次数翻倍，如果回调中涉及 DOM 操作，Layout/Paint 的开销也翻倍。

---

## 3. Long Task 与主线程阻塞

### 3.1 Long Task 阻塞主线程

超过 50ms 的连续任务会被标记为 Long Task。在 Long Task 执行期间，主线程完全被占用，无法处理用户输入、执行 rAF 回调或进行渲染。

**隐蔽点**：以下操作容易悄然超过 50ms 阈值：

- `JSON.parse()` 解析大型 JSON（> 1MB）
- `Array.prototype.sort()` 排序大型数组
- 同步 XHR（已废弃但仍存在）
- `document.querySelectorAll()` 在大型 DOM 上执行
- 复杂的正则表达式匹配（灾难性回溯）

### 3.2 Microtask 无限循环饿死渲染

Microtask 队列（Promise 回调、`MutationObserver`、`queueMicrotask`）在每个宏任务结束后清空。如果 microtask 不断产生新的 microtask，渲染将永远不会被触发：

```js
async function infinite() {
  await Promise.resolve();
  infinite(); // 无限递归，microtask 队列永远不空
}
```

**隐蔽点**：这比 `while(true)` 更难发现，因为每个 microtask 单独看都很"正常"，且不会触发调用栈溢出（每次都是新的 microtask 帧）。页面看起来完全冻结，但 JS 控制台无报错。

### 3.3 rAF 回调中同步 DOM 操作触发 Layout

在 rAF 回调中先写后读 DOM 属性会触发同步 Layout：

```js
requestAnimationFrame(() => {
  el.style.width = '200px';
  const height = el.offsetHeight; // 强制同步 Layout
  el.style.height = height + 'px';
});
```

**隐蔽点**：rAF 本身给人一种"已经优化过了"的安全感，但 rAF 只保证回调在正确的时机执行，不保证回调内部不触发同步 Layout。

---

## 4. Worker 相关的隐蔽性能问题

### 4.1 `postMessage` 序列化开销

`postMessage` 使用结构化克隆算法传递数据。以下数据类型的序列化开销远超预期：

- `ArrayBuffer`：虽然可 Transfer，但默认行为是复制
- 包含循环引用的对象：序列化可能非常慢
- 大型嵌套对象：深度遍历 + 逐字段复制
- `Map` / `Set`：结构化克隆比普通对象更慢

**隐蔽点**：开发者常在 Worker 中处理数据后通过 `postMessage` 返回结果，如果结果是一个大型数组或复杂对象，序列化本身的耗时可能抵消 Worker 带来的并行收益。

### 4.2 SharedArrayBuffer 竞态条件

`SharedArrayBuffer` 允许主线程和 Worker 共享内存，避免序列化开销。但共享内存意味着需要手动同步：

- 非原子操作的读写可能产生撕裂值（torn read）
- `Atomics.wait()` 在主线程上是禁止的（会阻塞渲染）
- 缺少适当的锁机制会导致难以复现的随机 bug

**隐蔽点**：竞态条件在开发环境中几乎无法复现，只在生产环境的特定时序下出现，表现为间歇性的数据损坏或渲染异常。

### 4.3 Worker 启动延迟

创建新 Worker 需要下载、解析和执行 Worker 脚本。首次使用 Worker 时的延迟可达 100–500ms，取决于脚本大小和设备性能。

**隐蔽点**：开发者在代码中即时创建 Worker（`new Worker(url)`），然后立即 `postMessage`。由于 Worker 可能尚未初始化完成，消息会被排队，导致首帧延迟。使用 Worker 池（Worker Pool）可缓解，但增加内存占用。

---

## 5. 性能监测工具的自身开销

### 5.1 DevTools Performance 面板录制影响性能

Chrome DevTools 的 Performance 面板在录制时会：

- 为每个函数调用注入 instrumentation 开销
- 额外的内存分配用于存储调用栈和时间戳
- 启用更细粒度的 GC 追踪
- 增加 Layout 和 Paint 的详细记录

**隐蔽点**：录制期间的性能数据会比真实场景差 5%–20%。如果基于录制数据做优化决策，可能过度优化"看起来慢"但实际无问题的代码路径。

### 5.2 Allocation Timeline 采样精度 vs 开销

Memory 面板的 Allocation Timeline 使用采样方式追踪内存分配。采样率越高，数据越精确，但开销也越大：

- 高采样率：精确到每次分配，但可能使页面慢 2–3 倍
- 低采样率：开销小，但可能遗漏短生命周期的对象分配

**隐蔽点**：在 Allocation Timeline 下观察到的内存分配模式可能与真实场景不同——高采样率本身可能导致 GC 行为变化。

### 5.3 PerformanceObserver 回调本身耗时

`PerformanceObserver` 用于监听 Long Task、LCP 等指标。但 observer 的回调本身也在主线程执行：

```js
const observer = new PerformanceObserver((list) => {
  // 如果这里做复杂的分析或上报 → 本身也成为 Long Task
  list.getEntries().forEach(entry => {
    complexAnalysis(entry);
    sendToAnalytics(entry);
  });
});
```

**隐蔽点**：监测 Long Task 的代码本身变成了 Long Task 的来源。

### 5.4 Long Task 归因信息不精确

Long Task API 提供的 `attribution` 信息（`containerType`、`containerName` 等）在以下场景中可能不准确：

- 跨 iframe 的任务归因可能指向错误的框架
- 动态创建的脚本（`eval`、`new Function`）的归因信息有限
- 多个微小任务合并为一个 Long Task 时，归因只指向最后一个

### 5.5 User Timing 标记过多

`performance.mark()` 和 `performance.measure()` 本身有开销。当标记数量过多（> 1000）时：

- 内存中维护大量 mark/measure 对象
- `performance.getEntriesByType()` 查询变慢
- DevTools Timeline 中充斥大量标记，增加分析难度

---

## 6. CSS 渲染阻塞的隐蔽场景

### 6.1 渲染阻塞 CSS 的延迟发现

浏览器在遇到 `<link rel="stylesheet">` 时会阻塞渲染（不阻塞 DOM 解析）。问题在于：

- CSS 文件越大，首次渲染延迟越长
- 即使使用了 `media` 属性做条件加载，未匹配的样式表仍然阻塞（浏览器需要下载以确认是否应用）
- `@import` 引入的样式表形成串行加载链

**隐蔽点**：在开发环境中 CSS 可能已被缓存，完全感知不到阻塞。用户首次访问时的体验远差于开发者预期。

### 6.2 JS 阻塞 DOM 解析

`<script>` 标签（无 `async`/`defer`）会阻塞 HTML 解析器。即使脚本本身很短，如果它位于 CDN 上且网络延迟较高，阻塞时间可能远超脚本执行时间。

**隐蔽点**：使用 `document.write()` 动态写入的脚本尤其危险——它会完全阻塞解析直到脚本加载并执行完毕。

### 6.3 合成层过多

`will-change` 或 `transform: translateZ(0)` 可将元素提升为合成层，减少重绘范围。但过多的合成层会导致：

- GPU 内存消耗急剧增加（每个层都需要独立的纹理）
- 层纹理上传到 GPU 的时间增加
- 在移动端可能导致纹理超出 GPU 内存限制，触发回退到 CPU 渲染

**隐蔽点**：框架（如 React）的动画库可能自动添加 `will-change`，导致合成层数量不可控。在低端设备上，"优化"反而变成瓶颈。

---

## 7. 跨场景组合陷阱

### 7.1 SPA 路由切换的累积效应

SPA 路由切换时同时发生：旧组件卸载（触发 rAF 清理、事件解绑）、新组件挂载（触发 DOM 构建、样式计算、首次 Layout）、数据请求返回后批量 DOM 更新。这些操作在同一帧或相邻帧内叠加，可能形成一个 > 100ms 的 Long Task。

### 7.2 无限滚动 + 虚拟列表的边界情况

虚拟列表在快速滚动时需要频繁创建和销毁 DOM 节点。如果创建逻辑中包含强制同步 Layout（如测量新节点尺寸），滚动帧率会急剧下降。而如果不测量，又可能导致高度计算错误、滚动位置跳动。

### 7.3 响应式布局 + ResizeObserver 的循环触发

`ResizeObserver` 回调中修改元素尺寸可能触发新的 resize 事件，形成循环。浏览器有内置保护（超过阈值会报错），但在此之前可能已经产生了多帧的额外 Layout 计算。

---

## 8. 防御策略速查

| 场景 | 检测手段 | 缓解方案 |
|---|---|---|
| 布局抖动 | Performance 面板的 Layout 事件密集出现 | 批量读取→批量写入；使用 `requestAnimationFrame` 分离读写 |
| rAF 超时 | Long Task API + User Timing | 将工作拆分到多帧；使用 `requestIdleCallback` 处理非紧急任务 |
| microtask 饿死渲染 | 页面冻结但无 Long Task 记录 | 在 microtask 中设置退出条件；使用宏任务（`setTimeout`）打断循环 |
| Worker 启动延迟 | 首次消息响应时间异常长 | Worker 池预热；使用 Module Worker 减少脚本大小 |
| 合成层过多 | DevTools Layers 面板 | 移除不必要的 `will-change`；仅对正在动画的元素提升 |
| 高刷屏掉帧 | 在 120Hz 设备上测试 | 自适应帧率；降低 rAF 中的工作量 |
| 监测工具自身开销 | 对比录制前后的性能差异 | 生产环境使用轻量级 APM；限制 User Timing 标记数量 |
