# 长列表渲染 — 学习阶梯

> 跟着阶梯走，每步有具体任务，做到才算过关。
> 不需要从头到尾读完 overview/experiment/trade-offs，阶梯会告诉你什么时候去看什么。

## 你需要什么基础
- 会写基本的 React 或 Vue 组件
- 了解 DOM 操作（createElement / appendChild）
- 用过 Chrome DevTools 的 Elements 面板

## 阶梯总览
- 阶段一：看见瓶颈（A8-DevTools + A1-渲染管线）
- 阶段二：理解节点（A2-DOM 生命周期 + A4-事件循环调度）
- 阶段三：掌握算法（A14-虚拟化算法）
- 阶段四：综合运用（完整虚拟列表实现 + 极端场景应对）

---

## 阶段一：看见瓶颈

> 你将理解：为什么 10000 个 DOM 节点会让页面卡死，瓶颈出现在渲染管线的哪个阶段。

### Step 1.1：用 DevTools 看见「卡」的真相

**做**：在 Chrome 中打开一个包含大量 DOM 的页面（如任意新闻列表页），按 F12 打开 DevTools → Performance 面板 → 点击 Record → 快速滚动页面 3 秒 → 停止录制。

**你会看到什么**：火焰图中 Main 轨道出现红色三角标记（Long Task），帧率曲线跌破 30fps，某些帧耗时超过 50ms。

**这说明了什么**：浏览器主线程被阻塞了。每帧只有 ~16ms 预算（60fps），超过 50ms 的任务会被标记为 Long Task，这就是「卡」的根源。

**接下来去哪**：打开 `workflow/research/01-长列表渲染/experiment/src/index.html`，点击「模拟阻塞」按钮，观察 Long Task 计数变化。

**做到才算过**：能在 Performance 面板中识别出 Long Task 并说出其耗时。

### Step 1.2：理解渲染管线的六个阶段

**做**：阅读 `workflow/research/capabilities/A1-浏览器渲染管线.md` 的「核心机制」章节。重点关注 Layout 和 Paint 两个阶段的触发条件。

**你会看到什么**：DOM→CSSOM→Style→Layout→Paint→Composite 六个阶段，以及「仅触发 Composite 的属性（transform/opacity）性能最优」这一关键结论。

**这说明了什么**：不是所有 CSS 属性变化都一样贵。修改 `top/left` 会触发 Layout+Paint+Composite 三步，而修改 `transform` 只触发 Composite 一步——差了 2 个数量级的开销。

**接下来去哪**：打开 `workflow/research/01-长列表渲染/overview.md`，阅读「链路节点 → 4. 渲染层」部分，理解虚拟列表如何利用这一特性。

**做到才算过**：能说出 `top/left` 和 `transform: translate()` 在渲染管线上的区别。

### 阶段一过关标准
- [ ] 能用 DevTools Performance 面板录制并识别 Long Task
- [ ] 能说出渲染管线六个阶段及 Layout/Paint 的触发条件
- [ ] 能解释为什么虚拟列表用 `transform` 定位而非 `top`

做不到？→ 重读 `capabilities/A1-浏览器渲染管线.md` 核心机制章节

---

## 阶段二：理解节点

> 你将理解：DOM 节点的创建/销毁/回收如何影响内存和性能，以及事件循环如何调度渲染。

### Step 2.1：DOM 节点的生命周期与泄漏

**做**：阅读 `workflow/research/capabilities/A2-DOM节点生命周期.md` 的「核心机制」和「工程瓶颈 → Detached DOM 内存泄漏」部分。

**你会看到什么**：DOM 节点从创建到回收的五阶段，以及「节点从文档树移除但 JS 仍持有引用导致无法 GC」这一核心风险。

**这说明了什么**：虚拟列表滚动时不断创建和销毁节点。如果旧节点没有被彻底释放（闭包持有引用、事件监听器未解绑），内存会持续增长——这就是为什么虚拟列表需要 DOM 复用池。

**接下来去哪**：阅读 `workflow/research/01-长列表渲染/edge-cases.md` 的「P0-3 Detached DOM 内存泄漏」和「P0-4 事件监听器泄漏」。

**做到才算过**：能在 Chrome DevTools Memory 面板拍摄 Heap Snapshot，过滤 `Detached` 并找到泄漏的 DOM 节点。

