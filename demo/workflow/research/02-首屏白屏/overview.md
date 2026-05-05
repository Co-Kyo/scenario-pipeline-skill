# 首屏白屏：从 FCP 到 LCP 的全链路优化

## 问题切入

首屏白屏是用户可感知的最严重性能问题。用户点击链接后面对一片空白，信任度直线下降。三种主流渲染模式各有痛点：

- **SPA**：空 HTML → 下载 JS → 执行 → 渲染，白屏时间最长，FCP 完全取决于 JS bundle 大小和执行速度
- **SSR**：服务端返回 HTML，但 hydration 期间页面不可交互，甚至因 JS 加载顺序问题出现"闪烁"或二次白屏
- **SSG**：预渲染 HTML 可快速 FCP，但动态内容依赖客户端请求，LCP 可能严重滞后

无论哪种模式，首屏性能本质上是一条 **数据流管线**：从浏览器发起请求到像素上屏再到用户可交互，每一环都可能成为瓶颈。以下按这条链路逐段拆解。

---

## 链路全景

```
[DNS/CDN] → [HTML 获取] → [资源解析] → [渲染树构建] → [布局与绘制] → [激活与交互]
   A7          A6/A7         A8/A9         A1/A9          A1              R2/V2
               A6           A10/A11
```

---

## 一、HTML 获取：从网络到首字节

首屏的第一个瓶颈是 **HTML 文档本身何时到达浏览器**。

### 1.1 CDN 就近分发（A7）

用户请求不应跨半个地球才能到达源站。CDN 边缘节点缓存 HTML（SSG 页面天然适合）或动态回源（SSR），配合 DNS 智能解析将用户路由到最近节点，TTFB 可降至 50ms 以内。

- HTTP/2 时代建议**单域名**策略，避免多域名带来的 DNS 额外开销和连接复用断裂
- `s-maxage` 可独立控制 CDN 边缘缓存时长，与浏览器缓存 `max-age` 解耦

### 1.2 缓存策略（A6）

HTML 本身的缓存决定了重复访问的速度：

- **强缓存**：`Cache-Control: max-age=3600` 直接从磁盘/内存读取，零网络开销
- **协商缓存**：`ETag` / `Last-Modified` 配合 `304 Not Modified`，减少传输体积
- **stale-while-revalidate**：返回过期缓存的同时后台异步刷新，用户无感知等待

SPA 的 HTML 通常不含动态内容，可激进缓存；SSR 的 HTML 需要根据业务选择合适的缓存时长。

---

## 二、资源解析：关键渲染路径的博弈

HTML 到达后，浏览器开始解析并发现子资源。这一阶段的核心矛盾是：**哪些资源阻塞渲染，哪些可以延迟**。

### 2.1 关键渲染路径（CRP）（A1, A9）

浏览器渲染管线的固定路径：

```
HTML → DOM Tree ─┐
                 ├→ Render Tree → Layout → Paint → Composite
CSS → CSSOM Tree ┘
```

关键认知：
- **CSS 是渲染阻塞资源**：浏览器必须等 CSSOM 构建完成才能生成 Render Tree，不会在 CSS 加载完成前渲染任何像素
- **JS 是解析阻塞资源**：遇到 `<script>` 标签时 HTML 解析暂停（除非 `async`/`defer`），因为 JS 可能修改 DOM

**CRP 优化的核心三原则（A9）**：
1. **减少关键资源数量**：非首屏 CSS/JS 不应阻塞
2. **缩短关键路径长度**：减少关键资源的往返次数
3. **优化加载顺序**：先渲染后交互

### 2.2 资源预加载（A8）

利用浏览器空闲时间提前获取资源：

| 指令 | 用途 | 优先级 |
|------|------|--------|
| `<link rel="preload">` | 当前页关键资源（字体、首屏图片、关键 CSS） | 高 |
| `<link rel="modulepreload">` | ES 模块预加载，含依赖解析 | 高 |
| `<link rel="prefetch">` | 下一页可能需要的资源 | 低（空闲时） |

关键用法：首屏 LCP 图片用 `preload` 提前拉取，避免被 JS/CSS 排队延迟。

### 2.3 代码分割（A10）

首屏 JS 体积直接决定解析和执行时间：

- **Entry Points 分割**：多入口各自打包，适合多页应用
- **自动提取（SplitChunks）**：将 `node_modules` 中的共享依赖提取为独立 chunk，利用缓存
- **动态导入（Dynamic Import）**：`import()` 按需加载非首屏组件，是 SPA 减少首屏 bundle 的核心手段

首屏只加载渲染所需的最小 JS 集合，其余一律延迟。

### 2.4 Tree Shaking（A11）

即使分割了 chunk，单个模块内仍可能携带死代码：

- ESM 的 `import`/`export` 是静态声明，打包工具可在编译期确定哪些导出未被引用
- `usedExports` 标记未引用导出 → 后续压缩阶段删除
- `package.json` 中的 `sideEffects: false` 告诉打包工具整个模块无副作用，可安全跳过未引用部分

