# A2 - DOM 节点生命周期

## 概述

DOM 节点的生命周期涵盖**创建 → 插入 → 更新 → 销毁**四个阶段。每个阶段都有对应的 DOM API 和性能影响。理解节点生命周期对于避免不必要的 Reflow/Repaint、管理内存泄漏至关重要。

## 核心机制

### 1. 创建阶段（Creation）

DOM 节点可以通过多种方式创建：

#### 方式一：`document.createElement()`
```js
const div = document.createElement('div');
```
- 创建一个**未连接（disconnected）**的 DOM 节点
- 此时节点不在文档树中，不会触发 Layout 或 Paint
- 可以自由设置属性、样式、子节点

#### 方式二：`cloneNode()`
```js
const clone = existingNode.cloneNode(true); // true = 深克隆
```
- 复制已有节点及其属性
- 深克隆包含所有子节点，浅克隆只复制节点本身
- 克隆的节点同样不在文档树中

#### 方式三：HTML 解析器自动创建
- 浏览器解析 HTML 字节流时自动创建 DOM 节点
- 解析过程是增量的（Incremental），边接收边构建
- 每遇到一个 startTag/endTag 就创建或关闭节点

#### 方式四：`innerHTML` / `outerHTML`
```js
container.innerHTML = '<div class="item">Hello</div>';
```
- 触发 HTML 解析器解析字符串
- 会**销毁**原有子节点并创建新节点
- 解析过程相对 `createElement` 有额外开销

### 2. 插入阶段（Insertion）

将节点插入文档树后，它成为渲染树的候选节点：

| API | 特点 |
|-----|------|
| `appendChild(node)` | 追加到父节点末尾 |
| `insertBefore(node, ref)` | 插入到参考节点之前 |
| `replaceChild(new, old)` | 替换已有子节点 |
| `append(...nodes)` | 支持字符串和多节点，无返回值 |
| `prepend(...nodes)` | 插入到开头 |
| `after()` / `before()` | 相对于参考节点的兄弟位置插入 |

**关键性能行为**：
- 节点插入文档树后，浏览器可能需要执行 **Layout**（如果影响几何属性）
- 每次插入都可能触发一次布局计算——**批量插入**比逐个插入高效得多
- 使用 `DocumentFragment` 可以将多次插入合并为一次 DOM 操作

```js
// ❌ 逐个插入：触发 N 次 Layout
for (let i = 0; i < 1000; i++) {
  container.appendChild(createItem(i));
}

// ✅ Fragment 批量插入：触发 1 次 Layout
const frag = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  frag.appendChild(createItem(i));
}
container.appendChild(frag);
```

### 3. 更新阶段（Update）

节点插入后，可通过多种方式修改：

#### 内容更新
```js
node.textContent = 'new text';  // 推荐，不触发HTML解析
node.innerHTML = '<b>bold</b>';  // 触发HTML解析，有额外开销
node.nodeValue = 'text node value'; // 文本节点专用
```

#### 属性更新
```js
node.setAttribute('class', 'active');
node.className = 'active';
node.classList.add('active'); // 推荐，最灵活
node.dataset.id = '123';
```

#### 样式更新
```js
node.style.color = 'red';           // 行内样式
node.style.cssText = 'color: red; font-size: 14px'; // 批量设置
node.style.setProperty('--color', 'red'); // CSS 变量
```

**性能影响**：
- 修改样式属性可能触发 **Style Recalculation**（样式重计算）
- 修改影响布局的属性（width、height、margin 等）会触发 **Reflow**
- 修改仅影响绘制的属性（color、background 等）只触发 **Repaint**
- 修改 `transform`、`opacity` 可能只触发 **Composite**（最轻量）

### 4. 销毁阶段（Destruction）

```js
parent.removeChild(child);   // 传统方式
node.remove();                // 现代方式
container.innerHTML = '';     // 批量清除（会先销毁所有子节点）
```

**内存泄漏陷阱**：

