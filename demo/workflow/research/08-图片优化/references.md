# 参考资料：图片优化——WebP/AVIF 格式选择与加载策略（多端适配场景）

## Tier 1 — 权威规范与核心文档

| # | 标题 | URL | 关键内容 |
|---|------|-----|----------|
| T1 | MDN: Image file type and format guide | https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types | 各图片格式（AVIF、WebP、JPEG、PNG、SVG 等）的规范、压缩能力、浏览器兼容性、色彩模式、许可协议的权威参考 |
| T2 | web.dev: Serve responsive images | https://web.dev/articles/uses-responsive-images | `srcset`、`sizes`、`<picture>` 元素的响应式图片策略；Lighthouse 审计指标与优化建议 |
| T3 | AVIF 规范 (AOM) | https://aomediacodec.github.io/av1-avif/ | AVIF 官方规范：基于 AV1 的 HEIF 容器编码，支持有损/无损压缩、HDR、广色域、Alpha 通道 |
| T4 | WebP 规范 (Google) | https://developers.google.com/speed/webp | WebP 官方文档：有损/无损压缩、动画、Alpha 透明度、编码工具 libwebp |
| T5 | HTML `<picture>` 元素 — MDN | https://developer.mozilla.org/en-US/docs/Web/HTML/Element/picture | `<picture>` + `<source type="image/avif">` 实现格式降级的核心 API |
| T6 | HTML `srcset` 属性 — MDN | https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#srcset | 按设备像素密度 / 视口宽度选择不同分辨率图片的语法与用法 |

## Tier 2 — 性能优化与工程实践

| # | 标题 | URL | 关键内容 |
|---|------|-----|----------|
| T7 | web.dev: Use WebP images | https://web.dev/articles/serve-images-webp | WebP 相比 JPEG/PNG 的压缩优势、编码参数调优、`<picture>` 降级方案 |
| T8 | web.dev: Use AVIF images | https://web.dev/articles/avif | AVIF 与 WebP/JPEG 的压缩对比（AVIF 约比 JPEG 小 50%）、编码速度与质量权衡、不支持渐进渲染的限制 |
| T9 | web.dev: Lazy loading images | https://web.dev/articles/lazy-loading-images | `loading="lazy"` 原生懒加载、Intersection Observer 方案、首屏图片预加载策略 |
| T10 | web.dev: Responsive image breakpoints | https://web.dev/articles/responsive-image-breakpoints | 响应式图片断点生成算法、Cloudinary 断点生成器、`sizes` 属性的最佳实践 |
| T11 | Can I Use: AVIF | https://caniuse.com/avif | AVIF 浏览器支持矩阵（Chrome 85+, Firefox 93+, Safari 16.1+, Edge 121+） |
| T12 | Can I Use: WebP | https://caniuse.com/webp | WebP 浏览器支持矩阵（全主流浏览器，Safari 14+） |

## Tier 3 — 多端适配与 CDN 实践

| # | 标题 | URL | 关键内容 |
|---|------|-----|----------|
| T13 | MDN: Responsive images | https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images | 响应式图片入门：分辨率切换、艺术方向（art direction）、`<picture>` 与 `srcset` 配合使用 |
| T14 | AVIF vs WebP 对比 (CTRL Blog) | https://www.ctrl.blog/entry/webp-avif-comparison.html | 实测对比：AVIF 中位压缩率比 WebP 更优（50% vs 30% 对比 JPEG 基准）、编码速度差异 |
| T15 | Cloudflare: Image optimization | https://www.cloudflare.com/learning/performance/automatic-image-optimization/ | CDN 层自动格式协商（Accept 协商）、图片质量参数传递、边缘转码策略 |
| T16 | Image CDN: format negotiation | https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types#browser_compatibility | 服务端基于 `Accept` 头进行内容协商，自动返回最优格式 |
| T17 | Squoosh: 图片压缩对比工具 | https://squoosh.app/ | Google 出品的浏览器端图片压缩工具，支持 AVIF/WebP/JPEG/MozJPEG 参数调优与可视化对比 |
| T18 | vite-plugin-imagemin / sharp | https://sharp.pixelplumbing.com/ | Node.js 图片处理库，构建时批量转 WebP/AVIF、生成多尺寸断点图 |

## 核心知识点索引

### 格式选择决策链

```
目标格式
├─ AVIF → 最佳压缩（比 JPEG 小 ~50%），支持 HDR/广色域/动画/透明
│         ⚠ 不支持渐进渲染，大图需注意首屏体验
│         ⚠ Safari 16.1+ 才支持，需降级方案
├─ WebP → 通用性最好（Safari 14+ 全平台覆盖），压缩优于 JPEG ~30%
│         ⚠ 不支持渐进渲染
├─ JPEG  → 降级兜底，支持渐进渲染（Progressive JPEG）
├─ PNG   → 需要无损 + 透明时兜底
└─ SVG   → 矢量图标/UI 元素
```

### 多端适配策略

1. **格式协商**：`<picture>` + `<source type="image/avif/webp">` 实现客户端降级
2. **分辨率切换**：`srcset` + `sizes` 按视口宽度选图
3. **CDN 边缘转码**：服务端 `Accept` 头协商，动态返回最优格式
4. **懒加载**：首屏外图片 `loading="lazy"`，首屏图片 `fetchpriority="high"`
5. **构建时预处理**：sharp/imagemin 批量生成 WebP + AVIF + 多尺寸断点图

### 浏览器兼容性速查

| 格式 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| AVIF | 85+ | 93+ | 16.1+ | 121+ |
| WebP | 32+ | 65+ | 14+ | 18+ |
| JPEG  | 全版本 | 全版本 | 全版本 | 全版本 |
| PNG   | 全版本 | 全版本 | 全版本 | 全版本 |

> **结论**：当前（2026）AVIF 已在全主流浏览器覆盖，可作为首选格式；WebP 作为安全降级层；JPEG/PNG 作为最终兜底。通过 `<picture>` 元素实现三层格式降级是最佳实践。
