# MVE: 图片优化 — 格式选择与响应式策略

## 环境基线
- 浏览器：Chrome 90+ / Firefox 89+ / Safari 15+
- 无需 Node.js 或构建工具，纯 HTML+JS
- 操作系统：无约束

## 一键启动
```bash
open 08-图片优化/experiment/src/index.html
```

## 验证检查点

### 检查点 1：格式规格对比
1. 默认「📊 格式对比」视图
2. 查看 JPEG/PNG/WebP/AVIF/JPEG XL 的规格表
3. 注意浏览器支持列：WebP 97%+，AVIF 93%
4. **验证能力**：A12-图片格式与压缩策略

### 检查点 2：体积对比
1. 查看同一张照片在不同格式下的体积对比条
2. JPEG 240KB → WebP 156KB (-35%) → AVIF 98KB (-59%)
3. **验证能力**：A12-图片格式（压缩率差异）

### 检查点 3：响应式图片
1. 点击「📐 响应式图片」
2. 切换不同视口宽度（375px/768px/1200px/1920px）
3. 观察浏览器如何根据 sizes 规则选择不同图片
4. **验证能力**：A12-srcset/sizes 响应式图片

### 检查点 4：sizes 配置错误
1. 在响应式视图中查看「sizes 配置错误示例」
2. 理解 sizes="100vw" 导致桌面端加载过大的图片
3. 理解忘记设 width/height 导致 CLS
4. **验证能力**：A12-srcset/sizes + A8-CLS

### 检查点 5：加载策略
1. 点击「🎯 加载策略」
2. 查看 Preload/Lazy Load/Placeholder/渐进式 JPEG/CDN fmt=auto 的适用场景
3. 查看 Next.js Image 和 NuxtImg 最佳实践代码
4. **验证能力**：A12-图片策略 + A8-Core Web Vitals

## 故障排除

- **体积数据为典型值**：实际压缩率取决于图片内容（照片 vs 图标差异很大）
- **想验证格式支持**：访问 caniuse.com 查看 WebP/AVIF 的浏览器支持情况
