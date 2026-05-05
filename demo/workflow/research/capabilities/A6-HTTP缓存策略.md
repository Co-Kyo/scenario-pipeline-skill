# A6 - HTTP 缓存策略

## 核心机制

HTTP 缓存分为**强缓存**和**协商缓存**两层，是前端性能优化最基础也最有效的手段。

### 强缓存（Strong Cache）

强缓存命中时，浏览器直接使用本地缓存，不发送网络请求。

- **`Cache-Control: max-age=N`**：响应在生成后 N 秒内为 fresh 状态，可直接复用。这是最核心的缓存指令，计算基准是服务器生成时间（非客户端接收时间），需减去中间缓存的 `Age` 值。
- **`Cache-Control: s-maxage=N`**：仅对共享缓存（CDN、代理）生效，覆盖 `max-age`，私有缓存忽略。
- **`Cache-Control: immutable`**：标记资源内容永不变（如带 hash 的静态文件），浏览器在 fresh 期间不会发起条件请求。
- **`Expires: <date>`**：旧式过期时间头，已被 `max-age` 取代，存在时钟偏差问题。

### 协商缓存（Revalidation）

强缓存过期（stale）后，浏览器发起条件请求验证资源是否更新：

- **`ETag` / `If-None-Match`**：服务器返回资源的唯一标识（内容 hash 或版本号）。浏览器下次请求携带 `If-None-Match: <etag>`，服务器对比匹配则返回 `304 Not Modified`。
  - 强 ETag：字节级完全一致（`"abc123"`）
  - 弱 ETag：语义等价（`W/"abc123"`），允许微小差异
- **`Last-Modified` / `If-Modified-Since`**：基于最后修改时间的验证，精度为秒级，是 ETag 的降级方案。

### 关键缓存指令

| 指令 | 含义 |
|------|------|
| `no-cache` | 允许缓存但每次使用前必须验证（常被误解为"不缓存"） |
| `no-store` | 禁止任何缓存存储 |
| `private` | 仅允许私有缓存（浏览器），禁止代理/CDN 缓存 |
| `public` | 允许共享缓存存储，即使响应带认证信息 |
| `must-revalidate` | stale 后必须向源站验证，不可使用过期缓存 |
| `stale-while-revalidate=N` | stale 后 N 秒内先返回旧缓存，后台异步验证 |

### 启发式缓存（Heuristic Caching）

当响应没有 `Cache-Control` 时，浏览器会根据 `Last-Modified` 自动推算缓存时间（通常为 `(Date - Last-Modified) * 10%`）。这是 HTTP 规范的兜底机制，**所有响应都应显式指定 `Cache-Control`**。

## 工程瓶颈

1. **缓存失效困难**：带 hash 的静态资源可设长期缓存，但 HTML 入口文件的缓存策略难以平衡——缓存太久导致更新不及时，不缓存则每次请求。
2. **`no-cache` 语义误解**：团队常将 `no-cache` 当作"不缓存"使用，实际上它允许存储只是要求每次都验证，浪费了条件请求的开销。
3. **CDN 缓存与浏览器缓存不同步**：CDN 的 `s-maxage` 和浏览器的 `max-age` 独立管理，可能出现 CDN 已失效但浏览器仍使用旧缓存的情况。
4. **个性化内容泄露**：错误地将含用户信息的响应标记为 `public`，导致代理/CDN 缓存了个人数据，其他用户可能获取到。
5. **Vary 头导致缓存碎片化**：`Vary: Accept-Encoding, User-Agent` 等会导致同一资源因请求头不同而产生大量缓存副本。

## 调试工具

- **Chrome DevTools → Network 面板**：查看每条请求的缓存状态（`from memory cache` / `from disk cache` / `304`）
- **Chrome DevTools → Application → Cache Storage**：查看 Service Worker 缓存
- **`curl -I <url>`**：直接查看响应头中的 `Cache-Control`、`ETag`、`Last-Modified`
- **WebPageTest**：瀑布图中可观察缓存命中情况
- **Lighthouse**：审计项 "Serve static assets with an efficient cache policy"

## 典型权衡

1. **缓存时长 vs 更新及时性**：带 hash 的静态资源设 `max-age=31536000`（1 年）无风险，但 HTML 入口通常设 `no-cache` 或短 `max-age`（如 5 分钟），需配合版本发布机制。
2. **ETag 精度 vs 服务器开销**：强 ETag 需要计算完整内容 hash，对大文件有 CPU 开销；弱 ETag 或 `Last-Modified` 开销更低但精度下降。
3. **`stale-while-revalidate` vs `must-revalidate`**：前者用户体验更好（不阻塞），但可能短暂展示过期内容；后者保证一致性但增加延迟。

## 最小验证实验

```bash
# 1. 启动一个带 Cache-Control 的静态服务
npx serve -s ./public --cors

# 2. 首次请求，观察响应头
curl -I http://localhost:3000/index.html
# 观察 Cache-Control、ETag、Last-Modified

# 3. 再次请求，携带条件请求头
curl -I -H 'If-None-Match: "<etag值>"' http://localhost:3000/index.html
# 预期返回 304 Not Modified

# 4. 在 Chrome DevTools Network 面板中勾选 "Disable cache" 对比
```

## 参考资料

- [MDN: HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)
- [MDN: Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
- [MDN: ETag](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag)
- [MDN: Conditional Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests)
- [RFC 9111: HTTP Caching](https://httpwg.org/specs/rfc9111.html)
- [web.dev: HTTP Cache](https://web.dev/articles/http-cache)
