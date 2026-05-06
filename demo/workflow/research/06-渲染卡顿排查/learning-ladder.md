# 渲染卡顿排查 — 学习阶梯

> 跟着阶梯走，每步有具体任务，做到才算过关。

## 你需要什么基础
- 了解浏览器渲染的基本概念（DOM、CSS、像素）
- 用过 Chrome DevTools 的基本功能
- 知道什么是帧率（fps）

## 阶梯总览
- **阶段一：理解帧预算与事件循环**（对应能力 A1 渲染管线 + A2 事件循环）
- **阶段二：掌握 Long Task 定位与 DevTools 分析**（对应能力 A4 DevTools + A16 Long Tasks API）
- **阶段三：学习优化手段——Worker 卸载与 CSS 隔离**（对应能力 A10 Web Worker + A13 CSS contain）
- **阶段四：综合运用——排查实战**（全部能力联动）

---

## 阶段一：理解帧预算与事件循环

### 你将理解什么
为什么 60fps 是目标？事件循环的执行顺序是什么？长任务如何阻塞渲染？

### Step 1：理解 16ms 帧预算，用实验感受掉帧
**做**：阅读 `06-渲染卡顿排查/overview.md` 的"渲染管线与帧预算"章节。理解每帧 16ms 的预算分配。
**然后动手**：打开 `experiment/src/index.html`，切换到「强制同步布局」标签页。点击「❌ 读写交替」（DOM 数量 1000），观察 FPS 骤降和日志中的耗时。然后点击「✅ 读写分离」，对比 FPS 恢复正常。
**你会看到什么**：读写交替触发 N 次 Layout，FPS 跌到个位数；读写分离只触发 1 次 Layout，FPS 稳定在 60。
**这说明了什么**：卡顿的本质是"某个任务占用了太多帧预算"。Layout Thrashing 是最常见的帧预算超支原因。
**接下来去哪**：带着"什么任务最容易超时"这个问题，进入 Step 2。
**做到才算过**：能说出一帧内 5 个阶段的顺序和总预算。能在实验中观察到强制同步布局的 FPS 骤降。

### Step 2：理解事件循环与长任务
**做**：阅读 `overview.md` 的"事件循环与长任务"章节 + `edge-cases.md` 的微任务风暴和宏任务饥饿。
**你会看到什么**：微任务（Promise.then）在渲染前执行，可独占主线程；单个宏任务 >50ms 就是 Long Task。
**这说明了什么**：不是所有 JS 都会阻塞渲染——关键是要把长任务切片。
**接下来去哪**：进入阶段二，学习如何定位 Long Task。
**做到才算过**：能解释微任务→rAF→渲染→宏任务的执行顺序。

### 阶段一过关标准
- [ ] 能说出 16ms 帧预算的含义
- [ ] 能画出事件循环的执行顺序
- [ ] 能解释微任务风暴和宏任务饥饿的区别
- 做不到？→ 回到 `overview.md` A1/A2 节点重读

---

## 阶段二：掌握 Long Task 定位与 DevTools 分析

### 你将理解什么
如何用 DevTools 找到卡顿的根因？Long Tasks API 如何自动监测？

### Step 3：用实验观察 Long Task，用 Performance 面板定位
**做**：打开 Chrome DevTools → Performance 面板，录制一个卡顿页面的操作。找到红色三角标记的 Long Task。
**然后动手**：在实验中切换到「Long Task」标签页。点击「❌ 同步长任务 (200ms)」，观察日志中 `🔴 Long Task detected: ~200ms`，FPS 降到接近 0。然后点击「✅ 分片执行」，观察主线程保持响应。
**你会看到什么**：Long Task 会显示调用栈，精确到哪一行代码耗时最长。实验中同步 200ms 计算完全阻塞主线程，分片执行每片 <4ms 不影响帧率。
**这说明了什么**：Performance 面板是"定位根因"的精确武器——不是猜，而是看。
**接下来去哪**：阅读 `edge-cases.md` 的"未识别 Long Task"坑点。
**做到才算过**：能用 Performance 面板找到一个 Long Task 并读出其调用栈。能在实验中对比同步长任务 vs 分片执行的 FPS 差异。

### Step 4：部署 Long Tasks API 监测
**做**：阅读 `overview.md` 的 A16 节点。在项目中用 PerformanceObserver 监听 Long Task。
**你会看到什么**：`new PerformanceObserver(list => { ... }).observe({ entryTypes: ['longtask'] })` 可以自动上报 >50ms 的任务。
**这说明了什么**：DevTools 是手动排查，Long Tasks API 是线上自动监测——两者互补。
**接下来去哪**：进入阶段三，学习优化手段。
**做到才算过**：能在代码中部署 Long Tasks API 监测。

