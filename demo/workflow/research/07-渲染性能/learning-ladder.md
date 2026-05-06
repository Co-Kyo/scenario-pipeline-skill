# P7-渲染性能 · 学习阶梯

> **命题**：渲染性能：重排重绘触发机制与合成层优化
> **目标**：从零基础到能独立诊断和优化渲染性能问题

---

## 阶梯总览

```
Level 5 ── 实战优化 ── contain 粒度选择 + 合成层治理 + 生产监控体系
    ↑
Level 4 ── 合成层原理 ── will-change + GPU 图层 + content-visibility
    ↑
Level 3 ── 事件循环调度 ── rAF/rIC + 长任务检测 + 任务分片
    ↑
Level 2 ── 渲染管线深入 ── Layout/Paint/Composite 触发条件 + Layout Thrashing
    ↑
Level 1 ── 基础认知 ── CRP 全链路 + DOM 生命周期 + DevTools 基本操作
```

---

## Level 1：基础认知

### 学习目标
- 理解浏览器渲染管线（CRP）的完整流程
- 了解 DOM 节点的生命周期（创建→挂载→更新→卸载→GC）
- 能使用 DevTools Performance 面板录制并查看火焰图

### 核心知识点
1. **CRP 全链路**：HTML → DOM Tree → CSSOM → Render Tree → Layout → Paint → Composite
2. **DOM 节点生命周期**：createElement → appendChild → 更新 → removeChild → GC
3. **DevTools 基本操作**：
   - Performance 面板：录制、查看 Main 轨道、识别 Layout/Paint 事件
   - Elements 面板：Event Listeners 查看
   - Console：基本性能 API（performance.now()）

### 动手练习
- 打开任意网页，录制 Performance，识别一个 Layout 事件和一个 Paint 事件
- 在 Console 中用 `performance.now()` 测量一段代码的执行时间

### 产出检验
- [ ] 能画出 CRP 流程图
- [ ] 能说出 Layout 和 Paint 的区别
- [ ] 能用 DevTools 录制一段性能数据

---

## Level 2：渲染管线深入

### 学习目标
- 理解哪些属性触发 Layout、哪些触发 Paint、哪些只触发 Composite
- 掌握 Layout Thrashing 的成因和修复方法
- 能识别强制同步布局

### 核心知识点
1. **属性触发阶段**（参考 csstriggers.com）：
   - Layout 触发：width, height, top, left, margin, padding, font-size...
   - Paint 触发：color, background, box-shadow, border-color...
   - Composite only：transform, opacity
2. **Layout Thrashing**：JS 循环中交替读写布局属性，导致反复强制同步布局
3. **强制同步布局**：读取 offsetWidth 等属性时，如果布局队列有待处理变更，浏览器被迫立即 Layout
4. **批量读写分离**：先读所有需要的值，再写所有变更

### 动手练习
- 编写一个 Layout Thrashing 的反模式代码，用 DevTools 观察 Layout 事件密度
- 重构为批量读写，对比 Layout 事件数量
- 测量 top/left 动画 vs transform 动画的 Paint 事件差异

### 产出检验
- [ ] 能列出 5 个触发 Layout 的 CSS 属性
- [ ] 能修复一个 Layout Thrashing 代码
- [ ] 能解释为什么 transform 比 top/left 快

---

## Level 3：事件循环调度

### 学习目标
- 理解事件循环的宏任务/微任务模型
- 掌握 requestAnimationFrame 与渲染帧的同步关系
- 能使用 Long Tasks API 检测主线程阻塞

### 核心知识点
1. **事件循环模型**：宏任务 → 微任务 → 渲染更新（rAF → Style → Layout → Paint → Composite）
2. **帧预算**：16.6ms（60fps），JS 执行 + 渲染必须在此时间内完成
3. **requestAnimationFrame**：与渲染同步，在 Layout/Paint 前执行
4. **requestIdleCallback**：空闲期调度，Safari 不支持
5. **Long Tasks API**：>50ms 的任务被标记，有 attribution 归属信息
6. **任务分片策略**：rIC、scheduler.yield()、rAF 分帧

### 动手练习
- 用 PerformanceObserver(type: 'longtask') 监控页面长任务
- 人为制造一个 100ms 的同步阻塞，观察 Long Task 标记
- 用 rAF 实现一个简单的分帧处理

### 产出检验
- [ ] 能画出一个渲染帧的完整执行顺序
- [ ] 能解释为什么 setTimeout 不适合做动画
- [ ] 能用 Long Tasks API 检测并归因长任务

---

## Level 4：合成层原理

### 学习目标
- 理解 GPU 合成层的提升机制和内存代价
- 掌握 will-change 的正确使用方式
- 了解 contain 属性的四种隔离模式
- 能使用 content-visibility 优化长页面

