# 滚动性能：长页面大量图片的懒加载与滚动优化

## 为什么电商商品列表是滚动卡顿的"重灾区"

打开任何一个主流电商 App 或网站的商品列表页，你面对的是一个极具挑战性的渲染场景：一个理论上无限长的页面，每个卡片都包含图片、价格、标签等富内容元素，用户持续快速滑动。一旦帧率掉到 30fps 以下，用户感知到的就是"卡"——滑动不跟手、白屏闪烁、内容跳动。

这个场景之所以成为性能瓶颈的典型代表，是因为它同时叠加了三个核心矛盾：

1. **DOM 规模与首屏渲染的矛盾**——列表可能有数千条数据，但视口只显示 6-10 条
2. **图片资源体积与网络带宽的矛盾**——商品图是页面体积的主体（通常占 80%+），但移动网络条件参差不齐
3. **滚动流畅度与动态加载的矛盾**——懒加载触发的布局变化可能反过来破坏滚动体验本身

理解这个场景的优化思路，本质上是在理解浏览器渲染管线、资源加载策略与用户感知之间的工程博弈。

---

## 一、浏览器渲染管线：滚动卡顿的根本原因

### 1.1 关键渲染路径（CRP）全链路

浏览器将 HTML/CSS/JS 转化为屏幕像素的过程称为关键渲染路径（Critical Rendering Path），其完整链路为：

```
DOM Tree + CSSOM Tree
       ↓
    Render Tree（渲染树）
       ↓
    Layout（布局/回流）→ 计算每个元素的几何信息（位置、尺寸）
       ↓
    Paint（绘制）→ 填充像素到多个层（Layer）
       ↓
    Composite（合成）→ GPU 合成最终画面
```

**滚动时的核心卡顿点在 Layout 和 Paint 阶段。** 每一帧（16.6ms@60fps）需要完成从 JavaScript 执行到像素上屏的完整流程。如果滚动过程中触发了强制同步布局或大面积重绘，帧预算会被瞬间耗尽。

### 1.2 强制同步布局（Forced Synchronous Layout）——滚动场景的头号杀手

强制同步布局是滚动优化中最常见也最致命的性能陷阱。其触发模式为：

```
// 危险模式：在滚动回调中交替读写布局属性
scroll.addEventListener('scroll', () => {
  const height = element.offsetHeight;  // 读（强制浏览器立即计算布局）
  element.style.height = height + 10;   // 写（标记布局为脏）
  // → 下一次读又会强制重新布局 → 无限循环
});
```

**时序竞争的本质**：浏览器为了节省资源，会将布局计算推迟到下一帧。但一旦你在同一帧内先写了布局属性、又读了布局属性，浏览器被迫立即执行同步布局以返回正确值。在快速滚动时，这种同步布局每帧都可能发生，直接导致帧率骤降。

**规避策略**：
- 使用 `requestAnimationFrame` 将读写批量集中到帧的固定阶段
- 优先使用 `IntersectionObserver` 替代手动计算元素位置
- 使用 `will-change: transform` 或 `transform: translateZ(0)` 将元素提升到独立合成层，避免触发主线程布局

---

## 二、IntersectionObserver：懒加载的基础设施

### 2.1 为什么需要异步的可见性检测

传统懒加载方案依赖 `scroll` 事件 + `getBoundingClientRect()` 的组合：

```
scroll.addEventListener('scroll', () => {
  images.forEach(img => {
    const rect = img.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      img.src = img.dataset.src;
    }
  });
});
```

这个方案有三个致命问题：
1. **主线程阻塞**：`scroll` 事件的回调在主线程执行，大量 `getBoundingClientRect()` 调用本身就很昂贵
2. **强制同步布局**：`getBoundingClientRect()` 会强制浏览器计算最新的布局信息
3. **节流的两难**：节流间隔太长导致图片加载延迟，太短则性能不足

`IntersectionObserver`（IO）将可见性检测移到了独立的异步观察器中，浏览器在合适的时机（通常在布局计算之后）批量通知回调，完全不阻塞主线程。

