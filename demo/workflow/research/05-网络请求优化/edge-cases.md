# Edge Cases：网络请求优化——接口串行导致首屏阻塞

## 开篇：网络请求的典型坑点

前端性能优化中，网络请求是最容易被忽视却杀伤力最大的环节。表面上看，接口调用是"发出去、收回来"的简单逻辑，但在真实场景中，**串行依赖、缓存雪崩、竞态覆盖、懒加载抖动**等问题会层层叠加，将首屏渲染时间从几百毫秒拖到数秒甚至白屏。以下从四个维度拆解高频 edge case，梳理排查原理与防御方案。

---

## 1. 请求瀑布流：串行依赖拖垮首屏

### 坑点描述

页面初始化时，接口 B 依赖接口 A 的返回值作为参数，接口 C 又依赖 B 的结果——形成 A → B → C 的串行链。每多一跳就多一轮 RTT（Round-Trip Time），在弱网环境下，三跳串行可能消耗 1.5s+ 的纯等待时间，直接击穿 LCP（Largest Contentful Paint）指标的 2.5s 阈值。

### 排查原理

1. **Chrome DevTools Network 面板**：观察 Waterfall 列，串行请求会呈现明显的阶梯状瀑布——A 结束后 B 才开始，B 结束后 C 才开始。并发请求则表现为并列条带。
2. **依赖图还原**：逐个检查每个请求的入参来源。如果 `fetchB` 的参数来自 `await fetchA()` 的响应体，这就是隐式串行依赖。
3. **LCP 元素关联**：定位 LCP 元素（通常是首屏大图或主标题块），向上追溯它的数据来源链路。如果 LCP 渲染依赖 C 的数据，那么整条链路的总耗时就是 LCP 的下限。

### 关键判断标准

| 现象 | 含义 |
|------|------|
| Network Waterfall 出现阶梯状 | 存在串行依赖 |
| LCP 时间 > 2.5s 且 Network 链路 > 2 跳 | 串行链路直接拖慢核心指标 |
| 接口 A 和 B 的入参无交集 | 可并行化，无需串行等待 |

---

## 2. 缓存失效引发回源风暴

### 坑点描述

HTTP 缓存是请求优化的第一道防线，但缓存策略配置不当反而会制造新问题：

- **缓存失效全量回源（P0）**：`Cache-Control` 过期或 `no-cache` 导致所有资源同时回源，瞬间产生大量并发请求，浏览器同域 6 连接限制下形成排队阻塞。
- **协商缓存回源风暴（P1）**：`ETag` / `Last-Modified` 协商缓存在高并发场景下，即使内容未变，每个请求仍需发送条件请求（`304`），在用户量大时对源站形成请求洪峰。

### 排查原理

1. **Network 面板 Status 列**：大量 `200`（强制回源）或密集 `304`（协商回源）是直接信号。
2. **Response Headers 检查**：查看 `Cache-Control`、`Expires`、`ETag`、`Last-Modified` 字段，确认缓存策略是否合理。
3. **资源尺寸与频率分析**：用 Performance 面板的 Network 统计，筛选同类型资源（如图片、API），如果同一批资源同时触发回源，说明缓存键（Cache Key）或过期时间配置有同步问题。

### 关键判断标准

| 现象 | 含义 |
|------|------|
| 同一批资源 Status 全部 `200` 且无 `from cache` | 缓存完全失效，全量回源 |
| 密集 `304` 且 Server 响应时间长 | 协商缓存命中但回源代价高 |
| `Cache-Control: no-store` 或缺失 | 根本未启用缓存 |

---

## 3. 懒加载图片闪烁

### 坑点描述

使用 `IntersectionObserver` 实现图片懒加载时，常见一个视觉 bug：图片在进入视口瞬间先显示占位符（灰色块或低质量缩略图），然后突然跳变为高清图，产生明显的闪烁/布局抖动（Layout Shift）。这会拉高 CLS（Cumulative Layout Shift）指标，同时在图片加载期间 LCP 元素可能尚未出现。

### 排查原理

1. **占位尺寸缺失**：如果 `<img>` 标签没有预设 `width` / `height` 或 `aspect-ratio`，图片加载完成后会撑开容器，导致布局重排。
2. **IntersectionObserver 阈值设置**：`rootMargin` 设置过小（如 `0px`），图片恰好在视口边缘才开始加载，用户可见延迟。设置过大则浪费带宽。
3. **加载状态管理缺失**：`img.onload` 与 `IntersectionObserver` 的回调时序不一致，可能在图片未完全解码时就移除了占位符。

### 关键判断标准

| 现象 | 含义 |
|------|------|
| Performance 面板 Layout Shifts 时间线出现密集偏移 | 图片加载触发布局抖动 |
| 图片元素无 `width`/`height` 属性 | 占位尺寸缺失 |
| `rootMargin: "0px"` | 触发时机过晚，可见延迟 |

