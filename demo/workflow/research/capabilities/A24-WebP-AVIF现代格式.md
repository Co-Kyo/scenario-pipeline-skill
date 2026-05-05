# A24 - WebP/AVIF 现代图片格式

## 核心机制

### WebP
- 基于 VP8 视频编解码器（有损）和无损压缩算法
- 支持有损压缩、无损压缩、Alpha 透明通道、动画
- 有损 WebP 使用预测编码 + DCT 变换 + 熵编码，典型压缩率比 JPEG 高 25-35%
- 无损 WebP 比 PNG 小约 26%
- **不支持渐进式渲染**（progressive rendering），需完整下载后才能显示
- 浏览器支持：Chrome、Edge、Firefox、Opera、Safari（14+）

### AVIF
- 基于 AV1 视频编解码器，在 HEIF 容器中编码
- 有损压缩比 JPEG 小约 50%，比 WebP 再优 20-30%
- 支持 HDR、宽色域（Wide Color Gamut）、10/12-bit 色深
- 支持 Alpha 通道、动画/多帧存储
- **不支持渐进式渲染**
- 浏览器支持：Chrome 85+、Firefox 93+（仅静态）、Safari 16.1+、Opera 71+；Edge/IE 不支持

### 压缩率对比（典型场景）

| 格式 | 有损压缩率 | 无损压缩率 | 透明 | 动画 | 渐进式 |
|------|-----------|-----------|------|------|--------|
| JPEG | 基准 | - | ✗ | ✗ | ✓ |
| PNG | - | 基准 | ✓ | ✗ | ✓ |
| WebP | -25~35% vs JPEG | -26% vs PNG | ✓ | ✓ | ✗ |
| AVIF | -50% vs JPEG | ✓ | ✓ | ✓ | ✗ |

## 工程瓶颈

1. **编码速度慢**：AVIF 编码耗时远高于 JPEG/WebP，CI/CD 构建流水线中批量转换需考虑并行化或预处理
2. **无渐进式渲染**：WebP/AVIF 均不支持 progressive rendering，大图在慢网络下用户感知白屏时间更长
3. **浏览器兼容性碎片**：Edge 仍不支持 AVIF，老版本 Safari（<16.1）不支持 AVIF，必须提供 fallback
4. **工具链成熟度**：部分 CDN、图片处理服务对 AVIF 支持不完善，sharp/libvips 版本需跟进
5. **色彩空间差异**：AVIF 默认使用 YUV 色彩空间，在某些场景下与 sRGB 转换存在色差

## 调试工具

- **Chrome DevTools → Network 面板**：查看实际传输的 Content-Type 和文件大小
- **Lighthouse**：Audit "Serve images in next-gen formats" 检测未使用现代格式的图片
- **Squoosh**（squoosh.app）：在线对比不同格式/质量下的视觉效果和文件大小
- **sharp (Node.js)**：`sharp(input).avif({ quality: 50 }).toFile(output)` 批量转换
- **cavif/cavif-rs**：Rust 实现的 AVIF 编码器，速度优于 libavif

## 典型权衡

1. **压缩率 vs 编码速度**：AVIF 压缩率最优但编码最慢；对实时场景（用户上传）可考虑 WebP 作为即时编码方案
2. **文件大小 vs 渲染时机**：AVIF 文件更小但不支持渐进式渲染；对首屏关键大图，JPEG progressive 可能用户感知更快
3. **兼容性 vs 维护成本**：提供 AVIF + WebP + JPEG 三重 fallback 保证兼容性，但增加图片处理和存储成本

## 最小验证实验

```html
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="Hero image" width="1200" height="600">
</picture>
```

验证步骤：
1. 用 Squoosh 将同一张 JPEG 分别导出为 WebP（quality 75）和 AVIF（quality 50）
2. 对比三者文件大小和视觉质量
3. 在 Chrome DevTools Network 面板中确认浏览器实际加载了哪个格式
4. 在不支持 AVIF 的浏览器中验证 fallback 是否生效

## 参考资料

- [MDN: 图像文件类型与格式指南](https://developer.mozilla.org/zh-CN/docs/Web/Media/Guides/Formats/Image_types)
- [MDN: WebP 图像](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types#webp)
- [MDN: AVIF 图像](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types#avif)
- [web.dev: Serve images in next-gen formats](https://web.dev/articles/uses-webp-images)
- [AVIF vs WebP 对比 (CTRL Blog)](https://www.ctrl.blog/entry/webp-avif-comparison.html)
