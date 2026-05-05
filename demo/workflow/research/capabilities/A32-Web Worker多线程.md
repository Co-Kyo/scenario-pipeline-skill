# A32 - Web Worker 多线程

## 核心机制

### Web Worker 基本概念

Web Worker 允许在**后台线程**中运行 JavaScript，与主线程（UI 线程）并行执行，不阻塞页面渲染和用户交互。

**核心特性**：
- Worker 运行在独立的线程和全局上下文中（`DedicatedWorkerGlobalScope` 或 `SharedWorkerGlobalScope`）
- Worker **无法访问 DOM**、`window` 对象、`document` 对象
- Worker 可以使用 `fetch`、`XMLHttpRequest`、`WebSocket`、`IndexedDB` 等 Web API
- 数据通过 **postMessage** 在主线程和 Worker 之间传递

### Worker 类型

| 类型 | 构造函数 | 作用域 | 用途 |
|------|---------|--------|------|
| Dedicated Worker | `new Worker(url)` | DedicatedWorkerGlobalScope | 单脚本独占 |
| Shared Worker | `new SharedWorker(url)` | SharedWorkerGlobalScope | 多脚本/tab 共享 |
| Service Worker | `navigator.serviceWorker.register(url)` | ServiceWorkerGlobalScope | 离线/推送/代理 |

### postMessage 通信机制

```javascript
// 主线程
const worker = new Worker('worker.js');
worker.postMessage({ type: 'compute', data: largeArray });
worker.onmessage = (e) => {
  console.log('Result:', e.data);
};

// worker.js
self.onmessage = (e) => {
  const result = heavyComputation(e.data.data);
  self.postMessage({ type: 'result', data: result });
};
```

**数据传递规则**：
- **结构化克隆（Structured Clone）**：默认数据传递方式，深拷贝对象（支持大部分 JS 类型）
- **Transferable Objects**：通过 `transfer` 参数转移所有权（零拷贝），原线程失去访问权
  - 支持类型：`ArrayBuffer`、`MessagePort`、`ImageBitmap`、`OffscreenCanvas`
  ```javascript
  const buffer = new ArrayBuffer(1024 * 1024);
  worker.postMessage(buffer, [buffer]); // 转移所有权
  console.log(buffer.byteLength); // 0（已转移）
  ```
- **SharedArrayBuffer**：真正的共享内存，主线程和 Worker 可同时读写

### SharedArrayBuffer 与 Atomics

```javascript
// 主线程
const sab = new SharedArrayBuffer(1024);
const arr = new Int32Array(sab);
arr[0] = 42;

worker.postMessage(sab); // 传递 SharedArrayBuffer（不拷贝）

// Worker
self.onmessage = (e) => {
  const arr = new Int32Array(e.data);
  console.log(arr[0]); // 42（同一块内存）
  Atomics.add(arr, 0, 1); // 原子操作
  Atomics.notify(arr, 0); // 唤醒等待线程
};
```

**安全要求**：
- 页面必须启用 **Cross-Origin Isolation**（`Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`）
- 否则 `SharedArrayBuffer` 不可用（Spectre 漏洞缓解）

### Worker 线程隔离

Worker 拥有独立的：
- **全局对象**：`self`（而非 `window`）
- **事件循环**：独立的微任务和宏任务队列
- **内存空间**：独立的 V8 Isolate（除非使用 SharedArrayBuffer）
- **脚本加载**：独立的网络请求和解析

Worker 共享的：
- **浏览器进程**：同源 Worker 共享进程资源
- **IndexedDB**：同源可访问同一数据库
- **网络限制**：受同源策略约束

### 嵌套 Worker 与 Module Worker

```javascript
// Module Worker（ES Modules 支持）
const worker = new Worker('worker.js', { type: 'module' });

// worker.js
import { heavyCompute } from './compute.js';
self.onmessage = (e) => {
  self.postMessage(heavyCompute(e.data));
};
```

## 工程瓶颈

1. **数据拷贝开销**：默认 `postMessage` 使用结构化克隆，大数据（如图像、数组）拷贝开销大。需使用 Transferable 或 SharedArrayBuffer。
2. **Worker 启动成本**：创建 Worker 需要加载和解析脚本，首次启动有明显延迟（几十到几百毫秒）。
3. **Worker 池管理**：频繁创建/销毁 Worker 不经济，需要实现 Worker Pool 复用。
4. **调试困难**：Worker 的 DevTools 支持有限，需要单独的 Sources 面板标签。
5. **SharedArrayBuffer 竞态**：共享内存需要手动使用 `Atomics` 管理同步，容易产生竞态条件。
6. **跨域限制**：Worker 脚本受同源策略限制，不能加载跨域脚本（除非使用 `type: 'module'` + CORS）。
7. **错误处理**：Worker 中的错误不会冒泡到主线程，需要通过 `onerror` 和 `onmessageerror` 捕获。
8. **内存双倍占用**：Worker 有独立的堆空间，相同数据可能在主线程和 Worker 中各存一份。

