# Core Web Vitals — Edge Cases（坑点提取）

## LCP 坑点

### 1. 首屏图片误用 `loading="lazy"`
**场景**：开发者习惯性给所有 `<img>` 加 `loading="lazy"`，包括首屏 Hero 图片。
**后果**：LCP 图片被延迟加载，直到用户滚动触发 Intersection Observer 才开始下载，LCP 可能从 1.5s 劣化到 4s+。
**诊断**：Lighthouse 报告 "Largest Contentful Paint image was lazily loaded"。
**修复**：首屏 LCP 图片移除 `loading="lazy"`，改用 `fetchpriority="high"`。
```html
<!-- ❌ 错误 -->
<img src="hero.webp" loading="lazy">

<!-- ✅ 正确 -->
<img src="hero.webp" fetchpriority="high">
```

### 2. CSS 渲染阻塞导致 LCP 延迟
**场景**：关键 CSS 通过外部 `<link>` 加载，网络慢或 CSS 文件过大。
**后果**：浏览器等待 CSS 下载完成才开始渲染，FCP 和 LCP 同步延迟。
**诊断**：Lighthouse → "Eliminate render-blocking resources"；Performance 面板中 CSS 下载期间无渲染事件。
**修复**：内联 Critical CSS，剩余 CSS 异步加载。
```html
<style>/* 首屏关键 CSS 内联 */</style>
<link rel="preload" href="rest.css" as="style" onload="this.rel='stylesheet'">
```

### 3. JS 阻塞 DOM 解析推后 LCP
**场景**：首屏渲染依赖的 JS 无 `defer`/`async`，放在 `<head>` 中。
**后果**：JS 下载并执行期间 DOM 解析暂停，LCP 元素无法被发现和渲染。
**诊断**：Performance 面板 Main 轨道中 Parse HTML 阶段被 Script Evaluation 打断。
**修复**：非关键 JS 使用 `defer`，关键 JS 使用 `async`。

### 4. preload 与 CORS 不匹配导致双重下载
**场景**：`<link rel="preload" as="font" href="https://cdn.example.com/font.woff">` 但字体跨域未设置 `crossorigin`。
**后果**：浏览器预加载一份，实际使用时因 CORS 不匹配重新下载，浪费带宽且延迟 LCP。
**诊断**：Console 警告 "preload resource was not used within a few seconds"；Network 面板出现两次相同资源请求。
**修复**：跨域资源 preload 必须加 `crossorigin`。
```html
<link rel="preload" href="https://cdn.example.com/font.woff" as="font" crossorigin>
```

### 5. TTFB 过高拖累 LCP
**场景**：服务器响应慢（数据库查询、无 CDN、未启用服务端缓存）。
**后果**：LCP = TTFB + 资源加载 + 渲染，TTFB 占比过大时前端优化空间有限。
**诊断**：Lighthouse → "Reduce initial server response time"；Performance 面板 Network 轨道等待时间长。
**修复**：启用 CDN、服务端缓存、数据库查询优化。

---

## CLS 坑点

### 6. 无尺寸声明的图片导致布局偏移
**场景**：`<img>` 标签未设置 `width`/`height`，或 CSS 中未声明 `aspect-ratio`。
**后果**：图片加载前浏览器不知道其尺寸，加载完成后周围内容被推移，产生 CLS。
**诊断**：Performance 面板 Experience 轨道出现 Layout Shift 事件。
**修复**：HTML 中声明 `width`/`height`，或 CSS 中设置 `aspect-ratio`。
```html
<img src="photo.webp" width="800" height="600" alt="...">
```
```css
img { aspect-ratio: 4/3; width: 100%; height: auto; }
```

### 7. 动态注入内容（广告/通知）引起布局跳动
**场景**：页面加载后动态插入 banner、cookie 提示、广告位，没有预留空间。
**后果**：已有内容被向下推移，CLS 持续累积。
**诊断**：Performance 面板 Layout Shift 事件带有 "Had recent input: false" 属性。
**修复**：为动态内容预留固定高度容器，或使用 CSS `contain: layout` 隔离。

### 8. Web Font 加载导致 FOUT/CLS
**场景**：Web Font 加载期间使用 fallback 字体，两者 metrics 差异大。
**后果**：字体切换导致文本行高、字宽变化，周围元素位移。
**诊断**：Performance 面板 Experience 轨道 Layout Shift 与字体加载时间吻合。
**修复**：`font-display: optional`（完全避免 FOUT）或 `size-adjust`/`ascent-override` 匹配 fallback 字体 metrics。