### Step 2.2：事件循环与帧预算

**做**：阅读 `workflow/research/capabilities/A4-事件循环与任务调度.md` 的「核心机制」章节。重点关注 rAF（requestAnimationFrame）和 Long Tasks API。

**你会看到什么**：浏览器事件循环的宏任务/微任务模型，以及「每帧 ~16ms 预算」的来源——rAF 回调在每帧开始时执行，如果 Main 线程被长任务占据，rAF 就会被延迟。

**这说明了什么**：虚拟列表的滚动回调必须在 16ms 内完成，否则就会掉帧。这就是为什么需要用 rAF 节流滚动事件、用 DOM 复用池减少创建开销。

**接下来去哪**：阅读 `workflow/research/01-长列表渲染/edge-cases.md` 的「P0-5 主线程长任务阻塞」和「P1-6 rAF 回调过重」。

**做到才算过**：能解释「为什么滚动回调中不能做复杂计算」以及「rAF 节流的原理」。

### 阶段二过关标准
- [ ] 能用 Heap Snapshot 检测 Detached DOM 泄漏
- [ ] 能说出 rAF 与 setTimeout 在渲染调度上的区别
- [ ] 能解释虚拟列表为什么需要 DOM 复用池

做不到？→ 重读 `capabilities/A2-DOM节点生命周期.md` 和 `capabilities/A4-事件循环与任务调度.md`

---

## 阶段三：掌握算法

> 你将理解：虚拟列表如何从 10 万条数据中精确计算出当前需要渲染的 20 个节点。

### Step 3.1：等高列表的 O(1) 定位

**做**：打开 `workflow/research/01-长列表渲染/experiment/src/index.html`，阅读代码中 `VirtualList` 类的 `calculateRange()` 方法。

**你会看到什么**：`startIndex = Math.floor(scrollTop / itemHeight)` 一行代码完成定位——除法 O(1)，不需要遍历。

**这说明了什么**：等高列表是最简单的虚拟化方案。固定高度让定位变成了纯数学问题，这是 `react-window` 的 FixedSizeList 的核心原理。

**接下来去哪**：阅读 `workflow/research/01-长列表渲染/trade-offs.md` 的「路线 A：等高虚拟列表」。

**做到才算过**：能手写等高虚拟列表的 `calculateRange` 函数。

### Step 3.2：变高列表的前缀和+二分

**做**：阅读 `workflow/research/capabilities/A14-虚拟化算法.md` 的「核心机制 → 动态高度预估」和「核心机制 → 可视区域计算（变高用前缀和+二分查找）」。

**你会看到什么**：维护一个高度缓存数组 `heightCache[]`，用前缀和累加已知高度，用二分查找定位 scrollTop 对应的索引——O(log n)。

**这说明了什么**：变高列表的核心挑战是「高度未知」。首屏用预估高度，渲染后用 `clientHeight` 修正并缓存，后续滚动查缓存。高度缓存的准确性直接决定滚动是否跳动。

**接下来去哪**：阅读 `workflow/research/01-长列表渲染/edge-cases.md` 的「P0-2 变高列表滚动跳动」，理解高度缓存失效的三种场景。

**做到才算过**：能说出变高虚拟列表的定位算法（前缀和+二分）及其时间复杂度。

### Step 3.3：DOM 复用池与 overscan

**做**：阅读 `workflow/research/01-长列表渲染/experiment/src/index.html` 代码中的 DOM 复用池实现（`reusePool` 数组）和 `overscan` 参数。

**你会看到什么**：离开视口的节点不销毁而是放入复用池，进入视口时从池中取用而非新建；`overscan=5` 表示在视口上下各预渲染 5 个节点。

**这说明了什么**：DOM 创建和销毁是昂贵操作（createElement + appendChild + removeChild + GC）。复用池将创建开销降为 O(1)（取用已有节点），overscan 则用少量额外 DOM 换取滚动时的视觉连续性。

**接下来去哪**：阅读 `workflow/research/01-长列表渲染/trade-offs.md` 的「权衡矩阵 → DOM 节点数」和「Overscan 大小」。

**做到才算过**：能解释 DOM 复用池的工作原理，以及 overscan 大小对内存和流畅度的影响。

### 阶段三过关标准
- [ ] 能手写等高虚拟列表的 O(1) 定位算法
- [ ] 能说出变高列表的前缀和+二分定位及其时间复杂度
- [ ] 能解释 DOM 复用池和 overscan 的作用

