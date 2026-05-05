# A30 - requestAnimationFrame 调度

## 核心机制

`requestAnimationFrame`（rAF）是浏览器提供的与渲染帧同步的调度 API。它在浏览器下一次重绘（repaint）之前调用指定的回调函数，是实现流畅动画和帧感知任务调度的核心接口。

### 1. 基本用法

```javascript
function animate(timestamp) {
  // timestamp: 上一帧渲染结束的 DOMHighResTimeStamp
  // 基于时间差计算动画进度，而非假设固定帧率
  const elapsed = timestamp - startTime;
  const progress = Math.min(elapsed / duration, 1);
  element.style.transform = `translateX(${progress * 200}px)`;

  if (progress < 1) {
    requestAnimationFrame(animate); // 递归调度下一帧
  }
}
const handle = requestAnimationFrame(animate);
```

### 2. 渲染帧生命周期

浏览器每帧的处理流程（简化）：

```
1. 从 macrotask queue 取一个任务执行
2. 执行并清空 microtask queue（所有 microtask）
3. 渲染阶段（如果有需要）：
   a. 处理 input 事件
   b. 执行 rAF 回调（此时 timestamp 已确定）
   c. 执行 ResizeObserver / IntersectionObserver 回调
   d. Style calculation（样式计算）
   e. Layout（布局/重排）
   f. Paint（绘制/重绘）
   g. Composite（合成，GPU 处理）
4. 如果有空闲时间，执行 requestIdleCallback
```

**关键点**：rAF 回调在 Style/Layout/Paint **之前**执行，因此在 rAF 中修改 DOM 会在同一帧内完成布局和绘制，不会产生额外的重排。

### 3. 16.67ms 预算

在 60Hz 显示器上，每帧预算为 1000/60 ≈ 16.67ms。这 16.67ms 需要覆盖：

| 阶段 | 典型耗时 |
|------|----------|
| rAF 回调（JS 执行） | < 4ms |
| Style Recalculation | < 2ms |
| Layout | < 2ms |
| Paint | < 2ms |
| Composite | < 2ms |
| 浏览器内部开销 | ~2ms |

**实际可用的 JS 预算约为 10-12ms**，而非 16.67ms。

### 4. 与高刷新率屏幕

- 120Hz 屏幕：每帧 8.33ms
- 144Hz 屏幕：每帧 6.94ms
- rAF 回调频率自动匹配屏幕刷新率

**重要**：不要假设固定帧率，始终使用 timestamp 参数计算动画进度。

### 5. 后台标签行为

- 当页面在后台标签时，大多数浏览器会**暂停** rAF 回调
- 这节省了 CPU 和电池
- 恢复到前台时，timestamp 会有一个大的跳跃，需正确处理

## 工程瓶颈

### 瓶颈1：rAF 回调中执行耗时操作

- **触发条件**：rAF 回调中执行大量计算或 DOM 操作，超过帧预算
- **症状**：掉帧，动画卡顿
- **检测**：Performance 面板火焰图中 rAF 回调耗时 > 10ms
- **缓解**：
  - 将计算密集任务切片（time slicing），每帧只处理一部分
  - 使用 `performance.now()` 检查已用时间，在预算耗尽时让出控制权
  - 将非视觉更新逻辑移到 `requestIdleCallback`

### 瓶颈2：rAF 嵌套导致帧预算超支

- **触发条件**：在 rAF 回调中同步修改 DOM 触发 Layout，再用另一个 rAF 做后续更新
- **症状**：单帧内多次 Layout（Layout thrashing）
- **检测**：Performance 面板中单帧出现多个 Layout 块
- **缓解**：在单个 rAF 回调中批量读取和写入 DOM；避免在 rAF 中嵌套 rAF

### 瓶颈3：忘记取消 rAF 导致资源浪费

- **触发条件**：组件卸载时未调用 `cancelAnimationFrame`
- **症状**：已卸载组件的回调仍在执行，浪费 CPU 和可能导致错误
- **检测**：Performance 面板中出现"幽灵"动画回调
- **缓解**：在 cleanup 函数中始终调用 `cancelAnimationFrame(handle)`

### 瓶颈4：rAF 与 setTimeout 混用导致调度混乱

- **触发条件**：动画逻辑同时使用 rAF 和 setTimeout/setInterval
- **症状**：动画不连贯，时序不可预测
- **检测**：Performance 面板中回调时机混乱
- **缓解**：统一使用 rAF 做视觉更新；setTimeout 仅用于非视觉延迟任务

### 瓶颈5：高刷新率屏幕下的性能退化

- **触发条件**：应用在 60Hz 下流畅，但在 120Hz/144Hz 下掉帧
- **症状**：高刷屏反而更卡
- **检测**：Performance 面板中帧率从 60fps 下降到 < 120fps
- **缓解**：使用 timestamp 差值而非帧计数；按时间切片而非按帧切片；动态调整计算量

## 调试工具

