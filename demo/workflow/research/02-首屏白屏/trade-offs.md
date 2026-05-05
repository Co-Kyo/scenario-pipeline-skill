# Q3: 方案对比 — 首屏白屏：从 FCP 到 LCP 的全链路优化

## 方案总览

| 维度 | SSR | SSG | ISR | SPA+优化 |
|------|-----|-----|-----|----------|
| FCP | ⭐⭐⭐⭐⭐ 极快 | ⭐⭐⭐⭐⭐ 极快 | ⭐⭐⭐⭐⭐ 极快 | ⭐⭐ 较慢 |
| LCP | ⭐⭐⭐⭐ 快 | ⭐⭐⭐⭐⭐ 极快 | ⭐⭐⭐⭐ 快 | ⭐⭐⭐ 中等 |
| TTI | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐ 快 | ⭐⭐⭐⭐ 快 | ⭐⭐⭐⭐⭐ 极快 |
| 实时性 | ⭐⭐⭐⭐⭐ 实时 | ⭐ 较差 | ⭐⭐⭐⭐ 较好 | ⭐⭐⭐⭐⭐ 实时 |
| 运维复杂度 | ⭐⭐ 高 | ⭐⭐⭐⭐ 低 | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐⭐ 低 |
| 服务器成本 | ⭐⭐ 高 | ⭐⭐⭐⭐⭐ 低 | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐ 低 |

---

## 1. SSR（服务端渲染）

### 技术栈

- **框架**：Next.js (`getServerSideProps`)、Nuxt 3 (`useAsyncData`)、Remix
- **运行时**：Node.js / Edge Runtime（Vercel Edge、Cloudflare Workers）
- **缓存层**：CDN + ETag/Last-Modified、服务端 HTTP Cache-Control

### 实现思路

1. **服务端渲染完整 HTML**：每个请求在服务端执行组件渲染，输出带数据的 HTML 文档，浏览器收到即可绘制（FCP 快）
2. **Streaming HTML**：采用 React 18 `renderToPipeableStream`，边生成边传输，首字节时间（TTFB）进一步压缩，浏览器可以更早开始解析
3. **Selective Hydration**：配合 `<Suspense>` 实现分段注水，非关键交互区域延迟 hydrate，缩短 TTI
4. **缓存策略**：对可缓存页面设置 `Cache-Control: s-maxage=60, stale-while-revalidate=30`，CDN 层拦截重复请求；对高实时性页面设置 `no-cache` 并依赖 ETag 做条件请求

### 适用场景

- **内容高度个性化**：用户画像页面、推荐流、社交动态
- **SEO 刚需**：电商商品详情、新闻资讯（搜索引擎直接抓取服务端 HTML）
- **数据强实时**：金融行情、实时库存、即时通讯消息列表

### 权衡与牺牲

| 取舍 | 说明 |
|------|------|
| **实时性 vs 服务器成本** | 每次请求都执行服务端渲染，CPU/内存开销高；高并发场景需要水平扩展或引入缓存层 |
| **Streaming vs 传统 SSR** | Streaming 降低 TTFB 但增加复杂度（需处理 chunk 边界、Error Boundary 适配）；传统 SSR 实现简单但首字节慢 |
| **Selective Hydration vs 全量 Hydration** | Selective 减少主线程阻塞、改善 TTI，但需要精心设计 Suspense 边界，调试成本高；全量 hydrate 逻辑简单但长页面 TTI 差 |
| **ETag 精度 vs CPU 开销** | 精确 ETag（基于内容哈希）保证缓存一致性但消耗服务端计算资源；弱 ETag（基于时间戳）节省 CPU 但可能返回过期内容 |
| **CDN 缓存 vs 一致性** | 缓存时长越长命中率越高、服务器压力越小，但用户看到的可能是旧数据 |

---

## 2. SSG（静态生成 + CDN）

### 技术栈

- **框架**：Next.js (`getStaticProps` + `export`)、Nuxt 3 (`nuxt generate`)、Astro、Hugo、Gatsby
- **部署**：CDN（CloudFront、Akamai、Vercel Edge Network）直接托管静态文件
- **数据源**：构建时从 CMS/API 拉取，生成 HTML + JSON

### 实现思路

