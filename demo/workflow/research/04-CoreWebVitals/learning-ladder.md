# P4-Core Web Vitals — 学习阶梯

## 学习路径总览

```
Step 1: DevTools 性能分析 (A8) ──→ 所有诊断的起点
  │
  ├──→ Step 2: 浏览器渲染管线 (A1) ──→ 理解 LCP/CLS 的底层机制
  │     │
  │     ├──→ Step 3: 事件循环与任务调度 (A4) ──→ 理解 INP 的底层机制
  │     │
  │     └──→ Step 4: CSS 布局与合成层 (A6) ──→ CLS/INP 的 CSS 层优化手段
  │
  └──→ Step 5: 资源加载策略 (A7) ──→ LCP 的网络层优化手段
```

---

## Step 1：DevTools 性能分析（A8）— 诊断基础

**为什么先学这个？** 所有 CWV 优化的前提是"能看到问题"。DevTools 是贯穿全链路的诊断基础设施。

**学习目标：**
- 掌握 Performance 面板录制与火焰图解读
- 理解 LCP/CLS/INP 三条轨道的含义
- 会用 PerformanceObserver API 实时监测 CWV
- 会用 Lighthouse 生成自动化审计报告

**关键知识点：**
- Performance 面板 → Timings 轨道（LCP 标记）
- Performance 面板 → Experience 轨道（Layout Shift 事件）
- Performance 面板 → Interactions 轨道（INP 交互事件）
- Main 轨道 → Long Task 红色块 + Attribution 归属
- `PerformanceObserver({ type: 'largest-contentful-paint' })` — LCP 实时监测
- `PerformanceObserver({ type: 'layout-shift' })` — CLS 实时监测
- `PerformanceObserver({ type: 'event', durationThreshold: 0 })` — INP 实时监测
- `web-vitals` npm 库 — 生产环境标准化监测

**验证标准：**
- [ ] 能独立录制 Performance trace 并识别 LCP/CLS/INP 问题
- [ ] 能编写 PerformanceObserver 代码监测三项指标
- [ ] 能用 Lighthouse 生成报告并解读 Opportunities

**预计时间：** 2-3 小时

---

## Step 2：浏览器渲染管线（A1）— LCP/CLS 底层

**为什么排第二？** 渲染管线决定了内容何时上屏（LCP）和是否产生布局偏移（CLS）。

**学习目标：**
- 理解 CRP 全链路：DOM → CSSOM → Render Tree → Layout → Paint → Composite
- 理解哪些 CSS 属性触发 Layout、Paint、Composite
- 掌握 CSS 阻塞渲染和 JS 阻塞 DOM 解析的机制

**关键知识点：**
- CSS 是渲染阻塞资源：`<link rel="stylesheet">` 未加载完不渲染
- JS 默认阻塞 DOM 解析：`defer` 推迟到 DOM 解析后，`async` 下载完立即执行
- Layout（回流）vs Paint（重绘）vs Composite（合成）的开销差异
- `transform`/`opacity` 仅触发 Composite，`top`/`left` 触发 Layout+Paint+Composite
- Forced Reflow：读取 `offsetWidth`/`getBoundingClientRect()` 后立即修改样式

**与 CWV 的关联：**
- LCP = TTFB + 资源加载 + 渲染时间 → 渲染管线越高效，LCP 越短
- CLS = Layout 偏移累积 → 理解 Layout 触发条件才能避免偏移

**验证标准：**
- [ ] 能在 Performance 面板中识别 Layout/Paint/Composite 事件
- [ ] 理解 `transform` vs `top/left` 的性能差异
- [ ] 知道如何避免 Forced Reflow

**预计时间：** 2-3 小时

---

## Step 3：事件循环与任务调度（A4）— INP 底层

**为什么排第三？** INP 衡量的是交互响应性，直接关联事件循环的任务调度模型。

**学习目标：**
- 理解宏任务/微任务执行优先级
- 理解 INP 的三阶段：Input Delay → Processing Duration → Presentation Delay
- 掌握任务分片技术：scheduler.yield()、requestIdleCallback、setTimeout

**关键知识点：**
- 宏任务（setTimeout/setInterval/IO）vs 微任务（Promise.then/MutationObserver）
- 微任务优先于宏任务，但过长的微任务链会阻塞宏任务（饥饿风险）
- Long Tasks API：>50ms 的任务会被标记，含 attribution 归属
- `scheduler.yield()`：让出主线程，允许输入事件插入
- `requestIdleCallback`：空闲时执行低优先级任务（Safari 不支持）

