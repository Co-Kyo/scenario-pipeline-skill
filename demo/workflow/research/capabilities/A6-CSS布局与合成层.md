# CSS布局与合成层

> ID: A6 | 扇出: 2/8 | 耦合度: 1 | 战略价值: 2.0

## 核心机制

### 浏览器渲染流水线（Pixel Pipeline）

浏览器将一帧的渲染分为五个阶段：

1. **JavaScript** — 触发样式变化或 DOM 操作
2. **Style** — 计算每个元素的最终样式（Recalculate Style）
3. **Layout** — 计算元素的几何信息（位置、大小），也叫 Reflow
4. **Paint** — 将像素绘制到多个合成层的位图上（Rasterization）
5. **Composite** — 将多个合成层按正确顺序叠加到屏幕上

优化的核心思路：**尽可能跳过 Layout 和 Paint 阶段，只触发 Composite**。

### CSS `contain` 属性

`contain` 告诉浏览器某个元素的子树是独立的，外部变化不应波及内部，反之亦然。浏览器可以据此跳过不必要的重算。

四种 containment 类型：

| 类型 | 值 | 作用 |
|------|------|------|
| **Size Containment** | `size` / `inline-size` | 元素尺寸与子元素完全解耦，浏览器可独立计算尺寸 |
| **Layout Containment** | `layout` | 内部布局与外部隔离。内部的 float、fixed 定位等不影响外部文档流 |
| **Style Containment** | `style` | CSS counters 和 quotes 作用域限定在元素内部，不会泄漏 |
| **Paint Containment** | `paint` | 子元素绘制不会超出容器边界（等同于 `overflow: hidden`），浏览器可跳过屏幕外元素的绘制 |

快捷值：
- `strict` = `size layout paint style`（最强隔离）
- `content` = `layout paint style`（不含 size，适合内容容器）

典型应用：对列表项、卡片组件、独立模块添加 `contain: content`，浏览器可在这些子树变化时跳过外部重算。

### `content-visibility` 属性

`content-visibility` 是 `contain` 的上层封装，专为屏幕外内容优化：

- `content-visibility: auto` — 屏幕外元素自动跳过渲染（Layout + Paint），进入视口时恢复。需配合 `contain-intrinsic-size` 提供占位尺寸，避免滚动条跳动。
- `content-visibility: visible` — 默认行为，不做任何优化。
- `content-visibility: hidden` — 强制跳过渲染，即使在视口内也不渲染。

性能收益：长列表、长页面首屏加载时间可缩短 50%–90%（Chromium 实测数据）。

### `will-change` 属性与合成层提升

`will-change` 向浏览器声明元素即将发生变化的属性，浏览器可提前准备优化（通常是提升为独立合成层）。

支持的值：
- `transform` — 提示 transform 即将变化，触发 GPU 合成层提升
- `opacity` — 提示 opacity 即将变化
- `scroll-position` — 提示即将滚动
- `contents` — 提示内容即将变化
- `auto` — 无特殊提示

**合成层提升机制**：当浏览器检测到元素需要独立合成（如 `will-change: transform`、`transform: translateZ(0)`、`backface-visibility: hidden` 等），会将该元素提升为独立的合成层（Compositing Layer），由 GPU 单独光栅化和合成。后续对该层的 transform/opacity 动画只需 GPU 合成，跳过 Layout 和 Paint。

### 合成层的创建条件

以下情况会触发合成层提升：
1. `will-change` 指定 `transform`、`opacity` 等
2. `transform` 不为 `none`（如 `translateZ(0)`）
3. `backface-visibility: hidden`
4. `<video>`、`<canvas>`、`<iframe>` 等元素
5. 位于已提升合成层之上的元素（层叠上下文继承）
6. CSS animation/transition 使用 `transform` 或 `opacity`

### Layout / Paint / Composite 隔离对比