### 9. content-visibility:auto 未配合 contain-intrinsic-size
**场景**：使用 `content-visibility: auto` 优化长页面，但未设置 `contain-intrinsic-size`。
**后果**：屏幕外元素高度为 0，滚动到可视区域时高度突然变化，滚动条跳动。
**诊断**：滚动测试可见内容闪烁。
**修复**：始终配合 `contain-intrinsic-size` 使用。
```css
.section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* 预估高度 */
}
```

### 10. 合成层爆炸导致 CLS
**场景**：大量元素被 `will-change: transform` 或 `translateZ(0)` 提升为合成层。
**后果**：GPU 显存不足时浏览器降级处理，图层合并过程中可能出现视觉闪烁。
**诊断**：Chrome DevTools → Layers 面板查看合成层数量和内存占用。
**修复**：限制合成层数量，JS 动态管理 `will-change`：动画前设置，动画后清除。

---

## INP 坑点

### 11. Long Task 阻塞输入事件响应
**场景**：主线程执行 >50ms 的同步任务（大数组排序、复杂 DOM 操作、同步 XHR）。
**后果**：用户点击/键盘事件排队等待，INP 劣化。>200ms 用户感知到"卡"。
**诊断**：Performance 面板 Main 轨道红色 Long Task 块；`PerformanceObserver({ type: 'longtask' })` 捕获。
**修复**：任务分片（`scheduler.yield()` 或 `requestIdleCallback`），或卸载到 Web Worker。
```javascript
// 任务分片示例
async function processLargeArray(items) {
  for (const item of items) {
    processItem(item);
    if (performance.now() - start > 30) {
      await scheduler.yield(); // 让出主线程
    }
  }
}
```

### 12. 事件处理函数中触发强制同步布局
**场景**：click handler 中先读取 `offsetWidth` 再修改样式。
**后果**：浏览器被迫同步执行 Layout，事件处理时间拉长，INP 退化。
**诊断**：Performance 面板 Main 轨道中 Layout 事件出现在事件处理函数内部。
**修复**：批量读取布局属性后再批量写入，或使用 `ResizeObserver` 异步获取尺寸。

### 13. 微任务队列饥饿
**场景**：大量 `Promise.then()` 链或 `queueMicrotask()` 调用形成微任务风暴。
**后果**：微任务队列未清空前宏任务无法执行，输入事件处理被延迟。
**诊断**：Performance 面板 Main 轨道中微任务密集执行，Long Task 标记。
**修复**：避免深层 Promise 链，使用 `async/await` + `scheduler.yield()` 切割。

### 14. 第三方脚本膨胀
**场景**：统计、广告、聊天插件等第三方脚本体积大、执行时间长。
**后果**：主线程被第三方脚本占据，输入事件响应延迟。
**诊断**：Lighthouse → "Reduce the impact of third-party code"；Performance 面板 Attribution 视图显示第三方域 Long Task。
**修复**：延迟加载（`defer`/`async`）、iframe 隔离、按需加载。

### 15. rAF 回调过重
**场景**：`requestAnimationFrame` 回调中执行复杂计算（如大量 DOM 查询）。
**后果**：rAF 回调耗时过长，渲染帧超时（>16.6ms），动画掉帧且占用主线程。
**诊断**：Performance 面板 Main 轨道 rAF 回调耗时 >16ms。
**修复**：rAF 回调仅做轻量计算（设置 transform/opacity），重计算移到 rIC 或 Worker。

---

## 通用坑点汇总

| 编号 | 坑点 | 影响指标 | 严重度 | 修复成本 |
|------|------|---------|--------|---------|
| 1 | 首屏图片 lazy loading | LCP | P0 | 低 |
| 2 | CSS 渲染阻塞 | LCP | P0 | 中 |
| 3 | JS 阻塞 DOM 解析 | LCP | P0 | 低 |
| 4 | preload CORS 不匹配 | LCP | P0 | 低 |
| 5 | TTFB 过高 | LCP | P0 | 高 |
| 6 | 图片无尺寸声明 | CLS | P0 | 低 |
| 7 | 动态内容无预留空间 | CLS | P1 | 中 |
| 8 | Web Font FOUT | CLS | P1 | 中 |
| 9 | content-visibility 无预估尺寸 | CLS | P1 | 低 |
| 10 | 合成层爆炸 | CLS | P1 | 中 |
| 11 | Long Task 阻塞 | INP | P0 | 高 |
| 12 | 事件处理中强制同步布局 | INP | P0 | 中 |
| 13 | 微任务队列饥饿 | INP | P1 | 中 |
| 14 | 第三方脚本膨胀 | INP | P1 | 高 |
| 15 | rAF 回调过重 | INP | P1 | 中 |
