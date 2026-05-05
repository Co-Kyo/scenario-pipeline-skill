# 实验：首屏白屏——从 FCP 到 LCP 的全链路优化

> 命题：首屏白屏：从 FCP 到 LCP 的全链路优化  
> 限定词：SSR / SSG / SPA

## 实验概览

本实验通过纯浏览器端演示，验证以下关键能力：

| 编号 | 实验模块 | 能力 ID | 验证目标 |
|------|----------|---------|----------|
| 1 | CRP 阻塞对比 | A1 | CSS 同步 vs 异步、JS 同步 vs async/defer 对 FCP 的影响 |
| 2 | 关键路径精简 | A9 | 减少关键资源数、DOM 节点数对 Layout 耗时的影响 |
| 3 | 预加载对比 | A8 | preload vs 无 preload 的资源加载瀑布差异 |
| 4 | Code Splitting | A10 | 动态 import() 与首屏 JS 体积对比 |

## 使用方法

1. 用现代浏览器（Chrome 100+）直接打开 `index.html`
2. 点击各实验区域的「运行实验」按钮
3. 观察实时指标面板（右上角常驻显示 FCP / LCP）
4. 对比各场景下的数值差异

## 验证检查点

### ✅ 检查点 1：CSS 阻塞对 FCP 的影响
- **预期**：同步 `<link>` CSS 的 FCP 显著晚于异步 CSS（`media="print"` 切换）
- **判断**：异步 CSS 场景 FCP 应减少 200ms+

### ✅ 检查点 2：JS 加载策略对渲染的阻塞
- **预期**：同步 `<script>` 阻塞 DOM 解析；`async` / `defer` 不阻塞
- **判断**：defer 场景 FCP ≈ 无 JS 场景；同步 JS 场景 FCP 延迟明显

### ✅ 检查点 3：preload 加速关键资源
- **预期**：有 preload 时关键 CSS/字体加载更早，LCP 提前
- **判断**：preload 场景 LCP 优于无 preload ≥ 100ms

### ✅ 检查点 4：DOM 节点数影响 Layout 耗时
- **预期**：1000 节点 vs 50000 节点，Layout 时间差异 10x+
- **判断**：观察 PerformanceObserver 的 `layout-shift` 和 Layout 耗时

### ✅ 检查点 5：Code Splitting 减少首屏 JS 体积
- **预期**：动态 import() 仅加载首屏所需 chunk，总 JS 体积 < 同步全量加载
- **判断**：首屏 JS 解析时间更短，FCP 更早

## 技术说明

- 所有延迟通过 `setTimeout` 或 `new Promise` + `fetch` 模拟网络延迟
- DOM 节点实验通过脚本动态生成，避免页面卡死
- 指标采集使用 `PerformanceObserver`（paint / largest-contentful-paint / resource）
- 实验数据仅在当前页面生命周期内有效，刷新即重置
