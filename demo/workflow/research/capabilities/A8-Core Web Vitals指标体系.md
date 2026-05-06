# Core Web Vitals 指标体系

> ID: A8 | 扇出: 4/8 | 耦合度: 1 | 战略价值: 4.0 | 累积价值: 6.0 | 🏔️ 一级高地

## 核心机制

Core Web Vitals 是 Google 定义的 Web 用户体验三大核心指标：

**LCP（Largest Contentful Paint）**：
- 衡量：加载性能——最大内容元素渲染完成时间
- 阈值：Good ≤ 2.5s / Needs Improvement ≤ 4s / Poor > 4s
- 采集：`PerformanceObserver({entryTypes: ['largest-contentful-paint']})`

**INP（Interaction to Next Paint）**：
- 衡量：交互响应性——用户交互到下一帧绘制的延迟
- 替代了已废弃的 FID（First Input Delay），更全面
- 阈值：Good ≤ 200ms / Needs Improvement ≤ 500ms / Poor > 500ms
- 采集：`PerformanceObserver({entryTypes: ['event']})`

**CLS（Cumulative Layout Shift）**：
- 衡量：视觉稳定性——页面生命周期内所有意外布局偏移的累积
- 阈值：Good ≤ 0.1 / Needs Improvement ≤ 0.25 / Poor > 0.25
- 采集：`PerformanceObserver({entryTypes: ['layout-shift']})`

**其他重要指标**：FCP（First Contentful Paint）、TTFB（Time to First Byte）、TBT（Total Blocking Time）

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|---------|---------|---------|---------|
| 1 | LCP 元素加载慢 | 首屏最大图片/文本块渲染延迟 | LCP > 4s | Lighthouse → LCP 元素识别 | 预加载 LCP 资源（preload），优化图片格式 |
| 2 | INP 响应延迟 | 事件处理函数执行时间 > 200ms | 点击后明显卡顿 | Performance 面板 → Event Timing | 拆分长任务，用 scheduler.yield() 让出主线程 |
| 3 | CLS 布局偏移 | 图片/广告/字体加载导致元素位移 | 页面内容跳动 | Performance 面板 → Layout Shift | 为图片/视频设置宽高比容器，font-display: optional |
| 4 | 实验室 vs 真实数据差异 | Lighthouse 分数高但 RUM 数据差 | 本地测试正常用户反馈差 | CrUX 报告 / web-vitals 库 | 同时关注实验室数据和真实用户数据 |

## 调试工具

| 工具 | 用法 |
|------|------|
| Lighthouse | 自动审计 Core Web Vitals，输出评分和优化建议 |
| Chrome DevTools Performance 面板 | 录制后查看 LCP/CLS 标记 |
| `web-vitals` 库 | `onLCP()`, `onINP()`, `onCLS()` 上报真实用户数据 |
| PageSpeed Insights | 查看 CrUX 真实用户数据 |
| Chrome UX Report | 真实用户性能数据（需有足够流量） |

## 典型权衡

| 维度 | 方案 A | 方案 B | 选择建议 |
|------|--------|--------|---------|
| LCP 优化 | 预加载关键资源（preload）| SSR 直出 HTML | 资源型 LCP 用 preload，文本型用 SSR |
| CLS 优化 | 为媒体元素设置固定尺寸（简单但响应式受限）| Aspect Ratio CSS（响应式但需浏览器支持）| 优先用 aspect-ratio，回退用 padding-top hack |

## 参考资料

- [T1] web.dev: Core Web Vitals: https://web.dev/articles/vitals
- [T2] Chrome: Lighthouse Performance: https://developer.chrome.com/docs/lighthouse/performance
