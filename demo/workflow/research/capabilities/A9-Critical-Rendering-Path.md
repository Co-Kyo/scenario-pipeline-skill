# A9 - Critical Rendering Path（关键渲染路径）

## 概述

Critical Rendering Path（CRP）是浏览器从接收 HTML 字节到将像素绘制到屏幕上的完整过程：**HTML → DOM + CSSOM → Render Tree → Layout → Paint**。理解和优化 CRP 是提升首屏加载速度（FCP/LCP）的核心能力。

## 核心机制

### 1. 字节 → 字符 → Token → 节点 → DOM 树

浏览器接收到 HTML 字节流后的处理链：

```
Bytes → Characters → Tokens → Nodes → DOM Tree
```

- **字节（Bytes）**：网络传输的原始二进制数据
- **字符（Characters）**：根据编码（UTF-8 等）将字节转换为字符
- **Token（令牌）**：HTML Tokenizer 将字符流分割为 StartTag、EndTag、Text 等 Token
- **节点（Node）**：每个 Token 创建对应的 DOM 节点对象
- **DOM 树（DOM Tree）**：节点按标签层级关系组织为树结构

**关键特性**：
- DOM 构建是**增量式**的——边接收边构建
- 遇到 `<script>`（无 async/defer）时**阻塞** HTML 解析
- 遇到外部 CSS `<link>` 时**不阻塞**解析，但**阻塞渲染**

### 2. CSS → CSSOM 树

CSS 字节经过类似的解析链构建 CSSOM（CSS Object Model）：

```
CSS Bytes → CSS Tokens → CSS Nodes → CSSOM Tree
```

**关键特性**：
- CSS 是**渲染阻塞（Render-blocking）**资源
- CSS 解析**非增量式**——必须等全部 CSS 解析完才能构建渲染树
- 原因：CSS 规则可以被后续规则覆盖（级联），必须知道所有规则才能计算最终样式
- CSS 选择器的特异性（Specificity）和继承关系在 CSSOM 中表达

### 3. DOM + CSSOM → Render Tree

渲染树是 DOM 和 CSSOM 的**合并结果**，只包含**可见内容**：

```
DOM Tree + CSSOM Tree → Render Tree
```

**构建规则**：
- 从 DOM 根节点开始遍历
- 对每个节点，从 CSSOM 中查找匹配的 CSS 规则
- `display: none` 的元素**不包含**在渲染树中
- `visibility: hidden` 的元素**包含**在渲染树中（占据空间但不可见）
- `<head>`、`<script>` 等不可见元素不包含
- 伪元素（`::before`、`::after`）作为节点包含在渲染树中

**计算样式（Computed Style）**：
渲染树中每个节点关联一组计算后的样式值。计算过程：
1. 收集所有匹配的 CSS 规则
2. 按特异性（Specificity）排序
3. 处理继承（Inheritance）
4. 解析相对值为绝对值（如 `em` → `px`、`%` → `px`）

### 4. Layout（布局）

渲染树构建完成后，计算每个节点的**几何信息**：

```
Render Tree → Layout → Box Model (x, y, width, height)
```

**计算内容**：
- 盒模型：`content` + `padding` + `border` + `margin`
- 节点在页面中的位置（相对于父节点或视口）
- 文本换行和行高
- 浮动和定位的元素位置

**影响因素**：
- 视口尺寸（`<meta name="viewport">`）
- 设备像素比（Device Pixel Ratio）
- 字体度量（Font Metrics）

### 5. Paint（绘制）

布局完成后，将节点转换为屏幕像素：

```
Layout → Paint → Pixels on Screen
```

**绘制过程**：
- 创建绘制记录（Paint Records）：类似 Canvas 的绘制指令序列
- 按 CSS 层叠上下文（Stacking Context）的顺序绘制
- 绘制分为多个步骤：背景 → 边框 → 轮廓 → 文字 → 阴影等
- 每个步骤对应 `drawRect`、`drawImage`、`drawText` 等操作

**绘制层（Paint Layers）**：
- 某些 CSS 属性（如 `transform`、`opacity`、`will-change`）会创建独立的绘制层
- 每个层独立光栅化（Rasterize）
- 层可以独立重绘，不影响其他层

### 6. Composite（合成）

将多个绘制层合成为最终屏幕图像：

```
Paint Layers → GPU Compositing → Screen
```

**合成特性**：
- 在 GPU 上执行，不阻塞主线程
- `transform` 和 `opacity` 变化只触发合成（最轻量）
- 合成层数量影响 GPU 内存和管理开销

### CRP 时序图

