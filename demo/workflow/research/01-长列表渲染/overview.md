# 长列表渲染：万级数据的虚拟列表渲染 — 链路编排

## 概述

万级数据虚拟列表的核心链路是：将海量数据经算法层筛选出可视区域的有限子集，仅创建和维护当前可见的 DOM 节点，借助浏览器渲染管线完成高效绘制，并通过帧调度保证滚动流畅——形成「数据→算法→DOM→渲染→调度→诊断」的闭环管线。

## 链路节点

### 1. 数据层：接收万级数据

**能力引用：A14 可视区域计算**

虚拟列表的起点是数据层。万级数据（10,000+ 条目）从接口或缓存进入前端，此时并不立即创建 DOM，而是由虚拟化算法接管。核心机制是**可视区域计算**——根据容器尺寸（viewport height）和滚动偏移量（scroll offset）确定当前需要渲染的行范围（start index ~ end index）。

关键公式：
```
startIndex = floor(scrollTop / estimatedItemHeight)
endIndex = startIndex + ceil(viewportHeight / estimatedItemHeight)
```

这一层的核心约束：数据量与 DOM 节点数必须解耦。无论数据是 1 万条还是 10 万条，同时存在于 DOM 树中的节点数应维持在 O(viewport)，通常为 20~50 个。

### 2. 等法层：确定渲染窗口

**能力引用：A14 动态高度预估 + 前缀和 + 二分查找**

确定「渲染哪些项」是算法层的核心职责。在等高列表中，计算简单直接；但在社交动态流、商品瀑布流等**变高场景**中，每个列表项高度不同且未知，算法复杂度显著上升。

核心机制：

- **动态高度预估（estimated height）**：初始阶段使用预估值（如平均高度），渲染后用实际测量值替换，逐步收敛为真实高度。
- **前缀和（prefix sum）**：维护 `heightMap[i] = Σheight[0..i]`，将任意索引的 offset 查询从 O(n) 降为 O(1)。
- **二分查找（binary search）**：给定 scrollTop，通过二分查找 heightMap 定位 startIndex，复杂度 O(log n)。

主要瓶颈（来自 A14）：
| 瓶颈 | 严重度 | 说明 |
|-------|--------|------|
| 变高列表跳动 | P0 | 预估高度与实际高度偏差导致滚动位置突变 |
| 首屏 CLS | P1 | 累积布局偏移，影响 Core Web Vitals 评分 |
| 滚动回调性能 | P1 | 高频 scroll 事件中计算开销过大 |

### 3. DOM 层：创建/复用节点

**能力引用：A2 DOM 生命周期 + DOM 复用池**

算法层输出「需要渲染哪些项」后，DOM 层负责创建或复用对应节点。

**DOM 生命周期关键阶段**（A2）：
- **创建（Create）**：`document.createElement` 或框架虚拟 DOM diff 产出真实节点。
- **挂载（Mount）**：`appendChild`/`insertBefore` 插入容器。
- **更新（Update）**：已有节点内容变化，复用 DOM 结构、仅更新数据绑定。
- **卸载（Unmount）**：`removeChild` 移除节点，触发 GC 回收。
- **GC**：V8 垃圾回收器回收无引用的节点内存。

**DOM 复用池机制**：滚动时移出可视区域的节点不立即销毁，而是放入复用池（recycle pool）。新进入可视区域的项优先从池中取节点，仅更新内容，避免频繁的 create/destroy 开销。这是虚拟列表性能优化的核心策略之一。

主要瓶颈（来自 A2）：
| 瓶颈 | 严重度 | 说明 |
|-------|--------|------|
| Detached DOM 泄漏 | P0 | 节点移除但 JS 仍持有引用，无法被 GC 回收，内存持续增长 |
| 事件监听器泄漏 | P0 | 卸载时未移除事件绑定，导致回调链残留 |
| 批量重排 | P1 | 短时间内多次插入/删除触发多次 Layout |

### 4. 渲染层：浏览器绘制像素

**能力引用：A1 渲染管线：Layout → Paint → Composite**

DOM 节点准备好后，浏览器按 CRP（Critical Rendering Path）完成像素绘制：

```
DOM + CSSOM → Render Tree → Layout → Layer → Paint → Raster → Composite
```

各阶段开销分析：
- **Layout（重排）**：计算每个节点的几何信息（位置、尺寸）。强制同步布局（Forced Synchronous Layout）是性能杀手——在 JS 中读取 `offsetHeight` 等属性后立即写入样式，会强制浏览器提前执行 Layout。
- **Paint（重绘）**：将 Layout 结果绘制为像素。复杂样式（阴影、圆角、渐变）开销大。
- **Composite（合成）**：仅处理 `transform` 和 `opacity` 变化的图层，性能最优。虚拟列表的滚动应尽量走 Composite 路径。

