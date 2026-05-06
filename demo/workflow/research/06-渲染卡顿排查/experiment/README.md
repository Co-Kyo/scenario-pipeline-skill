# MVE: 渲染卡顿排查 — Long Task 与强制同步布局

## 环境基线
- 浏览器：Chrome 90+（Long Tasks API 需要 Chrome 支持）
- 无需 Node.js 或构建工具，纯 HTML+JS
- 操作系统：无约束

## 一键启动
```bash
open 06-渲染卡顿排查/experiment/src/index.html
```

## 验证检查点

### 检查点 1：强制同步布局 (Layout Thrashing)
1. 切换到「强制同步布局」标签页
2. 点击「❌ 读写交替」→ 观察 FPS 骤降，日志显示耗时
3. 点击「✅ 读写分离」→ 对比 FPS 和耗时差异
4. 调整 DOM 数量滑块到 5000，重复测试差异更明显
5. **验证能力**：A1-浏览器渲染管线（强制同步布局）

### 检查点 2：Long Task 检测
1. 切换到「Long Task」标签页
2. 点击「❌ 同步长任务」→ 日志显示 🔴 Long Task detected
3. 观察 FPS 降到接近 0
4. 点击「✅ 分片执行」→ 主线程保持响应
5. **验证能力**：A16-Long Tasks API + A2-事件循环

### 检查点 3：rAF vs setTimeout 动画
1. 切换到「rAF 调度」标签页
2. 点击「❌ setTimeout 动画」→ 观察 FPS 波动
3. 点击「✅ rAF 动画」→ FPS 稳定在 60
4. 点击「🚀 transform 动画」→ 最优性能，只触发 Composite
5. **验证能力**：A1-渲染管线（transform vs left）+ A2-事件循环（rAF 时序）

### 检查点 4：Long Tasks API 实时监测
1. 执行任何「❌」操作后，观察日志中的 Long Task 告警
2. 每个 >50ms 的任务都会被自动标记
3. **验证能力**：A16-Long Tasks API（PerformanceObserver 监测）

## 故障排除

- **Long Tasks API 不触发**：确保使用 Chrome，Firefox 不支持 longtask entry type
- **FPS 显示不准**：确保浏览器标签页在前台
- **DOM 数量太大导致卡顿**：5000 个 DOM 读写交替测试可能需要几秒，请耐心等待
