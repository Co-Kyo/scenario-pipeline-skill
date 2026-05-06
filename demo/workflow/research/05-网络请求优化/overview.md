# 网络请求优化：接口串行导致首屏阻塞——瀑布流请求与并发控制

## 问题：首屏 3-5 秒，罪魁祸首是谁？

用户打开页面，白屏等了 3-5 秒。抓包一看：`/user/info` 跑完才发 `/config`，`/config` 回来才发 `/list`，三个接口各 800ms，串行叠加就是 2.4 秒。加上浏览器解析渲染的开销，首屏直奔 3-5 秒。

这就是**请求瀑布流（Request Waterfall）**——多个接口串行执行，总延迟等于所有请求时间之和。它不是网络慢，是**调度策略错了**。

---

## 一、浏览器视角：串行请求如何阻塞渲染

### 1.1 关键渲染路径（CRP）

浏览器从拿到 HTML 到首屏像素上屏，经历一条关键路径：

1. **解析 HTML** → 构建 DOM
2. **解析 CSS** → 构建 CSSOM（渲染阻塞）
3. **执行 JS** → 修改 DOM/CSSOM（解析阻塞）
4. **合并** → Render Tree → Layout → Paint

CSS 是**渲染阻塞资源**：CSSOM 未就绪前，浏览器不会进行首次渲染。JS 是**解析阻塞资源**：遇到 `<script>` 标签，HTML 解析暂停，等 JS 下载并执行完毕。

当多个接口串行返回数据，而这些数据驱动了 DOM 的生成或 JS 的执行，每一个等待都在向渲染管线注入延迟。

### 1.2 串行 → 阻塞链

典型的阻塞链如下：

```
HTML 解析 → 发现需要 /api/config → 等待响应 800ms
  → 拿到配置，拼接请求 → 发出 /api/user  → 等待响应 600ms
    → 拿到用户信息 → 发出 /api/list   → 等待响应 700ms
      → 全部就绪 → 渲染首屏
总耗时 ≈ 800 + 600 + 700 = 2100ms（纯等待）
```

如果这三条请求彼此无依赖，并发执行的理论耗时是 `max(800, 600, 700) = 800ms`。串行 vs 并发，差了 **2.6 倍**。

---

## 二、通用原理：并发控制的本质

### 2.1 并发 vs 并行

- **并发（Concurrency）**：多个任务交替推进，逻辑上"同时进行"。
- **并行（Parallelism）**：多个任务物理上同时执行。

浏览器对同一域名有 **6 个 TCP 连接上限**（HTTP/1.1），超出的请求进入排队。HTTP/2 下虽然单连接多路复用，但服务器端、带宽、CPU 仍有瓶颈。因此"并发"不等于"无限并发"，需要**并发控制**。

### 2.2 并发控制的三个层次

| 层次 | 策略 | 原理 |
|------|------|------|
| **客户端并发** | `Promise.all` / `Promise.allSettled` | 多个无依赖请求同时发出，等最慢的一个返回 |
| **BFF 聚合** | 网关层合并多个下游接口 | 一次客户端请求 → 服务端并行调 N 个内部服务 → 返回聚合结果 |
| **数据预取** | 路由级 / 组件级提前发起请求 | 在用户触发导航前就开始拉取目标页数据 |

三层可以叠加使用，但每一层解决的问题不同：

- **客户端并发**：消除串行等待，适合无依赖关系的同域请求。
- **BFF 聚合**：减少客户端请求次数，降低 RTT，适合微服务架构。
- **数据预取**：隐藏网络延迟，让用户感知的等待时间趋近于零。

### 2.3 并发限制与连接数

浏览器对同一域名的并发连接数有限制：

- HTTP/1.1：**6 个** TCP 连接（Chrome/Firefox）
- HTTP/2：单连接多路复用，理论上无限制，但实际受服务器并发处理能力约束

这意味着即使你同时发出 20 个请求，浏览器也只会并行执行 6 个，其余排队。因此：

- **合理分组**：将首屏关键请求控制在 6 个以内。
- **域名分片**：利用多个子域名突破连接数限制（HTTP/1.1 时代常用，HTTP/2 后价值降低）。
- **优先级标记**：利用 `fetchpriority="high"` 提示浏览器优先处理关键资源。

---

## 三、瀑布流请求的典型模式与解法

