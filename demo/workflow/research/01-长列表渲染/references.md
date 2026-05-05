# 长列表渲染 — 参考资料

## 官方文档（T1）

| 来源 | 标题 | URL | 关键内容 |
|------|------|-----|----------|
| MDN | Critical Rendering Path | https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path | 浏览器从 HTML 到像素的完整渲染管线：DOM 构建→样式计算→布局→绘制→合成，理解 CRP 是优化万级列表渲染瓶颈的基础 |
| MDN | Intersection Observer API | https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API | 异步监听元素与视口交叉状态的 API，虚拟列表实现"按需加载"和"哨兵检测"的核心手段，替代 scroll 事件的高性能方案 |
| Chrome DevTools | Performance Panel | https://developer.chrome.com/docs/devtools/performance/ | 录制并分析页面运行时性能：帧率、长任务、布局抖动、JS 执行耗时，定位虚拟列表滚动卡顿的直接工具 |
| Chrome DevTools | Memory | https://developer.chrome.com/docs/devtools/memory/ | 堆快照、内存时间线、分配分析，用于排查万级节点场景下的内存泄漏（未回收的 DOM 引用、闭包持有等） |

## 技术博客（T2）

| 来源 | 标题 | URL | 关键内容 |
|------|------|-----|----------|
| 博客园 | Chrome DevTools Performance 功能详解 | https://www.cnblogs.com/xikui/p/17302436.html | Performance 面板各指标的中文详解：Main 线程火焰图、Recalculate Style、Layout 事件的含义与优化思路 |
| 博客园 | 前端性能优化-渲染优化 | https://www.cnblogs.com/MarsPGY/p/15780486.html | 渲染层面的优化策略汇总：减少重排重绘、will-change、层提升、批量 DOM 操作，直接适用于虚拟列表的 DOM 管理 |
| web.dev | Virtual Scroller | https://web.dev/articles/virtual-scroller | Google 官方的虚拟滚动概念讲解：原理、DOM 回收池、Intersection Observer 集成、与原生 `<virtual-scroller>` 提案的关系 |
| GitHub | react-window | https://github.com/bvaughn/react-window | Brian Vaughn 维护的 React 虚拟列表库，轻量（~3KB），支持 FixedSizeList / VariableSizeList / FixedSizeGrid，API 简洁，社区最广泛 |
| GitHub | vue-virtual-scroller | https://github.com/Akryum/vue-virtual-scroller | Vue 生态的虚拟滚动组件，支持 RecycleScroller / DynamicScroller / TransitionGroup 集成，适配瀑布流等不等高场景 |
| GitHub | react-virtuoso | https://github.com/petyosi/react-virtuoso | React 虚拟列表库，原生支持自动高度测量、分组、尾部追加、逆向滚动（聊天场景），API 更高级但体积更大 |

## 框架生态

| 框架 | 库 | URL | 说明 |
|------|-----|-----|------|
| React | react-window | https://github.com/bvaughn/react-window | 轻量首选，FixedSizeList/Grid 开箱即用，VariableSizeList 处理不等高项；与 react-virtualized 同作者但 API 大幅精简 |
| React | react-virtuoso | https://github.com/petyosi/react-virtuoso | 功能更丰富：自动探测 item 高度、逆向滚动、分组 header、响应式布局；适合社交动态流等高度不确定场景 |
| Vue | vue-virtual-scroller | https://github.com/Akryum/vue-virtual-scroller | Vue 2/3 通用，RecycleScroller 复用 DOM 节点，DynamicScroller 处理动态高度；可配合 vue-waterfall 实现瀑布流 |
