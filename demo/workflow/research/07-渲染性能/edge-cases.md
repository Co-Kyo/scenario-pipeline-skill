# P7-渲染性能 · 坑点提取

> **命题**：渲染性能：重排重绘触发机制与合成层优化
> **分类**：按触发机制分为时序竞争、资源边界、状态跃迁、输入变异四类

---

## 一、时序竞争类坑点

### EC-1：Layout Thrashing（布局抖动）

**触发条件**：JS 循环中交替读取布局属性（offsetWidth、getBoundingClientRect 等）和修改样式

**典型反模式**：
```javascript
// 每次循环都触发一次 Layout
items.forEach(item => {
  const height = item.offsetHeight;          // 读 → 强制刷新布局
  item.style.height = height + 10 + 'px';   // 写 → 脏标记
});
```

**表现**：帧率从 60fps 骤降至 10-20fps，Performance 面板 Main 轨道出现密集的紫色 Layout 事件

**检测方法**：
- Performance 面板录制 → Main 轨道查看 Layout 事件密度
- Rendering 面板开启 "Layout Shift Regions"
- Lighthouse → Avoids enormous network payloads / Reduce JavaScript execution time

**修复**：
```javascript
// 先批量读，再批量写
const heights = items.map(item => item.offsetHeight);
items.forEach((item, i) => {
  item.style.height = heights[i] + 10 + 'px';
});
```

**严重程度**：🔴 P0 — 直接导致用户可感知的卡顿

---

### EC-2：强制同步布局（Forced Synchronous Layout）

**触发条件**：在样式变更后立即读取布局属性，浏览器被迫同步执行 Layout

**隐蔽触发场景**：
```javascript
// 看似无害，但 getBoundingClientRect() 会强制布局
element.style.display = 'block';
const rect = element.getBoundingClientRect();  // 强制同步布局！
```

**常见触发属性**（读取时会强制布局）：
- `offsetWidth` / `offsetHeight` / `offsetTop` / `offsetLeft`
- `scrollWidth` / `scrollHeight` / `scrollTop` / `scrollLeft`
- `clientWidth` / `clientHeight` / `clientTop` / `clientLeft`
- `getBoundingClientRect()` / `getComputedStyle()`

**检测方法**：
- Performance 面板 → Main 轨道中 Layout 事件前有红色三角标记
- Chrome DevTools Console → "Forced reflow while executing JavaScript" 警告

**修复**：将所有读操作集中到写操作之前；或使用 ResizeObserver 异步监听

**严重程度**：🔴 P0

---

### EC-3：rAF 回调过重

**触发条件**：requestAnimationFrame 回调中执行复杂计算，超过帧预算（16.6ms）

**典型场景**：
```javascript
function animate() {
  // ❌ 在 rAF 中做大量计算
  const results = heavyComputation();  // 假设耗时 20ms
  updateDOM(results);
  requestAnimationFrame(animate);
}
```

**表现**：动画不流畅，FPS 持续低于 60

**修复**：将计算移到 rAF 外部，或使用 scheduler.yield() 分片

**严重程度**：🟡 P1

---

### EC-4：微任务队列饥饿

**触发条件**：大量 Promise.then 或 MutationObserver 回调堆积，阻塞渲染更新

**典型场景**：
```javascript
// 连续创建大量微任务
for (let i = 0; i < 100000; i++) {
  Promise.resolve().then(() => heavyWork(i));
}
// 渲染更新被推迟到所有微任务完成后
```

**表现**：页面响应延迟，INP 劣化

**检测方法**：Performance 面板 → Main 轨道中微任务（蓝色）密集连续

**严重程度**：🟡 P1

---

## 二、资源边界类坑点

### EC-5：合成层爆炸（Layer Explosion）

**触发条件**：大量元素被提升为合成层——滥用 `will-change`、`translateZ(0)` hack、或浏览器隐式创建过多图层

**典型反模式**：
```css
/* ❌ 每个列表项都提升为合成层 */
.list-item {
  will-change: transform;
  /* 或 */
  transform: translateZ(0);
}
```

**表现**：
- 内存暴涨（每个合成层占用 GPU 显存）
- 低端设备白屏或闪烁
- Chrome DevTools Layers 面板显示数百个图层

**检测方法**：
- DevTools → More tools → Layers → 查看图层数量和总内存
- Rendering 面板 → "Layer borders" 查看图层边界

**修复**：
```javascript
// 仅在动画开始前提升，动画结束后降级
element.addEventListener('mouseenter', () => {
  element.style.willChange = 'transform';
});
element.addEventListener('animationend', () => {
  element.style.willChange = 'auto';
});
```

**严重程度**：🔴 P0 — 低端设备直接不可用

---

### EC-6：Paint Storm（大面积重绘风暴）

**触发条件**：大面积元素同时触发 repaint（如大面积 background-color 变化、box-shadow 更新）

**典型场景**：
```css
/* 滚动时整个容器背景变化 */
.container {
  background: var(--bg);
  box-shadow: 0 2px 20px rgba(0,0,0,0.3);  /* 大面积阴影 */
  transition: background 0.3s;
}
```

**表现**：滚动或动画时掉帧，Performance 面板 Paint 事件耗时 >4ms

**检测方法**：
- Rendering 面板 → "Paint flashing"（绿色闪烁表示重绘区域）
- Performance 面板 → Paint 事件耗时

**修复**：用 `contain: paint` 隔离绘制区域；将背景动画改为 transform/opacity

