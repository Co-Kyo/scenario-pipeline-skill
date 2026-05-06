# P2-首屏白屏 — 链路编排

> 按数据流排列能力节点：**网络层 → 协议层 → 浏览器层 → 框架层 → 诊断层**

---

## 1. 网络层：CDN与边缘计算 (A10)

首屏白屏的起点在网络。CDN 通过全球分布的边缘节点缓存静态资源，基于 DNS 智能解析将用户请求导向最近节点。

**能力机制：**
- 多级缓存架构：浏览器→边缘→汇聚层→源站
- Cache Key 生成（URL/Header 维度）
- TTL/版本化 URL/Purge 缓存失效策略
- Origin Shield 保护源站免受回源风暴

**命题特有瓶颈：**
- **缓存命中率低 (P0)**：动态内容过多、Cache Key 过细 → 回源率 >20%，首屏延迟升高
- **回源风暴 (P0)**：热点内容同时过期 → 源站超时，首屏请求被阻塞
- **缓存一致性延迟 (P1)**：内容更新后缓存未失效 → 用户看到旧版本 HTML
- **CDN 故障/单点依赖 (P1)**：CDN 宕机 → 首屏完全不可访问

---

## 2. 协议层：HTTP缓存协议 (A5)

浏览器拿到资源后，缓存协议决定后续请求是命中本地、条件协商还是重新下载。

**能力机制：**
- 强缓存：Cache-Control max-age/Expires → 命中时零网络延迟
- 协商缓存：ETag/If-None-Match、Last-Modified/If-Modified-Since → 304 小传输量
- 关键指令：no-cache（必须验证）、no-store（禁止缓存）、immutable（跳过验证）、stale-while-revalidate（异步验证）
- s-maxage 分离 CDN 与浏览器缓存策略

**命题特有瓶颈：**
- **缓存穿透 (P0)**：HTML 入口未缓存 → 每次首屏都需完整网络往返
- **缓存雪崩 (P0)**：大量资源同时过期 → 瞬间回源洪峰冲击源站
- **Vary 过度膨胀 (P1)**：Vary:User-Agent → 缓存命中率骤降，首屏加载变慢
- **启发式缓存失控 (P2)**：缺少 Cache-Control → 意外长期缓存导致首屏内容无法更新

---

## 3. 网络层：资源加载策略 (A7)

资源的加载顺序和优先级直接影响 LCP 和 FCP。

**能力机制：**
- preload：当前导航关键资源高优先级预加载（需指定 as 属性）
- prefetch：未来导航资源低优先级预获取
- preconnect：提前完成 DNS+TCP+TLS 握手
- loading='lazy'：延迟非首屏资源
- fetchpriority：同类资源内微调优先级（high/low/auto）

**命题特有瓶颈：**
- **首屏 LCP 图片用 lazy (P0)**：LCP 图片错误使用 loading='lazy' → LCP 严重延迟
- **preload CORS 不匹配 (P1)**：preload 与实际请求 CORS 模式不一致 → 双重下载
- **过多 prefetch 争抢带宽 (P1)**：prefetch 与首屏关键资源争抢 → LCP 退化
- **preconnect 过多 (P2)**：超过 6 个域名 → 浪费 DNS/TCP 资源

---

## 4. 构建层：模块系统与构建优化 (A9)

构建产物的大小和分割策略决定首屏需要下载多少 JS。

**能力机制：**
- ES Module 静态分析 → Tree Shaking 消除死代码
- 动态 import() → 按需加载，split point 自动生成独立 chunk
- Code Splitting 三种策略：Entry Points、SplitChunksPlugin、Dynamic Import
- Vite：原生 ESM+esbuild 预构建 → 极快启动

**命题特有瓶颈：**
- **过度分割 (P0)**：minSize 过小 → chunk 数量爆炸，HTTP 请求激增，首屏反而更慢
- **Tree Shaking 失效 (P1)**：CJS 混入、顶层副作用 → 死代码未消除，bundle 膨胀
- **动态 import 加载抖动 (P1)**：网络不稳定 → chunk 加载失败，首屏白屏
- **重复依赖 (P2)**：多 chunk 引用同依赖不同版本 → bundle 体积膨胀

---

## 5. 浏览器层：浏览器渲染管线 (A1)

浏览器拿到 HTML/CSS/JS 后，CRP 决定首屏像素何时出现在屏幕上。

**能力机制：**
- DOM 构建 → CSSOM 构建 → Render Tree → Layout → Layer Tree → Paint → Raster → Composite
- Layout 和 Paint 阶段开销最大
- 仅触发 Composite 的属性（transform/opacity）性能最优

**命题特有瓶颈：**
- **CSS 渲染阻塞 (P0)**：<link rel='stylesheet'> 阻塞首屏渲染 → FCP 延迟，白屏时间长
- **JS 阻塞 DOM 解析 (P0)**：<script> 无 async/defer → DOM 构建延迟，TTFB 后长时间无内容
- **大图解码阻塞 (P1)**：高分辨率图片 Raster 阶段解码耗时 → 主线程阻塞

---

## 6. 框架层：SSR/Hydration机制 (A13)

框架的渲染策略决定首屏 HTML 从哪里来、交互何时可用。

**能力机制：**
- SSR：服务端 renderToString/renderToReadableStream → HTML 传输 → 客户端 hydrateRoot 绑定事件
- Streaming SSR：Suspense 分段流式传输+Selective Hydration
- SSG：构建时预渲染静态 HTML
- Lazy Hydration：onInteraction/onVisible/whenIdle 延迟激活

**命题特有瓶颈：**
- **Hydration Mismatch (P0)**：客户端与服务端 HTML 不一致 → 事件错位，交互异常
- **JS Bundle 过大 (P0)**：Hydration 需加载完整客户端 JS → FCP 快但 TTI 慢
- **服务端 CPU 瓶颈 (P1)**：高并发下单线程 Node.js 渲染阻塞 → 响应延迟
- **数据获取瓶颈 (P1)**：SSR 预取数据受 API 延迟制约 → TTFB 高
- **跨请求状态污染 (P1)**：单例 store 共享状态 → 数据串扰

---

## 7. 诊断层：DevTools性能分析 (A8)

贯穿全链路的诊断能力，用于定位首屏白屏的根因。

**能力机制：**
- Performance 面板：火焰图/Long Task/帧率分析
- Lighthouse：FCP/LCP/TBT/CLS 自动审计
- PerformanceObserver API：异步观察性能条目
- Network 面板：资源加载瀑布图、TTFB 分析

**在首屏场景中的应用：**
- 定位 CSS/JS 渲染阻塞（Performance → Main 火焰图）
- 分析 LCP 元素和加载时间（Lighthouse → LCP）
- 检测 Hydration 耗时（React Profiler / Vue DevTools）
- 验证 CDN 命中和缓存状态（Network → Headers）

---

## 数据流总结

```
用户请求
  ↓
[CDN边缘节点] A10 — 缓存命中? → 直接返回 / 回源
  ↓
[HTTP缓存] A5 — 强缓存命中? → 本地副本 / 协商304 / 重新下载
  ↓
[资源加载] A7 — preload关键资源 + preconnect关键域名
  ↓
[构建产物] A9 — Code Splitting → initial chunk + lazy chunks
  ↓
[浏览器CRP] A1 — DOM/CSSOM → Render Tree → Layout → Paint → 首屏像素(FCP)
  ↓
[SSR/Hydration] A13 — 服务端HTML → 客户端Hydration → 可交互(TTI)
  ↓
[诊断] A8 — Performance/Lighthouse → 定位瓶颈 → 优化迭代
```
