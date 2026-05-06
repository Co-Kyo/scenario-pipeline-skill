# 参考资料象限：长列表渲染——万级数据的虚拟列表实现

> 命题：长列表渲染：万级数据的虚拟列表实现——社交动态流/聊天记录场景
> 整理时间：2026-05-06

---

## 一、核心参考（T1 官方文档）

官方规范与权威文档，作为技术理解的基石。

| # | 标题 | 链接 | 关联主题 |
|---|------|------|----------|
| T1-1 | Critical Rendering Path | [MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path) | 渲染管线、DOM → Layout → Paint 流程，理解虚拟列表为何能减少渲染开销 |
| T1-2 | Event Loop | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop) | 主线程调度机制，理解长任务阻塞 UI 的根因，chunked rendering 的理论基础 |
| T1-3 | IntersectionObserver API | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) | 懒加载与可视区域检测的核心 API，虚拟列表决定"渲染哪些元素"的关键手段 |
| T1-4 | CSS `contain` | [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/contain) | 限制重排/重绘范围，虚拟列表中隔离渲染边界、提升滚动性能的 CSS 原语 |

---

## 二、深度阅读（T2 技术博客）

Google 官方技术博客文章，聚焦实战优化策略。

| # | 标题 | 链接 | 关联主题 |
|---|------|------|----------|
| T2-1 | Rendering Performance | [web.dev](https://web.dev/articles/rendering-performance) | 渲染性能全景：像素管道（Pixel Pipeline）、Layout / Paint / Composite 各阶段的优化切入点 |
| T2-2 | Optimize Long Tasks | [web.dev](https://web.dev/articles/optimize-long-tasks) | Long Tasks API、时间切片（Time Slicing）、`requestIdleCallback`、任务调度策略 |
| T2-3 | Virtualize Long Lists with React Virtual | [web.dev](https://web.dev/articles/virtualize-long-lists-react-virtual) | 虚拟列表实战：`@tanstack/react-virtual` 用法、动态高度、无限滚动模式 |
| T2-4 | Lazy Loading Images | [web.dev](https://web.dev/articles/lazy-loading-images) | 图片懒加载策略（`loading="lazy"`、IO 驱动），社交动态流中富媒体内容的性能处理 |
| T2-5 | Content Visibility | [web.dev](https://web.dev/articles/content-visibility) | `content-visibility: auto` 跳过离屏渲染，浏览器原生虚拟化支持，与虚拟列表方案的互补关系 |

---

## 三、扩展阅读

补充视角：社区方案、框架实现、场景专项。

| # | 标题 | 说明 |
|---|------|------|
| E-1 | [react-window](https://github.com/bvaughn/react-window) / [react-virtualized](https://github.com/bvaughn/react-virtualized) | React 生态最成熟的虚拟列表库，FixedSizeList / VariableSizeList 两种模式 |
| E-2 | [Vue Virtual Scroller](https://github.com/Akryum/vue-virtual-scroller) | Vue 生态虚拟滚动方案，支持动态高度与 RecycleScroller 模式 |
| E-3 | [virtual-list 探索（字节前端技术）](https://juejin.cn/post/7061230726132179975) | 字节跳动在社交场景（抖音评论/消息列表）中的虚拟列表工程实践 |
| E-4 | [Chat Rendering Architecture (Slack Engineering)](https://slack.engineering/) | Slack 聊天记录渲染架构演进，消息分页与虚拟化的工程取舍 |
| E-5 | [How Discord Renders Messages](https://discord.com/blog/how-discord-renders-messages) | Discord 消息渲染策略：虚拟化 + Chunked Loading + 平滑滚动的组合方案 |
| E-6 | [Long Animation Frames API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_detection) | 替代 Long Tasks API 的新标准，更细粒度的主线程阻塞检测 |

---

## 四、参考分类索引

按技术维度快速定位相关参考资料：

### 渲染机制与管线
- Critical Rendering Path (T1-1)
- Rendering Performance (T2-1)

### 主线程调度与任务切片
- Event Loop (T1-2)
- Optimize Long Tasks (T2-2)
- Long Animation Frames API (E-6)

### 虚拟列表核心实现
- Virtualize Long Lists (T2-3)
- react-window / react-virtualized (E-1)
- Vue Virtual Scroller (E-2)
- 字节前端 virtual-list 实践 (E-3)

### 可视区域检测与懒加载
- IntersectionObserver (T1-3)
- Lazy Loading Images (T2-4)

### CSS 层渲染优化
- CSS `contain` (T1-4)
- Content Visibility (T2-5)

### 工程案例：社交/聊天场景
- Discord 消息渲染 (E-5)
- Slack 聊天架构 (E-4)
- 字节社交场景实践 (E-3)
