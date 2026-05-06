# 参考资料：渲染卡顿排查——主线程长任务阻塞交互（动画掉帧/输入延迟）

## Tier 1（MDN 官方文档）

- **Critical Rendering Path**  
  https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path  
  浏览器从接收 HTML/CSS/JS 到将像素渲染到屏幕的完整路径。理解此路径是排查渲染卡顿的基础——识别哪些阶段（解析、样式计算、布局、绘制、合成）可能成为瓶颈。

- **Event Loop 事件循环**  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop  
  JavaScript 单线程模型的核心机制。主线程一次只执行一个任务，长任务会阻塞事件循环，导致后续的输入事件（点击、滚动、键盘）和 rAF 回调无法及时处理，直接造成动画掉帧和输入延迟。

- **Web Workers**  
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API  
  将计算密集型任务从主线程迁移到独立线程的机制。Worker 拥有自己的事件循环，不会阻塞 UI 渲染，是解决主线程长任务的关键手段之一。

- **Long Tasks API**  
  https://developer.mozilla.org/en-US/docs/Web/API/Long_Tasks_API  
  用于检测主线程上执行时间超过 50ms 的任务。是排查主线程阻塞的直接工具——通过 PerformanceObserver 监听 `longtask` 条目，定位哪些任务在阻塞渲染。

- **CSS `contain` 属性**  
  https://developer.mozilla.org/en-US/docs/Web/CSS/contain  
  限制元素的样式、布局、绘制和尺寸的影响范围，使浏览器可以跳过不需要的渲染计算。对减少不必要的重排和重绘、优化长列表/复杂页面的渲染性能有显著作用。

## Tier 2（web.dev 深度实践）

- **Rendering Performance 渲染性能**  
  https://web.dev/articles/rendering-performance  
  从像素到屏幕的完整渲染流水线解析，涵盖像素管道（Pixel Pipeline）的五个阶段：JavaScript → 样式 → 布局 → 绘制 → 合成。提供识别每阶段瓶颈的实践方法。

- **Optimize Long Tasks 优化长任务**  
  https://web.dev/articles/optimize-long-tasks  
  系统性地拆解和优化主线程长任务的方法论。包括：用 `yield to main`（`setTimeout`/`scheduler.yield`）将长任务分片、延迟非关键工作、使用 Web Worker 等策略。

- **INP (Interaction to Next Paint)**  
  https://web.dev/articles/inp  
  Core Web Vitals 指标之一，衡量页面对用户交互的响应速度。INP 关注从用户输入到下一帧绘制的延迟，50ms 以内的长任务是导致 INP 超标的主要原因。

- **Off Main Thread 主线程之外**  
  https://web.dev/articles/off-main-thread  
  详细介绍将工作从主线程移出的架构模式，包括 Web Worker、Service Worker、以及 Compositor 线程的利用，是解决主线程阻塞的根本性架构思路。

- **Content Visibility 内容可见性**  
  https://web.dev/articles/content-visibility  
  通过 `content-visibility: auto` 让浏览器跳过屏幕外内容的渲染工作（布局、绘制），显著减少主线程负担。对长页面、大量 DOM 节点的场景效果尤为明显。
