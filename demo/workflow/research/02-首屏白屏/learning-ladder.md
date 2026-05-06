# P2-首屏白屏 — 学习阶梯

---

## 能力依赖关系

从 capability-graph.json 提取 P2 涉及能力（A1, A5, A7, A9, A10, A13）的依赖关系：

```
A10-CDN与边缘计算 ──→ A5-HTTP缓存协议 ──→ A7-资源加载策略 ──→ A1-浏览器渲染管线
                                                              ↑
A9-模块系统与构建优化 ──────────────────────────────────────────┘
                                                              ↓
                                                    A13-SSR/Hydration机制
```

**拓扑排序结果：** A10 → A5 → A7 → A9 → A1 → A13

---

## 阶段一：网络基础（A10 + A5）

> 理解首屏数据从哪来、怎么缓存

### 学习顺序
1. **A10-CDN与边缘计算**
2. **A5-HTTP缓存协议**

### 阶段一·Step 1：CDN 与边缘计算 (A10)

**做什么：**
- 理解 CDN 多级缓存架构（浏览器→边缘→汇聚层→源站）
- 学习 Cache Key 生成规则和缓存失效策略（TTL/Purge/版本化 URL）
- 理解 Origin Shield 如何保护源站

**看到什么：**
- CDN 控制台的命中率监控面板
- 回源 QPS 和延迟指标
- `curl -I` 返回的 `x-cache`、`age`、`cache-control` 头

**说明什么：**
- 首屏白屏的第一道防线在网络层——CDN 命中率直接决定 TTFB
- 回源风暴是首屏不可用的极端场景

**接下来去哪：** → A5-HTTP缓存协议（CDN 缓存规则的协议基础）

**做到才算过：**
- [ ] 能解释 CDN 回源率 >20% 对首屏的影响
- [ ] 能配置版本化 URL 实现缓存安全更新
- [ ] 理解 stale-while-revalidate 的价值

### 阶段一·Step 2：HTTP 缓存协议 (A5)

**做什么：**
- 学习强缓存（Cache-Control max-age/Expires）和协商缓存（ETag/Last-Modified）机制
- 理解 no-cache/no-store/immutable/stale-while-revalidate 的区别
- 学习 s-maxage 分离 CDN 与浏览器缓存策略

**看到什么：**
- Network 面板中 Cache 状态列（from memory cache / from disk cache / 304）
- 不同 Cache-Control 指令下的请求行为差异
- Vary 头对缓存命中率的影响

**说明什么：**
- HTML 入口应该用 no-cache（每次验证），静态资源用长缓存+cache-busting
- 缓存雪崩是首屏突然变慢的常见根因

**接下来去哪：** → A7-资源加载策略（缓存之上的优先级调度）

**做到才算过：**
- [ ] 能为项目设计合理的缓存策略（HTML + 静态资源分离）
- [ ] 能通过 Network 面板诊断缓存命中/未命中原因
- [ ] 理解 ETag vs Last-Modified 的精度差异

---

## 阶段二：加载优化（A7 + A9）

> 理解首屏资源怎么加载、怎么减小体积

### 学习顺序
3. **A7-资源加载策略**
4. **A9-模块系统与构建优化**

### 阶段二·Step 3：资源加载策略 (A7)

**做什么：**
- 学习 preload/prefetch/preconnect/dns-prefetch 的区别和适用场景
- 理解 fetchpriority 对同类资源优先级的微调
- 学习 loading='lazy' 对 LCP 的影响

**看到什么：**
- Lighthouse 报告中的 Preload key requests 建议
- Network 面板中 preload 资源的优先级标记
- Console 中 preload 未使用的警告

**说明什么：**
- 首屏 LCP 图片绝对不能用 lazy loading
- preload 控制在 5 个以内，否则与首屏争抢带宽

**接下来去哪：** → A9-模块系统与构建优化（减小首屏 JS 体积）

**做到才算过：**
- [ ] 能为项目配置正确的 preload/prefetch 策略
- [ ] 理解 preload CORS 模式不匹配导致的双重下载
- [ ] 能通过 Lighthouse 验证资源加载优化效果

### 阶段二·Step 4：模块系统与构建优化 (A9)

**做什么：**
- 学习 ES Module 静态分析 → Tree Shaking 的原理
- 理解 Code Splitting 三种策略：Entry Points、SplitChunksPlugin、Dynamic Import
- 学习 Vite 的 ESM+esbuild 构建模型

