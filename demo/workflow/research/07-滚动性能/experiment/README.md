# MVE: 滚动性能 — 懒加载与 contain 隔离

## 环境基线
- 浏览器：Chrome 90+ / Firefox 89+ / Safari 15+
- 无需 Node.js 或构建工具，纯 HTML+JS
- 操作系统：无约束

## 一键启动
```bash
open 07-滚动性能/experiment/src/index.html
```

## 验证检查点

### 检查点 1：无优化基线
1. 保持默认「❌ 无优化」模式
2. 点击「▶ 自动滚动」，观察 FPS 下降
3. 所有图片立即加载，DOM 数量大
4. **验证能力**：A1-渲染管线（大量 DOM 滚动时 Layout 开销）

### 检查点 2：图片懒加载
1. 点击「⏳ 图片懒加载」
2. 滚动时图片按需加载（IntersectionObserver）
3. 观察 CLS 值增加（图片加载导致布局偏移）
4. **验证能力**：A9-IntersectionObserver + A8-CLS

### 检查点 3：contain 隔离
1. 点击「📦 contain 隔离」
2. 每个商品卡片添加 `contain: content`
3. 滚动时浏览器跳过视口外卡片的 Layout/Paint
4. **验证能力**：A13-CSS contain

### 检查点 4：全量优化
1. 点击「🚀 全量优化」
2. 懒加载 + contain + 200px rootMargin 预加载
3. FPS 稳定，CLS 接近 0
4. **验证能力**：A9 + A13 + A8 综合优化

### 检查点 5：数据量敏感性
1. 将商品数调到 500
2. 对比无优化 vs 全量优化的 FPS 差异
3. **验证能力**：A13-CSS contain（DOM 数量大时效果更明显）

## 故障排除

- **FPS 波动大**：确保浏览器标签页在前台，关闭其他标签页减少干扰
- **CLS 值为模拟值**：真实 CLS 需用 PerformanceObserver 或 Lighthouse 测量
- **图片用 emoji 模拟**：实际图片加载会更明显地体现懒加载效果
