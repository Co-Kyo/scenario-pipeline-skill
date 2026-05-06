# P3-内存泄漏 — 坑点提取

> 按严重程度排序：P0 = 必须避免（生产事故），P1 = 应当避免（性能隐患），P2 = 了解即可（边缘场景）

---

## P0 — 必须避免

### 1. Detached DOM 泄漏

**触发条件**：DOM 节点从文档树移除后，JS 仍通过闭包、全局变量、事件监听器、框架缓存等路径持有引用。

**典型场景**：
```javascript
// SPA 组件中的典型泄漏
class ListPage {
  constructor() {
    this.itemElements = [];
    this.render();
  }
  render() {
    const container = document.getElementById('list');
    for (let i = 0; i < 1000; i++) {
      const div = document.createElement('div');
      div.textContent = `Item ${i}`;
      div.addEventListener('click', () => this.handleClick(i));
      container.appendChild(div);
      this.itemElements.push(div); // 强引用
    }
  }
  destroy() {
    // ❌ 只移除了 DOM，未清空 this.itemElements
    document.getElementById('list').innerHTML = '';
  }
}
```

**症状**：页面内存持续增长，Heap Snapshot 中可见大量 `Detached HTMLElement`。

**诊断**：DevTools Memory → Heap Snapshot → Summary 视图搜索 `Detached` → Containment 视图追踪引用链。

**修复**：
```javascript
destroy() {
  document.getElementById('list').innerHTML = '';
  this.itemElements = []; // ✅ 释放引用
}
```

**[用于: edge-cases, overview]**

---

### 2. 事件监听器泄漏

**触发条件**：`addEventListener` 后未配套 `removeEventListener`，SPA 路由切换时旧组件的监听器未清理。

**典型场景**：
```javascript
// SPA 组件挂载时
useEffect(() => {
  const handleScroll = () => { /* ... */ };
  const handleResize = () => { /* ... */ };
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('resize', handleResize);
  // ❌ 没有返回清理函数，或返回了但遗漏部分监听器
}, []);
```

**症状**：路由切换后同一事件触发多次回调；Heap Snapshot 中 `EventListener` 对象数量持续增长。

**诊断**：Heap Snapshot → 搜索 `EventListener` → 检查数量是否与预期不符。

**修复**：
```javascript
useEffect(() => {
  const controller = new AbortController();
  window.addEventListener('scroll', handleScroll, { signal: controller.signal });
  window.addEventListener('resize', handleResize, { signal: controller.signal });
  return () => controller.abort(); // ✅ 一行清理所有监听器
}, []);
```

**[用于: edge-cases, overview]**

---

### 3. 闭包捕获导致隐式泄漏

**触发条件**：闭包无意中捕获了不再需要的大对象或 DOM 节点。

**典型场景**：
```javascript
function setupHandler() {
  const hugeData = new Array(100000).fill('*').join(''); // 100KB 字符串
  const element = document.getElementById('target');
  
  element.addEventListener('click', function handler() {
    // ❌ 闭包捕获了 hugeData，即使 handler 从未使用它
    console.log('clicked');
  });
  // hugeData 永远不会被 GC，因为闭包持有整个作用域
}
```

**症状**：Heap Snapshot 中意外的大 Retained Size，但找不到明显的泄漏对象。

**诊断**：Heap Snapshot → Containment → 展开 Closure 对象 → 检查 `[[Scopes]]` 中的变量。

**修复**：
```javascript
function setupHandler() {
  let hugeData = new Array(100000).fill('*').join('');
  // ... 使用 hugeData ...
  hugeData = null; // ✅ 使用后立即释放
  const element = document.getElementById('target');
  element.addEventListener('click', function handler() {
    console.log('clicked');
  });
}
```

**[用于: edge-cases, trade-offs]**

---

### 4. setInterval / setTimeout 泄漏

**触发条件**：定时器未在组件卸载时清除，回调中持有组件引用。

**典型场景**：
```javascript
useEffect(() => {
  setInterval(() => {
    fetchData().then(data => updateUI(data)); // ❌ 组件卸载后仍在执行
  }, 5000);
}, []);
```

**症状**：路由切换后旧组件的 API 请求仍在发出；UI 更新报错（组件已卸载）。

