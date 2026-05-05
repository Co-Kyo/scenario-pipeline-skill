# 实验：图片优化——大图量场景下的加载与渲染性能

## 实验目标

通过纯 HTML/CSS/JS 实验，直观对比以下图片优化技术在大图量场景下的性能表现：

1. **图片懒加载对比**：无优化 vs `loading="lazy"` vs IntersectionObserver
2. **srcset 尺寸选择演示**：不同 viewport 宽度下浏览器选择的图片
3. **content-visibility 渲染性能对比**：50 个 section 各含大量 DOM，有/无 `content-visibility: auto` 的 Layout 耗时
4. **格式降级演示**：`<picture>` 元素 AVIF → WebP → JPEG fallback 链

## 文件说明

| 文件 | 用途 |
|------|------|
| `index.html` | 完整实验页面，纯 HTML/CSS/JS，无外部依赖 |

## 使用方法

直接在浏览器中打开 `index.html`，或使用本地服务器：

```bash
cd workflow/research/05-图片优化/experiment
python3 -m http.server 8080
# 访问 http://localhost:8080
```

## 验证检查点

### 检查点 1：懒加载请求数对比
- **预期**：无优化模式下，页面加载即发起 30 张图片请求；`loading="lazy"` 和 IntersectionObserver 模式下，初始请求数应 ≤ 5（仅视口内图片）
- **验证方法**：打开 DevTools → Network 面板，刷新页面后观察 Img 类型请求数

### 检查点 2：IntersectionObserver 加载时间
- **预期**：IO 模式下，滚动到图片区域时才触发加载，首屏加载时间应明显短于无优化模式
- **验证方法**：观察性能指标面板中的「首屏加载时间」数值

### 检查点 3：srcset 尺寸选择
- **预期**：调整浏览器窗口宽度后，srcset 演示区应显示对应宽度的图片（如 400px 窗口选小图，1200px 窗口选大图）
- **验证方法**：拖拽浏览器窗口边缘改变宽度，观察演示区高亮的选中图片

### 检查点 4：content-visibility Layout 耗时
- **预期**：启用 `content-visibility: auto` 的 section 列表，Layout 耗时应显著低于未启用的版本（通常减少 50% 以上）
- **验证方法**：点击「运行 Layout 基准测试」按钮，对比两组耗时

### 检查点 5：格式降级链
- **预期**：在支持 AVIF 的浏览器中显示 AVIF 标签，不支持时降级到 WebP，再不支持降级到 JPEG
- **验证方法**：观察格式降级演示区当前激活的格式标签，可在 `about:config` 中禁用 AVIF/WebP 验证降级

## 技术要点

- **IntersectionObserver**：通过 `rootMargin` 配置预加载距离，`threshold` 控制触发时机
- **loading="lazy"**：浏览器原生懒加载，无需 JS，但控制粒度较粗
- **srcset/sizes**：`srcset` 定义候选图片及宽度描述符，`sizes` 告知浏览器图片在不同视口下的显示尺寸
- **content-visibility**：CSS 属性，值为 `auto` 时浏览器跳过屏幕外元素的渲染，减少首次 Layout 和 Paint 开销
- **picture/source**：`<source>` 元素按顺序匹配，浏览器选择第一个支持的格式

## 注意事项

- 图片使用 picsum.photos 生成随机图片，需要网络连接
- content-visibility 测试在 Chromium 内核浏览器中效果最明显
- 格式降级依赖浏览器实际支持情况
