# P7-渲染性能 · 方案对比

> **命题**：渲染性能：重排重绘触发机制与合成层优化
> **核心思路**：每个 trade-off 都围绕"减少渲染管线参与阶段"展开

---

## 一、动画属性选择：transform vs top/left

### 维度
位移动画的实现方式选择

### 选项 A：top/left 改变位置
```css
.box {
  position: absolute;
  transition: left 0.3s, top 0.3s;
}
.box.moved {
  left: 200px;
  top: 100px;
}
```

**触发阶段**：Layout → Paint → Composite（全链路）

**优势**：
- 语义直观，"移动到某个位置"
- 与布局系统天然配合
- 调试时 Elements 面板直接看到值变化

**劣势**：
- 每帧触发 Layout，开销大
- 大量元素同时动画时帧率骤降
- 可能引发 Layout Thrashing

### 选项 B：transform: translate()
```css
.box {
  transition: transform 0.3s;
}
.box.moved {
  transform: translate(200px, 100px);
}
```

**触发阶段**：仅 Composite（GPU 合成）

**优势**：
- 性能最优，跳过 Layout 和 Paint
- GPU 加速，60fps 流畅
- 可配合 will-change 提前提升图层

**劣势**：
- 不改变文档流中的实际位置（offsetLeft/offsetTop 不变）
- 可能影响 z-index 和 stacking context
- 需要理解"视觉位置 ≠ 布局位置"

### 建议
**选 B（transform）**。性能差距可达 10 倍以上。仅在需要改变文档流位置（如拖拽排序影响相邻元素布局）时才用 top/left。

### 验证方法
Rendering 面板开启 Paint flashing → transform 动画无绿色闪烁，top/left 动画持续闪烁。

---

## 二、合成层管理：will-change 动态管理 vs 静态

### 维度
合成层提升策略

### 选项 A：静态 will-change 全局应用
```css
/* 样式表中全局声明 */
.card {
  will-change: transform;
}
```

**优势**：
- 实现简单，一次性配置
- 浏览器提前优化，动画启动无延迟

**劣势**：
- 所有 .card 元素常驻合成层
- GPU 显存持续占用（每个层约 4×宽×高 字节）
- 层过多导致合成阶段本身变慢
- 不动画的元素也被提升，浪费资源

### 选项 B：动态 JS 管理
```javascript
// 动画前设置
element.style.willChange = 'transform';
element.classList.add('animating');

// 动画结束后清除
element.addEventListener('transitionend', () => {
  element.style.willChange = 'auto';
  element.classList.remove('animating');
});
```

**优势**：
- 仅在需要时提升图层
- GPU 显存按需分配
- 避免合成层爆炸

**劣势**：
- 实现复杂度增加
- 需要管理动画生命周期
- 设置/清除之间有微小延迟（通常不可感知）

### 建议
**选 B（动态管理）**。特别是列表场景，100 个卡片同时静态 will-change 会占用大量 GPU 显存。仅对确定会持续动画的元素（如轮播图）考虑静态设置。

### 验证方法
Layers 面板对比：静态方案图层数 = 元素总数，动态方案图层数 = 当前动画元素数。

---

## 三、contain 粒度：根元素 strict vs 组件级 content

### 维度
CSS contain 属性的应用范围

### 选项 A：根元素 contain: strict
```css
#app {
  contain: strict;  /* size + layout + style + paint */
}
```

**优势**：
- 最大程度隔离，浏览器优化空间最大
- 整个页面形成独立的渲染边界

**劣势**：
- `strict` 包含 `size`，必须显式设置宽高
- 所有子元素的 Layout 变化都被隔离，可能导致预期外的布局行为
- position:fixed 定位异常（相对于 #app 而非 viewport）
- CSS counter 全局重置

### 选项 B：组件级 contain: content
```css
.card { contain: content; }
.sidebar { contain: content; }
.modal { contain: content; }
```

**优势**：
- `content` = layout + style + paint，不需要设置 size
- 组件级隔离，副作用可控
- 不影响 position:fixed（除非在组件内部）
- 渐进式采用，可按组件逐步添加

**劣势**：
- 需要逐个组件标注
- 隔离范围小，优化效果弱于全局方案

### 建议
**选 B（组件级 contain:content）**。实际项目中根元素 strict 副作用太大。组件级 content 是"性价比最高"的方案——用最小副作用获得最大的重排重绘范围缩小。

### 推荐标注策略
```css
/* 高频更新区域 */
.card { contain: layout style paint; }

/* 大型列表容器 */
.list-container { contain: layout style paint; }

/* 独立功能模块 */
.sidebar { contain: content; }
.modal-content { contain: content; }

/* 避免标注 */
.position-fixed-modal { /* 不加 contain */ }
.counter-list { /* 不加 contain:style */ }
```

---

## 四、屏幕外渲染：content-visibility vs 手动虚拟滚动

### 维度
长列表/长页面的屏幕外元素优化

### 选项 A：content-visibility: auto（CSS 原生）
```css
.list-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 50px;
}
```

**优势**：
- 零 JS 成本，纯 CSS 方案
- 浏览器原生支持，无需第三方库
- 渐进增强，降级无副作用
- 实现简单

**劣势**：
- DOM 节点仍然存在（只是跳过渲染）
- 超大数据量（>10000 节点）DOM 树本身成为瓶颈
- 无法精确控制回收和复用
- 滚动条精度依赖 contain-intrinsic-size 预估
- Safari 支持较晚（15.4+）

