# 渲染性能：避免掉帧的 JS 执行与 DOM 操作策略 — 学习阶梯

> 跟着阶梯走，每步有具体任务，做到才算过关。

## 你需要什么基础
- 了解浏览器渲染页面的基本流程
- 用过 Chrome DevTools 的 Performance 面板
- 了解 requestAnimationFrame 的概念

## 阶梯总览
- **阶段一：帧预算与渲染管线**（对应能力 A1、A3）— 16ms 里发生了什么
- **阶段二：JS 执行优化**（对应能力 A31、A30、A32）— 怎么让 JS 不阻塞渲染
- **阶段三：DOM 操作优化**（对应能力 A3、A30）— 怎么减少 Layout/Paint
- **阶段四：度量与诊断**（对应能力 A17、A33）— 怎么发现问题

---

## 阶段一：帧预算与渲染管线

### 你将理解什么
掉帧 = 单帧工作量超过 16ms（60Hz）或 8ms（120Hz）。要优化，先知道帧内各阶段的耗时分配。

### Step 1：建立帧预算概念
**做**：读 `overview.md` 第一节"渲染帧生命周期总览"。
**你会看到什么**：一帧包含 JS→DOM→Style→Layout→Paint→Composite 六个阶段，transform/opacity 可跳过 Layout+Paint 直达 Composite。
**这说明了什么**：不是所有样式修改都"一样贵"——修改 `width` 触发 Layout，修改 `transform` 只触发 Composite，性能差 10-50 倍。
**接下来去哪**：读 `capabilities/A1-浏览器渲染管线.md`。
**做到才算过**：能说出"修改 transform 为什么不触发 Layout"。

### Step 2：亲手制造掉帧
**做**：打开 `experiment/index.html` 实验 2，点击"运行：同步长任务"。
**你会看到什么**：FPS 仪表盘掉到个位数，帧耗时柱状图出现红色长条（>16ms）。
**这说明了什么**：同步长任务（macrotask）在执行期间完全阻塞主线程——浏览器无法执行 rAF、无法渲染、无法处理输入。
**接下来去哪**：读 `edge-cases.md` 第 3 节"Long Task 与主线程阻塞"。
**做到才算过**：能解释"为什么一个 200ms 的同步任务会导致 12 帧丢失"。

### 阶段一过关标准
- [ ] 能画出一帧的 6 个阶段
- [ ] 能区分修改 transform vs width 的渲染路径差异
- [ ] 做不到？→ 回看 `overview.md` + `capabilities/A1`

---

## 阶段二：JS 执行优化

### 你将理解什么
JS 执行超时是掉帧的首要原因。三种策略：时间分片、卸载到 Worker、利用空闲时间。

### Step 3：rAF 时间分片
**做**：在 `experiment/index.html` 实验 2 中，点击"运行：rAF 切片"。
**你会看到什么**：同样的总任务量，rAF 切片期间 FPS 保持 ≥50，帧耗时柱状图大部分是绿色（<8ms）。
**这说明了什么**：将长任务拆成多帧执行，每帧只做 budget ms（如 8ms），剩余时间让给渲染。
**接下来去哪**：读 `capabilities/A30-requestAnimationFrame调度.md`。
**做到才算过**：能手写一个 rAF 时间分片函数（< 30 行）。

### Step 4：理解事件循环
**做**：读 `capabilities/A31-事件循环与宏微任务.md`。
**你会看到什么**：macrotask 每轮取一个执行；microtask 必须全部清空才进入渲染。递归 microtask 可以饿死渲染。
**这说明了什么**：`Promise.then` 递归比 `while(true)` 更危险——不会报错，但页面完全冻结。
**接下来去哪**：在实验 3 中点击"触发 Microtask 饿死渲染"。
**做到才算过**：能解释"为什么 microtask 递归会导致 FPS=0"。

