# R2 - React Hydration

## 核心机制

### SSR Hydration 基本流程
Hydration（水合/激活）是 SSR 的客户端阶段，将服务端生成的静态 HTML "激活"为可交互的 React 应用：

1. **服务端**：执行组件渲染逻辑 → 生成完整 HTML → 发送响应
2. **客户端**：接收 HTML → 加载 JS Bundle → React 在已有 DOM 上"附加"事件监听和状态
3. **关键前提**：客户端渲染结果必须与服务端 HTML 完全一致，否则触发 mismatch

### React 18 新 SSR 架构
React 18 引入了全新的 Suspense SSR 架构，解决了传统 SSR 的三大问题：

**传统 SSR 的 Waterfall 问题**：
```
获取所有数据 → 渲染所有 HTML → 加载所有 JS → Hydrate 所有元素
```

**React 18 的 Streaming + Selective Hydration**：
```
部分 HTML 开始 Stream → 部分代码到达即开始 Hydrate → 用户交互优先处理
```

### 三个核心突破

1. **Streaming HTML**：使用 `<Suspense>` 包裹延迟组件，服务端先发送 fallback HTML，数据准备好后通过同一 stream 补充真实 HTML（inline script 插入）
2. **Selective Hydration**：不同 `<Suspense>` 边界的组件独立 hydrate，不相互阻塞。用户交互的组件会被优先处理
3. **Non-blocking Hydration**：hydrate 过程可被浏览器事件中断，不会阻塞用户交互

```jsx
<Layout>
  <NavBar />
  <Suspense fallback={<Spinner />}>
    <Sidebar />
  </Suspense>
  <RightPane>
    <Post />
    <Suspense fallback={<CommentsGlimmer />}>
      <Comments />
    </Suspense>
  </RightPane>
</Layout>
```

## 工程瓶颈

1. **Hydration Mismatch 频发**：服务端与客户端环境天然不一致（时间、window 对象、localStorage），导致 mismatch 无法完全避免
2. **全量 Hydration 开销**：传统 SSR 即使页面大部分静态，也要对整页执行 hydration，JS 执行量大
3. **数据 Waterfall**：`getServerSideProps` 必须在渲染前获取所有数据，慢接口拖慢整体
4. **代码分割与 SSR 冲突**：`React.lazy()` 在传统 SSR 中不支持，需要 React 18 的 Suspense SSR
5. **首屏 TTFB vs 完整性**：Streaming HTML 可能先发送不完整内容，搜索引擎可能抓到 fallback

## 调试工具

- **React DevTools**：查看组件树 hydration 状态
- **Chrome DevTools Performance 面板**：分析 hydration 耗时
- **`__VUE_PROD_HYDRATION_MISMATCH_DETAILS__`**（Vue 对应）/ React 控制台 warning：定位 mismatch 位置
- **Lighthouse**：测量 TTFB、FCP、TTI 等指标
- **React Profiler**：追踪 hydration 阶段的组件渲染

## 典型权衡

### 权衡 1：TTFB vs 内容完整性
- Streaming HTML 可以更快返回首屏，但 Suspense fallback 内容对 SEO 不友好
- 使用 `onCompleteAll` 可等待所有数据，但会增加 TTFB

### 权衡 2：Hydration 范围 vs 交互延迟
- 全量 hydration：完整性好但 JS 执行量大
- Selective Hydration：优先处理用户交互区域，但需要合理划分 Suspense 边界
- Islands Architecture：最小化 hydration 范围，但增加了架构复杂度

### 权衡 3：数据获取策略
- 服务端统一获取：简单但有 waterfall 问题
- 流式获取 + Suspense：体验好但需要服务端支持 streaming
- 客户端获取：无 waterfall 但首屏无数据

## 最小验证实验

```jsx
// 实验：Selective Hydration — 观察 Suspense 边界如何独立 hydrate
// 1. 创建 Next.js 项目（App Router）
// 2. 添加以下页面代码：

// app/page.tsx
import { Suspense } from 'react';

async function SlowComponent() {
  // 模拟慢接口
  await new Promise(resolve => setTimeout(resolve, 3000));
  return <div style={{ padding: 20, background: '#e8f5e9' }}>慢组件已加载</div>;
}

async function FastComponent() {
  await new Promise(resolve => setTimeout(resolve, 500));
  return <div style={{ padding: 20, background: '#e3f2fd' }}>快组件已加载</div>;
}

export default function Page() {
  return (
    <div>
      <h1>Selective Hydration Demo</h1>
      <Suspense fallback={<div>Loading slow...</div>}>
        <SlowComponent />
      </Suspense>
      <Suspense fallback={<div>Loading fast...</div>}>
        <FastComponent />
      </Suspense>
    </div>
  );
}

// 3. 运行 next dev，观察：
//    - FastComponent 先显示（500ms）
//    - SlowComponent 后显示（3000ms）
//    - 两者独立加载，互不阻塞
```

**预期结果**：FastComponent 在 500ms 后独立完成 hydration 并可交互，无需等待 SlowComponent 的 3000ms。

## 参考资料

1. [React 18 新 SSR 架构 - Reactwg](https://github.com/Reactwg/React-18/discussions/37)
2. [New Suspense SSR Architecture in React 18 - 腾讯云](https://cloud.tencent.com/developer/article/1843054)
3. [React 官方文档 - Server Components](https://react.dev/reference/rsc/server-components)
4. [为什么 SSR 一定会有 hydration mismatch - 博客园](https://www.cnblogs.com/zxlh1529/p/19950298)
5. [Hydration Mismatch 原理 - Vite-plugin-ssr](https://github.com/vikejs/vike/raw/dfaaf7da7dd2eecffb2b8f45a0ef25604946bb77/hydration-mismatch.html)
