# P7-渲染性能 · 参考资料

> **命题**：渲染性能：重排重绘触发机制与合成层优化
> **分类**：按能力分组，Tier 排序（T1 = 官方/权威，T2 = 社区优质）

---

## A1 — 浏览器渲染管线

| Tier | 标题 | URL |
|------|------|-----|
| T1 | MDN - Critical Rendering Path | https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path |
| T1 | Chrome DevTools - Performance Panel | https://developer.chrome.com/docs/devtools/performance/ |
| T2 | Chrome DevTools Performance 功能详解 | https://www.cnblogs.com/xikui/p/17302436.html |
| T2 | 前端性能优化-渲染优化 | https://www.cnblogs.com/MarsPGY/p/15780486.html |
| T2 | web.dev - Critical Rendering Path | https://web.dev/articles/critical-rendering-path |

## A2 — DOM 节点生命周期

| Tier | 标题 | URL |
|------|------|-----|
| T1 | MDN - Document Object Model | https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model |
| T1 | MDN - Node API | https://developer.mozilla.org/en-US/docs/Web/API/Node |
| T1 | MDN - DocumentFragment | https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment |
| T1 | MDN - MutationObserver | https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver |
| T2 | web.dev - DOM Performance | https://web.dev/articles/dom-ppa |
| T2 | Chrome DevTools - Memory Problems | https://developer.chrome.com/docs/devtools/memory-problems/memory-101 |
| T2 | Memlab（Meta 内存泄漏检测） | https://github.com/facebook/memlab |

## A4 — 事件循环与任务调度

| Tier | 标题 | URL |
|------|------|-----|
| T1 | MDN - Event Loop | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop |
| T1 | MDN - requestAnimationFrame | https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame |
| T1 | MDN - requestIdleCallback | https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback |
| T2 | web.dev - Long Tasks DevTools | https://web.dev/articles/long-tasks-devtools |

## A6 — CSS 布局与合成层

| Tier | 标题 | URL |
|------|------|-----|
| T1 | MDN - CSS contain | https://developer.mozilla.org/en-US/docs/Web/CSS/contain |
| T1 | MDN - will-change | https://developer.mozilla.org/en-US/docs/Web/CSS/will-change |
| T2 | web.dev - content-visibility | https://web.dev/articles/content-visibility |
| T2 | CSS Triggers（属性触发阶段查询） | https://csstriggers.com/ |
| T2 | CSS Containment Spec | https://drafts.csswg.org/css-contain/ |

## A8 — DevTools 性能分析

| Tier | 标题 | URL |
|------|------|-----|
| T1 | Chrome DevTools - Performance Panel | https://developer.chrome.com/docs/devtools/performance/ |
| T1 | Chrome DevTools - Memory | https://developer.chrome.com/docs/devtools/memory/ |
| T1 | MDN - PerformanceObserver | https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver |
| T1 | MDN - PerformanceLongTaskTiming | https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming |
| T2 | web.dev - Performance DevTools | https://web.dev/articles/performance-devtools |
| T2 | GoogleChrome/web-vitals | https://github.com/GoogleChrome/web-vitals |
| T2 | Chrome DevTools - Coverage | https://developer.chrome.com/docs/devtools/coverage/ |

---

## 通用参考

| 类别 | 标题 | URL |
|------|------|-----|
| 规范 | W3C Paint Timing | https://w3c.github.io/paint-timing/ |
| 规范 | W3C Long Tasks API | https://w3c.github.io/longtasks/ |
| 规范 | W3C Layout Instability | https://w3c.github.io/layout-instability/ |
| 工具 | WebPageTest | https://www.webpagetest.org/ |
| 工具 | CrUX（Chrome UX Report） | https://developer.chrome.com/docs/crux/ |
