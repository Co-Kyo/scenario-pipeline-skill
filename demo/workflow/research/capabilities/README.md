# 原子能力知识库

> 来自「前端性能优化面试场景（L2）」前处理的原子能力提取
> 共 33 个原子能力：通用 26 个 + 框架特化 7 个

## 能力索引（按战略价值排序）

### 🏔️ 一级战略高地

| ID | 能力 | 扇出度 | 耦合度 | 战略价值 | 覆盖命题 |
|----|------|--------|--------|---------|---------|
| A1 | 浏览器渲染管线 | 4/7 | 1 | **4.0** | P1,P2,P5,P7 |

### ⛰️ 二级战略高地

| ID | 能力 | 扇出度 | 耦合度 | 战略价值 | 覆盖命题 |
|----|------|--------|--------|---------|---------|
| A17 | DevTools Performance/Memory面板 | 3/7 | 1 | 3.0 | P1,P3,P7 |
| A28 | ESM与CommonJS | 2/7 | 1 | 2.0 | P2,P6 |
| A3 | 重绘与回流 | 2/7 | 1 | 2.0 | P1,P7 |
| A5 | IntersectionObserver | 2/7 | 1 | 2.0 | P1,P5 |
| A6 | HTTP缓存策略 | 2/7 | 1 | 2.0 | P2,P4 |
| A7 | CDN与资源分发 | 2/7 | 1 | 2.0 | P2,P4 |
| A27 | CSS contain与content-visibility | 2/7 | 1 | 2.0 | P1,P5 |
| A30 | requestAnimationFrame调度 | 2/7 | 1 | 2.0 | P1,P7 |

### 🏕️ 三级（按需学习）

| ID | 能力 | 扇出度 | 覆盖命题 |
|----|------|--------|---------|
| A2 | DOM节点生命周期 | 1/7 | P1 |
| A4 | 虚拟化算法 | 1/7 | P1 |
| A8 | 资源预加载 | 1/7 | P2 |
| A9 | Critical Rendering Path | 1/7 | P2 |
| A10 | Code Splitting | 2/7 | P2,P6 |
| A11 | Tree Shaking | 2/7 | P2,P6 |
| A12 | V8垃圾回收机制 | 1/7 | P3 |
| A13 | 堆快照分析 | 1/7 | P3 |
| A14 | 事件监听清理 | 1/7 | P3 |
| A15 | 定时器与闭包管理 | 1/7 | P3 |
| A16 | WeakMap/WeakRef弱引用 | 1/7 | P3 |
| A18 | HTTP/2多路复用 | 1/7 | P4 |
| A19 | HTTP/3与QUIC | 1/7 | P4 |
| A20 | 资源压缩（gzip/brotli） | 1/7 | P4 |
| A21 | 接口合并与BFF | 1/7 | P4 |
| A22 | 请求重试与降级 | 1/7 | P4 |
| A23 | Service Worker离线缓存 | 1/7 | P4 |
| A24 | WebP/AVIF现代格式 | 1/7 | P5 |
| A25 | 响应式图片（srcset/sizes） | 1/7 | P5 |
| A26 | 图片懒加载 | 1/7 | P5 |
| A29 | 持久化缓存（contenthash） | 1/7 | P6 |
| A31 | 事件循环与宏微任务 | 1/7 | P7 |
| A32 | Web Worker多线程 | 1/7 | P7 |
| A33 | Performance API与Long Task | 1/7 | P7 |

### 框架特化能力

| ID | 能力 | 耦合度 | 覆盖命题 | 所属框架 |
|----|------|--------|---------|---------|
| R1 | React key与diff策略 | 3 | P1 | React |
| R2 | React hydration | 3 | P2 | React |
| V1 | Vue patch flag优化 | 3 | P1 | Vue |
| V2 | Vue SSR激活 | 3 | P2 | Vue |
| N1 | Next/Nuxt SSR实践 | 3 | P2 | React/Vue |
| W1 | Webpack loader/plugin链 | 3 | P6 | Webpack |
| W2 | Module Federation | 3 | P6 | Webpack |
| VI1 | Vite预构建与esbuild | 3 | P6 | Vite |

## 能力依赖图

```
A1(渲染管线) ──┬── A2(DOM生命周期) ── A4(虚拟化算法)
               ├── A3(重绘回流)
               ├── A8(预加载)
               ├── A9(CRP)
               ├── A27(contain)
               └── A30(rAF)

A6(HTTP缓存) ──┬── A7(CDN)
               └── A23(Service Worker)

A12(V8 GC) ──┬── A13(堆快照)
              └── A16(WeakRef)

A28(ESM) ──┬── A10(Code Splitting) ── A29(持久化缓存) + W2(Module Fed)
            └── A11(Tree Shaking)

A18(HTTP/2) ── A19(HTTP/3)

A17(DevTools) ── A13(堆快照)

A5(IO) ── A26(图片懒加载)

R2(React SSR) + V2(Vue SSR) ── N1(Next/Nuxt)
```

## 学习路径（推荐顺序）

| 步骤 | 能力 | 覆盖 | 验证标准 |
|------|------|------|---------|
| 1 | A1-浏览器渲染管线 | 4/7 | 能解释 transform vs width 的 Layout 影响 |
| 2 | A17-DevTools面板 | 3/7 | 能用 Performance 面板定位渲染瓶颈 |
| 3 | A6-HTTP缓存策略 | 2/7 | 能区分强缓存/协商缓存的触发条件 |
| 4 | A28-ESM与CommonJS | 2/7 | 能解释 ESM 可 Tree Shaking 的原因 |
| 5 | A5-IntersectionObserver | 2/7 | 能实现图片懒加载并说明优于 scroll 的原因 |
| 6 | A12-V8 GC | 1/7 | 能解释分代回收 vs Mark-Sweep |
