# 图片优化：WebP/AVIF 格式选择与加载策略——多端适配场景

## 开篇：格式选择的困惑

多端适配时代，前端开发者面对一个真实的困境：同一个页面要在 iPhone、Android 低端机、桌面浏览器、甚至车载屏幕上良好呈现，而图片往往是页面体积的最大头。WebP 说"我兼容性好、体积小"，AVIF 说"我压缩率更高"，JPEG 说"我无处不在"——到底该选谁？选了 AVIF，Safari 旧版本图片直接不显示；选了 WebP，带宽敏感场景下又觉得浪费。更麻烦的是，图片尺寸也得适配：手机加载桌面级大图是带宽犯罪，但 srcset 写错了就会出这种问题。

这不是一个"选最优格式"的简单问题，而是一个**格式兼容性 × 压缩效率 × 加载策略 × 多端适配**的组合优化问题。

---

## 通用原理

### 一、主流图片格式的压缩机制与适用场景

| 格式 | 压缩方式 | 相对体积 | 核心优势 | 核心劣势 |
|------|----------|----------|----------|----------|
| JPEG | 有损 DCT | 1× (基准) | 无处不在的兼容性 | 无透明通道，压缩效率低 |
| JPEG (渐进式) | 渐进式加载 | ≈1× | 先渲染低分辨率，感知更快 | 浏览器支持良好但非默认 |
| WebP | VP8 内核 | 比 JPEG 小 25-34% | 兼容性已覆盖 >97% 浏览器 | 有损编码质量在极低码率下不如 AVIF |
| AVIF | AV1 内核 | 比 WebP 再小 ~20% | 压缩率最高，支持 HDR/10-bit | 编码慢，Safari <16.4 不支持 |
| PNG | 无损 | 较大 | 无损、透明 | 体积大，不适合照片 |

**通用认知**：格式选择不是"哪个最好"，而是"在目标用户的浏览器覆盖率下，哪个的压缩率/兼容性比最优"。

### 二、多格式回退机制（Progressive Enhancement）

浏览器不会因为你写了 AVIF 就只认 AVIF。HTML 的 `<picture>` 元素天然支持格式降级：

```
浏览器按 <source> 顺序尝试 → 认识的第一个格式胜出 → 全不认识则 fallback 到 <img>
```

这意味着：把压缩率最高的格式放最前面，把兼容性最好的格式放最后面。浏览器自动选最优解，开发者无需做 UA 检测。

### 三、响应式图片：尺寸适配的两个维度

1. **分辨率切换（srcset + sizes）**：告诉浏览器"我有这些尺寸的图片，你根据视口宽度和 DPR 自己选"。
2. **艺术指导（picture + media）**：不同断点下用完全不同的裁切/构图。

`srcset` 配合 `sizes` 的关键认知：`sizes` 属性描述的是**图片在页面中的显示尺寸**（而非视口宽度），浏览器据此 + DPR 计算出实际需要加载哪个资源。写错 `sizes` 是最常见的性能泄漏源。

### 四、压缩的分层策略

图片从上传到展示，压缩可以发生在多个层面：

- **上传时（Build/CMS）**：预生成多格式、多尺寸的图片变体。
- **CDN 边缘（Runtime）**：根据请求头的 Accept 字段动态转换格式、按 URL 参数调整尺寸和质量。
- **前端（Rendering）**：`<picture>` 声明格式优先级，`srcset` 声明尺寸候选，懒加载控制时机。

理想状态是三层配合：前端负责声明策略，CDN 负责执行转换，构建时负责生成源文件。

---

## 典型瓶颈与应对

### B1：格式兼容性断裂

**问题**：AVIF 在 Safari <16.4 完全不支持，直接不显示图片。

**根因**：把 AVIF 作为唯一格式，没有回退路径。

**应对**：永远不要只提供单一格式。`<picture>` 的多 `<source>` 降级是标准解法——AVIF 优先，WebP 兜底，JPEG 保底。

### B2：原始图片未压缩即上线

**问题**：设计师导出 4MB 的 PNG 直接丢到 CDN，LCP 慢、带宽浪费。

**根因**：缺乏构建流水线或 CDN 动态处理，原始资源未经任何优化就上线。

