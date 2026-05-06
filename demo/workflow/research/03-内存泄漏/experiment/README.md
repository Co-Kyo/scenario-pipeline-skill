# P3-内存泄漏 — 实验：最小可运行的内存泄漏复现与检测

## 目标

用一个纯 HTML + JS 页面，复现 3 种最常见的内存泄漏模式，并使用 Chrome DevTools Memory 面板进行诊断。

## 泄漏模式

1. **Detached DOM**：移除 DOM 节点后 JS 仍持有引用
2. **事件监听器泄漏**：addEventListener 未配套 removeEventListener
3. **闭包捕获泄漏**：闭包持有不再需要的大对象

## 使用方法

1. 用 Chrome 打开 `src/index.html`
2. 打开 DevTools → Memory 面板
3. 点击页面上的按钮操作
4. 观察内存变化

## 实验步骤

### 步骤 1：建立基线
- 打开页面
- Memory 面板 → 拍 Heap Snapshot #1

### 步骤 2：触发泄漏
- 点击"创建 Detached DOM"按钮 10 次
- 点击"添加事件监听器"按钮 10 次
- 点击"创建闭包泄漏"按钮 10 次

### 步骤 3：GC 后对比
- 点击垃圾桶图标手动 GC
- 拍 Heap Snapshot #2
- 切换到 Comparison 视图，对比 #1 和 #2

### 步骤 4：定位泄漏
- 在 #2 中搜索 `Detached` → 找到泄漏的 DOM 节点
- 搜索 `EventListener` → 找到未清理的监听器
- 展开 Closure 对象 → 找到被闭包捕获的大对象

### 步骤 5：修复验证
- 点击"修复泄漏"按钮
- 手动 GC
- 拍 Heap Snapshot #3
- 对比 #2 和 #3，确认泄漏对象被回收