### 核心知识点
1. **合成层提升条件**：will-change、transform 不为 none、backface-visibility: hidden 等
2. **合成层内存代价**：每个层约 4×宽×高 字节 GPU 显存
3. **will-change 动态管理**：动画前设置，动画后清除为 auto
4. **contain 属性**：
   - `size`：子树尺寸不影响外部
   - `layout`：创建新 containing block
   - `style`：counter 隔离
   - `paint`：裁剪溢出 + stacking context
   - `content` = layout + style + paint（推荐）
   - `strict` = size + layout + style + paint
5. **content-visibility: auto**：跳过屏幕外元素渲染，必须配合 contain-intrinsic-size
6. **Layers 面板**：查看合成层数量和内存

### 动手练习
- 创建 100 个卡片，分别用静态 will-change 和动态管理，用 Layers 面板对比图层数量
- 对一个组件添加 contain: content，用 Rendering 面板的 Paint flashing 验证重绘范围缩小
- 用 content-visibility: auto 优化一个长文档，测量首屏加载时间

### 产出检验
- [ ] 能解释合成层的内存代价
- [ ] 能正确使用 will-change（动态管理）
- [ ] 能为组件选择合适的 contain 粒度
- [ ] 能用 content-visibility 优化长页面

---

## Level 5：实战优化

### 学习目标
- 能独立诊断渲染性能问题（从现象到根因）
- 掌握生产环境性能监控体系搭建
- 能在复杂场景中做出正确的性能 trade-off

### 核心知识点
1. **诊断流程**：
   - FPS 掉帧 → Performance 录制 → Long Task 归因 → Layout/Paint 分析 → 修复
2. **生产监控**：
   - web-vitals（LCP/INP/CLS）
   - PerformanceObserver（Long Task、resource timing）
   - sendBeacon 上报
3. **复杂场景 Trade-off**：
   - 动画多 → transform + 动态 will-change
   - 列表长 → content-visibility 或虚拟滚动
   - 组件多 → contain:content 组件级隔离
   - 交互频繁 → 事件委托 + 读写分离
4. **Detached DOM 检测**：Heap Snapshot 过滤 Detached，对比增长
5. **事件监听器清理**：AbortController 统一管理

### 动手练习
- 对一个真实项目进行完整的渲染性能审计
- 搭建一个基于 web-vitals + PerformanceObserver 的监控体系
- 处理一个包含 Layout Thrashing + 合成层泄漏 + Detached DOM 的综合案例

### 产出检验
- [ ] 能独立完成从问题发现到修复的全流程
- [ ] 能搭建生产环境性能监控
- [ ] 能在 5 个坑点中识别并修复至少 3 个
- [ ] 能为团队输出渲染性能最佳实践文档

---

## 能力覆盖矩阵

| Level | A1 渲染管线 | A2 DOM 生命周期 | A4 事件循环 | A6 合成层 | A8 DevTools |
|-------|-----------|---------------|-----------|---------|-----------|
| L1 | ✅ CRP 全链路 | ✅ 生命周期概览 | — | — | ✅ 基本录制 |
| L2 | ✅ 属性触发阶段 | ✅ 批量操作 | — | — | ✅ Layout/Paint 分析 |
| L3 | — | — | ✅ 事件循环模型 | — | ✅ Long Task 监控 |
| L4 | — | — | — | ✅ 合成层 + contain | ✅ Layers 面板 |
| L5 | ✅ 综合优化 | ✅ 泄漏排查 | ✅ 任务分片 | ✅ 治理策略 | ✅ 监控体系 |

---

## 推荐学习路径

1. **第 1 周**：Level 1 + Level 2 — 建立渲染管线认知，掌握 Layout Thrashing 诊断
2. **第 2 周**：Level 3 — 理解事件循环，掌握 Long Task 检测
3. **第 3 周**：Level 4 — 合成层原理，contain/content-visibility 实战
4. **第 4 周**：Level 5 — 综合实战，搭建监控体系

**总预估时间**：4 周（每天 2-3 小时）

---

## 命题间关联

学习 P7（渲染性能）会自然铺垫以下命题：

| 关联命题 | 关联点 | 铺垫效果 |
|---------|-------|---------|
| P1-长列表渲染 | Layout Thrashing + 批量 DOM 操作 | 虚拟列表的性能基础 |
| P4-Core Web Vitals | Long Task + INP/CLS | CWV 指标的底层理解 |
| P3-内存泄漏 | Detached DOM + 事件监听器 | DOM 生命周期的下游延伸 |
| P8-长任务拆分 | 事件循环 + rAF/rIC | 任务分片策略的直接应用 |
