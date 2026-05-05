# N1 - Next/Nuxt SSR 实践

## 核心机制

### 渲染模式全景
现代元框架（Next.js / Nuxt）提供三种服务端渲染模式：

| 模式 | 执行时机 | 适用场景 | 特点 |
|------|----------|----------|------|
| **SSR** | 每次请求 | 实时数据、个性化内容 | 动态生成，TTFB 取决于服务端性能 |
| **SSG** | 构建时 | 静态内容、博客、文档 | CDN 分发，TTFB 极低 |
| **ISR** | 构建时 + 定期重验证 | 半静态内容、商品列表 | 兼顾静态性能和数据新鲜度 |

### Next.js 数据获取

**Pages Router（传统）**：
```jsx
// SSR - 每次请求执行
export async function getServerSideProps(context) {
  const data = await fetch('https://api.example.com/data');
  return { props: { data: await data.json() } };
}

// SSG - 构建时执行
export async function getStaticProps() {
  const data = await fetch('https://api.example.com/data');
  return { props: { data: await data.json() }, revalidate: 60 }; // ISR: 60秒重验证
}
```

**App Router（现代）**：
```tsx
// 服务端组件 - 默认 SSR
async function Page({ params }) {
  const data = await fetch(`https://api.example.com/${params.id}`, {
    next: { revalidate: 60 } // ISR
  });
  return <div>{await data.json()}</div>;
}

// 客户端获取
'use client';
function ClientPage() {
  const { data } = useSWR('/api/data', fetcher);
  return <div>{data}</div>;
}
```

### Nuxt 数据获取

```vue
<!-- useAsyncData - SSR/CSR 通用 -->
<script setup>
const { data, pending, error } = await useAsyncData('key', () => 
  $fetch('/api/posts')
);
</script>

<!-- useFetch - 快捷方式 -->
<script setup>
const { data } = await useFetch('/api/posts');
</script>

<!-- 服务端 API -->
<!-- server/api/posts.get.ts -->
export default defineEventHandler(async () => {
  return await db.posts.findMany();
});
```

### 模式选择决策树

```
内容是否频繁变化？
├─ 是 → SSR（每次请求动态生成）
│       └─ 需要缓存？→ ISR（revalidate + CDN）
├─ 否 → SSG（构建时生成）
│       └─ 页面数量巨大？→ 增量式 SSG
└─ 混合 → SSR + SSG 混合（关键页面 SSG，动态页面 SSR）
```

## 工程瓶颈

1. **SSR 服务端性能**：每个请求都执行渲染，高并发下 Node.js 单线程瓶颈
2. **数据 Waterfall**：串行数据获取导致 TTFB 增长，需要并行获取或 Streaming
3. **ISR 缓存一致性**：revalidate 期间可能返回旧数据（stale-while-revalidate）
4. **SSG 构建时间**：大量页面的 SSG 构建时间线性增长
5. **Hydration 开销**：无论哪种模式，客户端都需要 hydration，JS 执行量不变

## 调试工具

- **Next.js DevTools**：查看渲染模式、缓存状态
- **Nuxt DevTools**：SSR 数据流、组件 hydration 状态
- **Vercel Analytics / Netlify Analytics**：TTFB、渲染模式分布
- **Chrome DevTools Network**：查看 SSR 响应时间和数据获取 waterfall
- **Lighthouse**：综合性能评分

## 典型权衡

### 权衡 1：SSR vs SSG
- SSR：数据实时但 TTFB 高，服务端压力大
- SSG：TTFB 极低但数据可能过期，构建时间长
- ISR：折中方案，但缓存控制复杂

### 权衡 2：数据获取粒度
- 页面级获取：简单但 waterfall
- 组件级获取（React Server Components）：并行获取但架构复杂
- 路由级缓存：Next.js App Router 的 `fetch` 缓存策略

### 权衡 3：服务端 API vs 外部 API 直连
- 服务端 API（Nuxt server routes）：安全但增加网络跳数
- 直连外部 API：减少延迟但暴露 API 地址

## 最小验证实验

```tsx
// 实验：Next.js App Router 三种渲染模式对比
// app/ssr/page.tsx - SSR（默认）
export const dynamic = 'force-dynamic';
export default async function SSRPage() {
  const data = await fetch('https://jsonplaceholder.typicode.com/posts/1');
  const post = await data.json();
  return <div><h1>{post.title}</h1><p>{post.body}</p></div>;
}

// app/ssg/page.tsx - SSG
export const dynamic = 'force-static';
export default async function SSGPage() {
  const data = await fetch('https://jsonplaceholder.typicode.com/posts/1');
  const post = await data.json();
  return <div><h1>{post.title}</h1><p>{post.body}</p></div>;
}

// app/isr/page.tsx - ISR
export const revalidate = 10; // 10秒重验证
export default async function ISRPage() {
  const data = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
    next: { revalidate: 10 }
  });
  const post = await data.json();
  return (
    <div>
      <h1>{post.title}</h1>
      <p>渲染时间: {new Date().toISOString()}</p>
    </div>
  );
}
```

**预期结果**：
- SSR 页面：每次刷新渲染时间不同
- SSG 页面：构建后渲染时间固定
- ISR 页面：10秒内渲染时间固定，10秒后下次请求更新

## 参考资料

1. [Next.js 官方文档 - 数据获取](https://nextjs.org/docs/app/building-your-application/data-fetching)
2. [Nuxt 3 官方文档 - 数据获取](https://nuxt.com/docs/getting-started/data-fetching)
3. [Next.js SSR/SSG/ISR 详解 - CSDN](https://modelers.csdn.net/690058ad5511483559dd179f.html)
4. [Next.js/Nuxt.js SSR 实践指南 - CSDN](https://fruge365.blog.csdn.net/article/details/153964482)
5. [React Server Components 与 Next.js App Router](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
