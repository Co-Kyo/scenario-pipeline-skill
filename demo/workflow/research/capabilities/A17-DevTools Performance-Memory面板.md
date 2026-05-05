# A17 - DevTools Performance/Memory 面板

## 核心机制

Chrome DevTools 的 Performance 和 Memory 面板是前端性能分析的核心工具链。它们基于 Chrome 内核（Blink/V8）的 instrumentation 接口，提供页面加载和运行时的全面性能画像。

### 1. Performance 面板 — 火焰图

Performance 面板的核心是**火焰图（Flame Chart）**，它以时间轴为横轴、调用栈深度为纵轴，展示主线程上每一帧的工作内容。

**录制流程**：
1. 打开 DevTools → Performance 面板
2. 点击 Record（或 Ctrl+E）开始录制
3. 执行用户操作（滚动、点击、页面加载等）
4. 停止录制，分析结果

**火焰图关键区域**：

| 区域 | 内容 | 关注指标 |
|------|------|----------|
| **Frames** | 每帧的渲染耗时，绿色=流畅，红色=掉帧 | 帧耗时是否 > 16.67ms |
| **Main** | 主线程活动：JS 执行、Layout、Paint | Long Task、长调用栈 |
| **Network** | 资源加载瀑布图 | 关键路径资源、阻塞资源 |
| **Timings** | LCP、FCP、CLS 等 Web Vitals | 各指标是否达标 |
| **Interactions** | 用户交互（点击、输入）的响应延迟 | INP 是否 < 200ms |

**帧分析关键概念**：
- **JS Evaluation**：JavaScript 执行时间
- **Recalculate Style**：样式重计算
- **Layout**：布局计算（重排）
- **Update Layer Tree**：图层树更新
- **Paint**：绘制
- **Composite**：合成（GPU 处理）

### 2. Memory 面板 — 堆快照

Memory 面板提供三种分析模式：

#### Heap Snapshot（堆快照）
- 拍摄 V8 堆内存的快照
- 展示所有 JS 对象及其内存占用
- **关键视图**：
  - **Summary**：按构造函数分组，显示对象数量和内存
  - **Comparison**：对比两个快照，找出新增/删除的对象
  - **Containment**：展示对象引用链
  - **Allocation**：按分配时间分组

#### Allocation Instrumentation on Timeline
- 实时记录内存分配的时间线
- 识别分配热点（哪个函数分配了最多内存）

#### Allocation Sampling
- 低开销的内存分配采样
- 适合长时间运行的性能分析

### 3. Lighthouse 评分

Lighthouse 是集成在 DevTools 中的自动化审计工具，输出 0-100 的性能评分。

**核心指标（Web Vitals）**：

| 指标 | 全称 | 良好阈值 | 权重 |
|------|------|----------|------|
| FCP | First Contentful Paint | < 1.8s | 10% |
| SI | Speed Index | < 3.4s | 10% |
| LCP | Largest Contentful Paint | < 2.5s | 25% |
| TBT | Total Blocking Time | < 200ms | 30% |
| CLS | Cumulative Layout Shift | < 0.1 | 25% |

**Lighthouse 运行模式**：
- **Navigation Mode**：分析页面加载全过程
- **Timespan Mode**：分析一段时间内的性能
- **Snapshot Mode**：分析当前页面状态

## 工程瓶颈

### 瓶颈1：火焰图中 Long Task 定位困难

- **触发条件**：页面存在多个 Long Task，难以定位根因
- **症状**：火焰图中出现红色长条，但调用栈复杂
- **检测**：Performance 录制后，在 Main 区域寻找 > 50ms 的任务块
- **缓解**：
  - 点击 Long Task 查看调用栈，定位到具体函数
  - 使用 User Timing 自定义标记包裹关键代码段
  - 启用 "Enable advanced paint instrumentation" 获取更详细的绘制信息

### 瓶颈2：Heap Snapshot 对比中的噪声