### 3.1 模式一：链式依赖

```
getUser() → getConfig() → getList()
```

**问题**：三个接口串行，总耗时 = T1 + T2 + T3。

**解法**：分析依赖关系。如果 `getList` 只依赖 `userId`（从 `getUser` 返回），而 `getConfig` 无依赖，则：

```js
const [user, config] = await Promise.all([getUser(), getConfig()]);
const list = await getList(user.id);
// 总耗时 = max(T1, T2) + T3
```

**核心原则**：只在真正有数据依赖时才串行，其余全部并发。

### 3.2 模式二：页面级串行初始化

```js
// 典型的反面模式
async function initPage() {
  const config = await fetch('/api/config');      // 300ms
  const user = await fetch('/api/user');          // 500ms
  const products = await fetch('/api/products');  // 400ms
  const ads = await fetch('/api/ads');            // 200ms
  // 首屏等了 1400ms
}
```

**解法**：

```js
async function initPage() {
  const [config, user, products, ads] = await Promise.all([
    fetch('/api/config'),
    fetch('/api/user'),
    fetch('/api/products'),
    fetch('/api/ads'),
  ]);
  // 首屏等了 max(300, 500, 400, 200) = 500ms
}
```

### 3.3 模式三：竞态条件

并发出多个请求后，用户快速切换页面，旧请求的响应回来覆盖了新数据。

**解法**：

- **请求取消**：使用 `AbortController`，页面切换时取消未完成的请求。
- **请求标识**：给每个请求打 tag，响应回来时校验 tag 是否匹配当前状态。
- **SWR/React Query 内置处理**：这些库自动管理请求的生命周期，切换 key 时自动取消旧请求。

---

## 四、缓存如何放大或缩小问题

### 4.1 HTTP 缓存的作用

- **强缓存（Cache-Control / Expires）**：命中时零网络开销，直接从本地读取。对首屏速度贡献最大。
- **协商缓存（ETag / Last-Modified）**：仍需发送请求，但响应体可能为 304（无变化），节省传输时间。

### 4.2 缓存失效时的瀑布流放大效应

当强缓存失效（如版本更新、CDN 回源），所有本该走缓存的请求突然全部回源，形成**回源风暴**：

- 平时：10 个请求，9 个走缓存，1 个回源 → 感知延迟低
- 失效瞬间：10 个请求全部回源 → 并发连接被打满，每个请求都在排队

**应对策略**：

- **缓存分层**：静态资源用内容哈希文件名（`app.[hash].js`），设置长期强缓存；API 响应根据业务特性设置合理的 `max-age`。
- **预热缓存**：版本发布后主动预热 CDN 缓存，避免冷启动回源。
- **渐进式失效**：灰度发布，逐步切换流量，避免瞬间全部回源。

### 4.3 缓存与并发的协同

缓存本质上是**用空间换时间**。在并发场景下：

- 命中缓存的请求瞬间完成，不占用并发连接。
- 未命中缓存的请求才真正需要并发控制。
- 因此**缓存做得越好，需要并发控制的请求越少**。

---

## 五、Core Web Vitals：量化串行请求的影响

### 5.1 LCP（Largest Contentful Paint）

LCP 衡量最大内容元素的渲染时间。如果 LCP 元素（如首屏大图、主标题）依赖接口返回的数据或资源加载，串行请求会直接拉高 LCP。

**优化方向**：

- LCP 资源使用 `fetchpriority="high"` 提升优先级。
- 服务端渲染（SSR）或流式 SSR，让 LCP 元素尽早出现在 HTML 中。
- 预加载关键资源：`<link rel="preload">`。

### 5.2 CLS（Cumulative Layout Shift）

懒加载图片未设置占位尺寸 → 图片加载完成后布局跳动 → CLS 升高。这与请求串行的关系：串行加载意味着布局变化分批发生，每一批都可能触发 CLS。

**解决**：图片容器设置固定宽高比（`aspect-ratio`），或使用 `width`/`height` 属性。

### 5.3 INP（Interaction to Next Paint）

串行请求期间，主线程可能被占用（如 JS 等待 `await` 后的同步操作），导致用户交互响应变慢。并发请求 + 非阻塞处理可以改善 INP。

---

## 六、落地方案：React Query / SWR + 接口聚合

### 6.1 为什么选择数据请求库

手动管理 `Promise.all` 存在以下问题：