---

## 4. 请求竞态：旧响应覆盖新数据

### 坑点描述

用户快速切换搜索关键词或 Tab 时，前一个请求尚未返回，新请求已经发出。如果前一个请求比后一个更晚返回（网络抖动、服务端处理时间不同），旧数据会覆盖新数据，页面展示错误结果。

### 排查原理

1. **时序比对**：在 Network 面板中按发起时间排序，观察是否存在后发先至（后发起的请求先返回）的情况。
2. **AbortController 使用检查**：代码中是否在新请求发起前调用了 `controller.abort()` 取消旧请求。如果没有，竞态无法避免。
3. **响应顺序 vs 数据一致性**：在控制台打印每个请求的发起时间和返回时间，如果返回顺序与发起顺序不一致且无取消机制，竞态必然发生。

### 关键判断标准

| 现象 | 含义 |
|------|------|
| 用户输入 "ab" 后输入 "abc"，页面显示 "ab" 的结果 | 旧请求晚返回，覆盖了新数据 |
| 快速切换 Tab 后内容与当前 Tab 不匹配 | Tab 切换的旧请求未取消 |
| 代码中无 `AbortController` 或请求队列管理 | 缺乏竞态防御 |

---

## 防御方案

### 5.1 请求瀑布流 → 并行化 + 预取

```
方案要点：
1. 分析依赖图，将无依赖关系的接口并行发起（Promise.all）
2. 有依赖关系的接口，通过 BFF 层合并为单一请求（GraphQL / 聚合接口）
3. 利用 <link rel="preload"> 或 prefetch 对首屏关键接口提前发起
4. 首屏数据通过 SSR / SSG 直出，消除客户端请求链路
```

**代码模式**：
```javascript
// ❌ 串行：总耗时 = A + B + C
const a = await fetchA();
const b = await fetchB(a.id);
const c = await fetchC(b.token);

// ✅ 并行：总耗时 = max(A, B, C)（无依赖部分）
const [a, b] = await Promise.all([fetchA(), fetchB()]);
const c = await fetchC(a.id, b.token); // 仅依赖部分串行
```

### 5.2 缓存回源 → 分层缓存策略

```
方案要点：
1. 静态资源：Cache-Control: public, max-age=31536000, immutable（配合内容哈希文件名）
2. API 响应：Cache-Control: private, max-age=0, must-revalidate + ETag 协商缓存
3. 高频接口：Service Worker 缓存 + Stale-While-Revalidate 策略
4. 过期时间错峰：对同类资源设置随机 jitter（如 max-age ± 10%），避免同时回源
```

### 5.3 懒加载闪烁 → 占位 + 渐进过渡

```
方案要点：
1. 所有图片预设 width/height 或 aspect-ratio，避免布局抖动
2. IntersectionObserver 的 rootMargin 设为 "200px"，提前加载
3. 加载完成后先设置 img.src，等待 decode 完成再移除占位符
4. 使用 CSS transition 做 opacity 渐变，视觉上消除闪烁
```

**代码模式**：
```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.decode().then(() => {
        img.classList.add('loaded'); // opacity: 0 → 1 transition
      });
      observer.unobserve(img);
    }
  });
}, { rootMargin: '200px' });
```

### 5.4 请求竞态 → 取消 + 版本号

```
方案要点：
1. 每次新请求前 AbortController.abort() 取消旧请求
2. 或使用请求版本号：每次请求携带递增 version，响应返回时校验 version 是否匹配当前最新
3. 搜索场景用 debounce + abort 组合：用户停止输入 300ms 后才发起请求
```

**代码模式**：
```javascript
let controller = null;

async function search(keyword) {
  controller?.abort();          // 取消旧请求
  controller = new AbortController();
  try {
    const res = await fetch(`/api/search?q=${keyword}`, {
      signal: controller.signal
    });
    return await res.json();
  } catch (e) {
    if (e.name === 'AbortError') return null; // 静默丢弃旧请求
    throw e;
  }
}
```

---

## 通用防御原则

1. **先度量再优化**：用 Lighthouse + Performance 面板量化问题，而非凭直觉猜。LCP > 2.5s、CLS > 0.1 是硬指标。
2. **依赖图是核心工具**：任何请求优化的第一步都是画出接口依赖关系图，识别哪些可以并行、哪些必须串行。
3. **缓存是双刃剑**：缓存策略必须匹配资源的更新频率。静态资源激进缓存，动态数据适度缓存 + 协商。
4. **防御性编程**：竞态问题不会自己消失——只要有异步操作，就必须考虑取消机制。
5. **渐进增强**：懒加载、预取、Service Worker 等优化手段应作为增强层，不应阻塞核心渲染路径。