**严重程度**：🟡 P1

---

### EC-7：大图解码阻塞主线程

**触发条件**：高分辨率图片在 Raster 阶段解码耗时过长，阻塞主线程

**表现**：页面卡死数秒，Performance 面板出现 Image decode 长任务

**修复**：使用 `decoding="async"` 属性；WebP/AVIF 格式减小体积；`loading="lazy"` 延迟加载

**严重程度**：🟡 P1

---

## 三、状态跃迁类坑点

### EC-8：Detached DOM 内存泄漏

**触发条件**：DOM 节点从文档树移除后，JS 仍持有引用（闭包、全局变量、事件监听器）

**典型场景**：
```javascript
// 节点被移除但 cache 仍持有引用
const cache = new Map();
function renderList(data) {
  const oldNodes = document.querySelectorAll('.item');
  oldNodes.forEach(node => node.remove());  // 移除 DOM
  // 但 cache 中仍引用这些节点 → Detached DOM 泄漏
  data.forEach(item => {
    const node = createNode(item);
    cache.set(item.id, node);
    container.appendChild(node);
  });
}
```

**检测方法**：
- Memory 面板 → Heap Snapshot → Class filter 搜索 "Detached"
- 对比两次 Heap Snapshot，查找增长的 Detached 节点

**修复**：移除后置空引用；使用 WeakRef/WeakMap 替代强引用

**严重程度**：🔴 P0 — 长时间运行页面必然崩溃

---

### EC-9：事件监听器泄漏

**触发条件**：addEventListener 后未配套 removeEventListener，SPA 路由切换时尤为突出

**典型场景**：
```javascript
// 组件挂载时绑定
useEffect(() => {
  window.addEventListener('scroll', handleScroll);
  // ❌ 忘记清理
}, []);

// 正确做法
useEffect(() => {
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

**表现**：事件回调重复执行，内存中保留大量闭包

**修复**：AbortController 统一管理；框架 onUnmount 清理

**严重程度**：🔴 P0

---

### EC-10：will-change 内存泄漏

**触发条件**：在样式表中静态设置 `will-change` 且从不移除

**反模式**：
```css
/* ❌ 所有元素常驻合成层 */
.animated {
  will-change: transform;
  /* 动画结束后也不会降级 */
}
```

**表现**：合成层常驻内存，GPU 显存持续增长

**修复**：JS 动态管理——动画前设置，动画后清除为 `auto`

**严重程度**：🟡 P1

---

## 四、输入变异类坑点

### EC-11：content-visibility 滚动跳动

**触发条件**：使用 `content-visibility: auto` 但未设置 `contain-intrinsic-size`

**反模式**：
```css
/* ❌ 缺少预估尺寸 */
.below-fold {
  content-visibility: auto;
  /* 未设置 contain-intrinsic-size */
}
```

**表现**：长列表滚动时滚动条突然跳动，内容闪烁

**修复**：
```css
.below-fold {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;  /* 必须配合 */
}
```

**严重程度**：🟡 P1

---

### EC-12：contain 导致布局错乱

**触发条件**：对 `position: fixed` 或使用 CSS counter 的元素添加 `contain: layout` 或 `contain: style`

**典型场景**：
```css
.sidebar {
  contain: layout;
}
.sidebar .modal {
  position: fixed;
  /* ❌ fixed 定位相对于 sidebar 而非 viewport */
}
```

**表现**：fixed 定位异常；counter 被重置为 0

**修复**：理解 contain 的副作用——`contain: layout` 创建新的 containing block；`contain: style` 隔离 counter

**严重程度**：🟠 P2

---

## 五、坑点严重程度汇总

| 编号 | 坑点 | 类型 | 严重程度 | 涉及能力 |
|-----|------|------|---------|---------|
| EC-1 | Layout Thrashing | 时序竞争 | 🔴 P0 | A1, A4 |
| EC-2 | 强制同步布局 | 时序竞争 | 🔴 P0 | A1 |
| EC-3 | rAF 回调过重 | 时序竞争 | 🟡 P1 | A4 |
| EC-4 | 微任务队列饥饿 | 时序竞争 | 🟡 P1 | A4 |
| EC-5 | 合成层爆炸 | 资源边界 | 🔴 P0 | A6 |
| EC-6 | Paint Storm | 资源边界 | 🟡 P1 | A1, A6 |
| EC-7 | 大图解码阻塞 | 资源边界 | 🟡 P1 | A1 |
| EC-8 | Detached DOM 泄漏 | 状态跃迁 | 🔴 P0 | A2 |
| EC-9 | 事件监听器泄漏 | 状态跃迁 | 🔴 P0 | A2 |
| EC-10 | will-change 泄漏 | 状态跃迁 | 🟡 P1 | A6 |
| EC-11 | content-visibility 跳动 | 输入变异 | 🟡 P1 | A6 |
| EC-12 | contain 布局错乱 | 输入变异 | 🟠 P2 | A6 |

---

## 六、DevTools 诊断 Checklist

遇到渲染性能问题时，按以下顺序排查：

1. **Performance 面板录制** → 检查 FPS 轨道是否有红色掉帧
2. **Main 轨道** → 查找 Long Task（>50ms 红色块）和 Layout 事件密度
3. **Rendering 面板** → 开启 Paint flashing 查看重绘区域
4. **Layers 面板** → 检查合成层数量和内存占用
5. **Memory 面板** → Heap Snapshot 过滤 Detached DOM
6. **Console** → 检查 "Forced reflow" 警告