| 阶段 | 触发条件 | 开销 | 优化手段 |
|------|----------|------|----------|
| Layout | 改变尺寸/位置属性（width, margin, font-size 等） | 高（可能触发整个文档 reflow） | `contain: layout`、减少 DOM 深度 |
| Paint | 改变外观属性（color, background, box-shadow 等） | 中（需要重新光栅化受影响区域） | `contain: paint`、减少绘制区域 |
| Composite | 仅改变 transform/opacity | 低（GPU 合成，60fps） | `will-change`、合成层提升 |

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|----------|----------|----------|----------|
| 1 | **合成层爆炸（Layer Explosion）** | 大量元素被提升为合成层（滥用 `will-change` 或 `transform: translateZ(0)`） | 内存暴涨、GPU 显存不足、页面白屏或闪烁 | Chrome DevTools → Layers 面板查看合成层数量和内存占用 | 限制合成层数量；仅在动画期间动态添加 `will-change`；用 JS 在动画前后切换 `will-change` |
| 2 | **Layout Thrashing** | JS 交替读写布局属性（如 offsetHeight → style.width → offsetHeight...） | 每次读取强制同步 reframe，帧率骤降至 10–20fps | Performance 面板中 Layout 任务反复出现；Lighthouse "Avoid forced reflows" 警告 | 批量读取后批量写入；使用 `requestAnimationFrame` 分离读写；`contain: layout` 限制 reflow 范围 |
| 3 | **Paint 抖动（Paint Storm）** | 大面积 repaint（如改变大面积 background-color、box-shadow） | 滚动或动画时掉帧 | Performance 面板 Paint 任务耗时 > 4ms；Layers 面板显示大面积 repaint | 使用 `contain: paint` 隔离绘制区域；用 `transform` 替代 top/left 动画；避免大面积 `box-shadow` |
| 4 | **content-visibility 滚动跳动** | 使用 `content-visibility: auto` 但未设置 `contain-intrinsic-size` | 长列表滚动时滚动条突然跳动、内容闪烁 | 用户反馈；滚动测试 | 始终配合 `contain-intrinsic-size` 使用；估算合理的占位高度 |
| 5 | **will-change 内存泄漏** | 在样式表中静态设置 `will-change`，元素永不移除该属性 | 合成层常驻内存，GPU 显存持续增长 | Chrome DevTools → Memory 面板；Layers 面板查看常驻层 | 用 JS 动态管理：动画前设置，动画后清除（`will-change: auto`）；不要在 CSS 中全局使用 |
| 6 | **contain 导致布局错乱** | 对使用 `position: fixed` 或 counter 的元素添加 `contain: layout` 或 `contain: style` | fixed 定位相对 contain 元素而非 viewport；counter 被重置 | 视觉检查；Layout 面板调试 | 理解 contain 副作用：layout containment 会创建新的 containing block；style containment 会隔离 counter 作用域 |

## 调试工具

| 工具 | 用法 |
|------|------|
| **Chrome DevTools → Layers 面板** | 3D 可视化查看所有合成层，检查层数、内存占用、层提升原因 |
| **Chrome DevTools → Performance 面板** | 录制页面操作，分析 Layout/Paint/Composite 各阶段耗时，定位瓶颈 |
| **Chrome DevTools → Rendering 面板** | 开启 "Paint flashing"（绿色闪烁表示 repaint）、"Layer borders"（显示合成层边界）、"FPS meter" |
| **Lighthouse** | 自动审计 "Avoid forced reflows"、"Avoid large layout shifts"、"Use CSS containment" 等性能指标 |
| **CSS Triggers (csstriggers.com)** | 查询每个 CSS 属性会触发 Layout/Paint/Composite 的哪些阶段 |
| **`content-visibility: auto` 效果验证** | Performance 面板对比开启前后的 Layout/Paint 任务数量和耗时 |

## 典型权衡

