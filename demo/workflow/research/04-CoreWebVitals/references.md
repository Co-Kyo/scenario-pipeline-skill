# Core Web Vitals — 参考资料

## 官方文档（Tier 1）

### Core Web Vitals 指标定义
- [Google - Core Web Vitals](https://web.dev/articles/vitals) — CWV 官方定义与评分标准
- [web.dev - LCP](https://web.dev/articles/lcp) — Largest Contentful Paint 详解
- [web.dev - CLS](https://web.dev/articles/cls) — Cumulative Layout Shift 详解
- [web.dev - INP](https://web.dev/articles/inp) — Interaction to Next Paint 详解
- [web.dev - Defining the Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds) — 指标阈值定义

### 浏览器渲染管线
- [MDN - Critical Rendering Path](https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path) — CRP 全链路
- [MDN - Rendering performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Rendering_performance) — 渲染性能概览
- [Chrome DevTools - Performance Panel](https://developer.chrome.com/docs/devtools/performance/) — Performance 面板官方文档

### 事件循环与任务调度
- [MDN - Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop) — 事件循环机制
- [MDN - requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) — rAF API
- [MDN - requestIdleCallback](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback) — rIC API
- [MDN - scheduler.yield()](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield) — 新一代任务切分 API

### CSS 布局与合成层
- [MDN - CSS contain](https://developer.mozilla.org/en-US/docs/Web/CSS/contain) — contain 属性
- [MDN - will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change) — will-change 属性
- [MDN - content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility) — content-visibility 属性

### 资源加载策略
- [MDN - link preload](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link) — Resource Hints
- [MDN - fetchpriority](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/fetchpriority) — 资源优先级
- [MDN - img loading](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#loading) — 原生懒加载

### DevTools 与性能 API
- [MDN - PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver) — 性能观察器 API
- [MDN - PerformanceLongTaskTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming) — Long Task 条目
- [MDN - LargestContentfulPaint](https://developer.mozilla.org/en-US/docs/Web/API/LargestContentfulPaint) — LCP 条目
- [MDN - LayoutShift](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift) — CLS 条目
- [Chrome DevTools - Memory](https://developer.chrome.com/docs/devtools/memory/) — Memory 面板
- [Chrome Lighthouse](https://developer.chrome.com/docs/lighthouse/) — Lighthouse 审计工具
- [Chrome DevTools Coverage](https://developer.chrome.com/docs/devtools/coverage/) — 代码覆盖率

### 工具库
- [GoogleChrome/web-vitals](https://github.com/GoogleChrome/web-vitals) — CWV 监测库（2KB）

---

## 社区资源（Tier 2）

### 综合优化指南
- [web.dev - Optimize LCP](https://web.dev/articles/optimize-lcp) — LCP 优化指南
- [web.dev - Optimize CLS](https://web.dev/articles/optimize-cls) — CLS 优化指南
- [web.dev - Optimize INP](https://web.dev/articles/optimize-interaction-to-next-paint) — INP 优化指南
- [web.dev - Critical Rendering Path](https://web.dev/articles/critical-rendering-path) — CRP 图文教程

### CSS 性能
- [web.dev - content-visibility](https://web.dev/articles/content-visibility) — content-visibility 使用指南
- [csstriggers.com](https://csstriggers.com/) — CSS 属性触发的渲染阶段速查表
- [CSS Containment Spec](https://drafts.csswg.org/css-contain/) — CSS Containment 规范
- [CSS Will Change Spec](https://drafts.csswg.org/css-will-change/) — will-change 规范

### 资源加载
- [web.dev - Preload critical assets](https://web.dev/articles/preload-critical-assets) — 关键资源预加载
- [web.dev - Fetch priority](https://web.dev/articles/fetch-priority) — 资源优先级指南
- [MDN - Speculative loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Speculative_loading) — 推测性加载

### 事件循环与长任务
- [web.dev - Long Tasks in DevTools](https://web.dev/articles/long-tasks-devtools) — DevTools 中的 Long Task 分析
- [Chrome DevTools Performance 功能详解](https://www.cnblogs.com/xikui/p/17302436.html) — 中文 Performance 面板教程
- [前端性能优化-渲染优化](https://www.cnblogs.com/MarsPGY/p/15780486.html) — 中文渲染优化教程

### 实战案例
- [web.dev - CLS Debugging](https://web.dev/articles/debug-layout-shifts) — CLS 调试实战
- [web.dev - Long Animation Frames](https://web.dev/articles/long-animation-frames) — Long Animation Frames API

---

## 规范与提案

- [Largest Contentful Paint API](https://w3c.github.io/largest-contentful-paint/) — LCP W3C 提案
- [Layout Instability API](https://w3c.github.io/layout-instability/) — CLS W3C 提案
- [Event Timing API](https://w3c.github.io/event-timing/) — INP 底层 API
- [Long Tasks API](https://w3c.github.io/longtasks/) — Long Task W3C 提案
- [Scheduling APIs](https://wicg.github.io/scheduling-apis/) — scheduler.yield() 提案
