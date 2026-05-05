# 坑点提取：首屏白屏 — 从 FCP 到 LCP 的全链路优化

> 分类维度：严重程度（致命 / 严重 / 隐蔽）
> 覆盖架构：SSR / SSG / SPA 通用坑点标注 [通用]，特定架构标注 [SSR] / [SSG] / [SPA]

---

## 一、致命级（直接导致白屏或页面不可用）

### 1. CSS 渲染阻塞引发白屏
- **现象**：页面长时间白屏，用户看到空白页面，FCP 指标极差
- **触发条件**：外部 CSS 文件未使用 `preload` 或放置在 `<head>` 中阻塞渲染；CSS 文件体积过大或网络缓慢导致关键渲染路径被阻塞
- **检测手段**：Chrome DevTools → Network 面板查看 CSS 请求瀑布图；Lighthouse "Eliminate render-blocking resources" 审计；Performance 面板查看首次绘制时间线
- **缓解策略**：内联关键 CSS（Critical CSS）；非关键 CSS 使用 `preload` + `media` 属性异步加载；使用 `<link rel="stylesheet" media="print" onload="this.media='all'">` 模式
- **关联能力**：A1、A9
- **适用架构**：[通用]

### 2. JS 阻塞 DOM 构建导致白屏
- **现象**：HTML 解析被阻塞，DOM 树无法构建完成，FCP 延迟数百毫秒至数秒
- **触发条件**：`<script>` 标签未添加 `async` 或 `defer` 属性；JS 文件位于 `<head>` 中且体积较大；内联脚本执行时间过长
- **检测手段**：Lighthouse "Reduce render-blocking scripts" 审计；Performance 面板查看 Main 线程 Long Task；`<script>` 标签缺少 `async`/`defer` 的静态扫描
- **缓解策略**：所有非关键脚本添加 `defer`（保序）或 `async`（不保序）；将脚本移至 `</body>` 前；使用 `type="module"` 自动 defer
- **关联能力**：A1、A9
- **适用架构**：[通用]

### 3. Hydration Mismatch 导致渲染失败
- **现象**：SSR 输出的 HTML 与客户端 JS hydration 结果不一致，触发报错或重新渲染，白屏或闪烁
- **触发条件**：服务端与客户端环境差异（`window`/`document`/`navigator`/`Date`）；随机数、时间戳等非确定性数据；浏览器扩展注入 DOM 节点
- **检测手段**：控制台 `Hydration mismatch` 警告；React DevTools 检查 hydration 错误边界；Vue DevTools 检查 SSR 激活警告
- **缓解策略**：使用 `useEffect`/`onMounted` 延迟访问浏览器 API；`suppressHydrationWarning` 处理已知差异；逐步 hydration（Progressive Hydration）减少一次性匹配范围
- **关联能力**：R2、V2
- **适用架构**：[SSR]

### 4. SSR 服务端单线程阻塞导致 TTFB 超时
- **现象**：用户请求长时间无响应，TTFB 超过 3 秒，浏览器显示白屏等待
- **触发条件**：Node.js 单线程被 CPU 密集操作阻塞；同步数据获取串行执行；第三方 API 响应缓慢拖累整体渲染
- **检测手段**：服务端 APM 监控（如 New Relic/Datadog）查看请求处理时间；`clinic.js` 性能分析；日志中 TTFB 分布 P95/P99 异常
- **缓解策略**：数据获取并行化（`Promise.all`）；设置 API 超时与降级策略；使用 Worker Threads 分担 CPU 计算；SSR → SSG/ISR 混合策略
- **关联能力**：N1、R2
- **适用架构**：[SSR]

---

## 二、严重级（显著拉长 FCP/LCP，但不完全阻塞）

### 5. 布局抖动与强制同步布局
- **现象**：页面加载过程中元素位置跳动，LCP 元素反复重排，用户感知到"跳帧"
- **触发条件**：图片/视频未设置宽高比；动态插入内容导致 reflow；读取 `offsetHeight`/`getComputedStyle` 触发强制同步布局
- **检测手段**：Performance 面板查看 Layout 事件频率和耗时；Lighthouse "Avoid large layout shifts" 审计；CLS 指标 > 0.1
- **缓解策略**：使用 `aspect-ratio` CSS 属性或 `width`/`height` 属性预设尺寸；`contain: layout` 限制布局影响范围；避免在动画循环中读取布局属性
- **关联能力**：A1
- **适用架构**：[通用]

