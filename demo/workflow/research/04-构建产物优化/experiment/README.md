# MVE: 构建产物优化 — Tree Shaking 与 Chunk 分析

## 环境基线
- 浏览器：Chrome 90+ / Firefox 89+ / Safari 15+
- 无需 Node.js 或构建工具，纯 HTML+JS
- 操作系统：无约束

## 一键启动
```bash
open 04-构建产物优化/experiment/src/index.html
```

## 验证检查点

### 检查点 1：Treemap 可视化对比
1. 默认「Treemap 视图」查看优化前后的模块体积分布
2. 优化前：moment(290KB) + antd(340KB) + lodash(72KB) = 730KB
3. 优化后：moment(68KB) + antd(85KB) + lodash-es(4KB) = 260KB
4. **验证能力**：A7-Code Splitting + Tree Shaking

### 检查点 2：前后对比
1. 点击「📊 前后对比」查看各模块的体积变化
2. lodash 从 72KB 降到 4KB（-94%），具名导入生效
3. moment 从 290KB 降到 68KB（-77%），locale 精简
4. **验证能力**：A7-Tree Shaking（sideEffects 标记 + ESM 导入）

### 检查点 3：缓存策略
1. 点击「💾 缓存策略」查看持久化缓存配置
2. 带 contenthash 的资源设置 1 年长期缓存
3. index.html 使用 no-cache 协商缓存
4. **验证能力**：A6-HTTP 缓存策略

### 检查点 4：代码示例
1. 查看底部代码示例中的 CommonJS vs ESM 对比
2. 理解 sideEffects 配置的作用
3. 查看 Vite manualChunks 配置
4. **验证能力**：A7-Tree Shaking（ESM 静态分析）

## 故障排除

- **数值为模拟数据**：实际体积取决于项目，此处用典型场景数据
- **想验证真实项目**：用 `npx webpack-bundle-analyzer` 或 `npx vite-bundle-visualizer`