### 2.2 IO 的核心配置与策略

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img); // 加载后停止观察
    }
  });
}, {
  rootMargin: '200px 0px',  // 提前 200px 开始加载
  threshold: 0               // 只要进入视口就触发
});
```

**`rootMargin` 是关键调优参数**：
- 太小：用户看到图片才开始加载，感知到白屏→图片的闪烁过程
- 太大：预加载过多图片，浪费带宽
- 经验值：移动端 150-300px，桌面端 300-500px

### 2.3 懒加载图片闪烁问题（P0）

懒加载场景下最常见的用户体验问题是"闪烁"——用户滚动时看到占位图→突然切换为真实图片，产生视觉跳动。

**闪烁的两个根源**：
1. **尺寸未预留**：图片未加载时占位尺寸为 0，加载完成后撑开布局（触发 CLS 布局偏移）
2. **加载延迟**：图片请求发出到显示之间有网络延迟

**解决手段**：
- 始终通过 `width`/`height` 或 `aspect-ratio` 预留图片空间
- 使用低质量占位图（LQIP）或骨架屏作为过渡
- 渐入动画（`opacity` 过渡）平滑切换，减少视觉突变

---

## 三、CLS 布局偏移：滚动体验的隐形杀手

### 3.1 Core Web Vitals 中的 CLS

累积布局偏移（Cumulative Layout Shift）衡量页面生命周期中所有意外布局变化的总和。Google 的建议阈值为 **CLS ≤ 0.1**。

在商品列表场景中，CLS 偏移的常见来源：

| 偏移来源 | 触发时机 | 严重程度 |
|---------|---------|---------|
| 图片加载后撑开尺寸 | 懒加载图片到达 | 高 |
| 动态插入广告/推荐模块 | 滚动到特定位置 | 中 |
| 字体加载导致文本重排 | FOUT/FOIT | 低-中 |
| 骨架屏替换为真实内容 | 数据返回 | 低 |

### 3.2 滚动场景中 CLS 的特殊性

常规页面的 CLS 主要在首屏加载阶段累积，而商品列表的 CLS 是**持续性的**——用户每滚动一段距离，新的图片就可能触发布局偏移。这意味着：

- 不能只关注"首次 CLS"，需要监控滚动全程的偏移累积
- 单次偏移量（session window）比总 CLS 更能反映用户感知
- Chrome DevTools 的 Performance 面板可以逐帧查看布局偏移

---

## 四、图片格式与资源优化

### 4.1 格式选择：JPEG → WebP → AVIF

商品图片是列表页资源体积的绝对主体。格式优化的收益直接等同于加载速度的提升：

| 格式 | 相对体积（以 JPEG 为基准） | 浏览器支持 | 适用场景 |
|------|------------------------|-----------|---------|
| JPEG | 100% | 全支持 | 兜底格式 |
| WebP | 66-75%（小 25-34%） | 96%+ | 主力格式 |
| AVIF | 50-60%（再小 20%） | 90%+ | 进阶优化 |

### 4.2 `<picture>` 元素的渐进回退

```html
<picture>
  <source srcset="product.avif" type="image/avif">
  <source srcset="product.webp" type="image/webp">
  <img src="product.jpg" alt="商品图片" width="300" height="300"
       loading="lazy" decoding="async">
</picture>
```

浏览器会自动选择第一个支持的格式，实现无 JavaScript 的格式降级。

### 4.3 压缩策略的权衡

- **CDN 动态处理**（推荐）：上传原图，CDN 根据请求的 `Accept` 头返回最优格式和尺寸。优势是一份原图适配所有设备
- **构建时预处理**：在 CI/CD 阶段生成多格式产物。优势是精确控制压缩参数
- **前端实时压缩**（不推荐）：在客户端用 Canvas 压缩。CPU 消耗大，且无法利用服务端优化

---

## 五、CSS `contain` 与 `content-visibility`：渲染隔离

### 5.1 `contain` 属性：限制重排范围

```css
.product-card {
  contain: layout paint style;
}
```

`contain` 告诉浏览器：这个元素的子树变化不会影响外部布局。当列表中某张图片加载完成导致卡片内部重排时，浏览器只需重排该卡片，而非整个页面。

**`contain` 的值与效果**：

| 值 | 隔离内容 | 滚动优化价值 |
|---|---------|------------|
| `layout` | 子树不影响外部布局 | 高：限制重排传播 |
| `paint` | 子树不溢出边界 | 中：减少绘制区域 |
| `size` | 子树不依赖子元素尺寸 | 高：跳过子树布局计算 |
| `content` | layout + paint + style | 综合推荐 |

### 5.2 `content-visibility: auto`：跳过视口外渲染

```css
.product-card {
  content-visibility: auto;
  contain-intrinsic-size: 300px 400px; /* 预估尺寸 */
}
```

这是滚动优化的"杀手级"属性。当卡片不在视口内时，浏览器会跳过其渲染子树的布局和绘制，**仅保留占位尺寸**。对于有数千个商品卡片的列表，这意味着：

- 视口外的 99% 卡片几乎零渲染开销
- 滚动时只有即将进入视口的卡片才会被完整渲染
- 必须配合 `contain-intrinsic-size` 提供占位尺寸，否则布局会跳动

### 5.3 层爆炸风险

使用 `will-change`、`transform: translateZ(0)` 或 `content-visibility` 时，每个元素可能被提升为独立的合成层（Compositing Layer）。当列表中有数百个卡片时，层的数量可能爆炸式增长，导致：

- GPU 显存占用飙升
- 合成阶段本身的开销增大
- 移动设备上可能触发内存降级

**控制策略**：只对即将进入视口的元素（通过 IO 触发）添加 `will-change`，离开视口后移除。

---

## 六、综合优化策略：从原理到实践

将上述原理整合为一个完整的电商商品列表优化方案：

```
┌─────────────────────────────────────────────────┐
│                 用户滚动商品列表                    │
├─────────────────────────────────────────────────┤
│                                                   │
│  1. CSS 层：content-visibility:auto 隔离视口外渲染  │
│     + contain:layout paint 限制重排范围             │
│                                                   │
│  2. 图片层：IntersectionObserver 异步触发懒加载      │
│     + rootMargin 提前预加载                         │
│     + <picture> 多格式回退（AVIF→WebP→JPEG）        │
│     + width/height 预留尺寸 防止 CLS                │
│                                                   │
│  3. 数据层：虚拟滚动 / 增量渲染                      │
│     + 仅维护视口附近 DOM 节点                        │
│                                                   │
│  4. 感知层：骨架屏 + LQIP + opacity 渐入动画        │
│     + 消除视觉闪烁                                  │
│                                                   │
└─────────────────────────────────────────────────┘
```

---

## 七、Vue / React 中的具体实现

### 7.1 Vue 3：`v-lazy` 指令 + 组件封装

**原生方案（零依赖）**：

```vue
<!-- LazyImage.vue -->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  src: String,
  alt: String,
  width: Number,
  height: Number,
})

