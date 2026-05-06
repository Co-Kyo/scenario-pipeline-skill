# P8 长任务拆分 — Trade-offs：方案对比

## 1. 主线程拆分方案：rIC vs scheduler.yield()

### 对比维度

| 维度 | requestIdleCallback | scheduler.yield() |
|------|--------------------|--------------------|
| **触发时机** | 浏览器判定空闲期 | 主动让出到下一个宏任务 |
| **优先级控制** | 无（只有 timeout 兜底） | 无（但可配合 `scheduler.postTask` 使用） |
| **Safari 支持** | ❌ 不支持 | ❌ 不支持 |
| **Chrome 版本** | 47+ | 115+ |
| **语义** | "有空再做"（可能永远不做） | "先让别人做，下一轮继续" |
| **可中断性** | 浏览器可随时中断 callback | yield 点可中断 |

### 决策矩阵

```
需要确保任务最终执行？
  ├── 是 → scheduler.yield() 或 setTimeout
  └── 否（低优先级可丢弃）→ rIC（Safari 用 setTimeout polyfill）

需要精确控制优先级？
  ├── 是 → scheduler.postTask({ priority: 'user-blocking' | 'user-visible' | 'background' })
  └── 否 → rIC 或 scheduler.yield()

需要兼容旧浏览器？
  ├── 是 → setTimeout(fn, 0) + 手动时间切片
  └── 否 → scheduler.yield()
```

### 推荐

- **渐进式方案**：优先 `scheduler.yield()`，降级到 `setTimeout`
- **低优先级任务**：用 `requestIdleCallback`（带 timeout 兜底），Safari 降级到 `setTimeout`

---

## 2. 计算卸载方案：Worker vs 主线程分片

### 对比维度

| 维度 | Web Worker | 主线程分片 |
|------|-----------|-----------|
| **线程** | 独立线程 | 主线程内切片 |
| **DOM 访问** | ❌ 不可访问 | ✅ 可访问 |
| **计算密集型** | ✅ 完全不阻塞主线程 | ⚠️ 仍在主线程，只是分时 |
| **通信开销** | postMessage 序列化 | 无 |
| **调试难度** | 高（独立线程） | 低 |
| **初始化开销** | 50~200ms（首次） | 无 |
| **适用场景** | 数据处理、图像计算、加密 | UI 更新、DOM 操作、轻量计算 |

### 决策矩阵

```
任务需要访问 DOM？
  ├── 是 → 主线程分片（Worker 无法访问 DOM）
  └── 否 ↓

任务计算量 > 50ms？
  ├── 否 → 主线程分片足够
  └── 是 ↓

数据传输量大？
  ├── 是 → Worker + Transferable/SharedArrayBuffer
  └── 否 → Worker + postMessage
```

### 性能对比（估算）

| 场景 | 主线程分片 | Worker | 差异原因 |
|------|-----------|--------|----------|
| 10ms 计算 × 100 次 | 每次让出 ~1ms | postMessage 开销 > 收益 | 通信成本高于计算 |
| 500ms 单次计算 | 让出后仍有延迟感 | 完全不阻塞 | Worker 真正并行 |
| 10MB 数据处理 | 主线程内存压力大 | Transferable 零拷贝 | 大数据场景 Worker 优势明显 |
| 需要读取 DOM | ✅ 直接访问 | ❌ 需要先传递 DOM 数据 | 架构差异 |

### 推荐

- **计算 < 20ms 且无 DOM**：主线程分片（开销小）
- **计算 > 50ms 且无 DOM**：Web Worker
- **需要 DOM**：主线程分片（rAF/scheduler.yield）
- **大数据**：Worker + Transferable

---

## 3. Worker 通信方式：postMessage vs SharedArrayBuffer

### 对比维度

| 维度 | postMessage | SharedArrayBuffer |
|------|------------|-------------------|
| **数据复制** | 结构化克隆（深拷贝） | 共享内存（零拷贝） |
| **同步机制** | 异步消息队列 | `Atomics` 操作 |
| **复杂度** | 低 | 高（需处理竞态） |
| **浏览器要求** | 无特殊要求 | COOP + COEP 响应头 |
| **适用频率** | 低频通信 | 高频通信 |
| **数据大小** | 大数据慢（序列化） | 大数据快（共享） |
| **安全性** | 天然隔离 | 需手动同步，容易出错 |

### 决策矩阵

```
通信频率 > 100次/秒？
  ├── 是 → SharedArrayBuffer + Atomics
  └── 否 → postMessage（足够）

数据大小 > 1MB？
  ├── 是 → Transferable（postMessage + 转移所有权）
  └── 否 → postMessage

需要实时双向数据共享？
  ├── 是 → SharedArrayBuffer
  └── 否 → postMessage（请求-响应模式）
```

### 推荐

- **通用场景**：`postMessage` + `Transferable`（简单可靠）
- **高频数据流**（音频/视频处理）：`SharedArrayBuffer` + `Atomics`
- **避免**：用 `SharedArrayBuffer` 做简单通信（杀鸡用牛刀）

---

## 4. 长任务检测方案对比

| 方案 | 精确度 | 兼容性 | 开销 | 推荐场景 |
|------|--------|--------|------|----------|
| PerformanceObserver + longtask | ⭐⭐⭐ 有 attribution | Chrome 58+ | 极低 | 生产监控首选 |
| rAF + 时间差检测 | ⭐⭐ 无归因 | 全浏览器 | 低 | 兼容旧浏览器 |
| Performance.getEntriesByType | ⭐⭐ 批量查询 | Chrome 64+ | 无 | 离线分析 |
| DevTools 手动录制 | ⭐⭐⭐ 最详细 | 仅 Chrome | 无 | 开发调试 |

---

## 5. 总结：选择框架

```
┌─────────────────────────────────────────────┐
│            长任务优化决策树                    │
├─────────────────────────────────────────────┤
│                                             │
│  1. 用 DevTools/Long Tasks API 发现长任务    │
│           ↓                                 │
│  2. 分析任务类型                              │
│     ├── 需要 DOM → 主线程分片                 │
│     └── 纯计算 ↓                            │
│                                             │
│  3. 评估计算量                               │
│     ├── < 20ms → 主线程分片                  │
│     └── > 50ms → Web Worker                 │
│                                             │
│  4. 选择拆分 API                             │
│     ├── 需要确保执行 → scheduler.yield()     │
│     └── 低优先级 → rIC + timeout             │
│                                             │
│  5. 选择 Worker 通信                         │
│     ├── 低频 → postMessage + Transferable   │
│     └── 高频 → SharedArrayBuffer            │
│                                             │
│  6. 验证 → DevTools + INP 指标              │
│                                             │
└─────────────────────────────────────────────┘
```
