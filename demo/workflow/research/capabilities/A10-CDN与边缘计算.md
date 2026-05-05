# CDN与边缘计算

> ID: A10 | 扇出: 2/8 | 耦合度: 1 | 战略价值: 2.0

## 核心机制

### CDN 架构概述

CDN（Content Delivery Network）是由分布在全球各地的边缘服务器组成的分布式网络，核心目标是将内容就近分发给用户，降低延迟、减轻源站负载。CDN 构建在现有互联网基础之上，通过智能路由和缓存机制优化内容传输路径。

**三层节点架构：**

| 层级 | 角色 | 职责 |
|------|------|------|
| 边缘节点（Edge Server） | 离用户最近 | 直接响应用户请求，提供缓存内容 |
| 汇聚节点 / 中间层（Mid-Tier / Origin Shield） | 边缘与源站之间 | 聚合多个边缘节点的回源请求，减少源站压力 |
| 源站（Origin Server） | 内容提供者 | 存储和管理原始内容，是内容的权威来源 |

### 内容路由机制

CDN 通过 DNS 重定向或 HTTP 重定向将用户请求导向最优的边缘节点：

1. **DNS 智能解析**：用户请求域名时，CDN 的权威 DNS 根据用户 IP 地理位置、网络状况、节点负载等因素，返回距离最近且负载最优的边缘节点 IP。
2. **Anycast 路由**：多个节点宣告同一 IP 地址，BGP 路由自动将流量导向最近节点。
3. **HTTP 重定向**：边缘节点根据实时负载决策，将请求 302 重定向到更优节点（较少使用，增加一次 RTT）。

### 边缘节点缓存

边缘节点是 CDN 系统中最核心的缓存层：

- **缓存内容**：静态资源（HTML、CSS、JS、图片、视频、字体等），部分 CDN 支持 API 响应缓存。
- **缓存 Key**：通常基于 URL（含 Query String）进行 Hash 生成唯一标识。维度越多（Header、Cookie 等），缓存粒度越细但命中率越低。
- **缓存淘汰**：LRU（Least Recently Used）、LFU（Least Frequently Used）或基于 TTL 的过期策略。

### 回源机制（Origin Fetch）

当边缘节点缓存未命中时触发回源：

1. 边缘节点向汇聚节点（Origin Shield）发起请求
2. 汇聚节点检查自身缓存，命中则返回，未命中继续向上
3. 最终由源站提供内容，响应逐层向下填充各级缓存

**回源触发条件：**
- 缓存未命中（首次访问或缓存已过期）
- 缓存主动失效（Purge/Invalidate）
- 条件请求校验失败（ETag/Last-Modified 不匹配）

### 缓存失效策略

| 策略 | 机制 | 适用场景 |
|------|------|----------|
| TTL 过期 | `Cache-Control: max-age=N`，到期自动失效 | 通用静态资源 |
| 版本化 URL | 文件名带 hash（如 `app.a1b2c3.js`），部署新版本生成新 URL | 前端构建产物 |
| 主动 Purge | 通过 API 或控制台手动清除指定 URL/目录的缓存 | 紧急内容更新 |
| Cache-Tag 失效 | 给资源打 Tag，按 Tag 批量失效 | 大规模内容管理 |
| 条件请求 | `ETag` / `Last-Modified` + `If-None-Match` / `If-Modified-Since` | 验证内容是否变化 |

### 多级缓存协作

```
用户 → [浏览器缓存] → [边缘节点缓存] → [汇聚层 Origin Shield] → [源站]
        L1 (本地)       L2 (边缘)         L3 (中间层)           L4 (权威)
```

- **L1 浏览器缓存**：`Cache-Control`、`Expires` 控制，避免网络请求
- **L2 边缘缓存**：CDN 节点本地缓存，命中率最高的一层
- **L3 汇聚层缓存**：Origin Shield 减少回源风暴，保护源站
- **L4 源站**：最终数据源，应尽量减少直接访问

### 边缘计算（Edge Computing）

边缘计算将计算能力下沉到 CDN 边缘节点，实现就近处理：

