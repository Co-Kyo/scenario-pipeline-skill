# SSR/Hydration 原理

> ID: A11 | 扇出: 1/8 | 耦合度: 3 | 战略价值: 0.33 | 🏕️ 三级能力

## 核心机制

**SSR（Server-Side Rendering）**：服务端将组件渲染为 HTML 字符串，发送给浏览器。

```
服务端：组件 → renderToString() → HTML 字符串 → HTTP 响应
浏览器：接收 HTML → 显示内容（此时不可交互）→ 加载 JS → Hydration → 可交互
```

**Hydration（激活/注水）**：浏览器端 JS 接管服务端渲染的 HTML，绑定事件监听器，恢复组件状态。Hydration 完成前页面"看起来正常但点击无反应"。

**流式渲染（Streaming SSR）**：`renderToNodeStream()` 分块传输 HTML，浏览器可以逐步渲染，减少 TTFB → FCP 的时间。

**Selective Hydration（React 18+）**：优先 hydrate 用户交互的组件，其他组件延迟 hydrate，减少可交互时间。

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|---------|---------|---------|---------|
| 1 | Hydration 不匹配 | 服务端和客户端渲染结果不一致 | 控制台警告 + 全量重新渲染 | 浏览器控制台 warning | 确保 SSR/CSR 输出一致，避免 typeof window 判断 |
| 2 | Hydration 阻塞交互 | 首屏 JS 过大导致 Hydration 时间长 | FCP 快但 TTI 慢 | Lighthouse → TTI | 延迟 Hydration，拆分非关键交互的 Hydration |
| 3 | 服务端内存泄漏 | SSR 时全局状态未清理 | Node.js 内存持续增长 | process.memoryUsage() | 请求级状态隔离，避免全局单例 |

## 典型权衡

| 维度 | 方案 A | 方案 B | 选择建议 |
|------|--------|--------|---------|
| 渲染策略 | SSR（首屏快，但服务端开销大）| SSG（构建时生成，无服务端开销）| 内容不常变用 SSG，个性化内容用 SSR |
| Hydration 策略 | 全量 Hydration（简单但阻塞）| Selective Hydration（精细但复杂）| React 18+ 用 Selective Hydration |

## 参考资料

- [T1] Vue SSR: https://vuejs.org/guide/scaling-up/ssr.html
- [T1] React Server DOM: https://react.dev/reference/react-dom/server
