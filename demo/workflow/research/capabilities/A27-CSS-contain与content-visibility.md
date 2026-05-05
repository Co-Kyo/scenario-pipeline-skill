# A27 - CSS contain 与 content-visibility

## 核心机制

### CSS contain 属性
告知浏览器某个元素的渲染是独立的，其内部变化不会影响外部布局。四种 containment 类型：

- **`contain: size`**：元素尺寸不受子元素影响，浏览器可跳过子元素尺寸计算
- **`contain: layout`**：内部布局与外部隔离，内部变化不触发外部 reflow
- **`contain: style`**：CSS counter/quote 等"逃逸"属性被限制在元素内
- **`contain: paint`**：子元素不会绘制到元素边界外（类似 overflow:hidden），浏览器可跳过屏幕外元素的绘制

速记值：
- `contain: strict` = `size layout paint style`（最严格）
- `contain: content` = `layout paint style`（不含 size，更实用）

### content-visibility 属性
基于 contain 的高级封装，控制元素是否渲染其内容：

- **`visible`**（默认）：正常渲染
- **`auto`**：自动判断——屏幕外时跳过渲染（layout + paint + style containment），进入 viewport 时恢复渲染
- **`hidden`**：始终跳过渲染，类似 `display: none` 但保留渲染状态（再次显示时更快）

### content-visibility: auto 的工作原理
1. 元素启用 layout/paint/style containment
2. 浏览器判断元素是否"对用户相关"（在 viewport 附近）
3. 屏幕外 → 跳过子元素的 layout 和 paint（节省大量渲染时间）
4. 接近 viewport → 恢复渲染
5. 需配合 `contain-intrinsic-size`（或 `contain-intrinsic-size: auto 500px`）提供占位尺寸

## 工程瓶颈

1. **`contain: size` 必须显式设尺寸**：使用 size containment 时若未设置宽高，元素会坍缩为 0，极易导致布局 bug
2. **find-in-page 与 accessibility**：`content-visibility: hidden` 的内容对 Ctrl+F 不可搜索，`auto` 的屏幕外内容仍可被搜索但可能影响滚动定位
3. **`contain-intrinsic-size` 不准确**：占位尺寸与实际内容差异大时，滚动条会跳动（类似 CLS）
4. **嵌套 containment 的性能收益递减**：过深的 containment 嵌套增加浏览器管理 containment 上下文的开销
5. **动画/transition 兼容性**：`contain` 属性本身不可动画化；`content-visibility` 支持 discrete animation 但需设置 `transition-behavior: allow-discrete`

## 调试工具

- **Chrome DevTools → Performance 面板**：对比开启 containment 前后的 layout/paint 时间
- **Chrome DevTools → Rendering → Layer borders**：查看 containment 创建的合成层
- **Lighthouse**：检测可受益于 content-visibility 的长页面
- **Chrome DevTools → Elements → Computed**：确认 containment 是否生效
- **about:tracing**（Chrome）：详细查看 Rendering pipeline 各阶段耗时

## 典型权衡

1. **渲染性能 vs 布局准确性**：containment 跳过子元素计算提升性能，但可能影响依赖子元素尺寸的父元素布局（如未设 size containment 的 flex 子项）
2. **content-visibility: auto vs 手动虚拟滚动**：auto 更简单无侵入，但对超长列表（>1000 项）的性能不如 IntersectionObserver + 虚拟列表精细控制
3. **containment 粒度选择**：`strict` 最激进但限制最多（需显式尺寸）；`content` 更实用但性能收益略低

## 最小验证实验

```html
<!-- content-visibility: auto 实验 -->
<style>
  section {
    content-visibility: auto;
    contain-intrinsic-size: auto 500px;
  }
</style>

<!-- 生成 50 个 section，每个含大量 DOM -->
<section><p>Section 1... 大量内容</p></section>
<section><p>Section 2... 大量内容</p></section>
<!-- ... -->

<!-- contain 实验 -->
<style>
  .card {
    contain: layout paint;
    /* 内部变化不会触发外部 reflow */
  }
</style>
```

验证步骤：
1. 创建包含 50 个 section 的长页面，每个 section 有 100+ DOM 节点
2. 对比无 containment vs `content-visibility: auto` 两种方案
3. 用 Performance 面板录制滚动操作，对比 Scripting/Rendering 时间
4. 观察屏幕外 section 的 layout/paint 是否被跳过（Performance 面板中 Recalculate Style / Layout 耗时显著降低）

## 参考资料

- [MDN: CSS contain](https://developer.mozilla.org/en-US/docs/Web/CSS/contain)
- [MDN: CSS content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility)
- [web.dev: content-visibility](https://web.dev/articles/content-visibility)
- [CSS Containment Spec](https://www.w3.org/TR/css-contain-2/)
- [知乎: 使用 content-visibility 优化渲染性能](https://zhuanlan.zhihu.com/p/528538686)