**修复**：
```javascript
useEffect(() => {
  const timer = setInterval(() => {
    fetchData().then(data => updateUI(data));
  }, 5000);
  return () => clearInterval(timer); // ✅
}, []);
```

**[用于: edge-cases]**

---

## P1 — 应当避免

### 5. 全局 Map 缓存无上限

**触发条件**：使用 `Map` 作为缓存但无淘汰策略，缓存条目只增不减。

**典型场景**：
```javascript
const cache = new Map();
function processUser(userId) {
  if (cache.has(userId)) return cache.get(userId);
  const data = fetchUser(userId); // 假设返回大对象
  cache.set(userId, data); // ❌ 永远不清理
  return data;
}
```

**症状**：长时间运行后 Map 条目数持续增长，内存占用线性上升。

**修复**：
```javascript
// 方案 1：WeakMap（键为对象时）
const cache = new WeakMap();

// 方案 2：LRU 缓存
import LRU from 'lru-cache';
const cache = new LRU({ max: 500 });
```

**[用于: edge-cases, trade-offs]**

---

### 6. 第三方库未调用 destroy()

**触发条件**：使用图表库（ECharts/Chart.js）、地图库（Mapbox/Leaflet）、富文本编辑器等重量级库，路由切换时未调用销毁方法。

**典型场景**：
```javascript
useEffect(() => {
  const chart = echarts.init(document.getElementById('chart'));
  chart.setOption(option);
  // ❌ 缺少 chart.dispose()
}, []);
```

**症状**：每次路由切换后内存增加数 MB；Heap Snapshot 中库内部对象持续累积。

**修复**：
```javascript
useEffect(() => {
  const chart = echarts.init(document.getElementById('chart'));
  chart.setOption(option);
  return () => chart.dispose(); // ✅
}, []);
```

**[用于: edge-cases]**

---

### 7. MutationObserver / IntersectionObserver 未 disconnect

**触发条件**：创建了 Observer 但未在组件卸载时 disconnect。

**典型场景**：
```javascript
useEffect(() => {
  const observer = new MutationObserver(mutations => { /* ... */ });
  observer.observe(document.body, { childList: true, subtree: true });
  // ❌ 缺少 observer.disconnect()
}, []);
```

**修复**：
```javascript
useEffect(() => {
  const observer = new MutationObserver(mutations => { /* ... */ });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect(); // ✅
}, []);
```

**[用于: edge-cases]**

---

## P2 — 了解即可

### 8. WebSocket / EventSource 未关闭

**触发条件**：页面离开时未关闭 WebSocket 连接，回调中持有页面状态。

**修复**：`beforeunload` 或组件卸载时调用 `ws.close()`。

**[用于: edge-cases]**

---

### 9. Promise 链中的隐式引用

**触发条件**：长 Promise 链中闭包捕获了中间变量。

**典型场景**：
```javascript
fetch('/api/data')
  .then(res => res.json())
  .then(data => {
    const processed = heavyProcess(data); // processed 被后续闭包隐式持有
    return processed;
  })
  .then(result => updateUI(result));
  // processed 在整条链完成前不会被 GC
```

**修复**：及时 `= null` 释放不再需要的中间变量。

**[用于: edge-cases]**

---

## 坑点速查表

| # | 坑点 | 优先级 | 一句话修复 | 涉及能力 |
|---|------|--------|-----------|---------|
| 1 | Detached DOM | P0 | 移除后清空引用 | A2 |
| 2 | 事件监听器泄漏 | P0 | AbortController.signal | A2 |
| 3 | 闭包捕获隐式泄漏 | P0 | 缩小作用域 / = null | A3 |
| 4 | setInterval 泄漏 | P0 | 组件卸载时 clearInterval | A2 |
| 5 | Map 缓存无上限 | P1 | WeakMap 或 LRU | A3 |
| 6 | 第三方库未销毁 | P1 | 调用 dispose()/destroy() | A2 |
| 7 | Observer 未 disconnect | P1 | 组件卸载时 disconnect | A2 |
| 8 | WebSocket 未关闭 | P2 | 离开时 close() | A2 |
| 9 | Promise 链隐式引用 | P2 | 及时 = null | A3 |
