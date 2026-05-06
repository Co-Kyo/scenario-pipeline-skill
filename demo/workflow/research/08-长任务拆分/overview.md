# P8 长任务拆分 — Overview：链路编排

## 问题本质

浏览器主线程是单线程的。当一个 JavaScript 任务执行超过 **50ms**，浏览器将其标记为 **Long Task**，此时用户交互（点击、输入、滚动）会被阻塞，直接导致 INP（Interaction to Next Paint）指标劣化。

长任务拆分的核心目标：**将阻塞主线程的计算拆解为可中断的小块，或将其卸载到独立线程**。

## 链路总览

```
用户交互 → 主线程事件循环 → [检测长任务] → [调度拆分] → [执行优化]
               ↑                                    ↓
          DevTools 诊断 ←←←←←←←←←←←←←←←←←←←←←←←←←
```

## 第一环：事件循环调度（A4）

### 核心模型

浏览器事件循环基于 **宏任务 → 渲染 → 微任务** 的执行顺序：

1. **宏任务队列**（Macrotask）：setTimeout/setInterval、I/O、UI rendering
2. **微任务队列**（Microtask）：Promise.then、MutationObserver、queueMicrotask
3. **渲染阶段**：requestAnimationFrame → Style/Layout/Paint → requestIdleCallback

### 关键约束

- 微任务优先级高于宏任务，递归微任务会饿死宏任务
- 每帧渲染窗口约 **16.6ms**（60fps），超过则掉帧
- Long Task 阈值为 **50ms**，超过则阻塞用户输入响应

### 调度策略

| API | 用途 | 触发时机 | 兼容性 |
|-----|------|----------|--------|
| `setTimeout(fn, 0)` | 任务拆分 | 下一个宏任务 | 全浏览器 |
| `requestIdleCallback(fn)` | 低优先级任务 | 浏览器空闲期 | ❌ Safari 不支持 |
| `requestAnimationFrame(fn)` | 渲染同步任务 | 下一帧渲染前 | 全浏览器 |
| `scheduler.yield()` | 主动让出控制权 | 下一个宏任务 | ⚠️ Chrome 115+ |
| `queueMicrotask(fn)` | 微任务调度 | 当前任务结束后立即 | 全浏览器 |

## 第二环：Web Worker 卸载（A12）

### 核心模型

Web Worker 提供 **独立于主线程的执行上下文**：

```
主线程                         Worker 线程
┌──────────────┐    postMessage    ┌──────────────┐
│  UI 渲染      │ ──────────────→ │  计算密集任务  │
│  事件处理      │ ←────────────── │  数据处理      │
│  DOM 操作      │   onmessage     │  文件解析      │
└──────────────┘                  └──────────────┘
         ↕                                ↕
      共享内存（SharedArrayBuffer，需 COOP/COEP）
```

### 卸载决策树

```
任务是否阻塞主线程 >50ms？
  ├── 否 → 继续在主线程执行
  └── 是 → 是否需要 DOM 访问？
        ├── 是 → 主线程分片（rIC/scheduler.yield）
        └── 否 → 是否计算密集型？
              ├── 否 → 主线程分片即可
              └── 是 → Web Worker 卸载
```

### 通信模型选择

| 方式 | 适用场景 | 开销 |
|------|----------|------|
| `postMessage` | 通用数据传递 | 结构化克隆（大对象慢） |
| `Transferable` | 大数据（ArrayBuffer/ImageBitmap） | 零拷贝转移 |
| `SharedArrayBuffer` | 高频共享数据 | 需 Atomics 同步 |

## 第三环：DevTools 诊断（A8）

### 诊断流程

1. **发现长任务**
   - Performance 面板 → Main 轨道 → 红色三角标记
   - `PerformanceObserver({ entryTypes: ['longtask'] })` 实时监控
   - Lighthouse TBT（Total Blocking Time）指标

2. **归因分析**
   - Long Task 的 `attribution` 属性 → 定位具体脚本
   - 火焰图 → 找到最耗时的函数调用栈
   - Source 面板 → 定位到具体代码行

3. **验证优化**
   - 拆分后重新录制 → 对比 Long Task 数量和时长
   - INP 指标变化 → web-vitals 上报
   - 用户体感 → 交互响应是否流畅

### 关键指标

| 指标 | 含义 | 目标 |
|------|------|------|
| TBT | 50ms 以上的阻塞时间总和 | < 200ms |
| INP | 交互到下一帧渲染的延迟 | < 200ms |
| Long Task 数量 | 阻塞任务数 | 趋近于 0 |

## 链路闭环

```
DevTools 发现长任务
    ↓
事件循环分析（是宏任务阻塞还是微任务饥饿？）
    ↓
选择拆分策略：
  ├── 主线程分片（rIC / scheduler.yield / chunked processing）
  ├── Worker 卸载（计算密集型 / 大数据处理）
  └── 混合方案（主线程分片 + Worker 批处理）
    ↓
DevTools 验证优化效果
    ↓
线上 PerformanceObserver 持续监控
```
