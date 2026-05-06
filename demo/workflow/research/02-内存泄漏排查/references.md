# 内存泄漏排查：SPA 长时间运行后卡顿——事件监听/定时器/Detached DOM

## 参考资料

---

### T1 · 权威核心文档

#### JavaScript 引擎与垃圾回收

- **V8 Blog: Trash talk: the Orinoco garbage collector** — V8 引擎 GC 机制的权威解读，涵盖分代回收、增量标记、并发清扫等核心原理，是理解 JS 内存回收的底层基础
  - https://v8.dev/blog/garbage-collection-2024

#### Web API 与资源清理

- **MDN: AbortController** — 现代事件监听取消的标准方案，支持通过 AbortSignal 统一管理 fetch、事件监听器等异步资源的生命周期，是 SPA 中防止事件泄漏的关键 API
  - https://developer.mozilla.org/en-US/docs/Web/API/AbortController

---

### T2 · 实践导向参考

#### DevTools 内存调试

- **Chrome DevTools: Fix Memory Problems** — 官方内存问题排查指南，涵盖堆快照拍摄、内存时间线分析、Detached DOM 树定位等实战流程，直接对应 SPA 卡顿排查场景
  - https://developer.chrome.com/docs/devtools/memory-problems

- **web.dev: Investigate memory leaks with Chrome DevTools** — web.dev 的内存泄漏专题教程，以交互式示例演示如何识别和修复常见泄漏模式（事件监听器未解绑、定时器未清除、闭包持有 DOM 引用等）
  - https://web.dev/articles/devtools-memory

---

### 按主题速查

| 主题 | 参考 |
|------|------|
| GC 原理（分代/增量/并发） | V8 Blog |
| 事件监听泄漏与 AbortController | MDN: AbortController |
| 堆快照与 Detached DOM | Chrome DevTools Memory Problems |
| 实战排查流程 | web.dev: DevTools Memory |
| 定时器泄漏 | web.dev: DevTools Memory |
