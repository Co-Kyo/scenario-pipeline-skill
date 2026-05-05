# A18 - HTTP/2 多路复用

## 核心机制

HTTP/2 是 HTTP 协议的重大修订版本（基于 Google 的 SPDY 协议），核心目标是降低延迟和解决队头阻塞（Head-of-Line Blocking）。

### 二进制分帧层（Binary Framing Layer）

HTTP/2 引入了二进制分帧层，将通信分解为更小的消息和帧：

- **消息（Message）**：对应 HTTP 请求或响应，由一个或多个帧组成
- **帧（Frame）**：最小通信单位，包含帧头（9 字节）和载荷。每帧都标记了所属的 Stream ID
- HTTP/1.x 的文本格式被替换为二进制格式，解析更高效

### 多路复用（Multiplexing）

- 在**单个 TCP 连接**上并行传输多个请求和响应
- 每个请求/响应被拆分为帧，通过 Stream ID 标识归属
- 不同 Stream 的帧可以交错发送，在接收端重新组装
- 彻底解决了 HTTP/1.1 的应用层队头阻塞（同一连接上请求必须排队）

### 头部压缩（HPACK）

- HTTP/1.x 中每个请求都携带完整头部（含大量重复的 Cookie、User-Agent 等），浪费带宽
- HPACK 算法维护一个**静态表 + 动态表**，将常见头部映射为索引号
- 未匹配的头部通过 **Huffman 编码**压缩
- 相比 HTTP/1.x，头部大小可减少 80%+

### 服务端推送（Server Push）— 已废弃

- 服务器可主动推送客户端即将需要的资源（如 HTML 中引用的 CSS/JS）
- **已被主流浏览器移除**（Chrome 106+），原因：
  - 推送的资源可能已在浏览器缓存中，造成浪费
  - 实现复杂，难以精确控制推送时机
- 替代方案：`<link rel="preload">` 和 `103 Early Hints`

### 流优先级（Stream Prioritization）

- 客户端可为每个流指定优先级和依赖关系
- 服务器据此调度资源分配（如优先发送 CSS 而非图片）
- 实际实现中各家浏览器行为不一致，HTTP/3 中已被简化

### 不修改 HTTP 语义

- HTTP/2 不改变 HTTP 方法、状态码、URI、头部字段等语义
- 所有现有应用无需修改即可在 HTTP/2 上运行
- 复杂性被封装在分帧层内部

## 工程瓶颈

1. **TCP 层队头阻塞仍在**：虽然应用层解决了队头阻塞，但 TCP 层的丢包重传仍会阻塞该连接上的所有流。一个丢包 → 整个连接暂停。这是 HTTP/3 要解决的问题。
2. **单连接瓶颈**：所有流量走一个 TCP 连接，在高丢包网络环境下反而不如 HTTP/1.x 的多连接表现。拥塞控制算法成为关键。
3. **服务端推送实践困难**：推送时机难以准确判断，可能推送已缓存资源浪费带宽；推送策略与缓存策略的协调复杂。
4. **调试复杂度增加**：二进制帧对人不可读，需要专用工具（如 Wireshark 解码 h2 帧）才能排查问题。
5. **中间设备兼容性**：部分旧代理、防火墙不能正确处理 HTTP/2 的二进制帧，需要 TLS 回退。

## 调试工具

- **Chrome DevTools → Network → Protocol 列**：显示 `h2` 确认 HTTP/2 生效
- **Chrome DevTools → Network → 查看 Connection ID**：同一连接的请求共享 Connection ID
- **Wireshark**：解码 HTTP/2 二进制帧，分析 Stream 分配
- **`curl --http2 -I <url>`**：验证服务器 HTTP/2 支持
- **h2load / nghttp2**：HTTP/2 专用压测工具
- **Lighthouse**：审计项 "Uses HTTP/2"

## 典型权衡

1. **单连接 vs 多连接**：HTTP/2 理论上单连接即可，但在高丢包网络下，Chrome 等浏览器仍会建立多个连接（fuzzy multiplexing）作为优化。
2. **HPACK 动态表大小 vs 内存占用**：动态表越大压缩效果越好，但消耗更多内存。在代理链中每层都需要维护表，增加内存压力。
3. **流优先级 vs 实现复杂度**：优先级模型理论上很强大，但实际浏览器和服务端实现差异大，HTTP/3 简化为仅使用权重。

## 最小验证实验

```bash
# 1. 验证网站是否支持 HTTP/2
curl --http2 -sI https://www.google.com | head -1
# 预期看到 HTTP/2 200

# 2. 在 Chrome DevTools 中观察多路复用
# 打开 Network 面板，添加 Protocol 列，加载一个页面
# 观察多个请求共享同一 h2 连接

# 3. 对比 HTTP/1.1 和 HTTP/2 的加载瀑布图
# 使用 WebPageTest，观察 HTTP/1.1 的串行 vs HTTP/2 的并行
```

## 参考资料

- [MDN: HTTP/2](https://developer.mozilla.org/en-US/docs/Glossary/HTTP_2)
- [RFC 9113: HTTP/2](https://httpwg.org/specs/rfc9113.html)
- [web.dev: HTTP/2](https://web.dev/articles/performance-http2)
- [High Performance Browser Networking - HTTP/2](https://hpbn.co/http2/)
