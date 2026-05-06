# P4-Core Web Vitals — 组装 Briefing

## 命题信息
命题：Core Web Vitals：LCP/CLS/INP三项核心指标的全链路优化
限定词：通用
通用占比：≥90%（通用层跨浏览器渲染管线+事件循环+CSS合成层+资源加载+DevTools诊断5层）

## 涉及能力摘要

### A1-浏览器渲染管线 [用于: overview, edge-cases, trade-offs]
机制：浏览器渲染管线（CRP）是将 HTML/CSS/JS 转换为屏幕像素的完整流程：DOM 构建 → CSSOM 构建 → 样式计算（Render Tree）→ 布局（Layout）→ 分层（Layer Tree）→ 绘制（Paint）→ 光栅化（Raster）→ 合成（Composite）。Layout 和 Paint 阶段开销最大，仅触发 Composite 的属性（transform/opacity）性能最优。管线中任何阶段都可能因 JS 介入被重新触发，形成强制同步布局或布局抖动。
瓶颈：
  - B1 Layout Thrashing（时序竞争，P0）：JS 循环中交替读取布局属性和修改样式 → 帧率骤降，长任务 >50ms，INP 劣化
  - B2 CSS 渲染阻塞（资源边界，P0）：`<link rel="stylesheet">` 阻塞首屏渲染，关键 CSS 体积大或网络慢 → FCP/LCP 延迟
  - B3 JS 阻塞 DOM 解析（时序竞争，P0）：`<script>` 标签无 async/defer → DOM 构建延迟，LCP 推后
  - B4 Paint 开销过大（输入变异，P1）：复杂 CSS 效果（box-shadow、filter、大图 background）→ 掉帧，Paint 时间长
  - B5 图层爆炸（资源边界，P1）：过度使用 will-change 或浏览器隐式创建过多图层 → 内存暴涨，CLS 风险
权衡：
  - 动画实现：top/left（触发 Layout+Paint+Composite）vs transform: translate()（仅触发 Composite），优先 transform
  - CSS 加载：外部 `<link>` 全量加载 vs 内联 Critical CSS + 异步加载剩余，首屏敏感场景用内联
  - 图层管理：浏览器自动分层 vs will-change 手动分层，仅对高优先级动画元素手动分层
  - JS 加载：同步 `<script>` vs script defer/async，默认使用 defer

### A4-事件循环与任务调度 [用于: overview, edge-cases, trade-offs]
机制：事件循环单线程异步模型，宏任务/微任务队列执行优先级，requestAnimationFrame 渲染同步调度，requestIdleCallback 空闲期调度，Long Tasks API（50ms 阈值）长任务检测。INP 直接关联主线程任务阻塞时间——每次用户交互经历 Input Delay → Processing Duration → Presentation Delay 三阶段，任一阶段超时即 INP 劣化。
瓶颈：
  - B1 主线程长任务阻塞（时序竞争，P0）：大量同步 JS 执行、复杂计算未分片 → 页面卡顿、INP 劣化，Long Task >50ms
  - B2 rAF 回调过重（时序竞争，P1）：rAF 回调中执行复杂计算 → 掉帧，CLS 因渲染延迟
  - B3 微任务队列饥饿（时序竞争，P1）：Promise 链过长阻塞宏任务 → 输入事件排队，INP 退化
  - B4 rIC 在 Safari 不支持（输入变异，P2）：requestIdleCallback 仅 Chrome/Firefox 支持 → 需 polyfill 或 scheduler.yield()
权衡：
  - 任务拆分：requestIdleCallback（低优先级，Safari 不支持）vs scheduler.yield()（新 API，切分到下一个宏任务）
  - 动画驱动：setTimeout（不精确）vs requestAnimationFrame（与渲染同步），动画必须用 rAF
  - Long Task 监控：PerformanceObserver+longtask（精确有 attribution）vs rAF+时间差检测（兼容性好）

### A6-CSS布局与合成层 [用于: overview, edge-cases, trade-offs]
机制：CSS contain 属性通过 size/layout/style/paint 四种隔离模式，将元素子树与外部文档解耦，使浏览器可跳过不必要的 Layout 和 Paint 重算。content-visibility:auto 在 contain 基础上进一步自动跳过屏幕外元素的渲染，长页面首屏加载可缩短 50%-90%。will-change 属性向浏览器声明即将变化的属性，触发合成层提升，使后续动画仅走 Composite 阶段。核心优化思路：尽可能跳过 Layout 和 Paint，只触发 Composite。
瓶颈：
  - B1 合成层爆炸（资源边界，P0）：大量元素被提升为合成层（滥用 will-change 或 translateZ(0)）→ 内存暴涨、GPU 显存不足、CLS 风险
  - B2 Layout Thrashing（时序竞争，P0）：JS 交替读写布局属性 → 帧率骤降，INP 劣化
  - B3 Paint Storm（时序竞争，P1）：大面积 repaint → 滚动或动画时掉帧
  - B4 content-visibility 滚动跳动（输入变异，P1）：使用 content-visibility:auto 但未设置 contain-intrinsic-size → CLS 布局偏移
  - B5 will-change 内存泄漏（状态跃迁，P1）：样式表中静态设置 will-change 且不移除 → 合成层常驻内存
权衡：
  - 动画属性选择：top/left（触发 Layout+Paint）vs transform:translate（仅触发 Composite），性能差距 10 倍以上
  - 合成层管理：静态 will-change 全局应用 vs 动态 JS 管理，动画前后切换避免常驻
  - contain 粒度：根元素 contain:strict vs 组件级 contain:content，组件级隔离副作用小
  - 长列表优化：content-visibility:auto 零 JS 成本 vs 手动虚拟滚动