```
          网络请求          解析/构建          渲染
        ┌──────────┐    ┌──────────────┐   ┌─────────┐
HTML:   │ Download │───→│  Build DOM   │──→│         │
        └──────────┘    └──────────────┘   │         │
        ┌──────────┐    ┌──────────────┐   │  Layout │──→ Paint ──→ Composite
CSS:    │ Download │───→│ Build CSSOM  │──→│         │
        └──────────┘    └──────────────┘   │         │
        ┌──────────┐    ┌──────────────┐   │         │
JS:     │ Download │───→│  Execute     │──→│ (可能修改 DOM/CSSOM)│
        └──────────┘    └──────────────┘   └─────────┘
```

### 关键指标

| 指标 | 含义 | 目标 |
|------|------|------|
| **FCP**（First Contentful Paint） | 首次绘制任何内容（文本/图片/Canvas） | < 1.8s |
| **LCP**（Largest Contentful Paint） | 最大内容元素完成绘制 | < 2.5s |
| **TTFB**（Time to First Byte） | 首字节到达时间 | < 800ms |
| **CLS**（Cumulative Layout Shift） | 累积布局偏移 | < 0.1 |

## 工程瓶颈

### 瓶颈1：CSS 阻塞渲染

- **触发条件**：外部 CSS 文件较大或加载慢
- **症状**：白屏时间长、FCP 延迟
- **检测**：Lighthouse "Eliminate render-blocking resources"；Network 面板 CSS 阻塞时间
- **缓解**：
  - 内联关键 CSS（Critical CSS），非关键 CSS 异步加载
  - `<link rel="stylesheet" href="non-critical.css" media="print" onload="this.media='all'">`
  - CSS 文件压缩（minify）、去除未使用 CSS（tree-shaking）

### 瓶颈2：JavaScript 阻塞 DOM 构建

- **触发条件**：`<script>` 无 async/defer，位于 `<head>` 中
- **症状**：DOM 构建暂停等待脚本下载和执行
- **检测**：Performance 面板 "Parse HTML" 中断、Lighthouse "Reduce render-blocking scripts"
- **缓解**：
  - `<script async>` 或 `<script defer>`
  - 代码分割（Code Splitting），只加载首屏需要的 JS
  - 使用 `requestIdleCallback` 延迟非关键脚本

### 瓶颈3：DOM 树过大

- **触发条件**：页面包含数千个 DOM 节点
- **症状**：Layout 和 Paint 耗时随节点数线性增长
- **检测**：`document.querySelectorAll('*').length` 检查节点总数；Lighthouse "Avoid excessive DOM size"
- **缓解**：
  - 虚拟列表（Virtual List）只渲染可视区域
  - `content-visibility: auto` 跳过视口外内容的渲染
  - 按需加载（懒加载图片、动态导入模块）

### 瓶颈4：Web 字体阻塞文本渲染

- **触发条件**：Web 字体加载期间，浏览器默认隐藏使用该字体的文本（FOIT: Flash of Invisible Text）
- **症状**：用户看到空白文字区域，直到字体加载完成
- **检测**：Lighthouse "Ensure text remains visible during webfont load"
- **缓解**：
  - `font-display: swap` 显示备用字体，字体加载完后切换
  - `<link rel="preload">` 提前加载关键字体
  - 使用 `size-adjust`、`ascent-override` 等 CSS 字体度量调整减少 CLS

### 瓶颈5：关键资源链过长

- **触发条件**：关键资源存在依赖链（CSS → 发现字体 → 发现图片）
- **症状**：资源加载呈瀑布式，总时间累加
- **检测**：Network 面板资源加载瀑布图
- **缓解**：
  - `<link rel="preload">` 提前加载链条中的资源
  - `<link rel="preconnect">` 提前建立连接
  - 内联关键 CSS 避免外部请求

## 调试工具

| 工具 | 用途 |
|------|------|
| Chrome DevTools → Performance | 录制完整 CRP 流程，观察各阶段时序 |
| Chrome DevTools → Network | 查看资源加载瀑布图、优先级、阻塞情况 |
| Lighthouse | CRP 综合审计，FCP/LCP/TBT 指标 |
| WebPageTest | 真实设备多地点 CRP 性能测试 |
| `performance.timing` API | 编程式获取各阶段时间戳 |
| `PerformanceObserver` | 监听 FCP/LCP/CLS 等 Web Vitals |
| Coverage 面板 | 查看 CSS/JS 的使用率 |

## 典型权衡

### 权衡1：Critical CSS 内联 vs 外链缓存

- **内联**：消除 CSS 阻塞，FCP 更快，但 HTML 体积增大，无法缓存
- **外链**：可缓存、可并行下载，但阻塞渲染
- **实践**：首屏关键 CSS 内联（通常 < 14KB），其余外链 + preload

### 权衡2：服务端渲染（SSR）vs 客户端渲染（CSR）