**看到什么：**
- webpack-bundle-analyzer 的 chunk 可视化
- Tree Shaking 前后的 bundle 大小对比
- 动态 import() 生成的独立 chunk 文件

**说明什么：**
- 首屏 JS 体积直接影响 TTI——SSR 场景下 FCP 快但 TTI 可能很慢
- 过度分割反而增加 HTTP 请求数，路由级中等粒度是最佳平衡

**接下来去哪：** → A1-浏览器渲染管线（理解浏览器如何处理这些资源）

**做到才算过：**
- [ ] 能配置 SplitChunksPlugin 实现合理的 chunk 分割
- [ ] 能验证 Tree Shaking 是否生效（bundle-analyzer 检查）
- [ ] 理解 dynamic import 的网络失败处理

---

## 阶段三：渲染原理（A1）

> 理解浏览器如何将资源转化为首屏像素

### 阶段三·Step 5：浏览器渲染管线 (A1)

**做什么：**
- 学习 CRP 全链路：DOM → CSSOM → Render Tree → Layout → Paint → Composite
- 理解 CSS 渲染阻塞和 JS 阻塞 DOM 解析的机制
- 学习强制同步布局和 Layout Thrashing

**看到什么：**
- Performance 面板的 Main 火焰图中 Layout/Paint 事件
- Lighthouse 的 Render-blocking resources 审计
- FCP/LCP 指标与 CRP 各阶段的对应关系

**说明什么：**
- CSS 在 <head> 中渲染阻塞——Critical CSS 内联是首屏优化关键
- <script> 无 defer/async 会阻塞 DOM 解析，直接延迟 FCP

**接下来去哪：** → A13-SSR/Hydration机制（框架如何利用 CRP 优化首屏）

**做到才算过：**
- [ ] 能通过 Performance 面板识别 CSS/JS 渲染阻塞
- [ ] 能配置 Critical CSS 内联 + 异步加载剩余 CSS
- [ ] 理解 defer vs async 对 FCP 的影响差异

---

## 阶段四：框架落地（A13）

> 理解 SSR/SSG/Hydration 如何在框架层面优化首屏

### 阶段四·Step 6：SSR/Hydration 机制 (A13)

**做什么：**
- 学习 SSR 服务端渲染 → HTML 传输 → 客户端 Hydration 的完整流程
- 理解 Streaming SSR（React 18 Suspense）和 Lazy Hydration（Vue 3.5）
- 学习 SSG 预渲染和 Islands 架构

**看到什么：**
- SSR 返回的 HTML 源码（已包含首屏内容）
- React DevTools Profiler 中的 Hydration 耗时
- Lighthouse 中 TBT（Total Blocking Time）指标

**说明什么：**
- SSR 解决了白屏问题，但引入了 Hydration 问题——FCP 快但 TTI 可能慢
- Streaming SSR + Selective Hydration 是解决 TTI 问题的前沿方案
- Hydration Mismatch 是 SSR 最常见的 bug，必须确保服务端/客户端 HTML 一致

**做到才算过：**
- [ ] 能用 Next.js/Nuxt 搭建 SSR 项目并验证 FCP/TTI
- [ ] 能识别和修复 Hydration Mismatch
- [ ] 理解 SSR vs SSG vs CSR 的选型依据
- [ ] 能通过实验对比三种策略的首屏性能差异（参见 `experiment/` 目录）

---

## 学习路径图

```
阶段一：网络基础          阶段二：加载优化          阶段三：渲染原理          阶段四：框架落地
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ A10 CDN     │ ──→  │ A7 资源加载  │ ──→  │ A1 渲染管线  │ ──→  │ A13 SSR     │
│ A5 HTTP缓存 │      │ A9 构建优化  │      │             │      │ /Hydration  │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
  数据从哪来             怎么加载               怎么渲染               框架怎么用
```

## 产出路径引用

| 产出 | 路径 |
|------|------|
| 能力图谱 | `.meta/capability-graph.json` |
| Briefing | `.meta/briefings/02-首屏白屏.md` |
| 链路编排 | `02-首屏白屏/overview.md` |
| 坑点提取 | `02-首屏白屏/edge-cases.md` |
| 方案对比 | `02-首屏白屏/trade-offs.md` |
| 实验代码 | `02-首屏白屏/experiment/` |
| 参考资料 | `02-首屏白屏/references.md` |