### A7-资源加载策略 [用于: overview, edge-cases, trade-offs]
机制：通过浏览器原生 Resource Hints（preload/prefetch/preconnect/dns-prefetch）和现代加载属性（loading="lazy"/fetchpriority）实现资源优先级调度。preload 用于当前导航关键资源的高优先级预加载，prefetch 用于未来导航资源的低优先级预获取，preconnect 提前完成 DNS+TCP+TLS 握手，lazy loading 延迟非首屏资源加载，fetchpriority 在同类资源内微调优先级。这些机制直接作用于浏览器内部优先级模型，影响 LCP 和 CLS。
瓶颈：
  - B1 首屏 LCP 图片错误使用 loading="lazy"（输入变异，P0）→ LCP 延迟数秒
  - B2 preload 与实际请求 CORS 模式不匹配（时序竞争，P0）→ 双重下载，浪费带宽
  - B3 过多 prefetch 与首屏争抢带宽（资源边界，P1）→ LCP 退化
  - B4 preconnect 超过 6 个域名（资源边界，P1）→ 浪费 DNS/TCP 资源
  - B5 所有资源都设为 fetchpriority="high"（输入变异，P1）→ 优先级提示失效
权衡：
  - preload vs prefetch：首屏关键资源用 preload（控制 5 个以内），交互后用 prefetch
  - 原生 lazy loading vs Intersection Observer：优先原生零成本方案，需自定义阈值时用 IO
  - preconnect vs dns-prefetch：关键第三方域名用 preconnect，其余用 dns-prefetch，每页 preconnect 不超 6 个

### A8-DevTools性能分析 [用于: overview, edge-cases, experiment]
机制：基于浏览器内置工具链的前端性能诊断体系：Performance 面板录制分析（火焰图/Long Task/帧率）、Memory 面板堆快照、Lighthouse 自动化审计（FCP/LCP/TBT/CLS/SI）、PerformanceObserver API 异步观察性能条目（longtask/LCP/CLS/paint/resource）、Long Tasks API 主线程阻塞检测（>50ms 任务+attribution 归属）。LCP/CLS/INP 三项指标均可通过 PerformanceObserver 实时观测。
瓶颈：
  - B1 JavaScript 主线程阻塞（时序竞争，P0）：大量同步 JS 执行 → LCP/INP 差
  - B2 布局抖动 Layout Thrashing（时序竞争，P0）：JS 中交替读写 layout 属性 → 帧率骤降，INP 劣化
  - B3 资源加载阻塞（资源边界，P0）：render-blocking CSS/JS、未优化图片 → FCP/LCP 延迟
  - B4 第三方脚本膨胀（资源边界，P1）：统计/广告/聊天插件 → TBT 过高、INP 退化
权衡：
  - 性能监控：PerformanceObserver API（实时精确）vs web-vitals 库（封装好 2KB），生产用 web-vitals
  - 性能审计：Lighthouse CLI（可集成 CI/CD）vs DevTools 手动运行（交互式复现）
  - Long Task 监控：PerformanceObserver+longtask（精确有 attribution）vs rAF+时间差检测（兼容性好）
  - 性能数据上报：sendBeacon（可靠不阻塞卸载）vs fetch keepalive（灵活可携带更多数据）

## 内容比例约束
开篇 10-15%：从 CWV 三项指标定义切入（LCP/CLS/INP 是什么、Google 评分标准、为什么重要）
主体 70-80%：通用工程原理（渲染管线与 LCP 关联、事件循环与 INP 关联、CSS 合成层与 CLS 关联、资源加载优先级、DevTools 诊断方法论）
收尾 10-15%：落地方案总结（CWV 监控体系搭建、持续优化工作流、CI/CD 集成）

## 参考资料（已去重，按 Tier 排序）
- [T1] MDN - Critical Rendering Path: https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path
- [T1] MDN - Event Loop: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop
- [T1] MDN - CSS contain: https://developer.mozilla.org/en-US/docs/Web/CSS/contain
- [T1] MDN - link preload: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
- [T1] Chrome DevTools - Performance Panel: https://developer.chrome.com/docs/devtools/performance/
- [T1] Chrome DevTools - Memory: https://developer.chrome.com/docs/devtools/memory/
- [T1] MDN - PerformanceObserver: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver
- [T1] MDN - requestAnimationFrame: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- [T1] MDN - requestIdleCallback: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
- [T1] MDN - fetchpriority: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/fetchpriority
- [T1] MDN - img loading: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#loading
- [T2] web.dev - Critical Rendering Path: https://web.dev/articles/critical-rendering-path
- [T2] web.dev - content-visibility: https://web.dev/articles/content-visibility
- [T2] web.dev - preload-critical-assets: https://web.dev/articles/preload-critical-assets
- [T2] web.dev - fetch-priority: https://web.dev/articles/fetch-priority
- [T2] web.dev - long-tasks-devtools: https://web.dev/articles/long-tasks-devtools
- [T2] web.dev - Speculative loading: https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Speculative_loading
- [T2] Chrome DevTools Performance 功能详解: https://www.cnblogs.com/xikui/p/17302436.html
- [T2] 前端性能优化-渲染优化: https://www.cnblogs.com/MarsPGY/p/15780486.html
- [T2] GoogleChrome/web-vitals: https://github.com/GoogleChrome/web-vitals
- [T2] csstriggers.com: https://csstriggers.com/
- [T2] Chrome Lighthouse: https://developer.chrome.com/docs/lighthouse/
- [T2] Chrome DevTools Coverage: https://developer.chrome.com/docs/devtools/coverage/