- **触发条件**：对比两个快照，但结果中大量框架/库内部对象
- **症状**：难以区分正常分配和泄漏
- **检测**：Comparison 视图中 #Delta 列显示大量新增对象
- **缓解**：
  - 使用 "Allocation instrumentation on timeline" 定位分配源头
  - 过滤 "System" 对象，关注 "(closure)" 和 "(array)" 等用户对象
  - 执行 GC 后再拍快照，排除临时对象

### 瓶颈3：Lighthouse 评分与真实体验不一致

- **触发条件**：Lighthouse 在实验室环境运行，用户实际网络/设备差异大
- **症状**：Lighthouse 评分 90+ 但用户反馈卡顿
- **检测**：对比 Lighthouse 结果与 RUM（Real User Monitoring）数据
- **缓解**：
  - 结合 CrUX（Chrome UX Report）的真实用户数据
  - 使用 Performance 面板手动录制特定交互场景
  - 关注 TBT 和 INP 而非仅看 LCP

### 瓶颈4：Performance 录制的性能开销

- **触发条件**：录制时间过长或页面过于复杂
- **症状**：录制本身导致页面变慢；分析数据量过大
- **检测**：录制文件大小 > 100MB；DevTools 卡顿
- **缓解**：
  - 缩短录制时间，聚焦特定交互
  - 使用 "Disable javascript samples" 减少数据量（牺牲调用栈详情）
  - 使用 `performance.measure()` 做针对性测量

### 瓶颈5：跨 iframe/Worker 的性能分析

- **触发条件**：应用使用 iframe 或 Web Worker
- **症状**：Performance 面板只显示主线程，Worker/iframe 活动不完整
- **检测**：火焰图中看不到 Worker 的 JS 执行
- **缓解**：
  - Worker 中使用 `performance.mark()` / `performance.measure()` 并通过 `PerformanceObserver` 收集
  - 使用 `chrome://tracing` 获取更全面的系统级追踪
  - 在 Worker 中使用 `performance.now()` 记录关键时间点

## 调试工具

| 工具 | 用途 |
|------|------|
| Chrome DevTools Performance 面板 | 火焰图录制与分析 |
| Chrome DevTools Memory 面板 | 堆快照、内存分配时间线 |
| Lighthouse（DevTools 内置） | 自动化性能审计 |
| `chrome://tracing` | 系统级追踪，包含 GPU、网络等 |
| PerformanceObserver API | 编程式收集性能数据 |
| Chrome Task Manager | 实时查看每个 Tab/扩展的内存和 CPU |

## 典型权衡

### 权衡1：火焰图录制深度 vs 开销

| 维度 | 浅录制（Disable JS samples） | 深录制（完整调用栈） |
|------|---------------------------|---------------------|
| 数据量 | 小 | 大 |
| 调用栈信息 | 无 | 完整 |
| 录制开销 | 低 | 高 |
| **建议** | 快速定位帧级别问题用浅录制；定位具体函数用深录制 |

### 权衡2：Heap Snapshot vs Allocation Timeline

| 维度 | Heap Snapshot | Allocation Timeline |
|------|--------------|---------------------|
| 信息类型 | 当前时刻的内存快照 | 内存分配的时间序列 |
| 适用场景 | 检测内存泄漏（对比快照） | 定位分配热点 |
| 开销 | 拍摄时暂停 | 持续记录 |
| **建议** | 泄漏排查用 Snapshot 对比；优化分配用 Timeline |

### 权衡3：Lighthouse vs 手动 Performance 录制

| 维度 | Lighthouse | 手动 Performance 录制 |
|------|-----------|---------------------|
| 自动化程度 | 高（一键审计） | 低（需手动操作） |
| 场景覆盖 | 标准加载场景 | 任意交互场景 |
| 真实性 | 实验室环境 | 可模拟真实用户操作 |
| **建议** | CI/CD 中用 Lighthouse 做回归；性能调优用 Performance 面板深入分析 |

## 最小验证实验