### 6. 多级缓存不一致导致白屏或旧版本
- **现象**：用户访问页面看到旧版本内容或白屏，CSS/JS 与 HTML 版本不匹配
- **触发条件**：HTML 入口文件缓存策略过长，新部署后旧 HTML 引用已失效的资源 hash；CDN `s-maxage` 与浏览器 `max-age` 不同步
- **检测手段**：对比 CDN 边缘节点与源站响应内容；检查 `Cache-Control` 头的 `max-age` / `s-maxage` / `stale-while-revalidate` 配置；资源 404 比率监控
- **缓解策略**：HTML 使用 `no-cache` 或短 `max-age` + `must-revalidate`；静态资源使用内容 hash 文件名长期缓存；CDN 配置与浏览器缓存策略统一规划
- **关联能力**：A6、A7
- **适用架构**：[通用]

### 7. 缓存回源风暴
- **现象**：部署瞬间大量请求同时穿透 CDN 回源，源站压力骤增，响应变慢，用户集体白屏
- **触发条件**：大量页面缓存同时过期（`max-age` 统一设置）；CDN 节点大面积失效；缓存预热不足
- **检测手段**：CDN 回源率监控突增；源站 QPS 暴涨告警；`stale-while-revalidate` 策略是否生效
- **缓解策略**：缓存时间加随机抖动（如 `max-age=3600 + random(0,300)`）；部署前 CDN 预热关键资源；使用 `stale-while-revalidate` 允许异步回源
- **关联能力**：A7
- **适用架构**：[通用]

### 8. Preload 资源浪费带宽
- **现象**：`<link rel="preload">` 声明的资源被下载但未被使用，浪费带宽，挤占其他资源下载
- **触发条件**：preload 的资源与实际使用路径不匹配；CORS 模式不匹配（如 `crossorigin` 属性缺失）导致请求两次；preload URL 与实际引用 URL 不一致
- **检测手段**：Chrome DevTools Console 的 `was preloaded but not used` 警告；Network 面板查看是否有重复请求；Lighthouse "Preload key requests" 审计
- **缓解策略**：确保 preload 的 `href` 与实际引用完全一致；跨域资源添加 `crossorigin` 属性；使用 `<link rel="preload" as="font" crossorigin>` 预加载字体；定期审计未使用的 preload
- **关联能力**：A8
- **适用架构**：[通用]

### 9. Web 字体阻塞文本渲染（FOIT）
- **现象**：页面加载时文字不可见（Flash of Invisible Text），用户看到空白区域，FCP/LCP 均受影响
- **触发条件**：`@font-face` 未设置 `font-display`；字体文件体积过大；字体请求在关键渲染路径上
- **检测手段**：Performance 面板查看字体加载时间线；Lighthouse "Ensure text remains visible during webfont load" 审计；Network 面板字体请求 waterfall
- **缓解策略**：设置 `font-display: swap` 实现 FOUT（Flash of Unstyled Text）；内联字体子集；使用 `preload` 提前加载关键字体；系统字体回退策略
- **关联能力**：A9
- **适用架构**：[通用]

### 10. 关键资源链过长导致瀑布式加载
- **现象**：资源按串行依赖逐级加载，FCP/LCP 被拉长数百毫秒
- **触发条件**：CSS 中引用字体 → 字体加载完才能渲染文字；JS 动态 import CSS → CSS 加载完才能应用样式；多级重定向链
- **检测手段**：Lighthouse "Reduce critical request chains" 审计；Network 面板 waterfall 图查看串行依赖；Performance 面板关键路径分析
- **缓解策略**：合并关键资源减少链深度；预加载关键依赖；消除不必要的重定向；使用 HTTP/2 Server Push（注意 Push 过度使用的问题）
- **关联能力**：A9
- **适用架构**：[通用]

### 11. 传统 SSR 全量 Hydration 开销
- **现象**：SSR 渲染的 HTML 快速展示后，客户端 JS hydration 导致主线程长时间阻塞，页面"卡死"
- **触发条件**：整棵 DOM 树遍历进行 hydration；复杂组件树 hydration 计算密集；hydration 期间用户交互无响应
- **检测手段**：Performance 面板 Main 线程 Long Task 分析；`react-profiler` 或 Vue DevTools 组件渲染耗时；`web-vitals` 库 LCP 与 FCP 差值过大
- **缓解策略**：使用 Selective Hydration（React 18 `Suspense`）；Islands Architecture 只 hydrate 交互组件；Streaming SSR 分块传输与逐步激活
- **关联能力**：R2、V2
- **适用架构**：[SSR]