| 维度 | 方案A | 方案B | 选择建议 |
|------|-------|-------|----------|
| **动画属性** | 使用 `top`/`left` 做位移动画 | 使用 `transform: translate()` 做位移动画 | **选 B**。transform 只触发 Composite，top/left 触发 Layout + Paint。性能差距可达 10 倍以上 |
| **合成层策略** | 静态 `will-change: transform` 全局应用 | 动态 JS 管理，动画前设置、动画后清除 | **选 B**。静态应用导致合成层常驻内存；动态管理只在需要时占用资源 |
| **contain 粒度** | 对整个页面根元素添加 `contain: strict` | 对独立模块/组件分别添加 `contain: content` | **选 B**。根元素 strict 会导致尺寸计算异常；组件级 content 隔离效果好且副作用小 |
| **长列表渲染** | `content-visibility: auto` 自动跳过屏幕外内容 | 手动虚拟滚动（Virtual Scroll） | **视场景选择**。content-visibility 零 JS 成本，适合简单列表；虚拟滚动更精确，适合超大数据量（10 万+）和复杂交互 |
| **Layout 隔离** | `contain: layout` 限制 reflow 范围 | 重构组件 DOM 结构减少嵌套 | **优先选 A**（低成本见效），长期结合 B。contain 是声明式优化，不改变代码结构 |
| **GPU 加速** | `transform: translateZ(0)` 强制提升合成层 | 依赖浏览器自动判断 | **选 B**。浏览器已有智能合成层决策；手动 hack 会导致层爆炸。仅在确认需要时用 `will-change` |

## 最小验证实验

### 实验 1：contain 性能对比

```html
<!DOCTYPE html>
<html>
<head>
<style>
  .item { padding: 10px; margin: 5px; border: 1px solid #ccc; }
  .contained { contain: content; }
</style>
</head>
<body>
  <button onclick="toggleContain()">Toggle contain</button>
  <div id="list"></div>
  <script>
    // 生成 1000 个列表项
    const list = document.getElementById('list');
    for (let i = 0; i < 1000; i++) {
      const div = document.createElement('div');
      div.className = 'item';
      div.textContent = `Item ${i}`;
      list.appendChild(div);
    }
    function toggleContain() {
      document.querySelectorAll('.item').forEach(el => {
        el.classList.toggle('contained');
      });
    }
    // 触发频繁重排以观察性能差异
    setInterval(() => {
      document.querySelector('.item').style.width = 
        Math.random() * 200 + 100 + 'px';
    }, 100);
  </script>
</body>
</html>
```

**验证步骤**：
1. 打开 Chrome DevTools → Performance，录制 3 秒
2. 对比开启/关闭 `contain: content` 时的 Layout 耗时
3. 开启 Rendering → Paint flashing，观察 repaint 范围变化

### 实验 2：will-change 合成层提升验证

```html
<!DOCTYPE html>
<html>
<head>
<style>
  .box {
    width: 100px; height: 100px; background: coral;
    transition: transform 0.3s;
  }
  .box.optimized { will-change: transform; }
  .box:hover { transform: scale(1.5); }
</style>
</head>
<body>
  <div class="box optimized" id="box">Hover me</div>
  <script>
    const box = document.getElementById('box');
    box.addEventListener('mouseenter', () => box.style.willChange = 'transform');
    box.addEventListener('animationend', () => box.style.willChange = 'auto');
  </script>
</body>
</html>
```

**验证步骤**：
1. 打开 Layers 面板，观察 hover 前后合成层数量变化
2. 对比静态 `will-change` vs 动态 JS 管理的内存占用差异

## 参考资料

1. [MDN - CSS `contain` 属性](https://developer.mozilla.org/en-US/docs/Web/CSS/contain)
2. [MDN - CSS `will-change` 属性](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)
3. [web.dev - content-visibility](https://web.dev/articles/content-visibility)
4. [CSS Containment Module Level 2 规范](https://drafts.csswg.org/css-contain/)
5. [CSS Will Change Module Level 1 规范](https://drafts.csswg.org/css-will-change/)
6. [CSS Triggers - 查询属性触发的渲染阶段](https://csstriggers.com/)
7. [MDN - CSS Containment 指南](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment)
8. [Chrome DevTools - Layers 面板文档](https://developer.chrome.com/docs/devtools/evaluate-performance/reference#layers)
