# DOM节点生命周期

> ID: A2 | 扇出: 3/8 | 耦合度: 1 | 战略价值: 3.0

## 核心机制

DOM 节点的生命周期可划分为五个阶段：**创建 → 挂载（Connected） → 更新 → 卸载（Disconnected） → 回收**。理解这五个阶段及其间的引用关系，是诊断内存泄漏与性能问题的基础。

### 1. 创建（Creation）

节点通过 DOM API 创建，此时节点存在于 JS 堆内存中，但尚未挂载到文档树。

| API | 用途 | 特点 |
|-----|------|------|
| `document.createElement(tagName)` | 创建 Element 节点 | 最常用 |
| `document.createTextNode(data)` | 创建 Text 节点 | |
| `document.createComment(data)` | 创建 Comment 节点 | |
| `document.createDocumentFragment()` | 创建 DocumentFragment | 轻量容器，挂载时不产生中间 DOM 操作 |
| `document.createRange()` | 创建 Range 对象 | 用于选区/片段操作 |
| `cloneNode(deep)` | 克隆已有节点 | `deep=true` 递归克隆子树 |

创建后的节点状态：
- `parentNode === null`
- `isConnected === false`
- `ownerDocument` 指向创建它的 Document

### 2. 挂载（Mounting / Connecting）

将节点插入文档树，使其成为渲染树的一部分。

| API | 说明 |
|-----|------|
| `parent.appendChild(node)` | 追加为最后一个子节点 |
| `parent.insertBefore(node, refNode)` | 插入到 refNode 之前 |
| `parent.replaceChild(newChild, oldChild)` | 替换子节点 |
| `parent.append(...nodes)` | 支持字符串和多节点（现代 API） |
| `parent.prepend(...nodes)` | 前置插入 |
| `node.before()` / `node.after()` | 在兄弟位置插入 |
| `node.replaceWith(...nodes)` | 替换自身 |

**关键行为**：如果 node 已存在于文档树中，`appendChild` / `insertBefore` 会先从原位置移除（detach），再插入新位置。这是一次原子操作，不会触发两次独立的 DOM 变更。

挂载后状态变化：
- `parentNode` 指向父节点
- `isConnected === true`
- 浏览器触发样式计算、布局（Layout）、绘制（Paint）

### 3. 更新（Update）

节点挂载后，通过属性修改、子树变更等方式更新。

常用操作：
- 修改属性：`node.setAttribute()`, `node.textContent`, `node.innerHTML`
- 子节点操作：`appendChild`, `removeChild`, `replaceChild`
- 样式操作：`node.style.*`, `node.classList.*`

**浏览器渲染管线关联**：DOM 更新 → Style Recalculation → Layout → Paint → Composite。批量更新（如使用 DocumentFragment）可减少中间 Layout 次数。

### 4. 卸载（Unmounting / Disconnecting）

节点从文档树移除，但 JS 仍可能持有引用。

| API | 说明 |
|-----|------|
| `parent.removeChild(child)` | 移除指定子节点，返回被移除节点 |
| `child.remove()` | 现代 API，直接移除自身 |
| `parent.replaceChild(new, old)` | old 被移除 |

卸载后状态：
- `parentNode === null`
- `isConnected === false`
- 节点仍存在于 JS 堆中，未被 GC

### 5. 回收（Garbage Collection）

当节点从文档树断开（detached）且没有任何 JS 引用指向它（包括事件监听器、闭包、全局变量），GC 可以回收其内存。

**Detached DOM 节点**：已从文档树移除但仍被 JS 引用的 DOM 节点。这是内存泄漏的主要来源。

回收条件：
- 节点不在文档树中（detached）
- 无 JS 强引用（变量、闭包、事件监听器、Map/Set 条目等）
- 无 DOM 属性引用（如 `element.dataset` 中存储的引用）

### 6. isConnected 属性

`Node.isConnected`（只读布尔值）是判断节点是否连接到文档树的标准 API：
- `true`：节点直接或间接连接到 Document（包括 ShadowRoot）
- `false`：节点未连接（detached）

### 7. MutationObserver

`MutationObserver` 提供了监听 DOM 变化的机制，可在节点挂载/卸载/属性变更时执行回调，是理解生命周期变化的重要工具。

```js
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    // mutation.type: 'childList' | 'attributes' | 'characterData'
    // mutation.addedNodes / mutation.removedNodes
  }
});
observer.observe(targetNode, { childList: true, subtree: true });
```

