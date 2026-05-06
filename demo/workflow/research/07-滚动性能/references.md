# 参考资料 — 滚动性能：长页面大量图片的懒加载与滚动优化

## Tier 1（核心规范 / MDN 官方文档）

1. **IntersectionObserver API**  
   MDN 官方文档，涵盖 `rootMargin`、`threshold`、`observe/unobserve` 等核心概念，是实现图片懒加载的底层 API。  
   https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API

2. **Image Types — 图片格式概览**  
   MDN 关于 Web 常用图片格式（WebP、AVIF、JPEG、PNG、SVG）的全面指南，帮助选择最适合电商场景的图片格式以减少传输体积。  
   https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types

3. **CSS `contain` 属性**  
   MDN 文档，说明 `contain: layout style paint` 等值如何限制浏览器重排/重绘范围，对长列表滚动性能优化至关重要。  
   https://developer.mozilla.org/en-US/docs/Web/CSS/contain

## Tier 2（权威实践指南 / web.dev）

4. **Lazy Loading Images**  
   web.dev 的懒加载最佳实践，涵盖 `loading="lazy"` 原生属性、IntersectionObserver 自定义方案及渐进增强策略。  
   https://web.dev/articles/lazy-loading-images

5. **Responsive Images**  
   web.dev 关于响应式图片的指南，包括 `srcset`、`sizes`、`<picture>` 元素的使用方法，确保不同设备加载合适尺寸的图片。  
   https://web.dev/articles/uses-responsive-images

6. **Content Visibility**  
   web.dev 对 CSS `content-visibility: auto` 的深度解析，展示如何通过跳过视口外元素的渲染来大幅降低长页面的渲染成本。  
   https://web.dev/articles/content-visibility

7. **Core Web Vitals**  
   web.dev 关于 LCP、FID/INP、CLS 三大核心指标的权威指南，是衡量滚动性能优化效果的基准参照。  
   https://web.dev/articles/vitals
