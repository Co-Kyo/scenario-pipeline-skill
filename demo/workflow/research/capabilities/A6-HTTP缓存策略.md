# HTTP 缓存策略

> ID: A6 | 扇出: 3/8 | 耦合度: 1 | 战略价值: 3.0 | 累积价值: 5.0 | ⛰️ 二级高地

## 核心机制

HTTP 缓存分为**强缓存**和**协商缓存**两层：

**强缓存**（不发请求，直接用缓存）：
- `Cache-Control: max-age=31536000`（相对时间，优先级高）
- `Expires: Thu, 01 Jan 2026 00:00:00 GMT`（绝对时间，已过时）
- 命中时返回 200 (from disk cache)，不发网络请求

**协商缓存**（发请求验证，未变则用缓存）：
- `Last-Modified` / `If-Modified-Since`（精度：秒级）
- `ETag` / `If-None-Match`（精度：内容哈希，优先级更高）
- 命中时返回 304 Not Modified

**CDN 缓存协作**：
```
浏览器 → CDN 边缘节点 → CDN 源站 → 业务服务器
  强缓存    CDN 缓存       回源验证
```

**最佳实践**：
- HTML 文件：`Cache-Control: no-cache`（每次都协商缓存，保证最新）
- 带 hash 的静态资源：`Cache-Control: max-age=31536000, immutable`（永久缓存）
- API 响应：`Cache-Control: no-store`（不缓存）

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|---------|---------|---------|---------|
| 1 | 缓存失效导致全量回源 | 部署时未正确更新 hash 或 Cache-Control 配置错误 | 用户看到旧版本或每次都重新下载 | Network 面板 → 检查 from disk cache / 304 | 文件名带 contenthash，HTML 用 no-cache |
| 2 | CDN 缓存与浏览器缓存不一致 | CDN 更新了但浏览器强缓存未过期 | 部分用户看到新版本，部分看到旧版本 | 不同用户对比 Network 面板 | 静态资源用 hash 文件名 + 长期缓存 |
| 3 | 协商缓存回源风暴 | 大量请求同时触发协商缓存验证 | 源站 QPS 飙高 | 服务端监控 | CDN 层加缓存 TTL，避免全部回源 |
| 4 | Service Worker 缓存策略错误 | SW 缓存了不该缓存的动态内容 | 用户看到过期数据 | Application 面板 → Cache Storage | 区分静态资源（Cache First）和 API（Network First）|

## 调试工具

| 工具 | 用法 |
|------|------|
| Network 面板 | 检查每个请求的缓存状态：from disk cache / from service worker / 304 |
| Application 面板 → Cache Storage | 查看 Service Worker 缓存内容 |
| `curl -I` | 检查响应头中的 Cache-Control / ETag / Last-Modified |

## 典型权衡

| 维度 | 方案 A | 方案 B | 选择建议 |
|------|--------|--------|---------|
| 静态资源缓存 | 长期缓存 + hash 文件名（最优性能，但需构建工具支持）| no-cache 协商缓存（简单但每次请求）| 构建工具完善的项目用 hash 文件名 |
| API 缓存 | SW 缓存 + Stale-While-Revalidate（离线可用，但可能过期）| 每次网络请求（最新但无离线）| 非实时性 API 可用 SW 缓存 |

## 参考资料

- [T1] MDN: HTTP Caching: https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
- [T2] web.dev: HTTP Cache: https://web.dev/articles/http-cache
