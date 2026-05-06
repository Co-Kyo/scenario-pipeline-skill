# 内存泄漏排查 — 学习阶梯

> 跟着阶梯走，每步有具体任务，做到才算过关。

## 你需要什么基础
- 了解 JavaScript 基本语法和对象引用概念
- 知道什么是 DOM 元素
- 用过 React useEffect 或 Vue onMounted/onUnmounted

## 阶梯总览
- **阶段一：理解内存模型与 GC 机制**（对应能力 A3 V8 GC）
- **阶段二：掌握 DevTools 排查工具链**（对应能力 A4 DevTools）
- **阶段三：建立资源生命周期规范**（对应能力 A14 资源生命周期）
- **阶段四：综合运用——实战排查**（全部能力联动）

---

## 阶段一：理解内存模型与 GC 机制

### 你将理解什么
SPA 越用越卡的根因是什么？V8 如何回收内存？什么情况下内存无法被回收？

### Step 1：理解分代 GC
**做**：阅读 `02-内存泄漏排查/overview.md` 的 A3 节点。理解新生代 Scavenge（半空间复制）和老生代 Mark-Sweep-Compact。
**你会看到什么**：对象两次 Scavenge 存活则晋升老生代；老生代 GC 标记清除会导致周期性帧率下降。
**这说明了什么**：内存泄漏的本质是老生代对象持续增长，GC 来不及回收。
**接下来去哪**：带着"什么东西会阻止 GC 回收"这个问题，进入 Step 2。
**做到才算过**：能画出新生代→老生代的晋升路径，解释 Scavenge 和 Mark-Sweep 的区别。

### Step 2：识别三种经典泄漏模式
**做**：阅读 `02-内存泄漏排查/overview.md` 的瓶颈汇总 + `edge-cases.md` 的 P0 坑点。
**你会看到什么**：Detached DOM（DOM 移除但 JS 持有引用）、未解绑的事件监听、无界增长的全局缓存。
**这说明了什么**：90% 的前端内存泄漏来自这三种模式。
**接下来去哪**：进入阶段二，学会用 DevTools 验证这些泄漏。
**做到才算过**：能解释什么是 Detached DOM，为什么 `Map` 会阻止 GC 而 `WeakMap` 不会。

### 阶段一过关标准
- [ ] 能画出新生代→老生代的晋升路径
- [ ] 能说出三种经典泄漏模式及其根因
- [ ] 能解释 WeakMap/WeakRef 为什么允许 GC 回收
- 做不到？→ 回到 `overview.md` A3 节点 + `edge-cases.md` 重读

---

## 阶段二：掌握 DevTools 排查工具链

### 你将理解什么
如何用 Chrome DevTools 定位内存泄漏？Heap Snapshot 对比怎么用？Retainers 链怎么追踪？

### Step 3：用 Performance 面板看内存趋势
**做**：打开 Chrome DevTools → Performance 面板，录制一个 SPA 页面的路由切换操作（来回切换 5-10 次），观察 JS Heap 曲线。
**你会看到什么**：正常情况应该锯齿形波动（分配→GC→回收），如果持续上升就是泄漏。
**这说明了什么**：Performance 面板是"看趋势"的第一步，能快速判断有没有泄漏。
**接下来去哪**：有了"有泄漏"的判断后，进入 Step 4 定位具体泄漏点。
**做到才算过**：能区分正常的锯齿形波动和异常的持续上升。

### Step 4：用 Heap Snapshot 对比定位泄漏
**做**：阅读 `02-内存泄漏排查/overview.md` 的 A4 节点。在 Memory 面板拍两个 Heap Snapshot（操作前一次、操作后一次），对比 Delta 列找新增对象。
**你会看到什么**：Detached DOM 节点会显示为橙色（已从 DOM 树移除但仍被 JS 引用）。
**这说明了什么**：Heap Snapshot 对比是定位泄漏的精确武器，Retainers 链能追踪到具体的引用路径。
**接下来去哪**：阅读 `edge-cases.md` 的 E1（Detached DOM）和 E2（事件监听未解绑）的排查原理。
**做到才算过**：能独立用 Heap Snapshot 对比找到一个 Detached DOM 节点，并追踪其 Retainers 链。