```html
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; padding: 20px; }
  .box { width: 100px; height: 100px; margin: 5px; display: inline-block; }
  #controls { margin: 20px 0; }
  button { padding: 8px 16px; margin: 4px; cursor: pointer; }
  #result { margin-top: 20px; padding: 10px; background: #f5f5f5; }
</style>
</head>
<body>
<h3>DevTools Performance/Memory 实验</h3>
<p>打开 DevTools (F12)，切换到 Performance 或 Memory 面板进行操作。</p>

<div id="controls">
  <button onclick="triggerLongTask()">触发 Long Task (200ms)</button>
  <button onclick="triggerLayout()">触发强制重排</button>
  <button onclick="triggerMemoryLeak()">模拟内存泄漏</button>
  <button onclick="useUserTiming()">使用 User Timing 标记</button>
  <button onclick="clearLeaks()">清除泄漏</button>
</div>

<div id="result">
  <p>操作说明：</p>
  <ol>
    <li><strong>Long Task</strong>：点击后主线程阻塞 200ms，Performance 面板会显示红色 Long Task</li>
    <li><strong>强制重排</strong>：读写 DOM 属性触发 Layout thrashing</li>
    <li><strong>内存泄漏</strong>：持续向数组添加对象，Memory 面板 Heap Snapshot 可观察增长</li>
    <li><strong>User Timing</strong>：在 Performance 面板的 User Timing 区域看到自定义标记</li>
  </ol>
</div>

<div id="container"></div>

<script>
const leakyArray = [];

function triggerLongTask() {
  performance.mark('longtask-start');
  const start = performance.now();
  while (performance.now() - start < 200) { /* busy wait */ }
  performance.mark('longtask-end');
  performance.measure('Long Task Duration', 'longtask-start', 'longtask-end');
  console.log('Long task completed (200ms)');
}

function triggerLayout() {
  performance.mark('layout-thrash-start');
  const container = document.getElementById('container');
  container.innerHTML = '';
  for (let i = 0; i < 100; i++) {
    const div = document.createElement('div');
    div.className = 'box';
    div.style.background = `hsl(${i * 3.6}, 70%, 60%)`;
    container.appendChild(div);
  }
  // Layout thrashing: read then write in loop
  for (let i = 0; i < 50; i++) {
    const boxes = container.children;
    for (let j = 0; j < boxes.length; j++) {
      const height = boxes[j].offsetHeight; // force layout
      boxes[j].style.width = (height + Math.random() * 10) + 'px'; // invalidate
    }
  }
  performance.mark('layout-thrash-end');
  performance.measure('Layout Thrashing', 'layout-thrash-start', 'layout-thrash-end');
  console.log('Layout thrashing triggered');
}

function triggerMemoryLeak() {
  for (let i = 0; i < 10000; i++) {
    leakyArray.push({
      id: i,
      data: new Array(100).fill('leak-data-' + i),
      timestamp: Date.now()
    });
  }
  console.log(`Leaked ${leakyArray.length} objects. Check Memory panel.`);
}

function useUserTiming() {
  performance.mark('custom-operation-start');
  // Simulate some work
  let sum = 0;
  for (let i = 0; i < 1000000; i++) sum += Math.sqrt(i);
  performance.mark('custom-operation-end');
  performance.measure('Custom Operation', 'custom-operation-start', 'custom-operation-end');
  console.log('User Timing marks and measure created. Check Performance panel > Timings.');
}

function clearLeaks() {
  leakyArray.length = 0;
  if (window.gc) window.gc();
  console.log('Leaks cleared. Take a Heap Snapshot to verify.');
}
</script>
</body>
</html>
```

## 参考资料

| 层级 | 标题 | URL |
|------|------|-----|
| 官方文档 | Performance Analysis Reference - Chrome DevTools | https://developer.chrome.com/docs/devtools/performance |
| 官方文档 | Memory Terminology - Chrome DevTools | https://developer.chrome.com/docs/devtools/memory-problems/memory-101 |
| 官方文档 | Lighthouse Documentation | https://developer.chrome.com/docs/lighthouse |
| 实践指南 | Chrome DevTools Performance 功能详解 | https://juejin.cn/post/7112544960934576136 |
| 规范 | W3C Performance Timeline | https://w3c.github.io/performance-timeline/ |
