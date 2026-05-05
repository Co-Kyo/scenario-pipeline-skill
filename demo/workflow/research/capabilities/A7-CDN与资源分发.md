# A7 - CDN 与资源分发

## 核心机制

CDN（Content Delivery Network，内容分发网络）通过在全球部署边缘节点服务器，将源站内容缓存到离用户最近的节点，减少网络延迟和源站压力。

### 基本工作流程

1. **DNS 解析**：用户请求域名时，CDN 的智能 DNS 根据用户 IP 地理位置、网络状况，将解析指向最近的边缘节点（CNAME 方式）。
2. **边缘节点响应**：如果边缘节点有缓存（cache hit），直接返回；没有则向上层节点或源站回源（cache miss / origin fetch）。
3. **回源与缓存填充**：边缘节点从源站获取资源后缓存本地，后续相同请求直接命中。

### 多域名并发（Domain Sharding 的演进）

- **HTTP/1.1 时代**：浏览器对同一域名有 6-8 个并发连接限制，通过将资源分散到多个子域名（`static1.example.com`、`static2.example.com`）突破限制。
- **HTTP/2 时代**：单连接多路复用解决了队头阻塞，多域名反而增加 DNS 解析和 TCP 连接开销，应**回归单域名**。
- **现代策略**：使用 CDN 的单域名 + HTTP/2/3，必要时用 `<link rel="preconnect">` 预连接。

### 边缘缓存策略

- **Push CDN**：主动将内容推送到边缘节点（适合已知热点内容）
- **Pull CDN**：首次请求时从源站拉取并缓存（更常见，自动按需缓存）
- **缓存键设计**：默认以 URL 为键，可通过 `Vary` 头、Query String、Cookie 等维度细分
- **Purge/Invalidation**：通过 API、Dashboard 或 TTL 过期清除缓存

### 与 HTTP 缓存的协作

CDN 作为共享缓存，遵循 HTTP 缓存语义：
- `Cache-Control: s-maxage=3600` 控制 CDN 缓存时长
- `Cache-Control: public` 允许 CDN 缓存（即使响应含 `Authorization` 头）
- `CDN-Cache-Control`（RFC 9213）：CDN 专属缓存指令，不影响浏览器
- `Surrogate-Control`：部分 CDN（如 Akamai）的私有指令

## 工程瓶颈

1. **缓存一致性问题**：多级缓存（浏览器 → CDN → 源站）导致更新延迟，`Purge` 操作传播到所有节点需要时间，可能出现新旧版本不一致。
2. **动态内容无法缓存**：API 接口、个性化内容不适合 CDN 缓存，需要区分静态/动态路由策略。
3. **回源风暴（Origin Storm）**：大量缓存同时过期时，瞬间大量请求穿透到源站，需要设置 `stale-while-revalidate` 或错开 TTL。
4. **HTTPS 证书管理**：每个 CDN 边缘节点需要配置 SSL/TLS 证书，多域名场景下证书管理复杂。
5. **跨区域一致性**：全球 CDN 节点的缓存刷新不同步，不同地区用户可能看到不同版本。

## 调试工具

- **`dig <domain>`**：查看 CNAME 解析链，确认 CDN 生效
- **`curl -I <url>`**：查看 `X-Cache`、`X-Cache-Hit`、`Age`、`CF-Ray`（Cloudflare）等 CDN 响应头
- **CDN Dashboard**：各厂商控制台查看命中率、带宽、回源率
- **WebPageTest**：多地域测试，观察 TTFB 差异
- **Chrome DevTools → Network**：查看 `cf-cache-status`、`x-cache` 等

## 典型权衡

1. **缓存时长 vs 一致性**：长缓存减少回源但更新慢，短缓存保证一致性但增加源站压力。最佳实践：静态资源带 hash 长期缓存 + HTML 短缓存或不缓存。
2. **全球覆盖 vs 成本**：更多边缘节点 = 更低延迟 = 更高费用。需根据用户分布选择合适的 CDN 区域覆盖。
3. **安全 vs 性能**：CDN 层可做 WAF、DDoS 防护，但增加一层代理也增加了一层攻击面和故障点。

## 最小验证实验

```bash
# 1. 解析 CDN 域名，观察 CNAME 链
dig cdn.example.com +short
# 预期看到 CDN 厂商域名（如 xxx.cloudfront.net）

# 2. 查看 CDN 缓存头
curl -I https://cdn.example.com/assets/app.js
# 观察 x-cache / cf-cache-status / age 等头

# 3. 连续请求两次，第二次应命中缓存
curl -I https://cdn.example.com/assets/app.js  # Miss
curl -I https://cdn.example.com/assets/app.js  # Hit

# 4. 对比不同地域 TTFB（使用 WebPageTest 选择多地测试）
```

## 参考资料

- [MDN: CDN](https://developer.mozilla.org/en-US/docs/Glossary/CDN)
- [MDN: HTTP Caching - Managed caches](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching#managed_caches)
- [RFC 9213: CDN-Cache-Control](https://httpwg.org/specs/rfc9213.html)
- [web.dev: CDN](https://web.dev/articles/content-delivery-networks)
- [Cloudflare: What is a CDN](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/)
