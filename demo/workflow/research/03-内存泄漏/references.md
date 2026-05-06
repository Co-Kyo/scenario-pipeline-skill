# P3-内存泄漏 — 参考资料汇总

> 按来源权威性分层，优先使用 Tier 1 官方文档。

---

## Tier 1 — 官方文档与规范

### V8 GC 机制
- V8 Trash Talk（GC 原理入门）: https://v8.dev/blog/trash-talk
- V8 Free Garbage Collection（Orinoco 并发 GC）: https://v8.dev/blog/free-garbage-collection
- MDN - Memory Management in JavaScript: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management

### DOM 生命周期
- MDN - Document Object Model: https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model
- MDN - Node.isConnected: https://developer.mozilla.org/en-US/docs/Web/API/Node/isConnected
- MDN - MutationObserver: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
- MDN - DocumentFragment: https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment
- DOM Living Standard (WHATWG): https://dom.spec.whatwg.org/

### DevTools 诊断
- Chrome DevTools - Memory Problems: https://developer.chrome.com/docs/devtools/memory-problems/memory-101
- Chrome DevTools - Performance Panel: https://developer.chrome.com/docs/devtools/performance/
- Chrome DevTools - Memory Panel: https://developer.chrome.com/docs/devtools/memory/
- Chrome DevTools - Coverage: https://developer.chrome.com/docs/devtools/coverage/

### WeakRef / FinalizationRegistry
- MDN - WeakRef: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef
- MDN - WeakMap: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap
- MDN - FinalizationRegistry: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
- TC39 WeakRef Proposal: https://github.com/tc39/proposal-weakrefs

### 性能 API
- MDN - PerformanceObserver: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver
- MDN - PerformanceLongTaskTiming: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming
- MDN - AbortController: https://developer.mozilla.org/en-US/docs/Web/API/AbortController

---

## Tier 2 — 社区深度文章与工具

- web.dev - DOM PPA（性能模式与反模式）: https://web.dev/articles/dom-ppa
- Memlab — Meta 开源内存泄漏检测框架: https://github.com/facebook/memlab
- web-vitals — Google 性能指标库: https://github.com/GoogleChrome/web-vitals
- Chrome DevTools Performance 功能详解: https://www.cnblogs.com/xikui/p/17302436.html
- 前端性能优化-渲染优化: https://www.cnblogs.com/MarsPGY/p/15780486.html

---

## 关键术语对照表

| 英文术语 | 中文 | 出处 |
|---------|------|------|
| Detached DOM | 脱离文档树的 DOM 节点 | A2 |
| Garbage Collection (GC) | 垃圾回收 | A3 |
| Mark-Sweep | 标记-清除 | A3 |
| Mark-Compact | 标记-整理 | A3 |
| Scavenge | 新生代半空间回收 | A3 |
| Weak Reference | 弱引用 | A3 |
| Heap Snapshot | 堆快照 | A8 |
| Allocation Timeline | 分配时间线 | A8 |
| Retained Size | 保留大小（GC 后释放的内存） | A8 |
| Shallow Size | 浅层大小（对象自身占用） | A8 |
| Closure | 闭包 | A3 |
| GC Root | 垃圾回收根节点 | A3 |
| Finalization Registry | 终态注册表 | A3 |
| AbortController | 中止控制器 | A2 |
