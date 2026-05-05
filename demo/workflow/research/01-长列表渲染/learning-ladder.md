# 长列表渲染：万级数据的流畅滚动方案 — 学习阶梯

> 跟着阶梯走，每步有具体任务，做到才算过关。
> 不需要从头到尾读完 overview/experiment/trade-offs，阶梯会告诉你什么时候去看什么。

## 你需要什么基础
- 基本的 DOM 操作（createElement、appendChild）
- 了解 scroll 事件
- 知道浏览器会"重绘"页面

## 阶梯总览
- **阶段一：理解渲染瓶颈**（对应能力 A1、A3）— 为什么列表会卡
- **阶段二：虚拟列表核心**（对应能力 A2、A4）— 只渲染看得见的
- **阶段三：浏览器原生优化**（对应能力 A5、A27）— 不写 JS 也能快
- **阶段四：框架层适配**（对应能力 R1、V1）— React/Vue 下怎么选

---

## 阶段一：理解渲染瓶颈

### 你将理解什么
为什么一个 1 万行的列表会让页面卡到不能用？根本原因不在"数据多"，而在浏览器渲染管线的每一帧都有 16ms 预算，超出就掉帧。

### Step 1：跑一遍实验，感受卡顿
**做**：打开 `experiment/index.html`，在实验 1 中选择 100,000 项，点击"初始化列表"，然后快速滚动。
**你会看到什么**：FPS 仪表盘显示帧率，DOM 节点数始终在 20-40 个左右（虚拟列表已生效）。
**这说明了什么**：10 万项数据并不需要 10 万个 DOM 节点。虚拟列表只渲染可视区域。
**接下来去哪**：读 `overview.md` 第一节"渲染帧生命周期总览"，建立帧预算的概念。
**做到才算过**：能说出"一帧 16ms 预算包含 JS→DOM→Style→Layout→Paint→Composite 六个阶段"。

### Step 2：亲手制造一次布局抖动
**做**：在实验 2 中选择 10,000 节点，点击"运行对比"。
**你会看到什么**：左侧"读写交替"耗时远大于右侧"批量读写"，可能差 10-100 倍。
**这说明了什么**：每次读 `offsetHeight` 都会强制浏览器同步计算 Layout（Forced Synchronous Layout），循环中反复读写 = 每次都触发 Layout = 布局抖动。
**接下来去哪**：读 `edge-cases.md` 第 1 节"布局抖动的隐蔽变体"。
**做到才算过**：能解释"为什么 `el.offsetHeight` 会触发同步 Layout"。

### 阶段一过关标准
- [ ] 能画出浏览器一帧的 6 个阶段
- [ ] 能解释 Layout Thrashing 的触发条件
- [ ] 做不到？→ 回看 `overview.md` 第一、二节 + `experiment/index.html` 实验 2

---

## 阶段二：虚拟列表核心

### 你将理解什么
虚拟列表的本质是"用计算换 DOM"——通过 scrollTop 算出哪些项该出现，只创建那几个节点。

### Step 3：拆解虚拟列表公式
**做**：读 `overview.md` 第三节"虚拟列表核心算法"。
**你会看到什么**：`startIndex = Math.floor(scrollTop / itemHeight)`，加上 overscan 缓冲。
**这说明了什么**：虚拟列表不需要"知道所有数据长什么样"，只需要知道每项多高、当前滚到哪。
**接下来去哪**：打开 `experiment/index.html` 实验 1，把 Overscan 从 5 改成 20，再改成 3，感受白屏和性能的权衡。
**做到才算过**：能手写一个 50 行以内的虚拟列表核心逻辑（不含样式）。

### Step 4：理解 DOM 复用池
**做**：读 `experiment/index.html` 实验 1 的源码中 `getOrCreateNode` 和 `recycleNodes` 函数。
**你会看到什么**：滚动时不是每次都 `createElement`，而是从"复用池"里取已有的节点。
**这说明了什么**：创建 DOM 节点有开销（分配内存、初始化属性），复用比新建快。
**接下来去哪**：读 `edge-cases.md` 中关于"快速滚动时 DOM 节点频繁创建销毁"的部分。
**做到才算过**：能解释"为什么虚拟列表需要 overscan"。

