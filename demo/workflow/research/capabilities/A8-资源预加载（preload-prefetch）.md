# A8 - 资源预加载（preload / prefetch / modulepreload）

## 概述

资源预加载是通过 `<link rel="preload">`、`<link rel="prefetch">`、`<link rel="modulepreload">` 等声明式提示，让浏览器提前获取资源以优化加载性能的机制。它们分别服务于**当前页面**、**未来导航**和**ES 模块**三种场景，是 Critical Rendering Path 优化的重要工具。

## 核心机制

### 1. `<link rel="preload">`

**语义**：当前页面**立即需要**的资源，浏览器应在主渲染机制启动前尽早获取。

```html
<link rel="preload" href="critical.js" as="script">
<link rel="preload" href="font.woff2" as="font" crossorigin>
<link rel="preload" href="hero.webp" as="image" type="image/webp">
```

**核心特性**：
- **优先级高**：浏览器以高优先级发起请求（等同于发现时的自然优先级）
- **不阻塞渲染**：preload 本身不阻塞 HTML 解析或渲染
- **不执行资源**：只下载，不自动应用。JS 不会自动执行，CSS 不会自动应用
- **缓存复用**：preload 获取的资源存入缓存，后续 `<script>` 或 `<link rel="stylesheet">` 引用时直接复用
- **`as` 属性必须**：告诉浏览器资源类型，用于设置正确的请求头、CSP 策略和优先级
- **CORS 跨域**：跨域字体和 fetch 资源需要 `crossorigin` 属性

**`as` 属性可选值**：

| 值 | 对应资源类型 |
|----|------------|
| `style` | CSS 样式表 |
| `script` | JavaScript |
| `font` | 字体文件 |
| `image` | 图片 |
| `fetch` | fetch/XHR 资源（JSON、ArrayBuffer 等） |
| `track` | WebVTT 字幕文件 |
| `audio` / `video` / `document` | 多媒体和文档 |

**加载失败处理**：
- 如果 preload 的资源在 3 秒内未被使用，Chrome DevTools 会发出警告
- preload 的 `onload` / `onerror` 事件可用于检测加载状态

### 2. `<link rel="prefetch">`

**语义**：**未来导航或后续交互**可能需要的资源，浏览器在**空闲时**以**最低优先级**获取。

```html
<link rel="prefetch" href="/next-page.js">
<link rel="prefetch" href="/api/user-data.json">
```

**与 preload 的关键区别**：

| 特性 | preload | prefetch |
|------|---------|----------|
| 用途 | 当前页面需要 | 未来页面可能需要 |
| 优先级 | 高 | 最低 |
| 时机 | 立即 | 空闲时 |
| 缓存作用域 | 当前页面 | 跨导航持久化 |
| `as` 属性 | 必需 | 可选（建议指定） |
| 适用场景 | 关键 CSS/JS/字体 | 下一页的资源、懒加载内容 |

**注意事项**：
- prefetch 的资源优先级低于页面当前资源，不会与关键资源竞争带宽
- 在慢速网络或高负载时，浏览器可能完全忽略 prefetch
- 不保证缓存命中——如果用户未访问目标页面，资源可能被清除

### 3. `<link rel="modulepreload">`

**语义**：专门为 ES 模块设计的预加载机制，提前获取模块及其**静态依赖链**。

```html
<link rel="modulepreload" href="/src/app.js">
<link rel="modulepreload" href="/src/utils.js">
```

**与 `<script type="module">` 的区别**：

| 特性 | script type="module" | modulepreload |
|------|---------------------|---------------|
| 获取 | 解析到标签时才发起请求 | HTML 解析早期立即发起 |
| 依赖发现 | 逐层解析 import 后才知道依赖 | 浏览器可预解析依赖链 |
| 执行 | 下载完立即执行 | 只下载不执行 |