| 工具 | 用途 |
|------|------|
| Chrome DevTools Performance 面板 | 录制动画，观察帧率和 rAF 回调耗时 |
| TestUFO | 测试浏览器 rAF 时序精度 (https://testufo.com) |
| `performance.now()` | 在 rAF 回调中测量执行时间 |
| Chrome DevTools Rendering | 开启 "Frame Rendering Stats" 显示实时帧率 |
| `requestIdleCallback` | 配合 rAF 做低优先级任务调度 |

## 典型权衡

### 权衡1：rAF vs setInterval/setTimeout

| 维度 | requestAnimationFrame | setInterval/setTimeout |
|------|----------------------|----------------------|
| 帧同步 | 与浏览器渲染帧同步 | 独立于渲染，可能跨帧 |
| 后台行为 | 自动暂停 | 继续执行（浪费资源） |
| 精度 | 高（DOMHighResTimeStamp） | 低（受节流影响，最小 4ms） |
| **建议** | 所有视觉更新用 rAF；定时/轮询用 setTimeout |

### 权衡2：帧内切片 vs 延迟到空闲

| 维度 | 帧内切片（每帧处理一部分） | requestIdleCallback 延后 |
|------|--------------------------|------------------------|
| 响应速度 | 高（持续产出结果） | 低（等空闲才执行） |
| 帧率影响 | 可能降低帧率 | 无影响（利用空闲时间） |
| 适用场景 | 需要持续视觉反馈 | 低优先级后台任务 |
| **建议** | 进度条、动画用切片；日志上报、预取用 idle |

### 权衡3：时间驱动 vs 帧驱动动画

| 维度 | 时间驱动（基于 elapsed） | 帧驱动（基于帧计数） |
|------|------------------------|---------------------|
| 跨刷新率一致性 | 好（60Hz/120Hz 表现一致） | 差（120Hz 速度翻倍） |
| 实现复杂度 | 稍高（需计算时间差） | 低 |
| **建议** | 始终使用时间驱动，用 timestamp 参数 |

## 最小验证实验

```html
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: monospace; background: #1a1a2e; color: #eee; overflow: hidden; }
  #canvas { display: block; margin: 20px auto; background: #16213e; border: 1px solid #333; }
  #info {
    position: fixed; top: 10px; left: 10px;
    background: rgba(0,0,0,0.7); padding: 10px; font-size: 13px;
    line-height: 1.6;
  }
  #task-load {
    position: fixed; top: 10px; right: 10px;
    background: rgba(0,0,0,0.7); padding: 10px;
  }
  #task-load button { padding: 6px 12px; margin: 4px; cursor: pointer; }
</style>
</head>
<body>
<div id="info">
  <div>FPS: <span id="fps">--</span></div>
  <div>Frame Time: <span id="frametime">--</span> ms</div>
  <div>Dropped: <span id="dropped">0</span></div>
  <div>rAF Callback: <span id="raf-time">--</span> ms</div>
</div>
<div id="task-load">
  <div>模拟任务负载：</div>
  <button onclick="setLoad(0)">无负载</button>
  <button onclick="setLoad(5)">5ms</button>
  <button onclick="setLoad(12)">12ms</button>
  <button onclick="setLoad(20)">20ms (掉帧)</button>
</div>
<canvas id="canvas" width="800" height="400"></canvas>
<script>
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let extraLoad = 0;
let frames = [];
let lastTime = performance.now();
let droppedFrames = 0;

function setLoad(ms) { extraLoad = ms; }

function animate(timestamp) {
  const rafStart = performance.now();

  // 帧时间计算
  const delta = timestamp - lastTime;
  lastTime = timestamp;
  frames.push(delta);
  if (frames.length > 60) frames.shift();

  // 检测掉帧
  if (delta > 20) droppedFrames++;

  // 模拟额外计算负载
  if (extraLoad > 0) {
    const start = performance.now();
    while (performance.now() - start < extraLoad) {}
  }

  // 绘制动画
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const time = timestamp / 1000;
  for (let i = 0; i < 20; i++) {
    const x = 400 + Math.cos(time * 2 + i * 0.3) * (150 + i * 5);
    const y = 200 + Math.sin(time * 3 + i * 0.5) * (100 + i * 3);
    const r = 10 + i * 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${(i * 18 + time * 50) % 360}, 70%, 60%)`;
    ctx.fill();
  }

  // 更新信息面板
  const rafTime = performance.now() - rafStart;
  const avgDelta = frames.reduce((a, b) => a + b, 0) / frames.length;
  const fps = Math.round(1000 / avgDelta);
  document.getElementById('fps').textContent = fps;
  document.getElementById('frametime').textContent = avgDelta.toFixed(1);
  document.getElementById('dropped').textContent = droppedFrames;
  document.getElementById('raf-time').textContent = rafTime.toFixed(1);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
</script>
</body>
</html>
```

## 参考资料

| 层级 | 标题 | URL |
|------|------|-----|
| 核心规范 | Window.requestAnimationFrame() - MDN | https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame |
| HTML 规范 | AnimationFrameProvider | https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html |
| 博客 | Animating with JavaScript: from setInterval to rAF | https://hacks.mozilla.org/2011/08/animating-with-javascript-from-setinterval-to-requestanimationframe/ |
| 测试工具 | TestUFO rAF Timing Test | https://testufo.com/#test=animation-time-graph |
| 深度解析 | 来自 requestAnimationFrame 的灵魂拷问 | https://zhuanlan.zhihu.com/p/145793042 |
