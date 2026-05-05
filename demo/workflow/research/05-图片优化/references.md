# 参考资料：图片优化——大图量场景下的加载与渲染性能

> 分级说明：T1 = 必读核心（直接出题来源），T2 = 重要补充（拓展理解），T3 = 延伸参考（开阔视野）

---

## T1 · 必读核心

### 1. Lazy Loading 原生懒加载
- **MDN — Lazy loading**：https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading
- **web.dev — Lazy loading images**：https://web.dev/articles/lazy-loading-images
- **核心知识点**：
  - `<img loading="lazy">` 属性，浏览器原生延迟加载屏幕外图片
  - 图片体积趋势：桌面端中位数从 ~250KB 增长到 ~900KB，移动端从 ~100KB 增长到 ~850KB
  - 首屏关键渲染路径（Critical Rendering Path）缩短策略
  - `loading="lazy"` 与 `loading="eager"` 的语义区别
  - 注意：`load` 事件在懒加载图片全部就绪前就会触发，需用 `HTMLImageElement.complete` 判断单张图片是否加载完毕

### 2. Intersection Observer API
- **MDN — Intersection Observer API**：https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
- **核心知识点**：
  - 替代 scroll/resize 事件监听的高性能可见性检测方案
  - `IntersectionObserver` 构造函数：`root`、`rootMargin`、`threshold` 三个配置项
  - 交叉比率（intersection ratio）：0.0 ~ 1.0，表示目标元素在视口中的可见百分比
  - 适用场景：懒加载、无限滚动、广告可见性监测、动画触发
  - 不支持精确像素级交叉计算，仅解决"大约 N% 可见"的通用场景

### 3. 响应式图片 — srcset 与 sizes
- **MDN — `<img>` srcset**：https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#srcset
- **web.dev — Serve responsive images**：https://web.dev/articles/serve-responsive-images
- **核心知识点**：
  - `srcset` + `sizes` 实现基于视口宽度的图片选择
  - 宽度描述符（如 `800w`）vs 像素密度描述符（如 `2x`）
  - 浏览器根据设备 DPR 和视口宽度自动选择最优图片
  - 避免为小屏设备加载大图，节省带宽
  - `width` 和 `height` 属性预留空间，防止布局偏移（CLS）

### 4. `<picture>` 元素与格式降级
- **MDN — `<picture>`**：https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture
- **核心知识点**：
  - `<source>` + `<img>` 的组合用法
  - Art Direction：不同媒体条件下裁剪/替换图片
  - 格式降级：AVIF → WebP → JPEG 的渐进增强方案
  - `media` 属性做媒体查询匹配（如 `(orientation: portrait)`、`(prefers-color-scheme: dark)`）
  - `type` 属性做 MIME 类型判断，浏览器不支持时自动跳过
  - `<picture>` 用于艺术指导和格式切换；`srcset` 用于分辨率切换，两者分工不同

---

## T2 · 重要补充

### 5. CSS contain 属性
- **MDN — contain**：https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/contain
- **核心知识点**：
  - 四种包含模式：`size`、`layout`、`style`、`paint`
  - `contain: strict` = size + layout + paint + style（最强隔离）
  - `contain: content` = layout + paint + style（不含 size）
  - `paint` 包含：子元素不溢出容器边界，容器离屏时浏览器可跳过子元素绘制
  - 大图量场景：对图片卡片容器设置 `contain: content`，减少布局/绘制计算范围
  - 性能收益：隔离变化传播，减少重排（reflow）和重绘（repaint）范围

### 6. CSS content-visibility 属性
- **MDN — content-visibility**：https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility
- **web.dev — content-visibility**：https://web.dev/articles/content-visibility
- **核心知识点**：
  - `content-visibility: auto`：自动跳过屏幕外元素的渲染，进入视口时恢复
  - `content-visibility: hidden`：强制跳过内容渲染（类似 `display: none` 但保留 DOM）
  - 自动启用 layout、style、paint 包含
  - 需配合 `contain-intrinsic-size`（或 `contain-intrinsic-block-size`）预估尺寸，避免滚动条抖动
  - 大图量长列表场景：对每个图片卡片设 `content-visibility: auto`，首屏渲染时间显著缩短
  - 支持动画过渡（需 `transition-behavior: allow-discrete`）

### 7. WebP 格式
- **web.dev — Serve images WebP**：https://web.dev/articles/serve-images-webp
- **核心知识点**：
  - WebP 有损压缩比 JPEG 小 25-34%，无损压缩比 PNG 小 26%
  - 支持透明通道（alpha）和动画
  - 浏览器兼容性：Chrome、Firefox、Edge、Safari 14+ 均已支持
  - `<picture>` 降级方案：`<source type="image/webp">` + `<img src="fallback.jpg">`
  - 服务端 `Accept` 头检测 + Content Negotiation 方案

---

## T3 · 延伸参考

### 8. AVIF 格式
- **web.dev — Compress images AVIF**：https://web.dev/articles/compress-images-avif
- **核心知识点**：
  - 基于 AV1 视频编码，压缩率优于 WebP 约 20%
  - 支持 8/10/12 位色深、HDR、广色域
  - 支持有损/无损压缩、透明通道、动画
  - 编码速度较慢（可离线预处理），解码性能已大幅优化
  - 浏览器支持：Chrome 85+、Firefox 93+、Safari 16.4+、Edge 121+
  - 最佳实践：AVIF → WebP → JPEG 三级降级

### 9. 综合策略与最佳实践汇总

| 策略 | 适用场景 | 关键技术 |
|------|---------|---------|
| 原生懒加载 | 长页面、图库、商品列表 | `loading="lazy"` |
| 自定义懒加载 | 需精细控制阈值/占位 | IntersectionObserver |
| 响应式图片 | 多设备/多分辨率 | `srcset` + `sizes` |
| 格式降级 | 兼容新旧浏览器 | `<picture>` + `<source type>` |
| 渲染包含 | 大图量长列表 | `contain: content` |
| 内容可见性 | 超长页面、无限滚动 | `content-visibility: auto` |
| 图片压缩 | 所有图片场景 | WebP/AVIF 预处理 |
| 尺寸预留 | 防止布局偏移 | `width` + `height` 属性 |

---

## 参考链接汇总

| # | 资源 | URL | 级别 |
|---|------|-----|------|
| 1 | MDN Lazy loading | https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading | T1 |
| 2 | web.dev Lazy loading images | https://web.dev/articles/lazy-loading-images | T1 |
| 3 | MDN Intersection Observer API | https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API | T1 |
| 4 | MDN `<img>` srcset | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#srcset | T1 |
| 5 | web.dev Serve responsive images | https://web.dev/articles/serve-responsive-images | T1 |
| 6 | MDN `<picture>` | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture | T1 |
| 7 | MDN contain | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/contain | T2 |
| 8 | MDN content-visibility | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility | T2 |
| 9 | web.dev content-visibility | https://web.dev/articles/content-visibility | T2 |
| 10 | web.dev Serve images WebP | https://web.dev/articles/serve-images-webp | T2 |
| 11 | web.dev Compress images AVIF | https://web.dev/articles/compress-images-avif | T3 |
