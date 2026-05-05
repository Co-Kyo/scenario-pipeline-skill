# 图片优化：大图量场景下的加载与渲染性能

## 概述

当页面包含大量图片时（图库、电商列表、社交 Feed 等），图片通常占据页面总传输量的 60%-80%，是影响加载速度和渲染性能的首要瓶颈。优化需沿着图片的完整生命周期展开：从源头的格式选择，到尺寸适配、加载策略、渲染优化，最终通过监控形成闭环。以下按生命周期各阶段编排。

---

## 1. 格式选择 — 减少传输体积

选择合适的图片格式是优化的第一步，直接影响下载字节数。

| 格式 | 相对 JPEG 体积 | 浏览器支持 | 适用场景 |
|------|---------------|-----------|---------|
| JPEG | 基准 | 全支持 | 照片类回退 |
| WebP | 小 25%-35% | 现代浏览器 | 通用照片、透明图 |
| AVIF | 小约 50% | Chromium 85+、Firefox 93+ | 高压缩需求 |

**关键策略：** 使用 `<picture>` 元素声明多个 `<source>`，按浏览器支持自动选择最优格式，不支持时降级到 JPEG。构建时生成多格式产物是前置条件。

> **能力引用：** A24-WebP/AVIF

---

## 2. 尺寸适配 — 避免传输冗余像素

一张 2000px 宽的图片在 375px 手机上显示，浪费了超过 90% 的像素传输。响应式图片方案让浏览器按实际需要选择最合适的资源。

**`srcset` + `w` 描述符：**
```html
<img
  srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w"
  sizes="(max-width: 600px) 100vw, 50vw"
  src="hero-800.jpg"
  alt="..."
/>
```
浏览器根据 `sizes` 计算出的渲染宽度和设备像素比，自动从 `srcset` 中选取最匹配的资源。

**`<picture>` + 媒体条件：** 针对不同断点提供裁切比例不同的艺术指导图片（Art Direction），而非简单缩放。

> **能力引用：** A25-响应式图片

---

## 3. 加载策略 — 延迟非关键资源

大图量页面的核心矛盾：首屏需要快速呈现，但页面可能有上百张图片。分层加载策略是解决之道。

### 3.1 原生懒加载

```html
<img src="photo.jpg" loading="lazy" alt="..." />
```
浏览器原生支持，零 JS 成本。适用于首屏以下的图片。

### 3.2 IntersectionObserver 懒加载

当需要更精细的控制（自定义阈值、加载动画、错误重试）时，使用 IntersectionObserver：
- **异步可见性观察**，不阻塞主线程
- 一个 Observer 实例可观察多个目标，开销远低于 scroll 事件监听
- 通过 `rootMargin` 配置提前加载距离

### 3.3 首屏 LCP 保护

懒加载的最大风险：误伤首屏大图，导致 LCP（Largest Contentful Paint）劣化。

**保护策略：**
- 首屏图片（如首屏轮播图、Hero Image）**禁止**使用 `loading="lazy"`
- 使用 `fetchpriority="high"` 标记关键图片
- 配合 `preload` 提前发起关键图片请求

> **能力引用：** A26-图片懒加载、A5-IntersectionObserver

---

## 4. 渲染优化 — 减少布局计算与绘制开销

图片加载完成后，渲染阶段仍可能产生性能问题：布局偏移（CLS）、不必要的重绘重排、屏幕外元素的渲染浪费。

### 4.1 CSS `contain`

通过 `contain` 属性限制元素的渲染影响范围：

| 值 | 作用 |
|----|------|
| `size` | 元素尺寸不依赖子元素，避免子元素变化触发外部重排 |
| `layout` | 内部布局不影响外部 |
| `style` | 计数器等样式隔离 |
| `paint` | 溢出内容不绘制，可被合成层优化 |

**实用写法：** `contain: layout size` 用于固定尺寸的图片容器，消除 CLS 并减少布局计算。

### 4.2 `content-visibility: auto`

对大量图片的长列表效果显著：
```css
.image-card { content-visibility: auto; contain-intrinsic-size: 300px 200px; }
```
- 屏幕外元素**跳过渲染阶段**（样式计算、布局、绘制均省略）
- 进入视口时按需渲染，与懒加载形成双重优化
- `contain-intrinsic-size` 提供占位尺寸，防止滚动条跳动

### 4.3 尺寸预留（CLS 消除）

始终为 `<img>` 指定 `width` 和 `height` 属性（或 CSS `aspect-ratio`），让浏览器在图片加载前就能计算布局空间，消除累积布局偏移。

> **能力引用：** A27-CSS contain 与 content-visibility

---

## 5. 监控与度量 — 形成优化闭环

没有度量就没有优化。需要持续追踪关键指标：

| 指标 | 含义 | 工具 |
|------|------|------|
| **LCP** | 最大内容元素渲染时间 | Lighthouse、Web Vitals |
| **CLS** | 累积布局偏移 | Lighthouse、Performance Observer |
| **传输体积** | 图片资源总字节数 | Network 面板、Lighthouse |
| **图片请求数** | 实际发起的图片 HTTP 请求 | Performance API |
| **缓存命中率** | 重复访问时是否走缓存 | CDN 日志 |

**持续监控方式：**
- CI 集成 Lighthouse 审计，设定性能预算
- 使用 `PerformanceObserver` 上报真实用户数据（RUM）
- 监控未懒加载的首屏外图片数量

---

## 优化决策流程图

```
页面含大量图片
    │
    ├─ 1. 构建阶段：生成 WebP/AVIF + JPEG 多格式产物 (A24)
    │
    ├─ 2. HTML 编码：<picture> 声明格式降级 + srcset/sizes 尺寸适配 (A25)
    │
    ├─ 3. 加载策略分流：
    │     ├─ 首屏关键图：fetchpriority="high" + preload (A26)
    │     ├─ 首屏非关键图：原生 loading="lazy" (A26)
    │     └─ 首屏外图片：IntersectionObserver 懒加载 (A5, A26)
    │
    ├─ 4. 渲染优化：
    │     ├─ 固定尺寸容器：contain: layout size (A27)
    │     ├─ 长列表卡片：content-visibility: auto (A27)
    │     └─ img 标签：width/height 消除 CLS (A25)
    │
    └─ 5. 持续监控：LCP/CLS/传输体积 → 反馈优化 (监控)
```

---

## 能力索引

| 能力 ID | 名称 | 生命周期阶段 |
|---------|------|-------------|
| A24 | WebP/AVIF 格式选择 | 格式选择 |
| A25 | 响应式图片（srcset/sizes/picture） | 尺寸适配 |
| A26 | 图片懒加载（loading=lazy / IO） | 加载策略 |
| A5 | IntersectionObserver | 加载策略 |
| A27 | CSS contain 与 content-visibility | 渲染优化 |
