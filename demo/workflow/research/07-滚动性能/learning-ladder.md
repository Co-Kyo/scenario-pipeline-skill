# 滚动性能 — 学习阶梯

> 跟着阶梯走，每步有具体任务，做到才算过关。

## 你需要什么基础
- 了解 HTML 图片标签和 CSS 布局
- 用过 IntersectionObserver 或听说过懒加载
- 知道什么是 CLS（布局偏移）

## 阶梯总览
- **阶段一：理解滚动渲染瓶颈**（对应能力 A1 渲染管线 + A8 Web Vitals）
- **阶段二：掌握懒加载与响应式图片**（对应能力 A9 IntersectionObserver + A12 图片格式）
- **阶段三：学习 CSS 渲染隔离**（对应能力 A13 CSS contain）
- **阶段四：综合运用——电商列表优化**（全部能力联动）

---

## 阶段一：理解滚动渲染瓶颈

### 你将理解什么
长页面滚动为什么会卡？CLS 是什么？滚动回调中的 DOM 操作为什么危险？

### Step 1：理解滚动时的渲染开销
**做**：阅读 `07-滚动性能/overview.md` 的 A1 节点。理解滚动时触发 Layout/Paint 是卡顿根源。
**你会看到什么**：滚动回调中读写布局属性（如 offsetHeight）会触发强制同步布局（Forced Synchronous Layout）。
**这说明了什么**：滚动时的性能瓶颈不是"图片太多"，而是"滚动回调中做了太多事"。
**接下来去哪**：阅读 `edge-cases.md` 的强制同步布局坑点。
**做到才算过**：能解释为什么在 scroll 事件中读写布局属性会掉帧。

### Step 2：理解 CLS 布局偏移
**做**：阅读 `overview.md` 的 A8 节点。理解 CLS 的定义（≤0.1）和常见触发场景。
**你会看到什么**：图片加载、字体加载、动态插入元素都会导致 CLS 增加。
**这说明了什么**：CLS 是滚动场景的核心指标——用户正在阅读内容突然跳走是最差体验。
**接下来去哪**：进入阶段二，学习懒加载如何解决图片问题。
**做到才算过**：能说出 CLS 的 3 个常见触发场景。

### 阶段一过关标准
- [ ] 能解释滚动时触发 Layout/Paint 的原因
- [ ] 能说出 CLS 的定义和阈值
- [ ] 能解释强制同步布局的危害
- 做不到？→ 回到 `overview.md` A1/A8 节点重读

---

## 阶段二：掌握懒加载与响应式图片

### 你将理解什么
如何用 IntersectionObserver 实现图片懒加载？WebP/AVIF 怎么选？srcset/sizes 怎么配？

### Step 3：用 IntersectionObserver 实现懒加载
**做**：阅读 `07-滚动性能/overview.md` 的 A9 节点。写一个懒加载 demo：图片进入视口时设置 `src`，用 `rootMargin: '200px'` 提前加载。
**你会看到什么**：IO 是异步的，不阻塞主线程；rootMargin 控制提前加载距离。
**这说明了什么**：懒加载是"按需加载"——只加载用户即将看到的图片。
**接下来去哪**：阅读 `edge-cases.md` 的懒加载闪烁坑点。
**做到才算过**：能用 IntersectionObserver 写一个图片懒加载组件。

### Step 4：理解懒加载的 CLS 问题
**做**：阅读 `edge-cases.md` 的懒加载闪烁坑点。理解无占位时图片加载导致 CLS 增加。
**你会看到什么**：设置 `width`/`height` 属性或用 aspect-ratio 占位可以消除 CLS。
**这说明了什么**：懒加载和 CLS 是矛盾的——加载晚了 CLS 反而增加，需要占位来平衡。
**接下来去哪**：阅读 `overview.md` 的 A12 节点（图片格式）。
**做到才算过**：能说出 3 种消除懒加载 CLS 的方案。