Tree Shaking 与 Code Splitting 配合，将首屏 JS 压到理论最小值。

---

## 三、渲染与绘制：像素上屏

资源就绪后，浏览器进入实际渲染阶段。

### 3.1 布局与绘制（A1）

Render Tree 确定后：

- **Layout**：计算每个节点的几何信息（位置、尺寸）
- **Paint**：将节点转换为屏幕上的像素（填充、边框、文字、阴影）
- **Composite**：将多个图层合成最终画面（GPU 加速）

**FCP（First Contentful Paint）** 在第一帧有效像素绘制时触发。要加速 FCP：
- 内联关键 CSS（Critical CSS），避免等待外部 CSS 文件
- 使用 `content-visibility: auto` 跳过视口外内容的渲染
- 避免 JS 直接操作 DOM 导致强制同步布局（Forced Synchronous Layout）

### 3.2 LCP 元素优化

**LCP（Largest Contentful Paint）** 通常是首屏最大的图片或文本块。优化方向：

- LCP 图片用 `<link rel="preload" as="image">` 提前加载
- 使用 `fetchpriority="high"` 提升 LCP 资源优先级
- 避免 LCP 元素被 CSS 或 JS 延迟渲染（如 `visibility: hidden` 的初始状态）

---

## 四、激活与交互：从"可看"到"可用"

像素上屏不等于页面可用。对于 SSR/SSG，服务端返回的 HTML 是静态的，必须通过 **hydration** 将事件监听和状态绑定到 DOM 上，页面才真正可交互。

### 4.1 React Hydration（R2）

React 18 引入两个关键能力：

- **Streaming HTML**：服务端以流式方式发送 HTML，浏览器可以边接收边渲染，减少 TTFB 到 FCP 的间隔
- **Selective Hydration**：通过 `<Suspense>` 边界将页面划分为独立的 hydration 单元，高优先级区域（如导航栏、搜索框）先激活，低优先级区域延迟

这解决了传统 SSR 的核心问题：整个页面必须等全部 JS 下载执行完才能交互。

### 4.2 Vue Hydration（V2）

Vue 3 的编译时优化在 hydration 阶段发挥作用：

- **静态节点标记**：编译器在 SSR 阶段标记纯静态节点，hydration 时直接跳过这些节点的对比，减少客户端工作量
- **Lazy Hydration（3.5+）**：类似 React 的 Selective Hydration，按需延迟非关键组件的激活

### 4.3 框架级 SSR 策略（N1）

Next.js 和 Nuxt.js 提供三种渲染模式，适用于不同场景：

| 模式 | 适用场景 | 首屏特点 |
|------|----------|----------|
| **SSR** | 高度动态内容 | HTML 即时生成，hydration 后可交互 |
| **SSG** | 内容稳定的页面 | 预渲染 HTML 由 CDN 直接分发，FCP 最快 |
| **ISR** | 内容偶尔更新 | 静态分发 + 后台增量更新，兼顾速度与新鲜度 |

Next.js App Router 进一步将数据获取下沉到**服务端组件**级别，服务端组件的 JS 不发送到客户端，从根本上减少 hydration 需要处理的代码量。

---

## 全链路优化检查清单

| 阶段 | 优化手段 | 影响指标 |
|------|----------|----------|
| 网络层 | CDN 边缘分发、DNS 智能解析 | TTFB |
| HTML 获取 | 强缓存 / 协商缓存 / stale-while-revalidate | TTFB |
| 资源发现 | preload 关键资源、prefetch 下一页资源 | FCP / LCP |
| JS 体积 | Code Splitting + Tree Shaking | FCP / TTI |
| 渲染阻塞 | Critical CSS 内联、defer/async JS | FCP |
| 绘制优化 | content-visibility、避免强制布局 | FCP |
| LCP 元素 | preload + fetchpriority="high" | LCP |
| 水合激活 | Streaming SSR、Selective/Lazy Hydration | TTI |

---

## 总结

首屏白屏不是单一环节的问题，而是一条从网络到像素再到交互的完整链路。每个环节的优化都有明确的理论基础和工程手段：

1. **网络层**用 CDN + 缓存策略压缩 TTFB（A6, A7）
2. **资源层**用预加载 + 分割 + 摇树压缩关键路径（A8, A9, A10, A11）
3. **渲染层**遵循 CRP 原则加速像素上屏（A1, A9）
4. **激活层**用流式 SSR + 选择性 hydration 缩短不可交互时间（R2, V2, N1）

SSR/SSG/SPA 三种模式在这条链路上各有侧重：SPA 需要在资源层下重功夫，SSR 在激活层需要精细控制，SSG 则在 HTML 获取阶段天然占优。理解这条链路，就能针对具体场景找到最短的优化路径。
