# A20 - 资源压缩与 gzip/brotli

## 核心机制

HTTP 传输层压缩通过在响应体上应用压缩算法减少传输数据量，是前端性能优化中投入产出比最高的手段之一。

### 内容协商机制

压缩通过 HTTP 内容协商完成：

1. 客户端在请求头 `Accept-Encoding` 中声明支持的压缩算法及优先级
   ```
   Accept-Encoding: br, gzip, deflate
   ```
2. 服务端选择一种算法压缩响应体，通过 `Content-Encoding` 告知客户端
   ```
   Content-Encoding: br
   ```
3. 客户端按 `Content-Encoding` 解码获取原始内容

### 主流压缩算法对比

| 算法 | Content-Encoding | 压缩率 | 压缩速度 | 解压速度 | 浏览器支持 |
|------|-----------------|--------|---------|---------|-----------|
| **gzip** | `gzip` | 中等 | 快 | 极快 | 所有浏览器 |
| **Brotli** | `br` | 高（比 gzip 高 15-25%） | 慢（级别高时） | 快 | 现代浏览器 |
| **Zstandard** | `zstd` | 高 | 快 | 极快 | 逐步支持中 |
| **deflate** | `deflate` | 中等 | 快 | 快 | 几乎弃用 |

### gzip

- 基于 LZ77 算法 + Huffman 编码，RFC 1952
- 压缩级别 1-9，默认级别 1（Nginx）或 6（Node.js zlib）
- 级别 1 和级别 9 的压缩率差异约 10-15%，但 CPU 开销差异 5-10 倍
- 解压极快（~400MB/s），几乎不增加客户端开销

### Brotli

- Google 开发，RFC 7932，专为 Web 优化
- 内置一个 120KB 的**静态字典**（包含常见 HTML/CSS/JS 片段），对 Web 内容压缩效果显著
- 压缩级别 0-11：
  - 级别 1-4：压缩速度接近 gzip，压缩率略优（适合动态压缩）
  - 级别 5-9：压缩率显著提升，但 CPU 开销大（适合静态资源预压缩）
  - 级别 10-11：最高压缩率，CPU 极高（仅适合构建时预压缩）
- 需要 HTTPS 环境（部分旧代理不支持）

### Zstandard (zstd)

- Facebook 开发，RFC 8878
- 压缩/解压速度极快，压缩率介于 gzip 和 Brotli 之间
- 支持字典训练（Dictionary Training），对同类小文件效果好
- 浏览器支持逐步增加（Chrome 123+）

### 已压缩资源不再压缩

对已经是压缩格式的媒体文件（JPEG、PNG、MP4、ZIP、WOFF2 等）再次应用 HTTP 压缩通常**增加体积**（因为压缩算法无法找到更多冗余），服务端应跳过。

## 工程瓶颈

1. **动态压缩的 CPU 开销**：Brotli 高级别压缩消耗大量 CPU，在高并发场景下可能成为瓶颈。解决方案：静态资源构建时预压缩（`brotli -q 11`），动态内容用低级别 gzip/Brotli。
2. **压缩比不可预测**：不同内容类型压缩效果差异大——文本类（HTML/CSS/JS）压缩率可达 60-80%，已压缩媒体文件几乎无收益。
3. **Brotli 在 HTTP 明文下不可用**：部分浏览器和中间设备仅在 HTTPS 下支持 Brotli，HTTP 回退到 gzip。
4. **小文件压缩收益为负**：极小文件（< 150 字节）压缩后可能更大（gzip 头部开销），且压缩/解压的 CPU 开销不值得。
5. **`Vary: Accept-Encoding` 缓存碎片化**：CDN 需要分别缓存 gzip 和 br 版本，增加存储和管理成本。

## 调试工具

- **Chrome DevTools → Network**：查看 `Content-Encoding` 列和响应大小（Transfer Size vs Content Size）
- **Chrome DevTools → Network → 筛选 "Use Large Request Rows"`**：显示 Size 列的 `(from disk cache)` 和压缩前后大小
- **`curl -H 'Accept-Encoding: br' -sI <url>`**：验证 Brotli 支持
- **[gzip_test](https://www.giftofspeed.com/gzip-test/)**：在线检测网站压缩状态
- **Lighthouse**：审计项 "Enable text compression"
- **`brotli -c -q 11 file.js > file.js.br`**：预压缩效果测试

## 典型权衡

1. **压缩级别 vs CPU/延迟**：动态请求用 gzip 1-4 或 Brotli 1-4；静态资源构建时用 Brotli 11 预压缩。权衡核心是 CPU 成本与带宽节省的比例。
2. **Brotli vs gzip 兼容性**：Brotli 压缩率更高但需要 HTTPS 且旧浏览器不支持，通常配置为 `br > gzip > identity` 的回退链。
3. **预压缩 vs 动态压缩**：预压缩不消耗运行时 CPU，但需要构建流程支持和存储两份文件（原始 + 压缩）；动态压缩灵活但消耗服务器资源。

## 最小验证实验

```bash
# 1. 对比不同压缩算法的压缩率
echo "console.log('hello world'.repeat(1000))" > test.js
gzip -k test.js && brotli test.js
ls -la test.js test.js.gz test.js.br
# 对比三种文件大小

# 2. 请求时指定压缩算法
curl -H 'Accept-Encoding: gzip' -sI https://www.google.com | grep -i encoding
curl -H 'Accept-Encoding: br' -sI https://www.google.com | grep -i encoding

# 3. 在 Nginx 中启用 Brotli
# /etc/nginx/nginx.conf:
# brotli on;
# brotli_comp_level 6;
# brotli_types text/plain text/css application/javascript application/json;
```

## 参考资料

- [MDN: Content-Encoding](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Encoding)
- [MDN: Accept-Encoding](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Accept-Encoding)
- [RFC 7932: Brotli](https://datatracker.ietf.org/doc/html/rfc7932)
- [RFC 8878: Zstandard](https://datatracker.ietf.org/doc/html/rfc8878)
- [web.dev: Text Compression](https://web.dev/articles/uses-text-compression)
- [Google: Brotli](https://github.com/google/brotli)