## 调试工具

| 工具 | 用途 |
|------|------|
| Chrome DevTools → Sources → Threads | 查看和切换 Worker 线程 |
| Chrome DevTools → Application → Service Workers | 管理 Service Worker |
| `worker.onerror` | 捕获 Worker 中的未处理错误 |
| `worker.terminate()` | 终止 Worker（释放线程资源） |
| `performance.mark()` / `performance.measure()` | 测量 Worker 启动和消息传递耗时 |
| `console` (Worker 内) | Worker 内的 console 输出会转发到主线程 Console |
| Chrome Task Manager | 观察每个 Worker 的内存和 CPU 使用 |

## 典型权衡

| 维度 | 权衡 |
|------|------|
| postMessage vs SharedArrayBuffer | postMessage 安全简单但有拷贝开销；SharedArrayBuffer 高效但需手动同步 |
| Transferable vs 结构化克隆 | Transferable 零拷贝但失去原访问权；克隆安全但开销大 |
| Worker Pool vs 按需创建 | Pool 复用减少启动开销但占用常驻内存；按需创建省内存但启动慢 |
| Dedicated vs Shared Worker | Dedicated 简单一对一；Shared 多 tab 共享但通信更复杂 |
| Module Worker vs Classic Worker | Module 支持 import 但加载稍慢；Classic 启动快但不支持 ESM |
| 细粒度 vs 粗粒度任务 | 细粒度通信频繁开销大；粗粒度通信少但 Worker 利用率可能不均 |

## 最小验证实验

### 实验 1：基础 Worker 通信

```javascript
// main.js
const worker = new Worker('worker.js');
const start = performance.now();

worker.postMessage({ numbers: Array.from({ length: 1e6 }, () => Math.random()) });
worker.onmessage = (e) => {
  console.log(`Sorted ${e.data.count} numbers in ${performance.now() - start}ms`);
};

// worker.js
self.onmessage = (e) => {
  const sorted = e.data.numbers.sort((a, b) => a - b);
  self.postMessage({ count: sorted.length });
};
```

### 实验 2：Transferable 零拷贝

```javascript
// main.js
const buffer = new ArrayBuffer(8 * 1024 * 1024); // 8MB
const view = new Float64Array(buffer);
for (let i = 0; i < view.length; i++) view[i] = Math.random();

console.log('Before transfer:', buffer.byteLength); // 8388608
worker.postMessage(buffer, [buffer]);
console.log('After transfer:', buffer.byteLength); // 0（已转移）

// worker.js
self.onmessage = (e) => {
  const view = new Float64Array(e.data);
  console.log('Worker received:', view.length, 'elements');
  // 处理后可传回
  self.postMessage(e.data, [e.data]);
};
```

### 实验 3：Worker Pool 实现

```javascript
class WorkerPool {
  constructor(size, workerScript) {
    this.pool = Array.from({ length: size }, () => new Worker(workerScript));
    this.queue = [];
    this.available = [...this.pool];
  }

  exec(data) {
    return new Promise((resolve) => {
      if (this.available.length > 0) {
        const worker = this.available.pop();
        worker.onmessage = (e) => {
          resolve(e.data);
          this.available.push(worker);
          this._processQueue();
        };
        worker.postMessage(data);
      } else {
        this.queue.push({ data, resolve });
      }
    });
  }

  _processQueue() {
    if (this.queue.length > 0 && this.available.length > 0) {
      const { data, resolve } = this.queue.shift();
      const worker = this.available.pop();
      worker.onmessage = (e) => {
        resolve(e.data);
        this.available.push(worker);
        this._processQueue();
      };
      worker.postMessage(data);
    }
  }

  terminate() {
    this.pool.forEach(w => w.terminate());
  }
}

// 使用
const pool = new WorkerPool(4, 'worker.js');
const results = await Promise.all(
  Array.from({ length: 20 }, (_, i) => pool.exec({ task: i }))
);
```

## 参考资料

1. [MDN: Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) - Worker API 总览
2. [MDN: Worker](https://developer.mozilla.org/en-US/docs/Web/API/Worker) - Dedicated Worker
3. [MDN: SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker)
4. [MDN: SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) - 共享内存
5. [MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) - 使用指南
6. [web.dev: PostMessage Performance](https://web.dev/articles/optimizing-postmessage-performance) - 消息传递性能优化
7. [web.dev: SharedArrayBuffer](https://web.dev/articles/cross-origin-isolation-guide) - 跨域隔离与 SharedArrayBuffer
