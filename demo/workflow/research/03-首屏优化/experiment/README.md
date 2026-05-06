# MVE: 首屏优化 — Code Splitting 与懒加载

## 环境基线
- 浏览器：Chrome 90+ / Firefox 89+ / Safari 15+
- 无需 Node.js 或构建工具，纯 HTML+JS
- 操作系统：无约束

## 一键启动
```bash
open 03-首屏优化/experiment/src/index.html
```

## 验证检查点

### 检查点 1：无优化基线
1. 保持默认「无优化」模式
2. 观察 Web Vitals 指标：FCP ~850ms, LCP ~1500ms, TTI ~1800ms
3. 观察瀑布图：vendor.js (450KB) 阻塞首屏
4. **验证能力**：A7-Code Splitting（无分割时单文件过大）

### 检查点 2：Code Splitting 效果
1. 点击「✂️ Code Splitting」
2. 对比指标变化：FCP 降至 ~450ms, JS 体积从 730KB 降至 260KB
3. 瀑布图显示 vendor/app/chunk 分离加载
4. **验证能力**：A7-Code Splitting + Tree Shaking

### 检查点 3：懒加载效果
1. 点击「⏳ 懒加载」
2. LCP 进一步降至 ~500ms（preload LCP 图片）
3. CLS 从 0.25 降至 0.05（图片设 width/height）
4. **验证能力**：A8-Core Web Vitals + A9-IntersectionObserver

### 检查点 4：全量优化
1. 点击「🚀 全量优化」
2. SSR 直出 HTML，FCP ~100ms
3. Critical CSS 内联，无渲染阻塞
4. **验证能力**：A11-SSR/Hydration + A6-HTTP 缓存

### 检查点 5：动画对比
1. 点击「▶ 模拟加载」观察瀑布图动画
2. 对比四种方案的资源加载时间线
3. **验证能力**：A6-HTTP 缓存（contenthash 长期缓存）

## 故障排除

- **指标数值为模拟值**：本实验用可视化方式展示原理，非真实 Performance API 采集
- **想看真实数据**：用 Chrome DevTools → Lighthouse 对真实项目运行
