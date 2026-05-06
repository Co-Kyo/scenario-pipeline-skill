# Core Web Vitals：LCP/CLS/INP 全链路优化 — Overview

## 命题全景

Core Web Vitals（CWV）是 Google 提出的三项核心用户体验指标，直接影响搜索排名：
- **LCP（Largest Contentful Paint）**：最大内容绘制时间，衡量加载性能，目标 ≤2.5s
- **CLS（Cumulative Layout Shift）**：累计布局偏移，衡量视觉稳定性，目标 ≤0.1
- **INP（Interaction to Next Paint）**：交互到下次绘制，衡量交互响应性，目标 ≤200ms

三项指标覆盖了用户感知的三个维度：**"快不快"、"稳不稳"、"跟不跟手"**。

---

## 链路编排：从资源到像素的全链路

### 1. 资源加载阶段 → 影响 LCP

浏览器发起请求后，资源加载链路决定 LCP 的起点：

```
DNS 解析 → TCP 连接 → TLS 握手 → 请求发送 → 服务器处理(TTFB) → 资源下载 → 资源解析
```

**关键控制点：**
- **preload**：`<link rel="preload" as="image" href="hero.webp">` 提前启动 LCP 关键资源下载
- **fetchpriority**：`<img fetchpriority="high">` 在同类资源内提升 LCP 图片优先级
- **preconnect**：提前完成第三方域名的 DNS+TCP+TLS 握手
- **避免 lazy loading**：首屏 LCP 图片**禁止**使用 `loading="lazy"`，这会将 LCP 推迟到用户滚动后

**资源加载与 LCP 的关系：**
```
LCP = TTFB + 资源加载时间 + 渲染时间
     ↑ preload/fetchpriority 缩短这一段
```

### 2. 渲染管线阶段 → 影响 LCP + CLS

浏览器 Critical Rendering Path（CRP）：

```
HTML 解析 → DOM 构建
                ↘
CSS 解析 → CSSOM 构建 → 样式计算 → 布局(Layout) → 绘制(Paint) → 合成(Composite)
                ↗
JS 执行（可能阻塞以上任何阶段）
```

**LCP 关联：**
- CSS 是渲染阻塞资源：`<link rel="stylesheet">` 未加载完成前不会开始渲染
- JS 默认阻塞 DOM 解析：无 `defer`/`async` 的 `<script>` 会暂停 HTML 解析
- **优化策略**：内联 Critical CSS、JS 使用 `defer`、减少关键资源数量

**CLS 关联：**
- Layout 阶段的尺寸变化直接产生布局偏移
- 无尺寸声明的图片/广告/动态注入内容是 CLS 主要来源
- **优化策略**：`aspect-ratio`、`width`/`height` 属性、CSS `contain` 属性

### 3. CSS 合成层阶段 → 影响 CLS + INP

合成层（Compositing Layer）是渲染管线的最后一步，也是性能最优的阶段：

```
Layer Tree → 合成(Composite) → GPU 光栅化 → 屏幕输出
```

**与 CLS 的关系：**
- `contain: layout` 限制布局偏移的传播范围
- `content-visibility: auto` 跳过屏幕外元素渲染，但需配合 `contain-intrinsic-size` 防止滚动跳动
- 合成层提升（`will-change`/`transform`）使元素独立于文档流，减少布局影响

**与 INP 的关系：**
- 合成层动画仅走 Composite 阶段（GPU），不阻塞主线程
- 使用 `transform`/`opacity` 动画而非 `top`/`left`，避免触发 Layout+Paint

### 4. 事件循环调度阶段 → 影响 INP

INP 衡量的是用户交互的完整响应链路：

```
用户点击/键盘 → Input Delay → Processing Duration → Presentation Delay → 下一帧绘制
                ↑ 主线程忙              ↑ 事件处理逻辑         ↑ rAF + 渲染
```

**事件循环模型：**
```
┌──────────────────────────┐
│       宏任务队列           │
│  [click handler]         │
│  [setTimeout callback]   │
│  [fetch callback]        │
└──────────┬───────────────┘
           ↓ 执行宏任务
┌──────────────────────────┐
│       微任务队列           │
│  [Promise.then]          │
│  [MutationObserver]      │
│  [queueMicrotask]        │
└──────────┬───────────────┘
           ↓ 清空微任务
┌──────────────────────────┐
│  requestAnimationFrame   │
│  渲染：Layout→Paint→Composite │
└──────────────────────────┘
```

**INP 优化关键：**
- **Input Delay**：主线程不能有 >50ms 的长任务（Long Task），否则输入事件排队
- **Processing Duration**：事件处理逻辑需分片，用 `scheduler.yield()` 或 `requestIdleCallback` 切割长任务
- **Presentation Delay**：减少 rAF 回调中的计算量，让渲染尽快完成
- **Long Tasks API**：`PerformanceObserver({ type: 'longtask' })` 检测 >50ms 的阻塞任务，含 attribution 归属

### 5. DevTools 诊断阶段 → 全链路可观测

```
┌─────────────────────────────────────────────┐
│              DevTools 诊断体系                │
├──────────┬──────────┬──────────┬─────────────┤
│Performance│  Memory  │ Lighthouse│ Performance │
│  面板     │   面板   │   审计    │  Observer   │
│          │          │          │    API      │
├──────────┼──────────┼──────────┼─────────────┤
│火焰图    │Heap      │FCP/LCP   │ longtask    │
│Long Task │Snapshot  │TBT/CLS   │ LCP/CLS     │
│帧率分析  │Allocation│SI        │ paint       │
└──────────┴──────────┴──────────┴─────────────┘
```

**CWV 专用诊断工具：**
- **LCP**：Performance 面板 → Timings 轨道 → LCP 标记；Lighthouse → Largest Contentful Paint
- **CLS**：Performance 面板 → Experience 轨道 → Layout Shift 事件；Lighthouse → Cumulative Layout Shift
- **INP**：Performance 面板 → Interactions 轨道；PerformanceObserver `type: 'event'` + `interactionId`
- **Long Task**：Performance 面板 → Main 轨道红色块；PerformanceObserver `type: 'longtask'`

**生产环境监控方案：**
```javascript
// web-vitals 库（2KB）—— 生产推荐
import { onLCP, onCLS, onINP } from 'web-vitals';

onLCP(console.log);  // { name: 'LCP', value: 1200, rating: 'good' }
onCLS(console.log);  // { name: 'CLS', value: 0.05, rating: 'good' }
onINP(console.log);  // { name: 'INP', value: 150, rating: 'good' }
```

---

## 全链路总结

```
资源加载 ──→ 渲染管线 ──→ CSS合成层 ──→ 事件循环调度 ──→ DevTools诊断
   │             │            │              │               │
   ↓             ↓            ↓              ↓               ↓
  LCP          LCP+CLS      CLS+INP         INP          全链路可观测
```

CWV 优化不是单点突破，而是全链路协同：
1. **资源加载**决定 LCP 的起跑线
2. **渲染管线**决定内容何时上屏、是否布局偏移
3. **CSS 合成层**决定动画是否流畅、是否触发重排
4. **事件循环**决定交互是否跟手
5. **DevTools** 是贯穿全链路的诊断基础设施
