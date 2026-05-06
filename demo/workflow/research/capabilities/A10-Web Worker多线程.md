# Web Worker 多线程

> ID: A10 | 扇出: 2/8 | 耦合度: 1 | 战略价值: 1.0 | 🏕️ 三级能力

## 核心机制

Web Worker 在独立线程中运行 JS，不阻塞主线程：

```javascript
// 主线程
const worker = new Worker('/worker.js');
worker.postMessage({ data: largeArray }); // 序列化传递
worker.onmessage = (e) => console.log(e.data);

// worker.js
self.onmessage = (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
};
```

**通信机制**：postMessage → 结构化克隆（Structured Clone）→ 序列化/反序列化。**Transferable Objects**（如 ArrayBuffer）可零拷贝传递，性能更高。

**限制**：Worker 无法访问 DOM、window、document。可用 API：fetch、WebSocket、IndexedDB、setTimeout 等。

**SharedWorker**：多个页面共享同一个 Worker 实例，适合跨标签页通信。

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|---------|---------|---------|---------|
| 1 | 序列化开销 | postMessage 传递大量数据 | 通信延迟 > 计算节省 | Performance 面板 | 使用 Transferable Objects（零拷贝） |
| 2 | Worker 初始化延迟 | 首次创建 Worker 需下载+解析 | 首次交互延迟 | Network 面板 | 预创建 Worker（空闲时初始化） |
| 3 | Worker 数量过多 | 每个任务创建新 Worker | 线程创建开销大 | 任务管理器 | Worker Pool 复用，限制并发数 |
| 4 | 调试困难 | Worker 代码在独立线程 | 断点不生效 | Sources 面板 → Worker 列表 | 使用 importScripts 或 module Worker |

## 典型权衡

| 维度 | 方案 A | 方案 B | 选择建议 |
|------|--------|--------|---------|
| 通信方式 | postMessage（简单，有序列化开销）| SharedArrayBuffer（零拷贝，需 Atomics）| 大数据用 SharedArrayBuffer，普通用 postMessage |
| Worker 模式 | 每任务一个 Worker（简单但开销大）| Worker Pool（复用但需管理）| 短任务用 Pool，长任务可单独 Worker |

## 参考资料

- [T1] MDN: Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- [T2] web.dev: Off Main Thread: https://web.dev/articles/off-main-thread
