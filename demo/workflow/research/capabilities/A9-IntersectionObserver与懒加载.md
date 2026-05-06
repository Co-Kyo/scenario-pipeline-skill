# IntersectionObserver 与懒加载

> ID: A9 | 扇出: 3/8 | 耦合度: 1 | 战略价值: 3.0 | ⛰️ 二级高地

## 核心机制

IntersectionObserver API 异步观察目标元素与祖先/视口的交叉状态：

```javascript
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // 元素进入可视区域
      loadImage(entry.target.dataset.src);
      io.unobserve(entry.target);
    }
  });
}, {
  root: null,        // null = 视口
  rootMargin: '200px', // 提前 200px 开始加载
  threshold: 0.01     // 1% 可见即触发
});
```

**核心优势**：不阻塞主线程，浏览器在空闲时计算交叉状态，比 scroll + getBoundingClientRect 性能好得多。

**应用场景**：
- 图片懒加载（data-src → src）
- 无限滚动列表（底部哨兵元素进入视口时加载更多）
- 广告曝光统计
- 虚拟列表的可见性判断

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|---------|---------|---------|---------|
| 1 | 懒加载图片闪烁 | 图片未加载时无占位，加载后布局偏移 | CLS 增加，视觉跳动 | Lighthouse → CLS | 预设宽高比容器（aspect-ratio 或 padding-top hack） |
| 2 | IO 回调阻塞 | 回调中执行重计算逻辑 | 主线程阻塞 | Performance 面板 | 回调只做轻量操作（设置 src），重计算用 requestIdleCallback |
| 3 | 观察器未清理 | 组件销毁时未 disconnect | 内存泄漏 | Memory 面板 | useEffect cleanup 中调用 io.disconnect() |
| 4 | rootMargin 失效 | 嵌套滚动容器中 root 未正确设置 | 预加载不生效 | 调试 root 和 rootMargin | 显式设置 root 为实际滚动容器 |

## 调试工具

| 工具 | 用法 |
|------|------|
| Chrome DevTools Rendering 面板 | 开启 "Frame Rendering Stats" 查看 IO 触发频率 |
| Performance 面板 | 录制滚动操作，查看 IO 回调耗时 |
| Elements 面板 | 检查 data-src → src 的切换时机 |

## 典型权衡

| 维度 | 方案 A | 方案 B | 选择建议 |
|------|--------|--------|---------|
| 懒加载触发 | IntersectionObserver（异步，性能好）| scroll + getBoundingClientRect（同步，兼容性好）| 现代浏览器用 IO，需要兼容 IE 用 scroll |
| 占位策略 | 固定宽高比容器（无 CLS）| 无占位（简单但有 CLS）| 始终预设容器尺寸 |

## 参考资料

- [T1] MDN: IntersectionObserver: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
- [T2] web.dev: Lazy Loading Images: https://web.dev/articles/lazy-loading-images