## 工程瓶颈

| # | 瓶颈名 | 优先级 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|--------|----------|----------|----------|----------|
| 1 | **Detached DOM 内存泄漏** | P0 | DOM 节点被移除后，JS 仍持有引用（闭包、全局缓存、事件监听器未解绑） | 页面内存持续增长；长时间运行后卡顿甚至崩溃；GC 无法回收已移除的 DOM 节点 | Chrome DevTools → Memory → Heap Snapshot → 过滤 "Detached" | ① `removeChild` 后置空引用；② `removeEventListener` 或使用 `{ signal }` 参数；③ WeakRef / WeakMap 存储临时引用 |
| 2 | **事件监听器泄漏** | P0 | `addEventListener` 后未 `removeEventListener`，尤其在 SPA 路由切换时 | 事件回调被重复执行；内存中保留大量闭包和关联 DOM 引用 | Heap Snapshot → 搜索 EventListener 对象；Performance Monitor 观察 JS Heap 增长 | ① `AbortController` + `signal` 统一管理；② 框架的 `onUnmount` / `useEffect cleanup`；③ `once: true` 自动移除 |
| 3 | **批量 DOM 操作触发重排** | P1 | 循环中逐个 `appendChild`，每次触发 Layout | 界面闪烁（FOUC）；页面渲染卡顿；FPS 下降 | Performance 面板 → 观察 Layout / Recalculate Style 事件密度 | ① DocumentFragment 批量插入；② `innerHTML` 一次性构建；③ `requestAnimationFrame` 分帧 |
| 4 | **innerHTML / outerHTML 安全与性能** | P1 | 使用 `innerHTML` 插入用户输入导致 XSS；频繁 innerHTML 触发完整子树重建 | 安全漏洞；已有节点被意外销毁（事件监听器丢失） | CSP 审计；DOM Snapshot 对比 | ① 使用 `textContent` 或 Trusted Types；② 优先使用 `createElement` + `appendChild` |
| 5 | **闭包持有过期 DOM 引用** | P1 | 回调闭包捕获了旧的 DOM 节点引用，即使节点已被替换 | 即使 DOM 已更新，旧节点仍被 GC roots 可达 | Heap Snapshot Retainers 路径分析 | ① 闭包内避免引用外部 DOM 变量；② 使用 WeakRef 替代强引用 |
| 6 | **MutationObserver 未断开** | P2 | 创建 MutationObserver 后未调用 `disconnect()` | 持续消耗 CPU 处理无意义的 mutation；持有对目标节点的引用 | Performance Monitor 观察 CPU 使用 | 组件卸载时调用 `observer.disconnect()` |

## 调试工具

| 工具 | 用法 |
|------|------|
| **Chrome DevTools → Memory → Heap Snapshot** | 拍摄堆快照，过滤 "Detached" 节点，查看 Retainers 链定位泄漏源 |
| **Chrome DevTools → Memory → Allocation Timeline** | 实时观察内存分配，定位增长热点 |
| **Chrome DevTools → Performance Monitor** | 实时监控 JS Heap 大小、DOM 节点数、事件监听器数量 |
| **Chrome DevTools → Performance → Record** | 录制页面操作，分析 Layout / Paint 事件，定位批量 DOM 操作瓶颈 |
| **Chrome DevTools → Elements → Event Listeners** | 查看节点绑定的事件监听器及其捕获/冒泡阶段 |
| **`getEventListeners(node)`** | Console API，列出节点所有事件监听器（仅 DevTools Console 可用） |
| **`$0`** | Console 中引用当前 Elements 面板选中的节点，配合 `getEventListeners($0)` 快速检查 |
| **Lighthouse** | 自动审计性能与最佳实践，检测 DOM 规模过大等问题 |
| **Memlab (Meta)** | 自动化内存泄漏检测框架，支持堆快照对比和泄漏路径分析 |
| **`performance.measureUserAgentSpecificMemory()`** | 浏览器提供的精确内存度量 API（需安全上下文） |

## 典型权衡