1. **构建时生成**：`npm run build` 阶段遍历所有路由，执行组件渲染 + 数据获取，输出纯静态 HTML/JS/CSS
2. **CDN 全球分发**：静态文件推送到全球 CDN 节点，用户从最近节点获取，网络延迟极低
3. **预加载优化**：`<link rel="preload">` 提前加载关键字体、图片；`<link rel="modulepreload">` 预加载关键 JS chunk
4. **资源拆分**：细粒度 Code Splitting，按路由拆分 + 按组件动态 import，减少首屏传输量

### 适用场景

- **内容变更低频**：文档站、博客、营销落地页、产品介绍页
- **全球用户**：通过 CDN 边缘节点实现全球一致的低延迟体验
- **SEO 优先**：搜索引擎直接索引静态 HTML，无需 JS 执行

### 权衡与牺牲

| 取舍 | 说明 |
|------|------|
| **构建时间 vs 页面数量** | 页面越多构建越慢（万级页面可能需要增量构建或分片策略） |
| **缓存时长 vs 更新及时性** | 静态文件天然长缓存，但内容更新需要重新构建 + 部署，用户看到新内容有延迟 |
| **CDN 节点数 vs 费用** | 全球覆盖节点越多一致性越好、延迟越低，但 CDN 带宽和请求费用显著上升 |
| **编译时优化 vs 运行时灵活性** | 编译期可以做 Tree Shaking、Dead Code Elimination、静态分析优化，但无法处理运行时动态数据 |
| **preload 数量 vs 带宽竞争** | 过多 preload 会与首屏关键资源争抢带宽，反而拖慢 FCP/LCP；需要精心挑选 preload 候选 |

---

## 3. ISR（增量静态再生）

### 技术栈

- **框架**：Next.js (`getStaticProps` + `revalidate`)、Nuxt 3（`routeRules` + `swr`）
- **部署**：Vercel、自建 Node.js + CDN 代理层
- **缓存策略**：`stale-while-revalidate` 模式，CDN + 服务端双重缓存

### 实现思路

1. **首次构建生成静态页面**：与 SSG 相同，构建时生成初始 HTML
2. **按需再生**：`revalidate: 60` 表示 60 秒后首次请求触发后台重新渲染，新页面替换旧页面，当前用户仍看到旧页面（或通过 stale-while-revalidate 策略异步更新）
3. **On-demand Revalidation**：通过 Webhook / API 调用 `res.revalidate('/path')`，CMS 内容变更时主动触发指定页面再生
4. **混合缓存**：CDN 层 `s-maxage` + `stale-while-revalidate`，服务端内存/Redis 缓存渲染结果

### 适用场景

- **中等更新频率**：电商商品页（价格/库存变动频繁但非实时）、新闻列表页、内容聚合页
- **大规模页面**：十万级商品详情页无法全量 SSG 构建，ISR 按需生成 + 缓存是唯一可行方案
- **SEO + 性能兼顾**：静态 HTML 保证 SEO，按需再生保证内容时效

### 权衡与牺牲

| 取舍 | 说明 |
|------|------|
| **缓存时长 vs 一致性** | `revalidate` 窗口内用户看到旧数据；窗口越短一致性越好但服务端压力越大 |
| **SSR 实时性 vs SSG 性能** | ISR 是两者的折中——性能接近 SSG（CDN 缓存命中时零计算），但一致性不如 SSR（有窗口延迟） |
| **On-demand vs 定时 Revalidation** | On-demand 精准但依赖外部触发机制（Webhook 可靠性）；定时简单但浪费再生资源 |
| **服务端组件 vs 客户端组件** | Next.js App Router 中 RSC 配合 ISR 可进一步减少客户端 JS，但服务端组件边界划分增加心智负担 |

---

## 4. SPA + 优化（Code Splitting + 预加载 + 骨架屏）

### 技术栈

- **框架**：Vue 3 + Vite、React + Vite、SvelteKit（CSR 模式）
- **构建工具**：Vite（原生 ESM + 按需编译）、Webpack 5（Module Federation）
- **优化手段**：`React.lazy` / `defineAsyncComponent`、路由级 Code Splitting、骨架屏、`<link rel="preload">`

### 实现思路