- **Edge Functions / Workers**：在边缘节点运行自定义逻辑（如 Cloudflare Workers、AWS Lambda@Edge）
- **典型应用**：A/B 测试路由、图片格式转换（WebP 适配）、请求鉴权、个性化内容渲染、Bot 检测
- **与传统 CDN 的区别**：传统 CDN 只做缓存分发，边缘计算在缓存层执行动态逻辑，减少回源次数

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|----------|----------|----------|----------|
| 1 | 缓存命中率低 | 动态内容过多、Cache Key 过细、TTL 设置不合理 | 回源率 > 20%，源站压力大，延迟升高 | CDN 控制台命中率监控、回源 QPS 统计 | 合并 Cache Key 维度、增大 TTL、引入 Origin Shield、使用 Stale-While-Revalidate |
| 2 | 回源风暴（Thundering Herd） | 热点内容同时过期、大促/秒杀场景 | 瞬间大量回源请求冲击源站，源站响应超时或宕机 | 源站 QPS 突增监控、5xx 错误率 | 源站限流、分层缓存、Jittered TTL（随机化过期时间）、请求合并（Request Coalescing） |
| 3 | 缓存一致性延迟 | 内容更新后缓存未及时失效 | 用户看到旧版本内容，持续时间取决于 TTL | 用户反馈 + 缓存版本比对 | 版本化 URL（文件名 hash）、主动 Purge + 预热、缩短热点资源 TTL |
| 4 | 跨区域同步延迟 | 全球节点数量多、更新内容体量大 | 部分区域用户获取旧内容的时间窗口较长 | 多区域一致性采样检查 | 预热策略提前分发、增量更新、分区域灰度发布 |
| 5 | HTTPS 握手开销 | TLS 1.2 或更早版本、未启用 Session Resumption | 首次连接延迟高，TTFB 增大 | 性能测试工具测量 TLS 握手时间 | 升级 TLS 1.3（1-RTT 握手）、启用 OCSP Stapling、使用 TLS Session Resumption |
| 6 | CDN 故障/单点依赖 | CDN 服务商宕机、区域网络故障 | 网站完全不可访问或大面积 5xx | 多源监控（Pingdom、UptimeRobot）、用户端 RUM | 多 CDN 策略（Multi-CDN）、DNS Failover、静态资源自托管回退 |
| 7 | 缓存投毒（Cache Poisoning） | 未过滤的用户输入成为 Cache Key 一部分 | 恶意内容被缓存并分发给其他用户 | 安全审计、异常内容检测 | 严格校验 Cache Key 组成、忽略不可信 Header、使用 Vary Header 精确控制 |

## 调试工具

| 工具 | 用法 |
|------|------|
| `curl -I` | 查看 Response Headers 中的缓存状态（`X-Cache`、`Age`、`Cache-Control`） |
| `curl -H "Cache-Control: no-cache"` | 强制绕过缓存，验证回源行为 |
| `dig` / `nslookup` | 检查 DNS 解析结果，确认 CDN 调度是否正确指向最近节点 |
| CDN 控制台（阿里云/Cloudflare/AWS CloudFront） | 查看实时命中率、带宽、回源率、错误率等核心指标 |
| Chrome DevTools → Network | 查看每个资源的缓存状态（from disk cache / from memory cache）、TTFB |
| WebPageTest | 多地域真实浏览器测试，生成瀑布图分析资源加载链路 |
| `curl --resolve` | 指定域名解析到特定 IP，测试特定 CDN 节点行为 |
| CDN 日志分析（如 AWS CloudFront Logs、阿里云 CDN 日志） | 分析请求分布、命中率趋势、热点资源、错误码分布 |
| `stale-while-revalidate` 测试 | 验证后台回源策略是否正常工作，用户是否无感知更新 |

## 典型权衡

