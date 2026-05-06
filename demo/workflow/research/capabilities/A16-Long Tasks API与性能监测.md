# Long Tasks API 与性能监测

> ID: A16 | 扇出: 2/8 | 耦合度: 1 | 战略价值: 1.0 | 🏕️ 三级能力

## 核心机制

**Long Tasks API**：监测主线程上执行超过 50ms 的任务：

```javascript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Long task:', entry.duration, 'ms', entry.attribution);
  }
});
observer.observe({ entryTypes: ['longtask'] });
```

**PerformanceObserver**：替代已废弃的 `performance.onresourcetimingbufferfull`，支持多种 entry types：
- `longtask`：>50ms 的任务
- `largest-contentful-paint`：LCP
- `layout-shift`：CLS
- `event`：INP 相关的事件时序
- `paint`：FP/FCP
- `navigation`：页面导航时序

**INP 采集**：通过 `PerformanceObserver({entryTypes: ['event']})` 记录所有交互事件的 input delay + processing duration + presentation delay。

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|---------|---------|---------|---------|
| 1 | Long Task 未被发现 | 没有部署 Long Task 监测 | 用户体验差但无告警 | 部署 PerformanceObserver | 上报到监控平台，设置告警阈值 |
| 2 | 监测本身消耗性能 | PerformanceObserver 回调过重 | 回调成为新的 Long Task | 自身性能测试 | 回调中只做轻量操作（收集数据），上报用 requestIdleCallback |
| 3 | 数据噪声 | 首屏加载期间大量 Long Task | 数据被加载噪声淹没 | 过滤条件 | 按页面生命周期过滤，只关注交互阶段 |

## 典型权衡

| 维度 | 方案 A | 方案 B | 选择建议 |
|------|--------|--------|---------|
| 采集方式 | PerformanceObserver（实时，低延迟）| Web Vitals 库（封装好，但有额外 JS）| 推荐 web-vitals 库，省去自己处理兼容性 |
| 上报策略 | 每个 Long Task 立即上报（实时但请求多）| 批量上报（减少请求但有延迟）| 用 requestIdleCallback 批量上报 |

## 参考资料

- [T1] MDN: Long Tasks API: https://developer.mozilla.org/en-US/docs/Web/API/Long_Tasks_API
- [T2] web.dev: INP: https://web.dev/articles/inp