节点从文档树移除后，如果有 JavaScript 变量仍引用它，节点**不会被垃圾回收**：

```js
const cache = {};
function addToCache(id, element) {
  cache[id] = element; // 引用存在！
}
// 移除节点后，cache 中的引用阻止 GC
container.removeChild(element);
// 仍然可以通过 cache[id] 访问该节点
```

**常见泄漏场景**：
- 事件监听器未解绑：`removeEventListener` 或使用 `AbortController`
- 定时器未清理：`clearInterval` / `clearTimeout`
- 闭包引用 DOM 节点
- Map/Set 持有 DOM 节点引用
- `MutationObserver` 未 `disconnect()`

### 5. 自定义元素生命周期（Custom Elements）

使用 Web Components 时，自定义元素有明确的生命周期回调：

```js
class MyElement extends HTMLElement {
  constructor() { /* 创建实例，此时不应访问属性或子节点 */ }
  connectedCallback() { /* 插入文档树 */ }
  disconnectedCallback() { /* 从文档树移除 */ }
  adoptedCallback() { /* 被移动到新文档 */ }
  attributeChangedCallback(name, oldVal, newVal) { /* 属性变化 */ }
  static get observedAttributes() { return ['data-value']; }
}
```

## 工程瓶颈

### 瓶颈1：频繁 DOM 操作导致多次 Layout

- **触发条件**：循环中逐个插入/修改节点
- **症状**：页面创建列表时明显卡顿
- **检测**：Performance 面板中多次 "Layout" 事件
- **缓解**：DocumentFragment 批量插入、`innerHTML` 一次性写入、虚拟列表

### 瓶颈2：事件监听器泄漏

- **触发条件**：组件销毁时未清理事件监听器
- **症状**：SPA 切换页面后内存持续增长、旧事件处理器仍在执行
- **检测**：Memory 面板堆快照（Heap Snapshot），搜索 Detached DOM tree
- **缓解**：`AbortController` 统一管理、框架的自动清理机制、WeakRef 引用

### 瓶颈3：innerHTML 导致子节点全部重建

- **触发条件**：使用 `innerHTML` 更新时，即使只改一个字也会销毁所有子节点并重建
- **症状**：失去子节点状态（滚动位置、焦点、动画状态）、大范围 Reflow
- **检测**：Performance 面板对比 `textContent` vs `innerHTML` 的 Layout 耗时
- **缓解**：使用 `textContent` 更新纯文本、DOM Diffing 算法（如虚拟 DOM）、精确更新只变化的节点

### 瓶颈4：Detached DOM 节点内存泄漏

- **触发条件**：节点从文档移除但仍被 JS 引用
- **症状**：内存占用持续增长，GC 无法回收
- **检测**：Chrome DevTools → Memory → Heap Snapshot → "Detached" 过滤
- **缓解**：移除节点时同时清除引用、使用 WeakMap/WeakRef 存储节点关联数据

## 调试工具

| 工具 | 用途 |
|------|------|
| Chrome DevTools → Elements | 实时查看和修改 DOM 树 |
| Chrome DevTools → Memory → Heap Snapshot | 查找 Detached DOM 节点、内存泄漏 |
| Chrome DevTools → Performance | 分析 DOM 操作的 Layout/Paint 开销 |
| `MutationObserver` | 监听 DOM 树变化（比 Mutation Events 高效） |
| `getEventListeners(node)` | 控制台中查看节点绑定的事件（仅限 DevTools） |

## 典型权衡

### 权衡1：innerHTML vs DOM API

- **innerHTML**：写入速度快（浏览器内部优化的 HTML 解析器），但会销毁子节点、丢失状态
- **DOM API**：精确控制，保留未修改节点状态，但代码量大、容易触发多次 Layout
- **实践**：初始渲染用 innerHTML 或模板引擎；增量更新用精确 DOM 操作

### 权衡2：DocumentFragment vs 虚拟 DOM

