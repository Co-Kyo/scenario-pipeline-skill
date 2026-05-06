# Core Web Vitals 实验：CWV 指标监测 + 优化对比

## 实验目标

通过一个可运行的 HTML 页面，直观体验 Core Web Vitals 三项指标的监测和优化效果：
1. **LCP 监测**：对比 lazy loading vs fetchpriority 对 LCP 的影响
2. **CLS 监测**：对比无尺寸图片 vs 有尺寸图片的布局偏移
3. **INP 监测**：对比长任务阻塞 vs 任务分片的交互响应

## 文件说明

```
experiment/
├── README.md          # 本文件
└── src/
    └── index.html     # 完整可运行实验页面
```

## 使用方法

1. 用 HTTP 服务器启动（不要用 file:// 协议，资源加载受限）
   ```bash
   cd experiment/src
   python3 -m http.server 8080
   ```
2. 打开 Chrome DevTools → Performance 面板，录制并观察
3. 或打开 Console 查看实时 CWV 指标输出

## 实验内容

### 实验 1：LCP 优化对比
- **对照组**：首屏 Hero 图片使用 `loading="lazy"`
- **实验组**：首屏 Hero 图片使用 `fetchpriority="high"`
- **观测**：Performance 面板 Timings 轨道中 LCP 标记的时间差异

### 实验 2：CLS 优化对比
- **对照组**：图片无 width/height 声明
- **实验组**：图片声明 width/height + aspect-ratio
- **观测**：Performance 面板 Experience 轨道中 Layout Shift 事件

### 实验 3：INP 优化对比
- **对照组**：按钮点击执行 200ms 同步长任务
- **实验组**：同样任务使用 scheduler.yield() 分片
- **观测**：Performance 面板 Interactions 轨道 + Console 中 INP 值

## 技术要点

- 使用 `PerformanceObserver` API 实时监测 LCP/CLS/INP
- 使用 `web-vitals` 库（CDN 引入）获取标准化指标
- 人为制造性能问题以对比优化效果
- 所有代码零依赖、单文件可运行