### 12. getServerSideProps 数据 Waterfall
- **现象**：页面 SSR 渲染等待多个串行数据请求完成，TTFB 显著增长
- **触发条件**：多个 `getServerSideProps` 或页面级数据获取串行执行；依赖前一个请求结果才能发起后续请求；数据库查询未优化
- **检测手段**：服务端日志查看各数据请求耗时和顺序；APM 链路追踪查看 waterfall；自定义 `console.time` 标记数据获取阶段
- **缓解策略**：独立数据请求使用 `Promise.all` 并行；引入 DataLoader 批量合并查询；设置单个请求超时避免拖累整体；使用 Streaming SSR 边获取边渲染
- **关联能力**：N1、R2
- **适用架构**：[SSR]

---

## 三、隐蔽级（难以察觉但持续影响性能）

### 13. Vary 头导致缓存碎片化
- **现象**：CDN 命中率低，大量请求回源，缓存效率远低于预期
- **触发条件**：`Vary: Accept-Encoding, User-Agent, Cookie` 等头过于宽泛；不同 User-Agent 导致同一 URL 产生数百个缓存变体；Session Cookie 导致几乎无法缓存
- **检测手段**：CDN 控制台查看缓存命中率和变体数量；`curl -I` 检查响应 `Vary` 头；分析 Top User-Agent 分布
- **缓解策略**：精简 `Vary` 头，只保留必要变体；对 Cookie 进行规范化（去除不影响内容的 Cookie）；使用 `Cache-Key` 自定义规则忽略不必要的变体
- **关联能力**：A6
- **适用架构**：[通用]

### 14. 动态内容缓存策略不当
- **现象**：动态页面要么不缓存（性能差），要么缓存了不该缓存的内容（数据过期）
- **触发条件**：未区分静态路由和动态路由的缓存策略；用户个性化内容被错误缓存；`stale-while-revalidate` 窗口设置不当
- **检测手段**：对比不同路由的 `Cache-Control` 配置；检查个性化页面是否返回了缓存响应；监控 stale 内容占比
- **缓解策略**：按路由粒度配置缓存策略；个性化内容使用客户端渲染 + 骨架屏；边缘计算（Edge Functions）动态组装页面
- **关联能力**：A7
- **适用架构**：[通用]

### 15. Prefetch 与当前页面竞争带宽
- **现象**：prefetch 的资源抢占当前页面关键资源的带宽，FCP/LCP 反而变慢
- **触发条件**：在页面加载初期就触发大量 prefetch；网络带宽有限（3G/弱网）；prefetch 资源优先级未正确设置
- **检测手段**：Network 面板查看 prefetch 请求与关键资源的带宽竞争；Lighthouse "Preconnect to required origins" 审计；弱网环境下 Performance 面板分析
- **缓解策略**：在页面 load 事件后才启动 prefetch；使用 `<link rel="prefetch">` 让浏览器自动管理优先级；限制同时 prefetch 的数量
- **关联能力**：A8
- **适用架构**：[通用]

### 16. Chunk 间共享模块重复打包
- **现象**：构建产物体积膨胀，加载时间增加，但难以定位重复模块
- **触发条件**：Webpack/Rollup 的 `splitChunks` 配置不当；不同 entry 或 chunk 之间共享的依赖未提取为公共模块；动态 import 的 chunk 之间存在重复
- **检测手段**：`webpack-bundle-analyzer` 可视化分析 bundle 组成；`source-map-explorer` 定位重复模块；构建日志中 chunk 大小告警
- **缓解策略**：配置 `optimization.splitChunks` 提取公共依赖；使用 `import()` 动态导入拆分路由级代码；定期审计 bundle 体积变化趋势
- **关联能力**：A10、A11
- **适用架构**：[通用]

### 17. CommonJS 依赖破坏 Tree Shaking
- **现象**：构建产物中包含大量未使用的代码，bundle 体积远超预期
- **触发条件**：第三方库使用 CommonJS 格式（`module.exports`）；Babel 默认将 ESM 转译为 CJS 破坏静态分析；库内部有副作用（side effects）未声明
- **检测手段**：`webpack --stats` 查看模块是否被标记为可 tree-shaken；检查 `package.json` 的 `sideEffects` 字段；对比 ESM 和 CJS 构建产物大小
- **缓解策略**：优先选择提供 ESM 版本的库；配置 Babel 不转换模块语法（`modules: false`）；在 `package.json` 中正确声明 `sideEffects`；使用 `babel-plugin-transform-imports` 按需导入
- **关联能力**：A11
- **适用架构**：[通用]