- **DocumentFragment**：原生方案，零依赖，适合简单批量插入
- **虚拟 DOM**：框架级方案（React/Vue），自动 Diff + 最小化 DOM 操作，但有额外的 Diff 开销
- **实践**：简单场景用 Fragment；复杂 UI 状态管理用框架

### 权衡3：事件委托 vs 直接绑定

- **事件委托**：事件绑定在父节点，通过 event.target 判断来源，内存开销小
- **直接绑定**：每个节点绑定事件，响应快但内存和初始化开销大
- **实践**：大量同类节点（如列表项）用事件委托；少量节点可直接绑定

## 最小验证实验

### 实验：观察 DOM 操作的性能差异

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DOM Lifecycle Performance</title>
  <style>
    .item { padding: 4px 8px; border-bottom: 1px solid #eee; }
    .result { margin: 20px; padding: 10px; background: #f5f5f5; font-family: monospace; }
  </style>
</head>
<body>
  <h1>DOM 节点生命周期性能实验</h1>
  <button onclick="testAppend()">逐个 appendChild</button>
  <button onclick="testFragment()">DocumentFragment 批量</button>
  <button onclick="testInnerHTML()">innerHTML 批量</button>
  <button onclick="testDetach()">测试 Detached 节点</button>
  <div id="result" class="result"></div>
  <div id="container"></div>

  <script>
    const N = 10000;
    const container = document.getElementById('container');
    const result = document.getElementById('result');

    function log(msg) {
      result.textContent += msg + '\n';
    }

    function testAppend() {
      container.innerHTML = '';
      const start = performance.now();
      for (let i = 0; i < N; i++) {
        const div = document.createElement('div');
        div.className = 'item';
        div.textContent = 'Item ' + i;
        container.appendChild(div);
      }
      log(`appendChild × ${N}: ${(performance.now() - start).toFixed(2)}ms`);
    }

    function testFragment() {
      container.innerHTML = '';
      const frag = document.createDocumentFragment();
      const start = performance.now();
      for (let i = 0; i < N; i++) {
        const div = document.createElement('div');
        div.className = 'item';
        div.textContent = 'Item ' + i;
        frag.appendChild(div);
      }
      container.appendChild(frag);
      log(`DocumentFragment × ${N}: ${(performance.now() - start).toFixed(2)}ms`);
    }

    function testInnerHTML() {
      const start = performance.now();
      let html = '';
      for (let i = 0; i < N; i++) {
        html += `<div class="item">Item ${i}</div>`;
      }
      container.innerHTML = html;
      log(`innerHTML × ${N}: ${(performance.now() - start).toFixed(2)}ms`);
    }

    function testDetach() {
      // 创建并立即移除，但保留引用
      const leaked = [];
      for (let i = 0; i < 100; i++) {
        const div = document.createElement('div');
        div.textContent = 'Detached ' + i;
        document.body.appendChild(div);
        document.body.removeChild(div);
        leaked.push(div); // 引用仍在！
      }
      log(`Created 100 detached nodes. leaked.length = ${leaked.length}`);
      log(`These nodes won't be GC'd until 'leaked' is cleared.`);
      // 清除引用
      leaked.length = 0;
      log('Cleared references. Nodes are now GC-eligible.');
    }
  </script>
</body>
</html>
```

**实验步骤**：
1. 依次点击三个按钮，对比三种插入方式的耗时
2. 点击 "测试 Detached 节点"，在 Memory 面板拍摄堆快照
3. 搜索 "Detached"，观察被分离但仍被引用的 DOM 节点
4. 在 Performance 面板中观察逐个 appendChild 和 DocumentFragment 的 Layout 差异

## 参考资料

1. [MDN - Document Object Model (DOM)](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)
2. [MDN - Element.innerHTML](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML)
3. [MDN - Node.appendChild()](https://developer.mozilla.org/en-US/docs/Web/API/Node/appendChild)
4. [MDN - DocumentFragment](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment)
5. [MDN - Using Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
6. [web.dev - Detached DOM trees memory leak](https://web.dev/articles/detached-window-memory-leaks)
