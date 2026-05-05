# 图片优化：大图量场景下的加载与渲染性能 — 学习阶梯

> 跟着阶梯走，每步有具体任务，做到才算过关。

## 你需要什么基础
- 了解 `<img>` 标签的基本属性
- 知道 JPEG/PNG/WebP 的概念
- 了解浏览器加载资源的基本流程

## 阶梯总览
- **阶段一：图片格式选择**（对应能力 A24）— 用什么格式
- **阶段二：加载策略**（对应能力 A25、A26、A5）— 怎么加载
- **阶段三：渲染优化**（对应能力 A27）— 怎么渲染更快

---

## 阶段一：图片格式选择

### 你将理解什么
不同格式的压缩算法和浏览器兼容性决定了"这张图该用什么格式"。

### Step 1：现代格式对比
**做**：读 `capabilities/A24-WebP-AVIF现代格式.md`。
**你会看到什么**：WebP 比 JPEG 小 25-35%；AVIF 比 JPEG 小约 50%。但 Safari 对 AVIF 的支持仍有缺口。
**这说明了什么**：不能只用 AVIF——需要 `<picture>` 元素做格式降级（AVIF → WebP → JPEG）。
**接下来去哪**：读 `overview.md` 第一节"图片格式选择"。
**做到才算过**：能用 `<picture>` 写一个包含 AVIF/WebP/JPEG 三种格式降级的代码。

### 阶段一过关标准
- [ ] 能说出 WebP 和 AVIF 各自的压缩优势和兼容性
- [ ] 能用 `<picture>` 实现格式降级
- [ ] 做不到？→ 回看 `capabilities/A24`

---

## 阶段二：加载策略

### 你将理解什么
图片优化的 80% 在"加载时机"——不该加载的不加载，该加载的提前加载。

### Step 2：响应式图片
**做**：读 `capabilities/A25-响应式图片（srcset-sizes）.md`。
**你会看到什么**：`srcset` 提供多尺寸候选，`sizes` 告诉浏览器显示宽度，浏览器自动选择最合适的图片。
**这说明了什么**：手机不需要加载 2000px 宽的图——`srcset` + `sizes` 让浏览器按需选择。
**接下来去哪**：读 `experiment/index.html`。
**做到才算过**：能用 `srcset` + `sizes` 实现一个响应式图片。

### Step 3：图片懒加载
**做**：读 `capabilities/A26-图片懒加载（loading-lazy）.md`。
**你会看到什么**：原生 `loading="lazy"` 零 JS 开销；IntersectionObserver 方案更灵活。
**这说明了什么**：首屏图片不要懒加载（会延迟 LCP）；屏外图片必须懒加载。
**接下来去哪**：读 `capabilities/A5-IntersectionObserver.md`。
**做到才算过**：能解释"为什么首屏图片不应该 lazy"。

### Step 4：IntersectionObserver 原理
**做**：读 `capabilities/A5-IntersectionObserver.md`。
**你会看到什么**：IO 是异步的，不阻塞滚动；scroll + getBoundingClientRect 是同步的，阻塞滚动。
**这说明了什么**：懒加载的底层原理就是 IO——原生 `loading="lazy"` 内部也是类似机制。
**接下来去哪**：读 `edge-cases.md`。
**做到才算过**：能用 IntersectionObserver 实现一个自定义懒加载（< 20 行）。

### 阶段二过关标准
- [ ] 能用 srcset + sizes 实现响应式图片
- [ ] 能解释懒加载的适用范围和反模式
- [ ] 做不到？→ 回看 `capabilities/A25` + `A26` + `A5`

---

## 阶段三：渲染优化

### 你将理解什么
图片加载完之后，渲染也可能成为瓶颈——大量图片同时布局会触发回流。

### Step 5：CSS contain 隔离
**做**：读 `capabilities/A27-CSS-contain与content-visibility.md`。
**你会看到什么**：`contain: layout paint` 告诉浏览器"这个元素的布局/绘制不影响外部"。
**这说明了什么**：图片列表用 contain 隔离每项，一张图加载完不会触发整个列表的回流。
**接下来去哪**：读 `experiment/index.html` 中的 contain 对比实验。
**做到才算过**：能解释 `contain` 的四种隔离模式。

### Step 6：aspect-ratio 防止布局偏移
**做**：读 `edge-cases.md` 关于"图片加载导致 CLS"的部分。
**你会看到什么**：图片未加载时宽高为 0，加载后撑开容器 → 布局偏移（CLS）。
**这说明了什么**：设置 `aspect-ratio` 或固定宽高比可以预留空间，避免 CLS。
**接下来去哪**：读 `trade-offs.md` 的选型建议。
**做到才算过**：能在一个图片列表中同时解决懒加载 + CLS + contain。

### 阶段三过关标准
- [ ] 能用 contain 优化图片列表的渲染性能
- [ ] 能用 aspect-ratio 防止图片加载导致的布局偏移
- [ ] 做不到？→ 回看 `capabilities/A27` + `edge-cases.md`

---

## 学完之后你应该能做到
- 面试中能从格式、加载、渲染三个维度设计图片优化方案
- 能用 `<picture>` + `srcset` + `loading="lazy"` 实现完整的图片优化
- 能解释 IntersectionObserver 的原理和优势
- 能防止图片加载导致的 CLS（布局偏移）
