# A33 - Performance API 与 Long Task

## 核心机制

Performance API 是 W3C 标准化的浏览器性能测量接口族，提供高精度时间戳、资源加载计时、自定义标记和 Long Task 检测能力。它是前端性能监控（RUM）和性能优化的基础设施。

### 1. PerformanceObserver — 异步观察性能条目

`PerformanceObserver` 是 Performance API 的核心观察接口，异步接收浏览器记录的性能条目。

```javascript
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    console.log(entry.entryType, entry.name, entry.startTime, entry.duration);
  });
});

// 观察多种条目类型
observer.observe({ entryTypes: ['longtask', 'mark', 'measure', 'resource', 'paint'] });
```

**关键特性**：
- **异步通知**：不轮询，浏览器主动推送
- **buffered: true**：获取在 observer 创建之前已记录的条目
- **supportedEntryTypes**：静态属性，返回当前浏览器支持的条目类型

**支持的 entryType 列表**：

| entryType | 说明 | 关键属性 |
|-----------|------|----------|
| `longtask` | 主线程阻塞 ≥ 50ms 的任务 | duration, attribution |
| `mark` | 用户自定义时间标记 | name, startTime |
| `measure` | 用户自定义时间测量 | name, startTime, duration |
| `resource` | 资源加载计时 | name(url), transferSize, responseStart |
| `paint` | 绘制事件 | name("first-paint"/"first-contentful-paint") |
| `largest-contentful-paint` | LCP 指标 | startTime, element, size |
| `layout-shift` | CLS 指标 | value, hadRecentInput |
| `navigation` | 页面导航计时 | type, domContentLoadedEventEnd |
| `event` | 事件处理计时 | name, duration, interactionId |

### 2. Long Tasks API

Long Tasks API 检测主线程被连续占用超过 50ms 的任务。

```javascript
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    console.log('Long Task:', {
      duration: entry.duration,        // 任务耗时
      startTime: entry.startTime,      // 开始时间
      name: entry.name,                // 归因信息
      attribution: entry.attribution   // TaskAttributionTiming 数组
    });
  });
});
observer.observe({ type: 'longtask', buffered: true });
```

**entry.name 的归因含义**：

| name 值 | 含义 |
|---------|------|
| `"self"` | 任务发生在当前文档 |
| `"same-origin-ancestor"` | 任务由同源祖先 iframe 触发 |
| `"same-origin-descendant"` | 任务由同源后代 iframe 触发 |
| `"cross-origin-ancestor"` | 任务由跨源祖先触发 |
| `"cross-origin-descendant"` | 任务由跨源后代触发 |
| `"multiple-contexts"` | 任务涉及多个执行上下文 |

**attribution 中的 TaskAttributionTiming**：
- `containerType`：容器类型（iframe/embed/object）
- `containerId`：容器 ID
- `containerName`：容器 name
- `containerSrc`：容器 src

### 3. User Timing — 自定义标记与测量

User Timing 允许开发者在代码中插入自定义的性能标记和测量。

```javascript
// 标记
performance.mark('process-start');

// 执行操作
doSomething();

// 标记结束
performance.mark('process-end');

// 测量两个标记之间的时间
performance.measure('process-duration', 'process-start', 'process-end');

// 读取结果
const measures = performance.getEntriesByName('process-duration', 'measure');
console.log(measures[0].duration); // 毫秒
```

**mark() 高级选项**：

```javascript
performance.mark('image-upload', {
  startTime: event.timeStamp,  // 自定义起始时间
  detail: {
    devtools: {
      dataType: 'marker',
      color: 'secondary',
      properties: [['Image Size', '2.5MB']],
      tooltipText: 'Image uploaded'
    }
  }
});
```

`devtools` 对象使用 Chrome DevTools Extensibility API，可在 Performance 面板的自定义轨道中显示。

### 4. Performance Timeline 集成

所有 Performance 条目都进入统一的 Performance Timeline：

```javascript
// 获取所有条目
performance.getEntries();

// 按类型筛选
performance.getEntriesByType('resource');

// 按名称筛选
performance.getEntriesByName('https://example.com/app.js', 'resource');

// 清除条目
performance.clearMarks('my-mark');
performance.clearMeasures('my-measure');
performance.clearResourceTimings();
```

## 工程瓶颈

### 瓶颈1：Long Task 检测的误报与漏报

- **触发条件**：浏览器将多个小任务合并报告，或跨帧任务边界不准确
- **症状**：报告的 Long Task duration 与实际卡顿感不一致
- **检测**：对比 PerformanceObserver 报告的 longtask 与 Performance 面板手动录制
- **缓解**：
  - 以 50ms 为阈值，但关注 > 100ms 的任务
  - 结合 TBT（Total Blocking Time）指标：`sum(max(0, duration - 50))`
  - 使用 User Timing 包裹关键代码段，精确定位瓶颈