### 18. 动态导入的加载状态缺失
- **现象**：路由切换时出现白屏闪烁，用户感知到"加载中"但无反馈
- **触发条件**：`React.lazy` / `defineAsyncComponent` 未配合 Suspense 或 Loading 组件；chunk 加载失败无降级处理；弱网环境下加载时间过长
- **检测手段**：弱网模拟下观察路由切换体验；检查是否有 `Suspense` fallback 配置；Sentry 等监控 chunk 加载失败率
- **缓解策略**：配合 `Suspense` + Loading 骨架屏；预加载下一个可能访问的路由（`prefetch`）；设置 chunk 加载超时与重试机制
- **关联能力**：A10
- **适用架构**：[SPA]

### 19. async Component 两端数据不一致
- **现象**：SSR 渲染的内容与客户端 hydration 后的内容不同，导致闪烁或报错
- **触发条件**：`async setup`（Vue）或 `use`（React）在服务端和客户端获取到不同数据；时间敏感数据（倒计时、实时价格）在 SSR 和 CSR 间不一致；API 返回了基于请求上下文（IP、Cookie）的个性化数据
- **检测手段**：对比 SSR 输出 HTML 与客户端渲染结果；控制台 hydration mismatch 警告；E2E 测试覆盖 SSR → CSR 切换场景
- **缓解策略**：将时间敏感数据放入 `onMounted`/`useEffect` 后获取；SSR 传递序列化状态（`__INITIAL_STATE__`）供客户端复用；使用 `useId` 确保 SSR/CSR ID 一致
- **关联能力**：V2、R2
- **适用架构**：[SSR]

### 20. 第三方库 SSR 兼容性问题
- **现象**：SSR 构建或运行时报错 `window is not defined` / `document is not defined`，或渲染结果异常
- **触发条件**：第三方库在模块顶层访问浏览器 API；库未提供 SSR 兼容版本；polyfill 策略不当
- **检测手段**：SSR 构建日志中的错误和警告；`typeof window` 检查点扫描；测试环境模拟 Node.js 运行
- **缓解策略**：使用 `dynamic import` 或条件加载（`typeof window !== 'undefined'`）延迟加载不兼容库；寻找 SSR 友好的替代库；封装适配层隔离浏览器 API
- **关联能力**：V2
- **适用架构**：[SSR]

### 21. ISR 缓存一致性问题
- **现象**：ISR（增量静态再生成）页面展示过期数据，或同时出现新旧版本内容
- **触发条件**：`revalidate` 时间窗口内多个 CDN 节点缓存不同版本；再生成期间的请求返回 stale 内容；源站更新后 CDN 缓存未及时失效
- **检测手段**：对比不同 CDN 边缘节点的响应内容；监控 ISR 再生成频率和失败率；A/B 测试检查内容一致性
- **缓解策略**：使用 `revalidate` + On-Demand Revalidation 结合；关键更新后主动触发 CDN 缓存清除；设置合理的 `stale-while-revalidate` 窗口
- **关联能力**：N1
- **适用架构**：[SSG]

### 22. 合成层过多导致 GPU 内存溢出
- **现象**：页面卡顿、掉帧，尤其在低端设备上表现明显
- **触发条件**：大量元素使用 `will-change` 或 `transform`/`opacity` 动画；每个动画元素都创建独立合成层；GPU 内存不足导致层合并或降级
- **检测手段**：Chrome DevTools → Layers 面板查看合成层数量和大小；Performance 面板查看 Composite Layers 事件；`chrome://gpu` 查看 GPU 内存使用
- **缓解策略**：限制同时存在的合成层数量；使用 `will-change` 仅在动画开始前添加、结束后移除；优先使用 `transform` 和 `opacity` 这两个不触发重排的属性
- **关联能力**：A1
- **适用架构**：[通用]

---

## 附录：能力 ID 对照表

| 能力 ID | 瓶颈领域 |
|---------|----------|
| A1 | 渲染阻塞（CSS/JS/DOM） |
| A6 | 缓存策略 |
| A7 | 缓存一致性与回源 |
| A8 | 资源预加载（preload/prefetch） |
| A9 | 关键渲染路径 |
| A10 | 代码分割与 chunk 管理 |
| A11 | Tree Shaking 与 ESM |
| R2 | React SSR Hydration |
| V2 | Vue SSR Hydration |
| N1 | Node.js SSR 服务端性能 |