### 阶段二过关标准
- [ ] 能手写 startIndex/endIndex 计算公式
- [ ] 能解释 DocumentFragment 批量插入为什么比逐个 appendChild 快
- [ ] 做不到？→ 回看 `experiment/index.html` 实验 1 源码 + `overview.md` 第三节

---

## 阶段三：浏览器原生优化

### 你将理解什么
不写虚拟列表也能优化长列表——浏览器提供了 IntersectionObserver 和 CSS contain 等原生工具。

### Step 5：IntersectionObserver 替代 scroll 事件
**做**：读 `capabilities/A5-IntersectionObserver.md`。
**你会看到什么**：IO 是异步的，不会阻塞滚动；scroll 事件在一帧内可能触发多次。
**这说明了什么**：用 scroll + getBoundingClientRect 做懒加载是反模式，IO 才是正解。
**接下来去哪**：读 `trade-offs.md` 中 R3（CSS containment）路线。
**做到才算过**：能用 IntersectionObserver 实现一个图片懒加载（< 20 行代码）。

### Step 6：CSS contain 的零成本优化
**做**：打开 `experiment/index.html` 实验 4，点击"初始化渲染测试"，滚动两个列表。
**你会看到什么**：右侧（有 contain）的 FPS 通常高于或等于左侧。
**这说明了什么**：`contain: layout paint` 告诉浏览器"这个元素的布局/绘制不影响外部"，浏览器可以跳过不必要的祖先重算。
**接下来去哪**：读 `capabilities/A27-CSS-contain与content-visibility.md`。
**做到才算过**：能说出 `contain: layout paint` 和 `content-visibility: auto` 的区别。

### 阶段三过关标准
- [ ] 能用 IntersectionObserver 实现懒加载
- [ ] 能解释 contain 和 content-visibility 的适用场景
- [ ] 做不到？→ 回看 `capabilities/A5` + `capabilities/A27` + 实验 4

---

## 阶段四：框架层适配

### 你将理解什么
React 和 Vue 的虚拟 DOM 已经帮你做了"批量 DOM 更新"，但在万级列表场景下，虚拟 DOM diff 本身也成了瓶颈。

### Step 7：React 的 key 陷阱
**做**：读 `capabilities/R1-React key与diff策略.md`。
**你会看到什么**：用 `index` 作为 key，在列表头部插入时会导致所有节点重新渲染。
**这说明了什么**：key 的作用是建立新旧节点映射，不是"给个唯一标识就行"。
**接下来去哪**：读 `capabilities/V1-Vue patch flag优化.md`。
**做到才算过**：能解释"为什么用 index 做 key 是反模式"。

### Step 8：选型判断
**做**：读 `trade-offs.md` 的"选型建议"部分。
**你会看到什么**：决策树——JS 计算密集用 Worker，DOM 渲染密集用虚拟列表/CSS contain。
**这说明了什么**：没有银弹，要先判断瓶颈在哪。
**接下来去哪**：用 `edge-cases.md` 最后的"防御策略速查表"做 checklist。
**做到才算过**：能针对一个具体场景（如"10 万行表格 + 可排序列"）给出完整优化方案。

### 阶段四过关标准
- [ ] 能解释 React key 和 Vue patch flag 的作用
- [ ] 能针对具体场景做技术选型
- [ ] 做不到？→ 回看 `trade-offs.md` + `capabilities/R1` + `capabilities/V1`

---

## 学完之后你应该能做到
- 面试中能从"帧预算"出发解释长列表卡顿的根因
- 能手写虚拟列表核心逻辑并解释 overscan、复用池的作用
- 能对比虚拟列表、IntersectionObserver、CSS contain 三种方案的适用场景
- 能针对 React/Vue 项目给出框架层的优化建议