### 瓶颈2：PerformanceObserver 的内存开销

- **触发条件**：观察多种 entryType 且不及时清理条目
- **症状**：内存占用持续增长
- **检测**：Memory 面板观察 PerformanceEntry 数量
- **缓解**：
  - 使用 `performance.clearMarks()` / `performance.clearMeasures()` 清理
  - 限制 observer 的 entryTypes 数量
  - 在 `performance.clearResourceTimings()` 后调用 `setResourceTimingBufferSize()` 控制缓冲区

### 瓶颈3：User Timing 条目的累积

- **触发条件**：频繁调用 `performance.mark()` 和 `performance.measure()`
- **症状**：Performance Timeline 中条目过多，查询变慢
- **检测**：`performance.getEntries().length` 持续增长
- **缓解**：
  - 定期调用 `performance.clearMarks()` 和 `performance.clearMeasures()`
  - 使用命名约定便于批量清理
  - 仅在开发/调试环境启用详细标记

### 瓶颈4：Long Task 的归因信息不足

- **触发条件**：Long Task 发生在框架内部或跨 iframe
- **症状**：`attribution` 信息无法定位到具体业务代码
- **检测**：`entry.attribution` 为空或仅显示 `"self"`
- **缓解**：
  - 使用 User Timing 在关键代码段前后标记
  - 使用 `sourceURL` 注释标记框架内部代码
  - 结合 Performance 面板火焰图查看调用栈

### 瓶颈5：跨浏览器兼容性

- **触发条件**：不同浏览器对 Performance API 的支持程度不同
- **症状**：某些 entryType 或属性在 Safari/Firefox 中不可用
- **检测**：检查 `PerformanceObserver.supportedEntryTypes`
- **缓解**：
  - 使用 `supportedEntryTypes` 特性检测
  - 使用 web-vitals 库获取跨浏览器一致的 Web Vitals 数据
  - 降级方案：使用 `performance.now()` 手动计时

## 调试工具

| 工具 | 用途 |
|------|------|
| Chrome DevTools Performance 面板 | 查看 User Timing 标记在时间轴上的位置 |
| Chrome DevTools Console | 实时打印 PerformanceObserver 回调数据 |
| Lighthouse | 基于 Performance API 数据生成性能报告 |
| web-vitals 库 | 封装 Core Web Vitals 的标准化采集 |
| Sentry/Web Vitals | 生产环境 RUM 数据采集 |

## 典型权衡

### 权衡1：Long Task 阈值选择

| 维度 | 50ms（规范阈值） | 100ms（宽松阈值） | 200ms（严格阈值） |
|------|----------------|-----------------|-----------------|
| 误报率 | 高 | 中 | 低 |
| 漏报率 | 低 | 中 | 高 |
| 用户感知 | 50ms 开始有感知 | 100ms 明显卡顿 | 200ms 严重卡顿 |
| **建议** | 监控用 50ms；告警用 100ms；优化目标 < 50ms |

### 权衡2：PerformanceObserver vs 轮询 getEntries

| 维度 | PerformanceObserver | 轮询 getEntries() |
|------|-------------------|-------------------|
| 实时性 | 高（异步推送） | 低（依赖轮询间隔） |
| 开销 | 低 | 高（频繁调用） |
| 时序保证 | 条目按时间排序 | 可能遗漏中间条目 |
| **建议** | 始终使用 PerformanceObserver |

### 权衡3：buffered: true vs false

| 维度 | buffered: true | buffered: false |
|------|---------------|----------------|
| 历史数据 | 可获取 observer 创建前的条目 | 仅获取创建后的条目 |
| 数据完整性 | 高 | 可能遗漏早期事件 |
| 适用场景 | 页面加载性能（paint/navigation） | 运行时监控（longtask） |
| **建议** | 页面加载相关用 true；运行时监控用 false |

## 最小验证实验

