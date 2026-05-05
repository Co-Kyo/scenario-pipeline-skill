# 渲染性能：避免掉帧的 JS 执行与 DOM 操作策略

> **命题定位**：从浏览器渲染帧的完整生命周期出发，逐阶段识别性能瓶颈，掌握避免掉帧的核心策略。
>
> **适用范围**：通用前端开发（不限框架），适用比例 ≥ 90%

---

## 一、渲染帧生命周期总览

浏览器以约 **60fps**（每帧 ~16.67ms）为目标渲染页面。一帧内各阶段按序执行，任一阶段超时即导致掉帧：

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ ① JS 执行 │──▶│ ② DOM 操作│──▶│ ③ 样式计算│──▶│ ④ 布局   │──▶│ ⑤ 绘制   │──▶│ ⑥ 合成   │
│           │   │           │   │ (Style)  │   │ (Layout) │   │ (Paint)  │   │(Composite)│
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
     │                                                                          │
     │  ← JS 执行期间的长任务会挤占后续阶段预算 →                                 │
     │  ← 仅 transform/opacity 变化可跳过 ③④⑤，直达 ⑥ →                         │
```

> **核心原则**：将工作量控制在 16.67ms 预算内；能跳过的阶段尽量跳过。

---

## 二、阶段 ① — JS 执行

### 2.1 事件循环与渲染时机

浏览器事件循环决定 JS 何时执行、何时渲染：**[A31-事件循环]**

- **macrotask**（setTimeout、用户事件等）每次取一个执行
- **microtask**（Promise.then、queueMicrotask）在当前 task 结束后、渲染前全部清空
- **渲染时机**：浏览器在 macrotask 之间择机执行渲染流水线，并非每个 task 之后都渲染

**掉帧风险**：单个 macrotask 或 microtask 链过长，阻塞渲染帧。

### 2.2 Long Task 识别与归因

超过 50ms 的任务被标记为 **Long Task**，是掉帧的直接原因：**[A33-Performance API]**

- `PerformanceObserver` 监听 `longtask` 类型，获取任务的 `attribution`（脚本来源、容器框架等）
- 配合 **User Timing** 标记（`performance.mark` / `performance.measure`）量化关键代码段耗时
- 在 DevTools Performance 面板中以火焰图直观定位瓶颈 **[A17-DevTools面板]**

### 2.3 rAF 与时间预算

`requestAnimationFrame`（rAF）是浏览器重绘前的回调入口：**[A30-rAF]**

```js
function tick(timestamp) {
  const elapsed = timestamp - lastTime;
  // 控制动画节奏，确保不超过帧预算
  updateAnimations(elapsed);
  render();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
```

**要点**：
- 浏览器保证 rAF 回调在样式计算和布局之前执行
- 标签页不可见时自动暂停，节省资源
- 动画逻辑应基于时间差（`elapsed`）而非固定步长

### 2.4 卸载重计算到 Worker

当 JS 执行不可避免地需要大量计算时，使用 **Web Worker** 将其移出主线程：**[A32-Web Worker]**

- Worker 运行在独立线程，不阻塞渲染
- 通过 `postMessage` 通信，传递数据需序列化（结构化克隆）
- `SharedArrayBuffer` 可实现零拷贝共享内存（需 COOP/COEP 头）

**典型场景**：大数据排序、图像处理、JSON 解析、加密计算。

---

## 三、阶段 ② — DOM 操作

### 3.1 读写分离，避免布局抖动

连续的 DOM 读写交替会强制浏览器同步计算布局，称为 **Layout Thrashing**：**[A3-重绘与回流]**

```js
// ❌ 反模式：读写交替 → 每次写都触发强制回流
for (const el of elements) {
  const height = el.offsetHeight;  // 读（强制布局）
  el.style.height = height + 10 + 'px'; // 写（标记脏）
}

// ✅ 正确：先批量读，再批量写
const heights = elements.map(el => el.offsetHeight);  // 读
elements.forEach((el, i) => {
  el.style.height = heights[i] + 10 + 'px';            // 写
});
```

### 3.2 批量化更新

减少 DOM 操作次数是降低布局开销的直接手段：

| 策略 | 做法 |
|------|------|
| `DocumentFragment` | 在离屏 DOM 上完成所有插入，一次性附加到文档 |
| `innerHTML` 批量构建 | 复杂结构用模板字符串一次性生成 |
| 虚拟 DOM / diff | 框架层面的批量化（React、Vue 自动处理） |
| `requestAnimationFrame` 合并 | 将多处写操作推迟到下一帧统一执行 |

### 3.3 属性选择决定触发阶段

不同属性修改触发不同渲染阶段：**[A3-重绘与回流]**

| 修改的属性 | 触发阶段 | 性能影响 |
|-----------|---------|---------|
| `width`、`height`、`top`、`left`、`margin`、`padding` | 回流（Layout）+ 重绘（Paint）+ 合成 | 🔴 最大 |
| `color`、`background`、`box-shadow` | 重绘 + 合成 | 🟡 中等 |
| `transform`、`opacity` | 仅合成（Composite） | 🟢 最小 |

**最佳实践**：动画和过渡优先使用 `transform` 和 `opacity`，它们可被 GPU 合成器独立处理，不触发回流和重绘。

---

## 四、阶段 ③④ — 样式计算与布局

### 4.1 减少样式计算范围

- 避免过于复杂的选择器（深层嵌套、通配符）
- 批量修改 class 而非逐条修改 inline style
- 使用 `content-visibility: auto` 跳过屏外内容的布局和绘制

### 4.2 避免强制同步布局

强制同步布局（Forced Synchronous Layout）是指在 JS 中读取几何属性（`offsetHeight`、`getBoundingClientRect` 等）时，浏览器被迫立即计算布局。

**缓解手段**：
- 利用上一次 rAF 缓存的布局值，而非实时读取
- 使用 `ResizeObserver` 异步监听尺寸变化
- 使用 `IntersectionObserver` 替代滚动事件 + `getBoundingClientRect`

---

## 五、阶段 ⑤⑥ — 绘制与合成

### 5.1 减少绘制区域

- 使用 `will-change: transform` 提示浏览器将元素提升为独立合成层
- 避免大面积重绘：将动画元素与静态内容分层
- 谨慎使用 `box-shadow`、`border-radius`、`filter` 等高绘制成本属性

### 5.2 GPU 合成优化

**[A1-浏览器渲染管线]** 中，合成（Composite）阶段由 GPU 执行，开销最低：

- `transform` 和 `opacity` 变化仅触发合成，跳过布局和绘制
- 浏览器会自动将符合条件的元素提升为合成层（compositing layer）
- 过多合成层会消耗 GPU 内存，需平衡

---

## 六、DevTools 诊断工作流

**[A17-DevTools面板]** 提供完整的性能诊断工具链：

```
发现掉帧
    │
    ▼
Performance 面板录制 ──▶ 火焰图定位 Long Task
    │                         │
    │                         ▼
    │                    标记（User Timing）细分耗时
    │                         │
    ▼                         ▼
Frames 视图查看帧耗时    Memory 面板检查 GC 频率
    │
    ▼
Lighthouse 评分报告 ──▶ 获取优化建议优先级
```

**关键操作**：
1. **Performance 录制**：观察红色长条（Long Task）和帧率曲线
2. **Bottom-Up 排序**：找出耗时最长的函数调用
3. **Memory 快照**：对比前后快照，定位内存泄漏
4. **Lighthouse**：获取结构化的性能评分和优化建议

---

## 七、策略速查表

| 场景 | 推荐策略 | 涉及能力 |
|------|---------|---------|
| 动画掉帧 | rAF + transform/opacity | A30, A3, A1 |
| 列表渲染卡顿 | 虚拟列表 + 批量 DOM 更新 | A3, A1 |
| 计算密集型 JS | Web Worker 卸载 | A32 |
| 布局抖动 | 读写分离 + ResizeObserver | A3, A1 |
| 帧预算监控 | Long Tasks API + PerformanceObserver | A33 |
| 掉帧定位 | Performance 面板火焰图 + User Timing | A17, A33 |
| 事件循环理解 | macrotask/microtask 优先级 | A31 |
| 动画节奏控制 | rAF + 时间差驱动 | A30 |

---

## 八、帧预算检查清单

在开发和 Code Review 时逐项检查：

- [ ] 单帧内 JS 执行是否控制在 10ms 以内？（留余量给样式/布局/绘制）
- [ ] 是否存在 DOM 读写交替（Layout Thrashing）？
- [ ] 动画是否使用 `transform` / `opacity` 而非 `top` / `left` / `width`？
- [ ] 重计算任务是否已卸载到 Web Worker？
- [ ] rAF 回调是否基于时间差而非固定步长？
- [ ] 是否通过 `PerformanceObserver` 监控 Long Task？
- [ ] 是否使用 `IntersectionObserver` 替代滚动事件中的几何属性读取？
- [ ] 合成层数量是否合理（未过多提升 `will-change`）？