- **缓存管理**：需要自己实现内存缓存、过期策略、失效机制。
- **请求去重**：同一数据被多个组件请求时，需要手动去重。
- **竞态处理**：组件卸载后响应回来，需要手动取消和校验。
- **重试与错误处理**：需要自己实现指数退避重试。
- **乐观更新**：需要自己管理本地状态与服务端状态的同步。

**React Query** 和 **SWR** 解决了以上所有问题，同时内置了并发优化。

### 6.2 React Query 实践

```tsx
import { useQuery, useQueries } from '@tanstack/react-query';

// 单个请求 —— 自动缓存、去重、重试
function UserPage() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => fetch('/api/user').then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 分钟内认为数据新鲜，不重新请求
  });

  // 依赖请求 —— 自动等待前置数据
  const { data: orders } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: () => fetch(`/api/orders?userId=${user.id}`).then(r => r.json()),
    enabled: !!user?.id, // user 就绪后才发起
  });
}

// 无依赖的多个请求 —— 并发执行
function Dashboard() {
  const results = useQueries({
    queries: [
      { queryKey: ['stats'], queryFn: fetchStats },
      { queryKey: ['notifications'], queryFn: fetchNotifications },
      { queryKey: ['recent'], queryFn: fetchRecent },
    ],
  });
  // 三个请求并发，全部就绪后渲染
}
```

### 6.3 SWR 实践

```tsx
import useSWR from 'swr';

function Dashboard() {
  // 并发请求，SWR 自动去重和缓存
  const { data: stats } = useSWR('/api/stats', fetcher);
  const { data: user } = useSWR('/api/user', fetcher);
  const { data: list } = useSWR('/api/list', fetcher);
}
```

SWR 的优势在于更轻量、API 更简洁；React Query 的优势在于更强大的缓存控制、Mutation 管理和开发工具。

### 6.4 BFF 接口聚合

当客户端请求过多（> 6 个），即使并发也受限于浏览器连接数。此时在 BFF 层聚合：

```ts
// BFF 聚合接口
// GET /api/dashboard-data
app.get('/api-dashboard/data', async (req, res) => {
  const [user, stats, notifications, recent] = await Promise.all([
    userService.getUser(req.userId),
    statsService.getStats(req.userId),
    notificationService.getUnread(req.userId),
    recentService.getRecent(req.userId),
  ]);
  res.json({ user, stats, notifications, recent });
});
```

客户端只需一次请求，服务端并行调用微服务。将 N 次客户端请求 → 1 次请求，RTT 从 N 次降到 1 次。

### 6.5 数据预取

```tsx
// 路由级预取：鼠标悬停导航链接时就开始请求
function NavLink({ to, children }) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: ['page-data', to],
      queryFn: () => fetchPageData(to),
    });
  };

  return <Link to={to} onMouseEnter={prefetch}>{children}</Link>;
}
```

用户点击时数据已在缓存中，感知延迟接近零。

---

## 七、决策清单

| 场景 | 推荐方案 |
|------|----------|
| 首屏多个无依赖 API | `Promise.all` / `useQueries` 并发 |
| 接口间有数据依赖 | 只在依赖处串行，其余并发 |
| 客户端请求 > 6 个 | BFF 聚合，减少客户端请求次数 |
| 用户可能快速导航 | 数据预取（路由级 / 组件级） |
| 需要缓存 + 去重 + 重试 | React Query 或 SWR |
| 缓存失效导致性能抖动 | 内容哈希 + 长期缓存 + CDN 预热 |
| 竞态条件 | AbortController + 请求标识 / 使用 React Query 自动管理 |

---

## 总结

首屏慢的根因往往不是单个接口慢，而是**多个接口被串行执行**。优化的核心思路：

1. **并发化**：无依赖请求用 `Promise.all` 同时发出，将 N 次串行等待压缩为 1 次。
2. **缓存化**：命中缓存的请求瞬间完成，减少需要并发管理的请求数。
3. **聚合化**：BFF 层合并接口，减少客户端请求次数和 RTT。
4. **预取化**：提前发起请求，隐藏网络延迟。
5. **工具化**：用 React Query / SWR 替代手动管理，内置缓存、去重、重试、竞态处理。

从 3-5 秒到 1 秒以内，往往只需要把串行改成并发，再加一层缓存策略。