- **SSR**：HTML 包含首屏内容，FCP/LCP 更快，但 TTFB 可能增大、服务端负载高
- **CSR**：服务端返回空壳 HTML，由 JS 渲染，TTFB 快但 FCP 慢
- **实践**：首屏关键内容 SSR，交互部分 CSR（Streaming SSR / Islands Architecture）

### 权衡3：代码分割粒度

- **粗粒度**：打包成少量大文件，HTTP 请求少但首次加载量大
- **细粒度**：打包成大量小文件，按需加载但 HTTP 请求多、瀑布延迟
- **实践**：路由级分割 + 关键路径预加载；小模块合并减少请求数

## 最小验证实验

### 实验：观察完整 CRP 流程

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CRP Demo</title>

  <!-- 关键 CSS 内联 -->
  <style>
    body { font-family: system-ui, sans-serif; margin: 20px; }
    .hero {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; padding: 40px; border-radius: 12px;
      font-size: 24px; text-align: center;
    }
    .metric { padding: 8px; margin: 4px 0; background: #f5f5f5; border-radius: 4px; font-family: monospace; }
  </style>

  <!-- 模拟阻塞渲染的外部 CSS -->
  <style>
    /* 模拟较大 CSS — 生产中应异步加载 */
    .card { border: 1px solid #ddd; padding: 16px; margin: 8px 0; border-radius: 8px; }
    .card-title { font-weight: bold; font-size: 18px; }
    .card-body { color: #666; margin-top: 8px; }
  </style>
</head>
<body>
  <h1>Critical Rendering Path 实验</h1>

  <div class="hero">CRP 各阶段时间测量</div>

  <div id="metrics"></div>

  <div id="content"></div>

  <!-- 阻塞脚本：模拟 JS 阻塞 DOM 解析 -->
  <script>
    const domStart = performance.now();
    // 模拟耗时操作
    const blockStart = performance.now();
    while (performance.now() - blockStart < 50) {} // 阻塞 50ms
    console.log('Blocking script executed');
  </script>

  <!-- defer 脚本：不阻塞 DOM 解析 -->
  <script defer>
    console.log('Deferred script executed — DOM is ready');
  </script>

  <!-- 在 DOM 解析完成后测量 CRP 各阶段 -->
  <script>
    window.addEventListener('load', () => {
      const t = performance.timing;
      const metrics = document.getElementById('metrics');

      const data = [
        ['DNS 查询', t.domainLookupEnd - t.domainLookupStart],
        ['TCP 连接', t.connectEnd - t.connectStart],
        ['请求/响应 (TTFB)', t.responseStart - t.requestStart],
        ['响应下载', t.responseEnd - t.responseStart],
        ['DOM 解析', t.domInteractive - t.responseEnd],
        ['DOMContentLoaded', t.domContentLoadedEventEnd - t.navigationStart],
        ['页面完全加载', t.loadEventEnd - t.navigationStart],
      ];

      metrics.innerHTML = data.map(([label, ms]) =>
        `<div class="metric">${label}: <strong>${ms}ms</strong></div>`
      ).join('');

      // 使用 PerformanceObserver 观测 FCP
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              metrics.innerHTML += `<div class="metric">FCP: <strong>${entry.startTime.toFixed(0)}ms</strong></div>`;
            }
          }
        });
        observer.observe({ type: 'paint', buffered: true });
      }

      // 观测 LCP
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          metrics.innerHTML += `<div class="metric">LCP: <strong>${last.startTime.toFixed(0)}ms</strong></div>`;
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      }
    });
  </script>
</body>
</html>
```

**实验步骤**：
1. 打开 Chrome DevTools → Performance 面板
2. 勾选 "Screenshots" 和 "Web Vitals"
3. 刷新页面录制，观察：
   - 火焰图中的 Parse HTML、Evaluate Script、Recalculate Style、Layout、Paint 各阶段
   - 阻塞脚本（50ms）对 DOM 解析的影响
   - defer 脚本在 DOM 解析完成后执行
4. 查看页面上显示的各阶段时间指标
5. 使用 Lighthouse 审计，关注 FCP 和 LCP 指标
6. 在 Network 面板中观察资源加载的瀑布图

## 参考资料

1. [MDN - Critical Rendering Path](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path)
2. [web.dev - Critical Rendering Path](https://web.dev/articles/critical-rendering-path)
3. [web.dev - Render-tree construction, layout, and paint](https://web.dev/articles/critical-rendering-path/render-tree-construction)
4. [web.dev - DOM](https://web.dev/articles/critical-rendering-path/constructing-the-object-model)
5. [Google Developers - Critical Rendering Path](https://developers.google.com/web/fundamentals/performance/critical-rendering-path)
6. [MDN - Web Performance](https://developer.mozilla.org/en-US/docs/Web/Performance)
