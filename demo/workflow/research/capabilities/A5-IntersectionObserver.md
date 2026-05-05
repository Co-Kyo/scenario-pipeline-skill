# A5 - IntersectionObserver

## 核心机制

IntersectionObserver API 是 W3C 标准的异步可见性观察接口，允许开发者注册回调函数，当目标元素与根元素（root）或视口（viewport）的交叉状态发生变化时触发回调。它**完全在浏览器内部异步执行**，不阻塞主线程。

### 1. 基本构造

```javascript
const observer = new IntersectionObserver(callback, options);
observer.observe(targetElement);
```

**options 配置项**：

| 属性 | 类型 | 说明 |
|------|------|------|
| `root` | Element/null | 交叉检测的根元素，默认为 viewport |
| `rootMargin` | string | 根元素的外边距，可扩大/缩小检测区域（如 `"100px"` 表示提前 100px 触发） |
| `scrollMargin` | string | 嵌套滚动容器的边距偏移 |
| `threshold` | number/number[] | 交叉比例阈值数组（0-1），如 `[0, 0.25, 0.5, 0.75, 1]` |
| `trackVisibility` | boolean | 是否追踪真实可见性（被遮挡、透明度等），计算开销大 |
| `delay` | number | trackVisibility 模式下的最小通知间隔（ms），最低 100ms |

### 2. 回调机制

```javascript
const callback = (entries, observer) => {
  entries.forEach(entry => {
    // entry.isIntersecting: 是否正在交叉
    // entry.intersectionRatio: 交叉比例 (0-1)
    // entry.boundingClientRect: 目标元素边界矩形
    // entry.rootBounds: 根元素边界矩形
    // entry.intersectionRect: 交叉区域矩形
    // entry.target: 被观察的目标元素
    // entry.time: 交叉变化的时间戳
  });
};
```

**关键行为**：
- 回调在主线程执行，但**观察和计算在浏览器后台异步进行**
- 一次回调可包含多个 `entries`（多目标或多阈值同时触发）
- 首次 `observe()` 时立即触发一次回调（用于初始状态判断）
- 回调中应快速执行，耗时操作使用 `requestIdleCallback` 延后

### 3. 与 scroll 事件的对比

| 维度 | scroll 事件 | IntersectionObserver |
|------|-------------|---------------------|
| 执行线程 | 主线程同步 | 浏览器内部异步 |
| 计算频率 | 每次 scroll 事件触发 | 浏览器优化后按需触发 |
| `getBoundingClientRect()` | 需手动调用，触发强制布局 | 浏览器内部完成，无布局开销 |
| 多目标检测 | 需循环遍历 | 一个 observer 可观察多个目标 |
| 精度 | 像素级 | 比例级（threshold 步进） |

### 4. 交叉计算原理

浏览器将所有参与计算的区域视为矩形：

1. **root 矩形**：根元素的内容区域（若为 viewport 则为视口矩形）
2. **rootMargin 调整**：正数扩大、负数缩小 root 矩形
3. **目标矩形**：目标元素的最小包围矩形
4. **交叉矩形**：root 矩形与目标矩形的交集
5. **交叉比例** = 交叉矩形面积 / 目标矩形面积

## 工程瓶颈

### 瓶颈1：回调在主线程执行

- **触发条件**：回调函数中执行耗时操作（复杂计算、大量 DOM 操作）
- **症状**：即使观察本身是异步的，回调仍可能阻塞主线程
- **检测**：Performance 面板火焰图中回调函数耗时
- **缓解**：回调中仅做标记/数据收集，耗时逻辑使用 `requestIdleCallback` 或 `setTimeout` 延后

### 瓶颈2：大量目标元素的观察开销

- **触发条件**：同时 observe 数千个元素
- **症状**：内存占用增加；回调批次过大导致单帧处理时间过长
- **检测**：Memory 面板观察 IntersectionObserver 实例数量
- **缓解**：
  - 使用 `unobserve()` 及时取消已完成的观察
  - 对已完成懒加载的元素 `unobserve`
  - 使用单个 observer 观察多个同类型目标

### 瓶颈3：rootMargin 预加载时机不精确

- **触发条件**：使用 `rootMargin` 做预加载，但网络或渲染延迟导致视觉不连续
- **症状**：图片/内容加载时机与用户滚动不匹配
- **检测**：Network 面板观察资源加载时机与滚动位置的关系
- **缓解**：根据网络状况动态调整 rootMargin；使用 placeholder 占位；结合 `loading="lazy"` 属性

### 瓶颈4：threshold 步进过细导致回调风暴

- **触发条件**：设置大量 threshold（如每 1% 一个），元素在边界附近快速移动
- **症状**：短时间内产生大量回调，帧率下降
- **检测**：Performance 面板观察回调频率和单帧回调数量
- **缓解**：减少 threshold 数量；在回调中使用防抖/节流；使用 `delay` + `trackVisibility` 模式