1. **骨架屏先行**：HTML 中内联关键 CSS + 骨架屏 DOM，用户立即看到页面结构（缓解白屏感知），FCP 指标改善
2. **路由级 Code Splitting**：每个路由懒加载对应 chunk，首屏只加载当前路由代码
3. **资源预加载**：
   - `<link rel="preload">` 提前加载首屏关键图片/字体
   - Hover 预加载：用户鼠标悬停导航链接时预加载目标路由 chunk
   - `requestIdleCallback` 空闲时预加载次屏资源
4. **数据预取**：Service Worker 拦截 API 请求做预缓存，或在骨架屏展示期间并行发起数据请求
5. **渐进式 Hydration**：优先 hydrate 可见区域组件，其余延迟处理

### 适用场景

- **强交互应用**：后台管理系统、在线编辑器、Dashboard、社交应用
- **团队前端为主**：不需要服务端基础设施，纯静态部署（OSS/CDN）即可
- **内网 / 低 SEO 需求**：不需要搜索引擎抓取的内部工具

### 权衡与牺牲

| 取舍 | 说明 |
|------|------|
| **FCP vs 白屏时间** | 骨架屏缓解感知白屏，但真实 FCP 仍依赖 JS 下载 + 执行，相比 SSR/SSG 天然劣势 |
| **LCP vs 资源加载顺序** | LCP 元素（大图/Hero 区域）需要 JS 渲染才能显示；即使 preload 图片，也需等待 JS 执行完才能插入 DOM |
| **细粒度拆分 vs 请求数** | 拆分越细单个 chunk 越小（传输快），但 HTTP 请求数增加（连接开销、HTTP/1.1 并发限制）；HTTP/2 多路复用缓解但不消除 |
| **Lazy Hydration vs 立即 Hydrate** | Lazy 减少主线程阻塞、改善 TTI，但用户快速交互时可能遇到未 hydrate 的组件（点击无响应）；立即 hydrate 保证交互可用但阻塞渲染 |
| **骨架屏设计成本** | 好的骨架屏需要与真实布局匹配，维护成本随页面迭代增加；劣质骨架屏反而误导用户 |

---

## 综合推荐

### 决策矩阵

```
                    高实时性
                       │
                       │  ┌─────────┐
                       │  │   SSR   │
                       │  └─────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
     ┌────┴────┐  ┌────┴────┐      │
     │   ISR   │  │  SPA+   │      │
     └─────────┘  │  优化    │      │
          │       └─────────┘      │
          │            │            │
          └────────────┼────────────┘
                       │
                       │  ┌─────────┐
                       │  │   SSG   │
                       │  └─────────┘
                       │
                    低实时性
         高性能 ◄──────────────► 低运维成本
```

### 推荐方案

| 场景 | 推荐 | 理由 |
|------|------|------|
| **内容站 + 全球用户** | SSG + CDN | 最佳 FCP/LCP，CDN 边缘命中率高，运维简单 |
| **电商 / 内容平台** | ISR | SSG 性能 + 按需更新，大规模页面可行，`stale-while-revalidate` 平衡时效与性能 |
| **个性化 / 实时应用** | SSR + Streaming | 实时数据、个性化内容无法预生成，Streaming + Selective Hydration 缓解 SSR 性能瓶颈 |
| **内部工具 / 后台系统** | SPA + 骨架屏 | 无 SEO 需求，纯前端团队可维护，骨架屏 + Code Splitting 够用 |
| **混合场景（推荐默认）** | **ISR + SSR 混合** | 静态页面走 ISR，动态页面走 SSR，通过路由级配置灵活切换，兼顾性能与实时性 |

### 通用优化（所有方案适用）

无论选择哪种技术路线，以下优化都应作为基线：

1. **关键资源预加载**：`<link rel="preload">` 首屏图片/字体，控制数量 ≤ 5 个避免带宽竞争
2. **资源压缩**：Brotli > Gzip，图片 WebP/AVIF，字体 `font-display: swap`
3. **缓存策略**：静态资源 `immutable` 长缓存 + 内容哈希文件名，HTML 短缓存 + `stale-while-revalidate`
4. **代码拆分**：路由级懒加载，首屏 chunk 控制在 100KB（gzip）以内
5. **Core Web Vitals 监控**：接入 RUM（真实用户监控），持续追踪 FCP / LCP / CLS / TTI
