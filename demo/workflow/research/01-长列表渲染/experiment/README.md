# MVE: 万级数据虚拟列表渲染

## 环境基线
- 运行时版本：Chrome v120+
- 操作系统：任意
- 无需 Node.js 或构建工具

## 一键启动
在 Chrome 中直接打开 src/index.html

## 验证检查点
1. [预期] DOM 节点数始终 ~15 个 → Elements 面板检查 → 验证 A14 虚拟化
2. [预期] 滚动 60fps 无掉帧 → Performance 面板录制 → 验证 A1 渲染管线
3. [预期] 无 Long Task → PerformanceObserver 回调 → 验证 A4 事件循环
4. [预期] Memory 稳定无增长 → Memory 面板 → 验证 A2 DOM 生命周期
5. [预期] 10 万条数据初始渲染 < 100ms → performance.measure → 验证 A14 算法效率

## 故障排除
- Chrome 版本过低 → 升级到 v120+
- 滚动卡顿 → 检查是否有浏览器扩展干扰