| 维度 | 方案A | 方案B | 选择建议 |
|------|-------|-------|----------|
| 缓存粒度 | 粗粒度（仅 URL）：命中率高，但无法按用户/设备差异化 | 细粒度（URL + Header/Cookie）：个性化内容，命中率低 | 静态资源用粗粒度；动态个性化内容用 Edge Computing 处理而非拆分 Cache Key |
| 缓存 TTL | 长 TTL（7天+）：命中率高，更新慢 | 短 TTL（分钟级）：实时性好，回源多 | 稳定资源用长 TTL + 版本化 URL；频繁变更资源用短 TTL + Stale-While-Revalidate |
| 更新策略 | 主动 Purge：即时生效，运维成本高 | TTL 自动过期：简单，有延迟窗口 | 关键内容用 Purge；常规内容依赖 TTL，配合版本化 URL |
| 部署架构 | 单 CDN：管理简单，有单点风险 | Multi-CDN：高可用，复杂度和成本翻倍 | 中小项目单 CDN + 自托管回退；大流量/高可用场景用 Multi-CDN + DNS Failover |
| 边缘计算 | 纯缓存 CDN：性能最优，功能有限 | Edge Computing：灵活强大，增加延迟和复杂度 | 简单加速用纯缓存；需要路由逻辑、鉴权、内容转换时引入 Edge Functions |
| 源站保护 | 无 Origin Shield：架构简单，源站直接暴露 | 有 Origin Shield：多一层缓存保护源站 | 小规模可省略；高并发/大促场景必须部署 Origin Shield |
| HTTPS 策略 | CDN 终止 TLS：减轻源站负担，CDN 可见明文 | 端到端加密（End-to-End）：安全性最高，CDN 无法缓存/处理内容 | 大多数场景用 CDN 终止 TLS + 源站 HTTPS 回源；高安全场景（金融/医疗）用 End-to-End |

## 最小验证实验

```bash
#!/bin/bash
# 最小验证：CDN 缓存行为观测
# 前提：有一个配置了 CDN 的域名和源站

DOMAIN="your-cdn-domain.example.com"
ASSET="/path/to/static-asset.css"

echo "=== 1. 首次请求（Cold）==="
curl -sI "https://${DOMAIN}${ASSET}" | grep -iE "x-cache|age|cache-control|x-cache-lookup"

echo ""
echo "=== 2. 二次请求（应命中缓存）==="
curl -sI "https://${DOMAIN}${ASSET}" | grep -iE "x-cache|age|cache-control|x-cache-lookup"

echo ""
echo "=== 3. 强制绕过缓存请求 ==="
curl -sI -H "Cache-Control: no-cache" "https://${DOMAIN}${ASSET}" | grep -iE "x-cache|age|cache-control"

echo ""
echo "=== 4. DNS 解析验证（确认指向 CDN）==="
dig +short "${DOMAIN}"

echo ""
echo "=== 5. 测量 TTFB（Time To First Byte）==="
curl -o /dev/null -s -w "TTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" "https://${DOMAIN}${ASSET}"

echo ""
echo "=== 6. 不同地域节点检测（通过请求头）==="
curl -sI "https://${DOMAIN}${ASSET}" | grep -iE "via|x-served-by|x-cache|cf-ray|server"
```

**预期结果：**
- 首次请求可能 X-Cache: Miss，二次请求应为 Hit
- Age 值随时间递增（表示缓存存活时长）
- DNS 解析应返回 CDN 节点 IP（非源站 IP）
- TTFB 应 < 100ms（边缘命中时）

## 参考资料

- [MDN - CDN (Content Delivery Network)](https://developer.mozilla.org/en-US/docs/Glossary/CDN)
- [web.dev - Content Delivery Networks](https://web.dev/articles/content-delivery-networks)
- [天翼云 - CDN技术深度解析与架构设计实践](https://www.ctyun.cn/developer/article/611748830158917)
- [博客园 - CDN 科普](https://www.cnblogs.com/pingan8787/p/11838084.html)
- [Varnish Software - Origin Shield](https://www.varnish-software.com/solutions/origin-shield/)
- [RFC 7234 - HTTP/1.1 Caching](https://httpwg.org/specs/rfc7234.html)
- [Cloudflare Learning Center - What is a CDN?](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/)