const imgRef = ref(null)
const loaded = ref(false)
const visible = ref(false)

let observer

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        visible.value = true
        observer.unobserve(entry.target)
      }
    },
    { rootMargin: '200px 0px' }
  )
  observer.observe(imgRef.value)
})

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div ref="imgRef" class="lazy-img-wrapper" :style="{ aspectRatio: `${width}/${height}` }">
    <img
      v-if="visible"
      :src="src"
      :alt="alt"
      :width="width"
      :height="height"
      loading="lazy"
      decoding="async"
      @load="loaded = true"
      :class="{ 'fade-in': loaded }"
    />
    <div v-else class="skeleton" />
  </div>
</template>

<style scoped>
.lazy-img-wrapper {
  contain: layout paint;
  content-visibility: auto;
  contain-intrinsic-size: auto 300px 400px;
  overflow: hidden;
}
.fade-in {
  animation: fadeIn 0.3s ease-in;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
```

**生态方案**：`vue-lazyload`、`lozad.js`（无框架依赖）

### 7.2 React：`useIntersectionObserver` Hook

```jsx
// useLazyImage.js
import { useState, useEffect, useRef } from 'react'

export function useLazyImage(src, { rootMargin = '200px' } = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(el)
        }
      },
      { rootMargin: `${rootMargin} 0px` }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])

  return { ref, isVisible, isLoaded, onLoad: () => setIsLoaded(true) }
}

// LazyImage.jsx
function LazyImage({ src, alt, width, height }) {
  const { ref, isVisible, isLoaded, onLoad } = useLazyImage(src)

  return (
    <div
      ref={ref}
      style={{
        aspectRatio: `${width}/${height}`,
        contain: 'layout paint',
        contentVisibility: 'auto',
        containIntrinsicSize: `auto ${width}px ${height}px`,
      }}
    >
      {isVisible ? (
        <picture>
          <source srcSet={src.replace(/\.\w+$/, '.avif')} type="image/avif" />
          <source srcSet={src.replace(/\.\w+$/, '.webp')} type="image/webp" />
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
            onLoad={onLoad}
            style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
          />
        </picture>
      ) : (
        <div className="skeleton" />
      )}
    </div>
  )
}
```

**生态方案**：`react-lazyload`、`react-intersection-observer`（对 IO 的封装）

### 7.3 虚拟滚动：当懒加载不够用时

当商品列表数量达到万级以上，仅靠懒加载不足以控制 DOM 观模。此时需要虚拟滚动（Virtual Scrolling）：

| 方案 | Vue | React |
|------|-----|-------|
| 基础虚拟列表 | `vue-virtual-scroller` | `react-window` / `react-virtualized` |
| 动态高度 | `@tanstack/vue-virtual` | `@tanstack/react-virtual` |
| 瀑布流 | 手动实现 | `react-virtualized` Masonry |

虚拟滚动的核心思想：只渲染视口附近的 N 个 DOM 节点，其余用空白占位。配合 `IntersectionObserver` 实现图片懒加载，两者互补。

---

## 总结

电商商品列表的滚动性能优化，本质上是**三个层面的协同**：

1. **渲染层**：通过 `contain`、`content-visibility` 减少浏览器的布局和绘制工作量
2. **资源层**：通过 `IntersectionObserver` 懒加载 + 现代图片格式减少网络和解码开销
3. **感知层**：通过骨架屏、占位尺寸、渐入动画消除用户可感知的"卡顿感"

三者缺一不可。只做懒加载而不预留尺寸会导致 CLS 飙升；只做格式优化而不做渲染隔离，快速滚动时仍会掉帧；只做虚拟滚动而忽略图片优化，带宽依然是瓶颈。

**最终检验标准**：在 DevTools Performance 面板中，以 4x CPU 节流模拟中端设备，快速滚动商品列表，检查每一帧是否都在 16.6ms 预算内完成。