**核心优势**：
- 消除模块依赖的**瀑布式加载**（Waterfall）：传统模块加载需要先下载入口模块，解析 import 语句后才知道需要哪些依赖
- 支持指定依赖：`<link rel="modulepreload" href="app.js" as="script">`
- 比通用 preload 更高效：浏览器知道这是 ES 模块，可以做更精确的优先级调度

### 4. 其他相关 Resource Hints

| Hint | 语义 | 示例 |
|------|------|------|
| `dns-prefetch` | 预解析 DNS | `<link rel="dns-prefetch" href="//cdn.example.com">` |
| `preconnect` | 预建立 TCP+TLS 连接 | `<link rel="preconnect" href="https://api.example.com">` |
| `prerender` | 预渲染整个页面（已废弃，被 Speculation Rules 替代） | — |

### 5. HTTP Headers 方式

除了 HTML 标签，也可以通过 HTTP 响应头声明预加载：

```
Link: </critical.css>; rel=preload; as=style
Link: </font.woff2>; rel=preload; as=font; crossorigin
```

优点：比 HTML 标签更早被浏览器发现（不需要等 HTML 解析到该标签）。

## 工程瓶颈

### 瓶颈1：preload 资源未被使用

- **触发条件**：声明了 preload 但页面中没有对应的使用标签
- **症状**：浪费带宽，Chrome DevTools 警告 "The resource was preloaded using link preload but not used within a few seconds"
- **检测**：Chrome DevTools Console 警告；Coverage 面板
- **缓解**：确保 preload 的每个资源在页面中有对应的 `<script>`、`<link>` 或 CSS `url()` 引用

### 瓶颈2：preload 与实际资源 CORS 模式不匹配

- **触发条件**：preload 跨域字体但未加 `crossorigin`
- **症状**：浏览器发起两次请求（preload 一次、实际使用时因 CORS 不匹配再请求一次）
- **检测**：Network 面板中同一资源出现两次请求
- **缓解**：跨域字体和 fetch 资源必须加 `crossorigin` 属性

### 瓶颈3：prefetch 与当前页面竞争带宽

- **触发条件**：在页面加载初期声明大量 prefetch
- **症状**：当前页面的资源加载变慢
- **检测**：Network 面板中 prefetch 请求与关键资源请求的优先级对比
- **缓解**：prefetch 应在页面加载完成后（`load` 事件后）或使用 JavaScript 动态添加

### 瓶颈4：modulepreload 依赖链未覆盖

- **触发条件**：只 preload 了入口模块，未覆盖其依赖
- **症状**：入口模块加载快，但依赖仍以瀑布式加载
- **检测**：Network 面板中模块加载的瀑布图
- **缓解**：使用构建工具（Webpack/Rollup）自动注入 modulepreload；手动列出关键依赖

### 瓶颈5：过多预加载请求

- **触发条件**：页面声明了大量 preload/prefetch
- **症状**：浏览器请求队列拥塞、关键资源被延迟
- **检测**：Network 面板中请求数量和优先级
- **缓解**：只预加载真正关键的资源（3-5 个以内）；使用 `importance` 属性或 Lighthouse 审计指导

## 调试工具

| 工具 | 用途 |
|------|------|
| Chrome DevTools → Network | 查看 preload/prefetch 请求的优先级、时序、是否被复用 |
| Chrome DevTools → Console | preload 未使用的警告 |
| Chrome DevTools → Coverage | 查看预加载资源的实际使用率 |
| Lighthouse | "Preload key requests" 和 "Preconnect to required origins" 审计 |
| `performance.getEntriesByType('resource')` | 编程式检查资源加载时序 |

## 典型权衡

### 权衡1：preload 数量 vs 带宽竞争

- **多 preload**：更多资源提前可用，减少瀑布等待
- **少 preload**：不与关键资源竞争带宽，请求队列更短
- **实践**：只 preload 首屏渲染阻塞的关键资源（关键 CSS、首屏 JS、Web Font）

### 权衡2：prefetch 提前量 vs 准确性