**应对**：建立"原图 → 压缩 + 多格式 + 多尺寸"的自动化流水线。可以是构建时生成，也可以是 CDN 实时处理。关键是**不依赖人工压缩**。

### B3：srcset/sizes 配置错误

**问题**：移动端加载了桌面尺寸的图片，带宽浪费严重。

**根因**：`sizes` 属性写死了一个远大于实际显示尺寸的值，或者干脆没写 `sizes`（浏览器默认假设图片占满视口）。

**应对**：`sizes` 必须反映图片在页面中的真实渲染宽度。使用 CSS 容器查询或 JS 动态计算都是可行方案。

---

## 落地方案：`<picture>` + CDN 动态处理

综合以上原理和瓶颈，推荐的多端适配落地方案分三步：

### 第一步：CDN 托管原始资源，动态生成变体

上传一张高质量原始图（如 3000px JPEG/PNG），CDN 根据 URL 参数实时输出：

```
原始: https://cdn.example.com/img/photo.jpg
WebP: https://cdn.example.com/img/photo.jpg?fmt=webp&q=80&w=800
AVIF: https://cdn.example.com/img/photo.jpg?fmt=avif&q=60&w=800
```

主流 CDN（Cloudflare、AWS CloudFront + Lambda@Edge、阿里云 OSS 图片处理）均支持此模式。优势：零预生成成本，格式/尺寸/质量按需调整。

### 第二步：前端 `<picture>` 声明格式优先级 + 响应式尺寸

```html
<picture>
  <!-- AVIF 优先：压缩率最高 -->
  <source
    type="image/avif"
    srcset="
      https://cdn.example.com/photo.jpg?fmt=avif&q=60&w=400 400w,
      https://cdn.example.com/photo.jpg?fmt=avif&q=60&w=800 800w,
      https://cdn.example.com/photo.jpg?fmt=avif&q=60&w=1200 1200w
    "
    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 600px"
  />
  <!-- WebP 兜底：兼容性好，体积优秀 -->
  <source
    type="image/webp"
    srcset="
      https://cdn.example.com/photo.jpg?fmt=webp&q=80&w=400 400w,
      https://cdn.example.com/photo.jpg?fmt=webp&q=80&w=800 800w,
      https://cdn.example.com/photo.jpg?fmt=webp&q=80&w=1200 1200w
    "
    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 600px"
  />
  <!-- JPEG 保底：任何浏览器都能渲染 -->
  <img
    src="https://cdn.example.com/photo.jpg?fmt=jpg&q=85&w=800"
    alt="描述文字"
    loading="lazy"
    decoding="async"
    width="800"
    height="600"
  />
</picture>
```

### 第三步：关键补充措施

- **懒加载**：首屏以外的图片使用 `loading="lazy"`，减少初始加载体积。
- **显式宽高比**：`<img>` 标签写 `width` 和 `height`（或 CSS `aspect-ratio`），防止布局偏移（CLS）。
- **Accept 协商**：部分 CDN 支持基于 `Accept` 请求头自动返回最优格式，此时前端甚至可以只写一个 `<img>` 标签，让 CDN 服务端决策。但 `<picture>` 方案更可控、更易调试。
- **质量分级**：AVIF 可以用更低的质量参数（如 60）获得与 WebP 80 相当的视觉效果，这是其压缩率优势的正确使用方式。
- **监控**：通过 RUM（真实用户监控）跟踪各格式的实际加载率、LCP 贡献、带宽消耗，持续优化参数。

---

## 总结

多端适配下的图片优化，核心不是"选一个格式"，而是建立一套**分层降级 + 动态生成 + 响应式声明**的体系：

1. **格式选择**：AVIF → WebP → JPEG 三级降级，浏览器自动选最优。
2. **尺寸适配**：`srcset` + `sizes` 让浏览器按需加载，避免带宽浪费。
3. **压缩执行**：CDN 边缘动态处理，无需预生成，零维护成本。
4. **兜底保障**：`<picture>` 结构确保任何浏览器都能看到图片，不会有"白屏"。

这套方案的通用性在于：它不依赖特定框架，不依赖特定 CDN 厂商，不依赖构建工具链——`<picture>` 和 `srcset` 是 HTML 标准，CDN 图片处理是所有主流云服务的标配能力。