### 阶段二过关标准
- [ ] 能用 Performance 面板定位 Long Task
- [ ] 能用 Long Tasks API 监测线上卡顿
- [ ] 能说出手动排查 vs 线上监测的适用场景
- 做不到？→ 回到 `overview.md` A4/A16 节点 + `edge-cases.md` 重读

---

## 阶段三：学习优化手段——Worker 卸载与 CSS 隔离

### 你将理解什么
如何把计算密集型任务从主线程移走？CSS contain 如何减少布局计算？

### Step 5：用 Web Worker 卸载计算，用实验对比动画模式
**做**：阅读 `overview.md` 的 A10 节点 + `trade-offs.md` 的 Worker 通信对比。写一个 Worker 示例：主线程发数据→Worker 计算→Worker 返回结果。
**然后动手**：在实验中切换到「rAF 调度」标签页。依次点击三种动画模式：
1. 「❌ setTimeout 动画」→ FPS 波动，因为 setTimeout 不精确且触发 Layout
2. 「✅ rAF 动画」→ FPS 稳定 60，与浏览器刷新率同步
3. 「🚀 transform 动画」→ 最优，只触发 Composite，跳过 Layout 和 Paint
**你会看到什么**：Worker 在独立线程运行，不阻塞主线程渲染；但 postMessage 有序列化开销。transform 动画比 left 动画少两个渲染阶段。
**这说明了什么**：Worker 适合"计算密集但通信量小"的场景（排序、搜索、加密）。动画属性选择直接影响渲染管线的参与阶段。
**接下来去哪**：阅读 `trade-offs.md` 的 postMessage vs SharedArrayBuffer。
**做到才算过**：能写一个 Worker 示例，理解 Transferable Objects 零拷贝。能在实验中对比三种动画模式的 FPS 差异。

### Step 6：用 CSS contain 隔离子树
**做**：阅读 `overview.md` 的 A13 节点 + `edge-cases.md` 的层爆炸坑点。在页面中给一个复杂组件添加 `contain: layout paint`。
**你会看到什么**：浏览器跳过该子树的布局和绘制，减少渲染工作量。
**这说明了什么**：CSS 手段是免费的优化，但 `will-change` 过度使用会导致 GPU 内存暴涨（层爆炸）。
**接下来去哪**：进入阶段四，综合排查实战。
**做到才算过**：能解释 contain 的三种取值和 will-change 的利弊。

### 阶段三过关标准
- [ ] 能写一个 Web Worker 示例
- [ ] 能解释 postMessage 的序列化开销和 Transferable Objects
- [ ] 能用 contain 属性优化渲染性能
- 做不到？→ 回到 `overview.md` A10/A13 节点 + `trade-offs.md` 重读

---

## 阶段四：综合运用——排查实战

### 你将理解什么
从用户反馈"页面卡"到定位根因并修复的完整流程是什么？

### Step 7：走完排查全流程
**做**：阅读 `overview.md` 的 8 步排查流程。拿一个真实卡顿页面实践：Performance 录制→Long Task 定位→调用栈分析→选择优化手段→验证效果。
**你会看到什么**：排查是"缩小范围→精确定位→选择方案→验证效果"的迭代过程。
**这说明了什么**：优化手段是多样的（切片、Worker、contain、动画属性选择），关键是先定位再选方案。
**接下来去哪**：阅读 `overview.md` 的三层优化模型（减少消耗→转移负载→框架调度）。
**做到才算过**：能独立完成一个卡顿页面的排查全流程。

### Step 8：理解框架级调度
**做**：阅读 `overview.md` 的框架落地方案（React Concurrent Mode / Vue nextTick）。
**你会看到什么**：React 的 `startTransition` 和 `useDeferredValue` 可以把低优先级更新让出主线程。
**这说明了什么**：框架级调度是"自动切片"——比手动 setTimeout 切片更优雅。
**接下来去哪**：完成！
**做到才算过**：能说出 React Concurrent Mode 和 Vue nextTick 的区别。

### 阶段四过关标准
- [ ] 能独立完成卡顿排查全流程
- [ ] 能说出三层优化模型（减少消耗→转移负载→框架调度）
- [ ] 能在 React/Vue 中使用框架级调度优化
- 做不到？→ 回到 `overview.md` 排查流程 + 框架落地方案重读

---

## 学完之后你应该能做到

**面试场景**：面对"动画掉帧/输入延迟怎么排查"的问题，能从事件循环→16ms 帧预算→Long Task 定位→Web Worker 卸载→CSS contain 隔离→React Concurrent Mode 完整回答。

**实战场景**：能用 Performance 面板定位 Long Task，部署 Long Tasks API 线上监测，用 Worker + contain + startTransition 组合优化渲染性能。
