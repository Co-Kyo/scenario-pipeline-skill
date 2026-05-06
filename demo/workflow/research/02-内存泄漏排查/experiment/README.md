# MVE: 内存泄漏排查

## 环境基线
- 浏览器：Chrome 90+（需要 `performance.memory` 支持）
- 无需 Node.js 或构建工具，纯 HTML+JS
- 建议使用 Chrome DevTools Memory 面板配合验证

## 一键启动
```bash
open 02-内存泄漏排查/experiment/src/index.html
```

## 验证检查点

### 检查点 1：Detached DOM 泄漏
1. 切换到「泄漏演示」标签页
2. 点击「创建 Detached DOM × 100」
3. 观察「Detached 节点」计数增加，堆内存上升
4. 点击「强制 GC」→ 内存不回落（因为 JS 仍持有引用）
5. **验证能力**：A3-V8 GC 机制（Detached DOM 无法被 GC 回收）

### 检查点 2：事件监听泄漏
1. 点击「模拟 SPA 路由切换 × 50」
2. 观察「事件监听器」计数增加
3. 每次路由切换都添加 scroll 监听但未清理
4. **验证能力**：A14-资源生命周期管理（监听器未解绑）

### 检查点 3：全局缓存无界增长
1. 点击「缓存追加 × 1000」
2. 观察缓存条目和堆内存持续增长
3. 点击「应用 WeakMap 修复」→ 切换为弱引用模式
4. **验证能力**：A3-V8 GC（WeakMap 允许 GC 回收）

### 检查点 4：泄漏检测方法
1. 切换到「泄漏检测」标签页
2. 点击「运行泄漏检测」
3. 查看自动检测报告
4. **验证能力**：A4-DevTools 性能分析（Heap Snapshot 对比法）

### 检查点 5：修复方案
1. 切换到「修复方案」标签页
2. 查看 AbortController 统一取消模式
3. 查看 WeakRef + FinalizationRegistry 模式
4. **验证能力**：A14-资源生命周期管理

## 故障排除

- **performance.memory 不显示**：仅 Chrome 支持，需在 `chrome://flags` 中启用或使用非隐身模式
- **强制 GC 不生效**：Chrome DevTools → Memory → 点击垃圾桶图标可强制 GC
- **Detached DOM 需要 Heap Snapshot 确认**：DevTools → Memory → Take heap snapshot → 搜索 "Detached"
