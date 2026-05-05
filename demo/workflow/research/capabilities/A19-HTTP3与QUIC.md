# A19 - HTTP/3 与 QUIC

## 核心机制

HTTP/3 是 HTTP 协议的第三代版本，基于 Google 开发的 QUIC 协议运行在 UDP 之上，解决了 HTTP/2 遗留的 TCP 层队头阻塞问题。

### QUIC 协议

QUIC（Quick UDP Internet Connections）是 HTTP/3 的传输层基础：

- **基于 UDP**：绕过操作系统内核中 TCP 的限制，实现在用户空间实现传输控制
- **集成 TLS 1.3**：QUIC 将加密握手与传输握手合并，TCP + TLS 需要 3 个 RTT 才能开始传输数据，QUIC 只需 **1 个 RTT**（首次连接）甚至 **0 个 RTT**（再次连接）
- **连接迁移**：QUIC 使用 Connection ID 标识连接而非 IP+Port，网络切换（如 WiFi → 4G）时连接不断开

### 消除队头阻塞

- HTTP/2 的问题：虽然应用层多路复用，但底层 TCP 将所有流视为单一字节流，一个包丢失会阻塞所有流
- HTTP/3 的解决：QUIC 在传输层为每个流独立管理丢包检测和重传，**一个流的丢包不影响其他流**
- 这对高延迟、高丢包的移动网络场景改善显著

### 0-RTT 连接建立

- **首次连接**：客户端发送 Initial 包（含 ClientHello），服务端回复 Handshake 包，1 个 RTT 完成握手
- **再次连接（0-RTT）**：客户端可在首个包中携带应用数据（Early Data），无需等待握手完成
- **安全风险**：0-RTT 数据存在重放攻击风险，应仅用于幂等请求（GET）

### 头部压缩（QPACK）

- HTTP/2 的 HPACK 依赖流的有序到达，在 QUIC 的独立流模型下不适用
- QPACK 使用**编码器流 + 解码器流**单独传输动态表更新，避免阻塞
- 保持了高压缩率，同时适配 QUIC 的无序特性

### 与 HTTP/2 的对比

| 维度 | HTTP/2 | HTTP/3 |
|------|--------|--------|
| 传输层 | TCP | QUIC (UDP) |
| 队头阻塞 | TCP 层仍存在 | 完全消除 |
| 握手 RTT | TCP 1-3 + TLS 1-2 = 2-5 RTT | 1 RTT（首次）/ 0 RTT（重连） |
| 连接迁移 | 不支持（IP+Port 变化断开） | 支持（Connection ID） |
| 头部压缩 | HPACK | QPACK |
| 服务端推送 | 已废弃 | 支持但同样不推荐 |

## 工程瓶颈

1. **UDP 受限**：部分企业网络、运营商对 UDP 有限制或 QoS 降级，导致 QUIC 连接失败需要回退到 TCP。Chrome 默认回退时间为 300ms。
2. **服务端实现门槛高**：QUIC 在用户空间实现，缺少内核级优化，CPU 消耗比 TCP 高。Nginx 从 1.25 开始支持，但生态不如 TCP 成熟。
3. **0-RTT 重放攻击**：Early Data 可被恶意重放，服务端必须保证 0-RTT 数据的幂等性。
4. **调试困难**：UDP 流量被中间设备丢弃或限速时难以排查；Wireshark 解密 QUIC 需要 NSS key log。
5. **CDN 支持不均匀**：主流 CDN（Cloudflare、Akamai）已支持，但边缘节点覆盖和回源链路的 QUIC 支持参差不齐。

## 调试工具

- **Chrome DevTools → Network → Protocol 列**：显示 `h3` 确认 HTTP/3 生效
- **`curl --http3 -I <url>`**（需要编译带 HTTP/3 支持的 curl）
- **Wireshark**：解码 QUIC 帧（需要配置 TLS key log）
- **`quicreach`**：测试网站 HTTP/3 支持
- **[http3check.net](https://http3check.net)**：在线检测 HTTP/3 支持状态
- **Lighthouse**：部分审计项会提示 HTTP/3 可用

## 典型权衡

1. **QUIC vs TCP 性能**：在低丢包网络下 QUIC 与 TCP 性能接近，但 CPU 开销更高；在高丢包/高延迟移动网络下 QUIC 优势明显。
2. **0-RTT 便利性 vs 安全性**：0-RTT 减少延迟但引入重放风险，需确保只用于幂等操作。
3. **协议演进 vs 兼容性**：HTTP/3 需要 UDP 支持，不能在所有网络环境下工作，必须设计好回退机制。

## 最小验证实验

```bash
# 1. 检测网站是否支持 HTTP/3
curl --http3 -sI https://www.cloudflare.com
# 预期看到 HTTP/3 200 和 alt-svc 头

# 2. 在 Chrome 中验证
# 打开 chrome://net-internals/#http3 查看活跃 HTTP/3 连接
# Network 面板 Protocol 列显示 h3

# 3. 使用在线工具检测
# 访问 https://http3check.net 输入目标域名

# 4. 模拟网络劣化对比 HTTP/2 和 HTTP/3
# 使用 tc (traffic control) 添加丢包和延迟，观察差异
```

## 参考资料

- [MDN: HTTP/3](https://developer.mozilla.org/en-US/docs/Glossary/HTTP_3)
- [MDN: QUIC](https://developer.mozilla.org/en-US/docs/Glossary/QUIC)
- [RFC 9114: HTTP/3](https://httpwg.org/specs/rfc9114.html)
- [RFC 9000: QUIC](https://www.rfc-editor.org/rfc/rfc9000)
- [web.dev: HTTP/3](https://web.dev/articles/performance-http3)
- [Cloudflare: HTTP/3](https://www.cloudflare.com/learning/performance/what-is-http3/)