### 阶段二过关标准
- [ ] 能用 Performance 面板判断是否存在内存泄漏
- [ ] 能用 Heap Snapshot 对比定位 Detached DOM
- [ ] 能读懂 Retainers 链，找到阻止 GC 的引用
- 做不到？→ 回到 `overview.md` A4 节点 + `edge-cases.md` E1/E2 重读

---

## 阶段三：建立资源生命周期规范

### 你将理解什么
如何从编码层面预防泄漏？AbortController 如何统一取消多个资源？

### Step 5：理解资源清理的对称性
**做**：阅读 `02-内存泄漏排查/overview.md` 的 A14 节点。理解"所有异步资源绑定与清理成对"的原则。
**你会看到什么**：addEventListener/removeEventListener、setInterval/clearInterval、observe/disconnect 必须成对出现。
**这说明了什么**：预防比排查更重要——建立清理规范比事后用 DevTools 找泄漏高效 10 倍。
**接下来去哪**：阅读 `trade-offs.md` 的"手动清理 vs AbortController"对比。
**做到才算过**：能列举 5 种需要清理的资源类型及其对应的清理 API。

### Step 6：掌握 AbortController 统一取消
**做**：阅读 `trade-offs.md` 的 AbortController 部分。理解一个 AbortSignal 如何同时取消 fetch、事件监听、Observer。
**你会看到什么**：`controller.abort()` 一次调用可以取消所有监听同一 signal 的资源。
**这说明了什么**：AbortController 是资源清理的"统一入口"，大幅降低遗漏风险。
**接下来去哪**：进入阶段四，综合运用排查和预防。
**做到才算过**：能写一段代码用 AbortController 同时取消 fetch 请求和事件监听。

### 阶段三过关标准
- [ ] 能列举 5 种需要清理的资源类型
- [ ] 能用 AbortController 统一取消多个资源
- [ ] 能写出 React useEffect cleanup 或 Vue onUnmounted 的完整清理代码
- 做不到？→ 回到 `overview.md` A14 节点 + `trade-offs.md` 重读

---

## 阶段四：综合运用——实战排查

### 你将理解什么
从发现"页面越来越卡"到定位根因并修复的完整流程是什么？

### Step 7：走完排查全流程
**做**：阅读 `overview.md` 的链路全景图（现象确认→堆快照对比→Retainers 追踪→资源审计→修复），然后拿一个真实 SPA 项目实践。
**你会看到什么**：排查是一个"缩小范围→精确定位→验证修复"的迭代过程。
**这说明了什么**：工具链是手段，排查思路才是核心——先判断"有没有"再定位"在哪里"。
**接下来去哪**：回顾 `edge-cases.md` 的三层防御方案（编码规范→工程治理→心智模型）。
**做到才算过**：能独立完成一个 SPA 页面的内存泄漏排查全流程。

### Step 8：建立防御体系
**做**：阅读 `edge-cases.md` 的收尾部分，理解编码规范、CI 基线检测、生产监控、CR Checklist 的四层防御。
**你会看到什么**：单靠个人自觉不够，需要工程手段兜底。
**这说明了什么**：内存管理是一种工程能力，不是个人技巧。
**接下来去哪**：完成！
**做到才算过**：能说出至少 3 个工程层面的内存泄漏防御手段。

### 阶段四过关标准
- [ ] 能独立完成内存泄漏排查全流程
- [ ] 能说出编码规范 + CI 检测 + 生产监控的三层防御
- [ ] 能在代码评审中识别潜在的内存泄漏模式
- 做不到？→ 回到 `overview.md` + `edge-cases.md` 防御部分重读

---

## 学完之后你应该能做到

**面试场景**：面对"SPA 越用越卡怎么排查"的问题，能从 V8 GC 原理→DevTools 工具链→三种经典泄漏模式→AbortController 统一清理→工程防御体系完整回答。

**实战场景**：能用 Performance 面板 + Heap Snapshot 对比独立定位内存泄漏，建立 useEffect cleanup / onUnmounted 的清理规范，在代码评审中识别 Detached DOM 和未解绑事件监听。