做不到？→ 重读 `capabilities/A14-虚拟化算法.md`，重新运行 `experiment/src/index.html`

---

## 阶段四：综合运用

> 你将理解：如何在真实项目中选型、应对极端场景、用 DevTools 验证效果。

### Step 4.1：选型决策

**做**：阅读 `workflow/research/01-长列表渲染/trade-offs.md` 的「选择建议」部分，对照自己的业务场景选择路线。

**你会看到什么**：四种场景（商品等高网格→路线A、社交动态流→路线B、瀑布流→路线C、混合场景→B+C）的明确推荐。

**这说明了什么**：没有「最好的虚拟列表方案」，只有「最适合场景的方案」。等高用 react-window，变高用 react-virtuoso，瀑布流用 IntersectionObserver——选错方案比不优化更糟。

**接下来去哪**：根据选型结果，阅读对应库的文档（react-window / vue-virtual-scroller / react-virtuoso）。

**做到才算过**：能为一个具体业务场景（如「小红书 Feed 流」）选择正确的虚拟列表方案并说明理由。

### Step 4.2：极端场景演练

**做**：阅读 `workflow/research/01-长列表渲染/edge-cases.md` 的「极端场景组合」部分。重点关注「AI 聊天窗口：流式追加 + 变高 + 快速滚动」。

**你会看到什么**：三个 P0 坑点（Layout Thrashing + 变高跳动 + 长任务阻塞）同时触发的场景，以及分层防御策略。

**这说明了什么**：真实业务中的性能问题往往不是单一坑点，而是多个坑点的叠加。虚拟列表只是基础，还需要配合读写分离、高度缓存、rAF 节流、骨架屏等手段形成完整防御。

**接下来去哪**：打开 `workflow/research/01-长列表渲染/experiment/src/index.html`，点击「运行全部验证」按钮，确认所有检查点通过。

**做到才算过**：能说出至少一个极端场景中三个坑点如何叠加，以及对应的防御策略。

### Step 4.3：DevTools 验证

**做**：在 `experiment/src/index.html` 中快速滚动 10 万条数据，同时在 DevTools Performance 面板录制。

**你会看到什么**：
1. Elements 面板：DOM 节点数始终 ~15 个（不随数据量增长）
2. Performance 面板：60fps，无 Long Task 红色标记
3. Memory 面板：Heap 大小稳定，无持续增长
4. 页面上的实时计数器：DOM 节点数、可视项数、渲染耗时

**这说明了什么**：虚拟化的核心目标——DOM 节点数与数据量解耦——在 DevTools 中得到了直观验证。如果任何一项不达标，回到对应阶段重学。

**做到才算过**：四项验证全部通过。

### 阶段四过关标准
- [ ] 能为具体业务场景选择正确的虚拟列表方案
- [ ] 能说出至少一个极端场景的多坑点叠加及防御策略
- [ ] experiment 四项 DevTools 验证全部通过

做不到？→ 回到 `trade-offs.md` 重读选型建议，回到 `edge-cases.md` 重读极端场景

---

## 学完之后你应该能做到

### 面试场景
- 被问「如何优化长列表渲染」时，能从渲染管线（A1）→ 虚拟化算法（A14）→ DOM 生命周期（A2）→ 事件循环调度（A4）四层展开，而非只说「用虚拟列表」
- 被问「虚拟列表有哪些坑」时，能说出变高跳动（P0）、Layout Thrashing（P0）、Detached DOM 泄漏（P0）三个必现坑点及其检测手段
- 被问「等高和变高怎么选」时，能给出 O(1) vs O(log n) 的复杂度分析和具体场景推荐

### 实战场景
- 能用 DevTools Performance/Memory 面板定位虚拟列表的性能瓶颈
- 能手写等高虚拟列表的核心算法（calculateRange + DOM 复用池）
- 能为社交 Feed、商品瀑布流、AI 聊天窗口三种场景选型并实现

### 继续深造
- 想了解其他性能命题？→ 继续 `研究：P2`（首屏白屏）
- 想深入某个能力？→ 回到 `capabilities/` 目录阅读对应的能力知识库
- 想看完整的研究产出？→ `workflow/research/01-长列表渲染/` 下的五个文件
