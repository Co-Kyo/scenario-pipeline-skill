# 长列表渲染 — 参考资料

## T1 官方规范与文档

| 标题 | URL | 说明 |
|------|-----|------|
| AnimationFrameProvider (WHATWG) | https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html | rAF 的正式 HTML 规范定义，描述回调调度机制 |
| Intersection Observer Specification (W3C) | https://w3c.github.io/IntersectionObserver/ | IntersectionObserver 的 W3C 原始规范，定义阈值、rootMargin 等核心概念 |
| Intersection Observer API - MDN | https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API | MDN 对 IntersectionObserver 的综合指南，含用法示例与兼容性说明 |
| IntersectionObserver 接口 - MDN | https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver | IntersectionObserver 接口的详细属性与方法参考 |
| Window.requestAnimationFrame() - MDN | https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame | rAF 的 MDN 接口文档，说明帧回调与浏览器刷新率的关系 |
| MDN Critical Rendering Path | https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path | 浏览器关键渲染路径全解析：DOM→CSSOM→布局→绘制→合成 |
| MDN Reflow | https://developer.mozilla.org/en-US/docs/Glossary/Reflow | 回流（Reflow）的概念解释，理解布局重排对性能的影响 |
| CSS contain | https://developer.mozilla.org/en-US/docs/Web/CSS/contain | `contain` 属性文档，通过限定元素作用域减少浏览器重排范围 |
| content-visibility | https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility | `content-visibility` 属性文档，允许浏览器跳过视口外内容的渲染 |
| MDN DOM | https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model | DOM 接口总览，理解节点操作的性能开销基础 |
| React key 文档 | https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key | React 列表渲染中 key 的作用与正确用法，直接影响虚拟 DOM diff 效率 |

## T2 高质量技术博客

| 标题 | URL | 说明 |
|------|-----|------|
| web.dev - Critical Rendering Path | https://web.dev/articles/critical-rendering-path | Google 团队对关键渲染路径的实践解读，含性能优化建议 |
| web.dev - Layout Thrashing | https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing | 布局抖动的成因与规避策略，长列表场景的核心性能陷阱 |
| web.dev - content-visibility | https://web.dev/articles/content-visibility | content-visibility 的性能实测与使用指南，对比传统懒加载方案 |

## T3 社区与实践参考

| 标题 | URL | 说明 |
|------|-----|------|
| @tanstack/virtual | https://tanstack.com/virtual | 框架无关的虚拟滚动库，支持动态高度、无限滚动，生产级首选 |
| 虚拟列表实现原理 | https://zhuanlan.zhihu.com/p/441638487 | 中文社区对虚拟列表核心原理的详细图解与代码实现 |
| Vue PatchFlag | https://juejin.cn/post/6858955776992968712 | Vue 3 编译时优化之 PatchFlag 机制，理解静态标记如何减少 diff 开销 |
| TestUFO rAF Timing Test | https://testufo.com/#test=animation-time-graph | rAF 时间精度的可视化测试工具，可实测浏览器帧率与回调抖动 |