| 维度 | 方案 A | 方案 B | 选择建议 |
|------|--------|--------|----------|
| **批量插入** | DocumentFragment 批量 append | `innerHTML` 一次性写入 | Fragment 保留已有节点和事件监听器；innerHTML 更快但销毁已有子树。**有交互节点用 Fragment，纯展示用 innerHTML** |
| **节点复用 vs 重建** | 对象池 / 节点回收（如虚拟列表的复用策略） | 每次全新 `createElement` | 高频列表切换（如虚拟滚动）用复用；低频操作用新建，代码更简单 |
| **事件绑定** | 直接 `addEventListener` 到每个子节点 | 事件委托绑定到父节点 | 子节点数量少且固定 → 直接绑定；动态列表/大量子节点 → **事件委托**，减少监听器数量和内存开销 |
| **DOM 查询** | 缓存 `querySelector` 结果 | 每次实时查询 | 高频操作路径缓存引用；低频/一次性查询可直接调用。注意缓存可能导致引用过期 |
| **更新策略** | 直接操作 DOM（原生 API） | 虚拟 DOM Diff（React/Vue） | 小规模、确定性更新 → 原生更快；复杂 UI 状态管理 → 框架的声明式更新更可维护 |
| **卸载清理** | 手动 `removeEventListener` + 置空引用 | `AbortController.signal` 集中管理 | 新项目推荐 AbortController 模式，可统一取消多个监听器和 Abortable Fetch |

## 最小验证实验

### 实验 1：Detached DOM 泄漏检测

```html
<!DOCTYPE html>
<html>
<head><title>Detached DOM Leak Demo</title></head>
<body>
<button id="leak">Create Leak</button>
<button id="clean">Clean Up</button>
<script>
let leakedNodes = [];

document.getElementById('leak').onclick = () => {
  // 创建节点并移除，但 JS 仍持有引用 → Detached DOM
  const div = document.createElement('div');
  div.textContent = 'I will leak!';
  document.body.appendChild(div);
  document.body.removeChild(div);
  leakedNodes.push(div); // 强引用阻止 GC
  console.log('Leaked nodes:', leakedNodes.length);
};

document.getElementById('clean').onclick = () => {
  leakedNodes = []; // 释放引用 → GC 可回收
  console.log('Cleaned. Nodes can be GC\'d now.');
};
</script>
</body>
</html>
```

**验证步骤**：
1. 打开 Chrome DevTools → Memory → 勾选 "Heap snapshot"
2. 多次点击 "Create Leak"
3. 拍摄 Heap Snapshot，过滤 "Detached"，观察数量递增
4. 点击 "Clean Up" 后再拍摄，Detached 节点应消失
5. 使用 Retainers 视图查看泄漏路径

### 实验 2：DocumentFragment 批量插入性能对比

```js
// 方式 A：逐个 appendChild（触发 N 次 Layout）
console.time('逐个插入');
for (let i = 0; i < 1000; i++) {
  const li = document.createElement('li');
  li.textContent = `Item ${i}`;
  list.appendChild(li);
}
console.timeEnd('逐个插入');

// 方式 B：DocumentFragment 批量插入（触发 1 次 Layout）
console.time('批量插入');
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  const li = document.createElement('li');
  li.textContent = `Item ${i}`;
  fragment.appendChild(li);
}
list.appendChild(fragment);
console.timeEnd('批量插入');
```

### 实验 3：事件委托 vs 直接绑定内存对比

```js
// 方式 A：每个子节点绑定事件（N 个监听器）
items.forEach(item => {
  item.addEventListener('click', handler);
});

// 方式 B：事件委托（1 个监听器）
parent.addEventListener('click', (e) => {
  if (e.target.matches('.item')) {
    handler(e);
  }
});
```

使用 Performance Monitor 对比两种方式的 "JS event listeners" 计数。

## 参考资料

1. [MDN - Document Object Model (DOM)](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) — DOM 核心概念、接口列表、树结构
2. [MDN - Node](https://developer.mozilla.org/en-US/docs/Web/API/Node) — Node 接口完整 API（属性、方法、事件）
3. [MDN - Node.isConnected](https://developer.mozilla.org/en-US/docs/Web/API/Node/isConnected) — 判断节点是否连接到文档树
4. [MDN - MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) — 监听 DOM 变化
5. [MDN - DocumentFragment](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment) — 批量 DOM 操作优化
6. [Chrome DevTools - Memory Terminology](https://developer.chrome.com/docs/devtools/memory-problems/memory-101) — Detached DOM 等内存概念
7. [web.dev - Detached DOM memory leaks](https://web.dev/articles/dom-ppa) — 工程实践与泄漏案例
8. [Memlab](https://github.com/facebook/memlab) — Meta 开源的自动化内存泄漏检测框架
9. [WHATWG DOM Spec](https://dom.spec.whatwg.org/) — DOM 标准规范
