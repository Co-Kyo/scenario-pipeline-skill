# P8 长任务拆分 — Edge Cases：坑点提取

## 1. requestIdleCallback Safari 不支持

**问题**：`requestIdleCallback` 是 Chrome/Edge/Firefox 支持的 API，**Safari 完全不支持**（截至 2026 年）。

**症状**：在 Safari/iOS 上低优先级任务永远不执行，功能静默失效。

**规避方案**：
```js
// polyfill 方案
const rIC = window.requestIdleCallback || function(cb) {
  const start = Date.now();
  return setTimeout(() => {
    cb({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
    });
  }, 1);
};

// 或者直接使用 scheduler.yield()（Chrome 115+）+ polyfill
```

**注意**：polyfill 的 `timeRemaining()` 是近似值，不能完全模拟浏览器空闲调度。

---

## 2. Worker postMessage 序列化开销

**问题**：`postMessage` 使用 **结构化克隆算法**（Structured Clone），大数据对象的序列化/反序列化开销可能比计算本身还大。

**症状**：
- 传递 10MB 的 JSON 对象 → postMessage 耗时 >100ms
- 频繁传递小对象 → 累积序列化开销吃掉 Worker 的性能收益

**规避方案**：
```js
// ❌ 避免：大数据结构化克隆
worker.postMessage(hugeArray); // 慢

// ✅ 使用 Transferable 转移所有权（零拷贝）
const buffer = hugeArray.buffer;
worker.postMessage(buffer, [buffer]); // buffer 在主线程变为不可用

// ✅ 使用 SharedArrayBuffer 共享内存（需 COOP/COEP）
const shared = new SharedArrayBuffer(1024 * 1024);
worker.postMessage(shared);
```

**阈值经验**：
- < 1KB：postMessage 开销可忽略
- 1KB ~ 1MB：评估是否值得 Worker 卸载
- \> 1MB：必须用 Transferable 或 SharedArrayBuffer

---

## 3. 微任务队列饥饿（Microtask Starvation）

**问题**：递归的 Promise 或 MutationObserver 微任务可以无限占用主线程，导致宏任务（包括 setTimeout、渲染、rIC）永远无法执行。

**症状**：页面"冻死"——UI 不更新、点击无响应，但 DevTools 不显示 Long Task（因为微任务不被标记为 Long Task）。

**复现**：
```js
// 微任务饥饿
async function infiniteMicrotask() {
  await Promise.resolve();
  // 执行一些工作...
  infiniteMicrotask(); // 递归微任务，永远不让出主线程
}
infiniteMicrotask();
```

**规避方案**：
```js
// 将递归微任务改为宏任务拆分
async function chunkedWork(items) {
  for (const item of items) {
    processItem(item);
    // 每处理 N 个让出主线程
    if (shouldYield()) {
      await new Promise(r => setTimeout(r, 0)); // 切换到宏任务
    }
  }
}
```

**DevTools 诊断**：Performance 面板中微任务栏（紫色）持续占满 → 微任务饥饿。

---

## 4. rIC 在高负载下不触发

**问题**：`requestIdleCallback` 的回调只在浏览器空闲时执行。如果页面持续有高优先级任务（动画、用户输入），rIC 回调可能 **永远不被调用**，或等到 `timeout` 才执行。

**症状**：rIC 中的清理任务、预加载、日志上报等"非紧急"逻辑静默丢失。

**规避方案**：
```js
// 设置 timeout 兜底
requestIdleCallback(processQueue, { timeout: 2000 });

// 或改用 scheduler.postTask（更细粒度控制）
scheduler.postTask(cleanupTask, { priority: 'background' });
```

---

## 5. Worker 初始化冷启动开销

**问题**：首次创建 Worker 需要下载脚本、解析、初始化执行上下文，开销 **50~200ms**，可能比直接在主线程执行还慢。

**症状**：用户操作后首次响应变慢，后续操作正常。

**规避方案**：
```js
// 预创建 Worker Pool
class WorkerPool {
  constructor(size = navigator.hardwareConcurrency || 4) {
    this.pool = Array.from({ length: size }, () => new Worker('task.js'));
    this.queue = [];
  }
  // 复用已有 Worker 而非每次新建
  exec(data) {
    const worker = this.pool.find(w => !w.busy);
    // ...
  }
}
```

---

## 6. SharedArrayBuffer 安全限制

**问题**：Chrome 92+ 要求页面必须设置 `Cross-Origin-Opener-Policy: same-origin` 和 `Cross-Origin-Embedder-Policy: require-corp` 响应头才能使用 `SharedArrayBuffer`。

**症状**：未配置响应头时 `SharedArrayBuffer` 为 `undefined`，静默失败。

**规避方案**：
```nginx
# Nginx 配置
add_header Cross-Origin-Opener-Policy "same-origin";
add_header Cross-Origin-Embedder-Policy "require-corp";
```

```js
// 运行时检测
if (typeof SharedArrayBuffer === 'undefined') {
  console.warn('SharedArrayBuffer 不可用，回退到 postMessage');
}
```

---

## 7. scheduler.yield() 浏览器兼容性

**问题**：`scheduler.yield()` 是新 API（Chrome 115+），Safari/Firefox 尚未支持。

**症状**：在不支持的浏览器上直接报错。

**规避方案**：
```js
async function yieldToMain() {
  if ('scheduler' in globalThis && 'yield' in scheduler) {
    await scheduler.yield();
  } else {
    // 回退方案
    await new Promise(resolve => {
      setTimeout(resolve, 0); // 或 MessageChannel 方案
    });
  }
}
```

---

## 8. Worker 中的错误难以调试

**问题**：Worker 运行在独立线程，错误堆栈不包含主线程上下文，`console.log` 输出在 Worker 的独立 console 中。

**症状**：Worker 内报错后主线程只收到 `onerror` 事件中的文件名和行号，没有完整堆栈。

**规避方案**：
```js
// Worker 内部捕获错误并传递完整信息
self.onerror = (message, source, lineno, colno, error) => {
  self.postMessage({
    type: 'error',
    message,
    source,
    lineno,
    colno,
    stack: error?.stack
  });
};

// 主线程监听
worker.onmessage = (e) => {
  if (e.data.type === 'error') {
    console.error('Worker error:', e.data.stack);
  }
};
```
