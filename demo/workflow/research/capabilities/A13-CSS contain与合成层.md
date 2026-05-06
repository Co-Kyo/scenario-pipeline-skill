# CSS contain 与合成层

> ID: A13 | 扇出: 3/8 | 耦合度: 1 | 战略价值: 3.0 | ⛰️ 二级高地

## 核心机制

**CSS `contain` 属性**告诉浏览器该元素的子树与页面其余部分隔离，允许浏览器跳过不必要的布局/绘制：

| 值 | 效果 |
|---|------|
| `contain: layout` | 子元素不影响外部布局 |
| `contain: paint` | 子元素不溢出边界，不影响外部绘制 |
| `contain: size` | 元素尺寸不依赖子元素 |
| `contain: strict` | = layout + paint + size（最严格）|
| `contain: content` | = layout + paint（常用，不影响尺寸计算）|

**`content-visibility: auto`**：浏览器自动跳过视口外元素的渲染（Layout + Paint），首次进入视口时才渲染。对长列表/长页面效果显著。

**`will-change` 与合成层**：`will-change: transform` 提示浏览器将元素提升为独立合成层（GPU 加速），Paint 隔离，不影响其他元素。但每个合成层消耗 GPU 内存，过多会导致"层爆炸"。

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|---------|---------|---------|---------|
| 1 | contain 导致尺寸异常 | `contain: size` 未显式设置元素尺寸 | 元素高度塌陷为 0 | 视觉观察 + Elements 面板 | 使用 `contain: layout paint` 而非 `size` |
| 2 | 层爆炸 | 大量元素使用 `will-change: transform` | GPU 内存暴涨，Composite 耗时增加 | Layers 面板 → 图层数量 | 动画结束后移除 will-change |
| 3 | content-visibility 导致搜索失效 | Ctrl+F 搜索不到被跳过的内容 | 用户无法搜索页面文字 | 浏览器行为 | 设置 `content-visibility: auto` 并配合 `contain-intrinsic-size` |

## 典型权衡

| 维度 | 方案 A | 方案 B | 选择建议 |
|------|--------|--------|---------|
| 隔离粒度 | `contain: content`（轻量，不影响尺寸）| `contain: strict`（完全隔离但需手动设尺寸）| 默认用 content，需要完全隔离时用 strict |
| 合成层策略 | `will-change: transform`（GPU 加速）| 不提升（CPU 绘制）| 仅对动画元素使用，静态元素不要提升 |

## 参考资料

- [T1] MDN: CSS contain: https://developer.mozilla.org/en-US/docs/Web/CSS/contain
- [T2] web.dev: Content Visibility: https://web.dev/articles/content-visibility