### Step 5：Web Worker 卸载
**做**：在 `experiment/index.html` 实验 4 中，分别点击"主线程排序"和"Worker 排序"。
**你会看到什么**：主线程排序期间 FPS 下降；Worker 排序期间 FPS 保持稳定。
**这说明了什么**：Worker 运行在独立线程，不阻塞主线程渲染。但 `postMessage` 有序列化开销——小数据量不值得用 Worker。
**接下来去哪**：读 `capabilities/A32-Web Worker多线程.md`。
**做到才算过**：能用 inline Worker（Blob URL）实现一个排序任务。

### 阶段二过关标准
- [ ] 能手写 rAF 时间分片函数
- [ ] 能解释 macrotask/microtask 的执行顺序
- [ ] 能判断"什么时候该用 Worker"
- [ ] 做不到？→ 回看 `capabilities/A30` + `A31` + `A32` + 实验 2/3/4

---

## 阶段三：DOM 操作优化

### 你将理解什么
DOM 操作的开销不在"操作本身"，而在它触发的 Layout 和 Paint。

### Step 6：Layout Thrashing
**做**：在 `experiment/index.html` 实验 1 中，选择 10,000 节点，点击"运行对比"。
**你会看到什么**：读写交替耗时远大于批量读写。
**这说明了什么**：每次读 `offsetHeight` 都触发同步 Layout，循环中反复读写 = 每次都 Layout。
**接下来去哪**：读 `capabilities/A3-重绘与回流.md`。
**做到才算过**：能识别代码中的 Layout Thrashing 并修复。

### Step 7：读写分离实践
**做**：读 `edge-cases.md` 第 1 节"布局抖动的隐蔽变体"。
**你会看到什么**：`getComputedStyle()`、`offsetWidth`、`scrollTop` 都会触发同步 Layout。
**这说明了什么**：不是只有"明显的循环"才会 Thrashing——藏在工具函数或第三方库里的读操作也会。
**接下来去哪**：读 `trade-offs.md` 中 R1（任务切片）路线。
**做到才算过**：能在 Code Review 中识别 Layout Thrashing 模式。

### 阶段三过关标准
- [ ] 能解释 Layout Thrashing 的触发条件
- [ ] 能用读写分离 + rAF 合并 DOM 操作
- [ ] 做不到？→ 回看 `capabilities/A3` + 实验 1

---

## 阶段四：度量与诊断

### 你将理解什么
优化的前提是"知道哪里慢"。PerformanceObserver + DevTools 是你的诊断工具链。

### Step 8：Long Task 检测
**做**：在 `experiment/index.html` 实验 3 中，分别触发 20ms、600ms、200ms 的任务。
**你会看到什么**：20ms 不触发 Long Task；60ms 触发；200ms 是严重阻塞。
**这说明了什么**：50ms 是 Long Task 阈值——浏览器每帧 16ms，50ms 意味着至少丢 3 帧。
**接下来去哪**：读 `capabilities/A33-Performance API与Long Task.md`。
**做到才算过**：能用 PerformanceObserver 监听 Long Task 并记录来源。

### Step 9：DevTools Performance 面板
**做**：读 `capabilities/A17-DevTools Performance-Memory面板.md`。
**你会看到什么**：火焰图展示每帧工作分布——红色长条是 Long Task，绿色是正常帧。
**这说明了什么**：Performance 面板是"总览"，Long Task API 是"实时监控"——两者配合使用。
**接下来去哪**：读 `edge-cases.md` 第 5 节"性能监测工具的自身开销"。
**做到才算过**：能用 Performance 面板定位一个页面的渲染瓶颈。

### 阶段四过关标准
- [ ] 能用 PerformanceObserver 监听 Long Task
- [ ] 能用 DevTools Performance 面板分析帧耗时
- [ ] 做不到？→ 回看 `capabilities/A33` + `A17` + 实验 3

---

## 学完之后你应该能做到
- 面试中能从帧预算出发解释掉帧的根因和优化策略
- 能手写 rAF 时间分片函数
- 能识别并修复 Layout Thrashing
- 能用 PerformanceObserver + DevTools 完成完整的性能诊断
- 能判断"任务切片 vs Worker vs CSS containment"的适用场景