主要瓶颈（来自 A1）：
| 瓶颈 | 严重度 | 说明 |
|-------|--------|------|
| Layout Thrashing | P0 | 读写交替导致反复重排，帧耗时激增 |
| Paint 开销 | P1 | 复杂节点样式导致大面积重绘 |
| 图层爆炸 | P1 | 过多合成层消耗 GPU 显存 |
| 强制同步布局 | P1 | JS 中读写布局属性导致同步 Layout |

### 5. 调度层：滚动事件与帧调度

**能力引用：A4 事件循环 + rAF 节流**

滚动是虚拟列表的核心交互。高频滚动事件（每秒 60+ 次）如果每次都触发完整的「算法计算→DOM 操作→渲染」流程，会阻塞主线程。

调度策略：

- **requestAnimationFrame（rAF）**：将 DOM 更新与浏览器渲染帧同步，避免在一帧内多次触发 Layout。核心原则：读操作和写操作分离到不同 rAF 回调，或在同一回调中先读后写。
- **节流（throttle）**：滚动事件处理器使用 rAF 或时间节流（如 16ms），确保每帧最多执行一次。
- **requestIdleCallback（rIC）**：低优先级任务（如预渲染、数据预取）推迟到浏览器空闲时执行。
- **Long Tasks API**：监控主线程超过 50ms 的任务，为诊断提供数据。

主要瓶颈（来自 A4）：
| 瓶颈 | 严重度 | 说明 |
|-------|--------|------|
| 主线程长任务阻塞 | P0 | 大量 DOM 操作或复杂计算阻塞主线程超过 50ms，导致掉帧 |
| rAF 回调过重 | P1 | rAF 回调中执行过多逻辑，反而加剧帧耗时 |

### 6. 诊断层：性能瓶颈定位

**能力引用：A8 DevTools Performance/Memory 面板**

虚拟列表的性能问题（卡顿、内存泄漏、布局抖动）需要系统化诊断：

- **Performance 面板**：
  - 火焰图（Flame Chart）定位 Long Task，识别哪段 JS 代码耗时最长。
  - 帧率图（FPS）识别掉帧区间，关联到滚动操作。
  - Layout/Paint 标记定位重排重绘热点。
- **Memory 面板**：
  - Heap Snapshot 对比：滚动前后拍摄快照，对比 Detached DOM 节点数量。
  - Allocation Timeline：追踪内存分配热点，定位未释放的节点引用。
- **PerformanceObserver**：
  - 监听 `longtask`、`layout-shift`、`largest-contentful-paint` 等指标。
  - 线上环境持续采集，发现回归问题。
- **Lighthouse**：综合评估 CLS、FID 等 Core Web Vitals 指标。

主要瓶颈（来自 A8）：
| 瓶颈 | 严重度 | 说明 |
|-------|--------|------|
| JS 主线程阻塞 | P0 | Long Task 导致交互无响应 |
| 内存泄漏 | P0 | Detached DOM 持续增长直至页面崩溃 |
| 布局抖动（Layout Shift） | P0 | 内容跳动导致 CLS 评分劣化 |

## 框架特化（≤30%）

通用虚拟化原理适用于所有框架，但具体实现依赖框架生态。以下为 React 和 Vue 的主流方案选型：

### React 生态

| 方案 | 特点 | 适用场景 |
|------|------|----------|
| **react-window** | 轻量（~6KB），API 简洁，支持 FixedSizeList / VariableSizeList | 等高或高度差异不大的列表 |
| **react-virtuoso** | 原生支持变高、自动测量、分组、Footer、滚动锚定 | 社交动态流、商品瀑布流等变高场景 |
| **@tanstack/react-virtual** | 无头（headless）虚拟化 hook，完全自定义渲染 | 需要完全控制 DOM 结构的场景 |

选型建议：社交动态流（变高 + 图文混排）→ **react-virtuoso**；商品瀑布流（等宽多列）→ **react-window** 的 `FixedSizeGrid` 或 **@tanstack/react-virtual**。

### Vue 生态

| 方案 | 特点 | 适用场景 |
|------|------|----------|
| **vue-virtual-scroller** | Vue 2/3 兼容，支持 RecycleScroller / DynamicScroller | 通用虚拟滚动 |
| **@tanstack/vue-virtual** | 同 React 版，无头 hook 设计，Vue 3 Composition API | 需要完全控制的场景 |

选型建议：优先 **@tanstack/vue-virtual**（无头设计，灵活性最高），其次 **vue-virtual-scroller**（开箱即用，社区成熟）。

### 框架共性约束

无论 React 还是 Vue，虚拟列表实现都需遵守以下通用原则：

1. **避免在渲染循环中强制同步布局**：不要在 `render`/`setup` 中读取 `offsetHeight` 等布局属性。
2. **使用 key 确保节点复用**：稳定的 `key` 属性让框架正确识别可复用节点，避免不必要的 DOM 销毁重建。
3. **滚动容器 CSS 优化**：使用 `will-change: transform` 提升合成层性能，避免 `overflow: scroll` 嵌套导致的额外 Layout。
4. **内存管理**：组件卸载时清理复用池引用，避免 Detached DOM 泄漏。