- **激进 prefetch**：用户大概率会访问的下一页资源
- **保守 prefetch**：只在用户交互（hover/prefetch on interaction）后才 prefetch
- **实践**：结合 Speculation Rules API 实现基于用户行为的智能 prefetch

### 权衡3：modulepreload vs 构建工具代码分割

- **modulepreload**：浏览器原生，零依赖，适合简单项目
- **构建工具**：Webpack/Rollup 自动分析依赖、生成预加载标签、支持动态导入
- **实践**：构建工具自动注入 modulepreload，手动优化仅用于特殊场景

## 最小验证实验

### 实验：对比 preload 的效果

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Preload Demo</title>

  <!-- 有 preload：字体提前加载 -->
  <link rel="preload" href="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2"
        as="font" type="font/woff2" crossorigin>

  <!-- 无 preload：字体直到 CSSOM 构建后才发现 -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap">

  <style>
    body { font-family: 'Roboto', sans-serif; padding: 20px; }
    .test-box {
      font-family: 'Roboto', sans-serif;
      font-size: 24px;
      padding: 20px;
      border: 2px solid #4CAF50;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <h1>Resource Preload 实验</h1>

  <div class="test-box">
    使用 Roboto 字体的文本 — 观察字体加载时机
  </div>

  <h2>手动测试 preload</h2>
  <button onclick="testPreload()">Preload 一个大图片</button>
  <button onclick="testPrefetch()">Prefetch 下一页资源</button>
  <button onclick="clearHints()">清除提示</button>
  <div id="output" style="margin:10px;padding:10px;background:#f5f5f5;font-family:monospace;"></div>

  <script>
    const output = document.getElementById('output');
    function log(msg) {
      output.textContent += new Date().toLocaleTimeString() + ' ' + msg + '\n';
    }

    function testPreload() {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = 'https://picsum.photos/1920/1080';
      link.as = 'image';
      link.onload = () => log('✅ Preload 加载完成');
      link.onerror = () => log('❌ Preload 加载失败');
      document.head.appendChild(link);
      log('已添加 preload: 大图片');

      // 3秒后检查是否被使用
      setTimeout(() => {
        log('⏳ 3秒后 — 检查 Network 面板是否出现未使用警告');
      }, 3000);
    }

    function testPrefetch() {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = '/next-page-data.json';
      document.head.appendChild(link);
      log('已添加 prefetch: /next-page-data.json（最低优先级）');
    }

    function clearHints() {
      document.querySelectorAll('link[rel="preload"], link[rel="prefetch"]')
        .forEach(el => el.remove());
      output.textContent = '';
      log('已清除所有 preload/prefetch 提示');
    }

    // 监控资源加载时序
    window.addEventListener('load', () => {
      const resources = performance.getEntriesByType('resource');
      const fonts = resources.filter(r => r.name.includes('woff'));
      fonts.forEach(f => {
        log(`字体加载: ${f.name.split('/').pop()} — 开始: ${f.startTime.toFixed(0)}ms, 耗时: ${f.duration.toFixed(0)}ms`);
      });
    });
  </script>
</body>
</html>
```

**实验步骤**：
1. 打开 Chrome DevTools → Network，过滤 Font 类型
2. 刷新页面，观察字体文件的请求时序——有 preload 时应该更早发起
3. 点击 "Preload 一个大图片"，观察 Network 面板中图片请求的优先级
4. 等待 3 秒，检查 Console 是否出现未使用警告
5. 使用 Lighthouse 审计 "Preload key requests"

## 参考资料

1. [MDN - rel="preload"](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload)
2. [MDN - rel="modulepreload"](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link)
3. [web.dev - Preload critical assets](https://web.dev/articles/preload-critical-assets)
4. [web.dev - Resource hints](https://web.dev/articles/resource-hints)
5. [W3C Resource Hints Specification](https://w3c.github.io/resource-hints/)