**与 CWV 的关联：**
- INP = Input Delay + Processing Duration + Presentation Delay
- Input Delay：主线程有 Long Task（>50ms）时输入事件排队
- Processing Duration：事件处理函数中的同步计算
- Presentation Delay：rAF 回调 + 渲染时间

**验证标准：**
- [ ] 能用 PerformanceObserver(longtask) 检测 Long Task
- [ ] 能用 scheduler.yield() 实现任务分片
- [ ] 理解 Input Delay 对 INP 的影响

**预计时间：** 2-3 小时

---

## Step 4：CSS 布局与合成层（A6）— CLS/INP 的 CSS 层手段

**为什么排第四？** 在理解渲染管线后，CSS 层的优化手段是 CLS 和 INP 的重要杠杆。

**学习目标：**
- 掌握 `contain` 属性的四种隔离模式
- 理解 `will-change` 的合成层提升机制和副作用
- 掌握 `content-visibility` 的屏幕外渲染跳过

**关键知识点：**
- `contain: layout` — 限制布局偏移传播
- `contain: paint` — 限制重绘范围
- `content-visibility: auto` — 跳过屏幕外元素渲染（需配合 `contain-intrinsic-size`）
- `will-change: transform` — 提升为合成层，动画仅走 Composite
- 合成层爆炸：滥用 `will-change` 导致 GPU 内存暴涨

**与 CWV 的关联：**
- CLS：`contain: layout` 限制偏移传播；`content-visibility` + `contain-intrinsic-size` 防止滚动跳动
- INP：`transform`/`opacity` 动画仅走 Composite，不阻塞主线程

**验证标准：**
- [ ] 能用 `contain` 隔离组件的布局影响
- [ ] 理解 `will-change` 的正确使用方式（动态管理）
- [ ] 知道 `content-visibility` 的坑点（需配合 contain-intrinsic-size）

**预计时间：** 1-2 小时

---

## Step 5：资源加载策略（A7）— LCP 的网络层手段

**为什么排最后？** 资源加载策略是在渲染管线理解之上的优化手段，属于"锦上添花"。

**学习目标：**
- 掌握 preload/prefetch/preconnect/dns-prefetch 的区别和使用场景
- 理解 `fetchpriority` 的优先级调度机制
- 掌握原生 `loading="lazy"` 的正确使用

**关键知识点：**
- `<link rel="preload">` — 当前导航关键资源高优先级预加载（需 `as` 属性）
- `<link rel="prefetch">` — 未来导航资源低优先级预获取
- `<link rel="preconnect">` — 提前完成 DNS+TCP+TLS 握手
- `fetchpriority="high/low/auto"` — 同类资源内微调优先级
- `loading="lazy"` — 原生懒加载（首屏 LCP 图片**禁止**使用）

**与 CWV 的关联：**
- LCP：preload + fetchpriority 缩短关键资源加载时间
- CLS：懒加载图片必须声明尺寸
- INP：过多 prefetch 争抢带宽间接影响主线程

**验证标准：**
- [ ] 能识别哪些资源需要 preload
- [ ] 知道首屏图片不能用 lazy loading
- [ ] 理解 preload 的 CORS 匹配要求

**预计时间：** 1-2 小时

---

## 学习里程碑

| 阶段 | 完成标志 | 预计时间 |
|------|---------|---------|
| 🟢 入门 | 能用 DevTools 识别 CWV 问题 | 1 天 |
| 🟡 进阶 | 理解渲染管线+事件循环，能解释 LCP/CLS/INP 的底层原因 | 3 天 |
| 🔴 熟练 | 能独立实施 CWV 优化方案，建立监控体系 | 1 周 |

## 与其他命题的交叉学习

- **P1-长列表渲染**：虚拟列表中的 CLS 问题（变高列表滚动跳动）与本命题 Step 4 重叠
- **P2-首屏白屏**：LCP 优化与首屏加载优化高度重叠，可一起学习
- **P7-渲染性能**：Layout Thrashing 和合成层优化与本命题 Step 2/4 重叠
- **P8-长任务拆分**：INP 优化与长任务拆分技术完全重叠