### 选项 B：手动虚拟滚动
```javascript
// 仅渲染可视区域内的节点
const visibleRange = calculateVisibleRange(scrollTop, viewportHeight);
renderItems(data.slice(visibleRange.start, visibleRange.end));
```

**优势**：
- DOM 节点数恒定（与数据量解耦）
- 可精确控制回收、复用、预加载
- 适合超大数据量（10万+）
- 可实现复杂交互（动态高度、搜索跳转）

**劣势**：
- 实现复杂度高
- 需要处理变高、滚动锚定、CLS 等边界问题
- 引入额外 JS 开销
- 需要第三方库或自研

### 建议
**简单场景选 A（content-visibility），复杂场景选 B（虚拟滚动）**。

| 场景 | 推荐方案 |
|------|---------|
| 长文档/静态内容 | content-visibility |
| 中等列表（<1000 项） | content-visibility |
| 大数据列表（>1000 项） | 虚拟滚动 |
| 复杂交互（拖拽/编辑） | 虚拟滚动 |
| 需要精确滚动定位 | 虚拟滚动 |

---

## 五、布局查询：同步 offsetWidth vs ResizeObserver

### 维度
获取元素尺寸的方式

### 选项 A：同步读取 offsetWidth
```javascript
const width = element.offsetWidth;
const rect = element.getBoundingClientRect();
```

**优势**：
- 立即获得精确值
- 实现简单

**劣势**：
- 可能触发强制同步布局
- 在循环中使用会导致 Layout Thrashing
- 读取时机敏感（DOM 未渲染完成时值为 0）

### 选项 B：ResizeObserver 异步监听
```javascript
const ro = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect;
    updateLayout(width, height);
  }
});
ro.observe(element);
```

**优势**：
- 不触发强制同步布局
- 回调在 Layout 后、Paint 前执行（最优时机）
- 批量处理多个元素的尺寸变化
- 自动清理（disconnect）

**劣势**：
- 异步，首次获取有延迟
- 回调频率可能过高（需节流）
- IE 不支持（但已不重要）

### 建议
**优先用 ResizeObserver，精确值场景才用同步读取**。如需首次精确值，可先同步读取一次，后续用 ResizeObserver 监听变化。

---

## 六、GPU 加速：translateZ(0) hack vs 浏览器自动判断

### 维度
强制触发合成层提升

### 选项 A：translateZ(0) / translate3d(0,0,0) hack
```css
.accelerated {
  transform: translateZ(0);
}
```

**优势**：
- 早期浏览器兼容性方案
- 明确触发合成层提升

**劣势**：
- 每个元素都创建独立合成层 → 层爆炸
- GPU 显存浪费
- 现代浏览器已不需要此 hack
- 合成层过多反而降低 Composite 性能

### 选项 B：依赖浏览器自动判断
```css
.animated-element {
  will-change: transform;  /* 仅在需要时 */
  /* 让浏览器决定是否提升 */
}
```

**优势**：
- 浏览器有更智能的图层管理策略
- 避免不必要的图层创建
- GPU 资源按需分配

**劣势**：
- 某些场景下浏览器可能不提升（需手动干预）

### 建议
**选 B（浏览器自动判断）**。`translateZ(0)` 是 2015 年的 hack，现代浏览器（Chrome 86+、Firefox 80+）有更智能的图层管理。滥用只会导致层爆炸。

---

## 七、性能监控：PerformanceObserver vs web-vitals

### 维度
生产环境性能数据采集

### 选项 A：PerformanceObserver API（原生）
```javascript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    reportMetric(entry);
  }
});
observer.observe({ type: 'largest-contentful-paint', buffered: true });
observer.observe({ type: 'layout-shift', buffered: true });
```

**优势**：
- 原生 API，零依赖
- 精确的 attribution 数据
- 可自定义观察指标
- Long Task 有完整的归属信息

**劣势**：
- 实现代码量大
- 需要处理浏览器差异
- 指标计算逻辑需自行实现

### 选项 B：web-vitals 库（封装）
```javascript
import { onLCP, onINP, onCLS } from 'web-vitals';
onLCP(console.log);
onINP(console.log);
onCLS(console.log);
```

**优势**：
- 2KB 封装，开箱即用
- 社区维护，处理了浏览器差异
- 与 Google 定义的指标一致
- 支持 attribution（调试信息）

**劣势**：
- 额外依赖
- 不支持自定义指标
- Long Task 细节需额外处理

### 建议
**生产环境 RUM 用 web-vitals，自定义指标/Long Task 细节用 PerformanceObserver**。两者可共存。

---

## 八、决策矩阵汇总

| 维度 | 推荐方案 | 性能收益 | 实现成本 | 适用场景 |
|------|---------|---------|---------|---------|
| 动画属性 | transform | ⭐⭐⭐⭐⭐ | 低 | 所有位移动画 |
| 合成层管理 | 动态 will-change | ⭐⭐⭐ | 中 | 列表/卡片动画 |
| contain 粒度 | 组件级 content | ⭐⭐⭐ | 低 | 通用组件 |
| 屏幕外渲染 | content-visibility | ⭐⭐⭐⭐ | 低 | 长文档/中等列表 |
| 屏幕外渲染 | 虚拟滚动 | ⭐⭐⭐⭐⭐ | 高 | 超大数据量 |
| 布局查询 | ResizeObserver | ⭐⭐⭐ | 低 | 尺寸监听 |
| GPU 加速 | 浏览器自动 | ⭐⭐ | 低 | 通用 |
| 性能监控 | web-vitals + PO | ⭐⭐⭐⭐ | 低 | 生产环境 |