### 瓶颈5：嵌套滚动容器中的 root 选择

- **触发条件**：目标元素在多层嵌套滚动容器中
- **症状**：选择错误的 root 导致检测不准确；scrollMargin 配置复杂
- **检测**：手动验证交叉计算结果
- **缓解**：明确指定 root 为最近的滚动祖先；使用 `scrollMargin` 处理嵌套容器

## 调试工具

| 工具 | 用途 |
|------|------|
| Chrome DevTools Performance 面板 | 录制滚动过程，观察回调执行时机和耗时 |
| Chrome DevTools Console | `console.log(entry)` 打印交叉变化详情 |
| Chrome DevTools Elements 面板 | 实时观察元素位置和交叉状态 |
| `performance.mark()` | 在回调中标记时间点，配合 Performance 面板分析 |
| Intersection Observer polyfill | 测试兼容性，调试边界行为 |

## 典型权衡

### 权衡1：rootMargin 预加载量

| 维度 | 小 rootMargin (50px) | 大 rootMargin (500px) |
|------|---------------------|----------------------|
| 预加载时机 | 接近可见时才加载 | 提前大量加载 |
| 网络开销 | 低 | 高（可能加载用户不会看到的内容） |
| 用户体验 | 可能有短暂加载闪烁 | 更流畅 |
| **建议** | 图片懒加载用 200-300px；无限滚动用 1-2 屏高度 |

### 权衡2：精确追踪 vs 性能

| 维度 | trackVisibility=false | trackVisibility=true |
|------|----------------------|---------------------|
| 计算开销 | 低 | 高（需检查遮挡、透明度、变换） |
| 精度 | 仅检测几何交叉 | 检测真实可见性 |
| delay 约束 | 无 | 最低 100ms |
| **建议** | 大多数场景用 false；广告可见性追踪用 true |

### 权衡3：单 Observer vs 多 Observer

| 维度 | 单 Observer 多目标 | 多 Observer 各自目标 |
|------|-------------------|---------------------|
| 内存 | 低（一个实例） | 高（多个实例） |
| 灵活性 | 所有目标共享相同配置 | 每个目标可独立配置 |
| 管理复杂度 | 需在回调中区分目标 | 逻辑隔离清晰 |
| **建议** | 同类目标（如列表项懒加载）用单 observer；不同类型需求用多 observer |

## 最小验证实验

```html
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; }
  body { font-family: sans-serif; }
  .spacer { height: 100vh; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #999; }
  .target {
    height: 200px;
    margin: 20px;
    background: #e0e0e0;
    border: 3px solid transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    transition: all 0.3s;
  }
  .target.visible {
    background: #4CAF50;
    color: white;
    border-color: #2E7D32;
  }
  #log {
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0,0,0,0.8);
    color: #0f0;
    padding: 10px;
    font-family: monospace;
    font-size: 12px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 999;
  }
</style>
</head>
<body>
<div id="log"></div>
<div class="spacer">↓ Scroll down to see IntersectionObserver in action ↓</div>
<div class="target" data-id="1">Target 1</div>
<div class="spacer">Continue scrolling...</div>
<div class="target" data-id="2">Target 2</div>
<div class="spacer">Almost there...</div>
<div class="target" data-id="3">Target 3</div>
<div class="spacer">End</div>
<script>
const log = document.getElementById('log');
function addLog(msg) {
  const time = performance.now().toFixed(1);
  log.innerHTML += `<div>[${time}ms] ${msg}</div>`;
  log.scrollTop = log.scrollHeight;
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const id = entry.target.dataset.id;
    const ratio = entry.intersectionRatio.toFixed(2);
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      addLog(`Target ${id} ENTERED (ratio: ${ratio})`);
    } else {
      entry.target.classList.remove('visible');
      addLog(`Target ${id} LEFT (ratio: ${ratio})`);
    }
  });
}, {
  root: null, // viewport
  rootMargin: '0px',
  threshold: [0, 0.25, 0.5, 0.75, 1.0]
});

document.querySelectorAll('.target').forEach(el => observer.observe(el));
addLog('Observer started. Scroll to see events.');
</script>
</body>
</html>
```

## 参考资料

| 层级 | 标题 | URL |
|------|------|-----|
| 核心规范 | Intersection Observer API - MDN | https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API |
| 接口文档 | IntersectionObserver - MDN | https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver |
| W3C 规范 | Intersection Observer Specification | https://w3c.github.io/IntersectionObserver/ |
| 兼容性 | Can I Use: IntersectionObserver | https://caniuse.com/intersectionobserver |
| 实践指南 | Lazy Loading Images - web.dev | https://web.dev/articles/lazy-loading-images |