```html
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: monospace; padding: 20px; background: #0d1117; color: #c9d1d9; }
  button { padding: 8px 16px; margin: 4px; cursor: pointer; background: #21262d; color: #c9d1d9; border: 1px solid #30363d; }
  button:hover { background: #30363d; }
  #log { height: 400px; overflow-y: auto; background: #161b22; padding: 10px; margin-top: 10px; border: 1px solid #30363d; font-size: 13px; }
  .log-longtask { color: #f85149; }
  .log-mark { color: #58a6ff; }
  .log-measure { color: #3fb950; }
  .log-resource { color: #d2a8ff; }
  .log-paint { color: #ffa657; }
  .log-info { color: #8b949e; }
  h3 { color: #58a6ff; }
</style>
</head>
<body>
<h3>Performance API & Long Task 实验</h3>
<p>打开 DevTools Performance 面板，点击录制后操作。</p>

<button onclick="testLongTask()">触发 Long Task (100ms)</button>
<button onclick="testUserTiming()">User Timing 标记</button>
<button onclick="testNestedTimings()">嵌套 User Timing</button>
<button onclick="testResourceObserver()">观察资源加载</button>
<button onclick="clearLog()">清除日志</button>

<div id="log"></div>

<script>
const logEl = document.getElementById('log');

function addLog(msg, type = 'info') {
  const div = document.createElement('div');
  div.className = `log-${type}`;
  div.textContent = `[${performance.now().toFixed(1)}ms] ${msg}`;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

// 1. Long Task Observer
const longTaskObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    addLog(`🔴 Long Task: ${entry.duration.toFixed(1)}ms (name: ${entry.name})`, 'longtask');
    if (entry.attribution) {
      entry.attribution.forEach(attr => {
        addLog(`   Attribution: ${attr.containerType || 'N/A'} - ${attr.containerId || 'N/A'}`, 'longtask');
      });
    }
  });
});
try { longTaskObserver.observe({ type: 'longtask', buffered: true }); }
catch(e) { addLog('Long Tasks API not supported', 'info'); }

// 2. User Timing Observer
const markObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    if (entry.entryType === 'mark') {
      addLog(`🔵 Mark: "${entry.name}" at ${entry.startTime.toFixed(1)}ms`, 'mark');
    }
    if (entry.entryType === 'measure') {
      addLog(`🟢 Measure: "${entry.name}" duration=${entry.duration.toFixed(2)}ms`, 'measure');
    }
  });
});
markObserver.observe({ entryTypes: ['mark', 'measure'] });

// 3. Paint Observer
try {
  const paintObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach(entry => {
      addLog(`🟠 Paint: "${entry.name}" at ${entry.startTime.toFixed(1)}ms`, 'paint');
    });
  });
  paintObserver.observe({ type: 'paint', buffered: true });
} catch(e) {}

// 测试函数
function testLongTask() {
  addLog('Starting Long Task (100ms busy wait)...', 'info');
  const start = performance.now();
  while (performance.now() - start < 100) {}
  addLog('Long Task finished.', 'info');
}

function testUserTiming() {
  performance.mark('demo-operation-start');

  // 模拟一些工作
  let result = 0;
  for (let i = 0; i < 500000; i++) {
    result += Math.sqrt(i);
  }

  performance.mark('demo-operation-end');
  performance.measure('Demo Operation', 'demo-operation-start', 'demo-operation-end');
}

function testNestedTimings() {
  performance.mark('outer-start');

  setTimeout(() => {
    performance.mark('inner-start');
    let sum = 0;
    for (let i = 0; i < 200000; i++) sum += Math.sqrt(i);
    performance.mark('inner-end');
    performance.measure('Inner Work', 'inner-start', 'inner-end');

    performance.mark('outer-end');
    performance.measure('Outer (async)', 'outer-start', 'outer-end');
  }, 50);
}

function testResourceObserver() {
  addLog('Loading test resource...', 'info');
  const img = new Image();
  img.onload = () => {
    const entries = performance.getEntriesByName(img.src);
    if (entries.length > 0) {
      const e = entries[0];
      addLog(`📦 Resource: ${e.name.split('/').pop()}`, 'resource');
      addLog(`   DNS: ${(e.domainLookupEnd - e.domainLookupStart).toFixed(1)}ms`, 'resource');
      addLog(`   Connect: ${(e.connectEnd - e.connectStart).toFixed(1)}ms`, 'resource');
      addLog(`   TTFB: ${(e.responseStart - e.requestStart).toFixed(1)}ms`, 'resource');
      addLog(`   Download: ${(e.responseEnd - e.responseStart).toFixed(1)}ms`, 'resource');
      addLog(`   Total: ${e.duration.toFixed(1)}ms`, 'resource');
    }
  };
  img.src = 'https://via.placeholder.com/100x100.png?t=' + Date.now();
}

function clearLog() { logEl.innerHTML = ''; }
</script>
</body>
</html>
```

## 参考资料

| 层级 | 标题 | URL |
|------|------|-----|
| 核心规范 | PerformanceObserver - MDN | https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver |
| 核心规范 | PerformanceLongTaskTiming - MDN | https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming |
| 核心规范 | User Timing API - MDN | https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing |
| 核心规范 | Performance.mark() - MDN | https://developer.mozilla.org/en-US/docs/Web/API/Performance/mark |
| W3C 规范 | Long Tasks API | https://w3c.github.io/longtasks/ |
| W3C 规范 | User Timing Level 3 | https://w3c.github.io/user-timing/ |
| 工具库 | web-vitals | https://github.com/GoogleChrome/web-vitals |
| Chrome 文档 | DevTools Performance Extension API | https://developer.chrome.com/docs/devtools/performance/extension |