### Step 5：选择图片格式
**做**：阅读 `07-滚动性能/overview.md` 的 A12 节点 + `trade-offs.md` 的图片格式对比。
**你会看到什么**：WebP 比 JPEG 小 25-34%，AVIF 再小 20%；但 AVIF 兼容性差（Safari <16.4）。
**这说明了什么**：用 `<picture>` 多格式回退是最佳实践——新浏览器用 AVIF，旧浏览器降级 WebP/JPEG。
**接下来去哪**：进入阶段三，学习 CSS 渲染隔离。
**做到才算过**：能用 `<picture>` 配置多格式回退。

### 阶段二过关标准
- [ ] 能用 IntersectionObserver 实现懒加载
- [ ] 能说出消除懒加载 CLS 的 3 种方案
- [ ] 能用 `<picture>` 配置 WebP/AVIF 回退
- 做不到？→ 回到 `overview.md` A9/A12 节点 + `edge-cases.md` 重读

---

## 阶段三：学习 CSS 渲染隔离

### 你将理解什么
contain 属性如何隔离子树？content-visibility:auto 如何跳过视口外渲染？

### Step 6：用 contain 优化长列表
**做**：阅读 `07-滚动性能/overview.md` 的 A13 节点 + `trade-offs.md` 的 contain 对比。给长列表的每一项添加 `contain: layout paint`。
**你会看到什么**：浏览器跳过不可见项的布局和绘制，减少渲染工作量。
**这说明了什么**：`contain` 是"告诉浏览器这部分是独立的，不用重算其他内容"。
**接下来去哪**：阅读 `edge-cases.md` 的层爆炸坑点。
**做到才算过**：能解释 `contain: layout paint style` 各自隔离的内容。

### Step 7：用 content-visibility 跳过视口外渲染
**做**：阅读 `overview.md` 的 A13 节点。给长列表项添加 `content-visibility: auto`。
**你会看到什么**：视口外的元素完全跳过渲染（布局+绘制），比 contain 更激进。
**这说明了什么**：`content-visibility: auto` 是长页面的杀手级 CSS 优化。
**接下来去哪**：进入阶段四，综合落地。
**做到才算过**：能说出 `contain` vs `content-visibility` 的区别。

### 阶段三过关标准
- [ ] 能用 contain 优化长列表渲染
- [ ] 能用 content-visibility 跳过视口外渲染
- [ ] 能解释层爆炸的根因和预防
- 做不到？→ 回到 `overview.md` A13 节点 + `trade-offs.md` 重读

---

## 阶段四：综合运用——电商列表优化

### 你将理解什么
如何把懒加载 + 响应式图片 + CSS 隔离组合成一个完整的滚动优化方案？

### Step 8：整合优化方案
**做**：阅读 `overview.md` 的收尾部分（Vue 3 / React 懒加载组件 + 虚拟滚动方案）。回顾 `edge-cases.md` 的防御清单。
**你会看到什么**：懒加载（IO）+ 响应式图片（srcset/picture）+ CSS 隔离（contain/content-visibility）+ 虚拟列表 = 完整方案。
**这说明了什么**：滚动优化不是某一个手段能解决的，需要多维度组合。
**接下来去哪**：完成！
**做到才算过**：能画出"懒加载→响应式图片→CSS 隔离→虚拟列表"的完整优化方案图。

### 阶段四过关标准
- [ ] 能整合懒加载 + 响应式图片 + CSS 隔离的完整方案
- [ ] 能在 Vue/React 中实现电商列表的滚动优化
- [ ] 能用 CLS/LCP 度量优化效果
- 做不到？→ 回到 `overview.md` + `edge-cases.md` + `trade-offs.md` 重读

---

## 学完之后你应该能做到

**面试场景**：面对"长页面大量图片滚动卡顿"的问题，能从 IntersectionObserver 懒加载→CLS 占位→WebP/AVIF 格式选择→srcset 响应式图片→contain/content-visibility CSS 隔离完整回答。

**实战场景**：能用 IntersectionObserver + `<picture>` + contain 组合优化电商商品列表，用 CLS 指标验证优化效果。
