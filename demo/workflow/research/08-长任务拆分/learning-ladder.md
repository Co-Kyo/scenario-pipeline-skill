# P8 长任务拆分 — 学习阶梯

## Level 1：认知层 — 理解长任务是什么

**目标**：知道什么是长任务，为什么需要拆分。

**核心知识**：
- 浏览器主线程是单线程的，JS 执行会阻塞 UI 渲染和用户交互
- Long Task = 执行时间 > 50ms 的任务，阻塞用户输入响应
- INP（Interaction to Next Paint）衡量交互响应速度，长任务直接劣化 INP

**学习资源**：
- web.dev - Optimize INP: https://web.dev/articles/optimize-inp
- MDN - Event Loop: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop

**验收标准**：
- [ ] 能解释 Long Task 的 50ms 阈值来源
- [ ] 能说明长任务对用户体验的影响（卡顿、输入延迟）
- [ ] 能在 DevTools Performance 面板中识别 Long Task（红色三角标记）

---

## Level 2：工具层 — 学会检测长任务

**目标**：掌握用 DevTools 和 API 检测长任务的方法。

**核心知识**：
- Chrome DevTools Performance 面板录制 + Main 轨道分析
- `PerformanceObserver({ entryTypes: ['longtask'] })` 实时监控
- Long Task 的 `attribution` 属性定位具体脚本
- Lighthouse TBT（Total Blocking Time）自动化审计

**学习资源**：
- web.dev - Long Tasks DevTools: https://web.dev/articles/long-tasks-devtools
- Chrome DevTools - Performance Panel: https://developer.chrome.com/docs/devtools/performance/

**实践任务**：
- [ ] 用 Performance 面板录制一个包含长任务的页面
- [ ] 用 PerformanceObserver API 实时监控长任务并输出到控制台
- [ ] 通过 attribution 找到长任务的调用栈

**验收标准**：
- [ ] 能独立用 DevTools 发现并归因长任务
- [ ] 能编写 PerformanceObserver 监控代码

---

## Level 3：应用层 — 掌握主线程分片

**目标**：学会将长任务拆分为主线程可调度的小块。

**核心知识**：
- `setTimeout(fn, 0)` 切分到下一个宏任务
- `requestIdleCallback` 空闲期调度（Safari 不支持）
- `scheduler.yield()` 主动让出控制权（Chrome 115+）
- `requestAnimationFrame` 渲染同步调度
- 时间切片模式（Time Slicing）

**学习资源**：
- MDN - requestIdleCallback: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
- web.dev - Main Thread Scheduling: https://web.dev/articles/main-thread-scheduling

**实践任务**：
- [ ] 将一个 200ms 的循环计算拆分为 10 个 20ms 的小任务
- [ ] 实现一个通用的 `chunkedAsync` 函数，支持自动让出主线程
- [ ] 在 Safari 上验证 rIC polyfill 的降级效果

**验收标准**：
- [ ] 能根据任务特性选择合适的分片 API
- [ ] 拆分后 Long Task 消失，INP 改善
- [ ] 理解各 API 的触发时机和兼容性差异

---

## Level 4：进阶层 — Web Worker 卸载

**目标**：学会将计算密集型任务卸载到 Web Worker。

**核心知识**：
- Worker 创建、生命周期管理
- `postMessage` 通信（结构化克隆算法）
- `Transferable` 对象（零拷贝转移）
- `SharedArrayBuffer` + `Atomics`（共享内存）
- Worker Pool 模式（复用 Worker，避免冷启动）

**学习资源**：
- MDN - Web Workers API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- MDN - SharedArrayBuffer: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
- web.dev - Off Main Thread: https://web.dev/articles/off-main-thread

**实践任务**：
- [ ] 将一个 CPU 密集型计算（如图像处理/大数据排序）移到 Worker
- [ ] 对比 postMessage vs Transferable 传递 1MB 数据的性能差异
- [ ] 实现一个 Worker Pool，支持并发任务调度

**验收标准**：
- [ ] Worker 执行期间主线程 Long Task 为 0
- [ ] 能根据数据大小选择合适的通信方式
- [ ] 理解 COOP/COEP 对 SharedArrayBuffer 的限制

---

## Level 5：体系层 — 构建完整的长任务治理方案

**目标**：能设计并实施一个生产级的长任务监控与优化体系。

**核心知识**：
- 长任务治理策略：检测 → 归因 → 拆分/卸载 → 验证 → 持续监控
- 线上 RUM（Real User Monitoring）方案：web-vitals + PerformanceObserver
- 渐进式优化：先检测，再按严重程度排序，逐个解决
- 性能预算（Performance Budget）：设置 TBT/INP 阈值，CI/CD 卡点

**实践任务**：
- [ ] 搭建完整的长任务监控管线（PerformanceObserver → 上报 → Dashboard）
- [ ] 制定长任务治理 SOP（标准操作流程）
- [ ] 在真实项目中实施优化，对比优化前后的 Core Web Vitals

**验收标准**：
- [ ] 能设计端到端的长任务监控方案
- [ ] 能根据业务场景制定优化优先级
- [ ] 线上 INP 持续 < 200ms（Good 阈值）
