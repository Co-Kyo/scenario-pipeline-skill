# P7-渲染性能 · 实验：重排重绘性能对比

> **目标**：通过可视化对比，直观理解不同 DOM 操作方式对渲染性能的影响
> **涉及能力**：A1（渲染管线）、A2（DOM 生命周期）、A4（事件循环）、A6（合成层）、A8（DevTools）

---

## 实验概述

本实验包含 4 个对比场景，每个场景都有"慢路径"和"快路径"两种实现，通过 FPS 实时显示和 DevTools 面板验证性能差异。

### 场景一：Layout Thrashing vs 批量读写
- **慢路径**：循环中交替读 offsetWidth 和写 style.width（每次循环触发 Layout）
- **快路径**：先批量读取所有 offsetWidth，再批量写入 style.width（单次 Layout）
- **预期**：慢路径帧率 <20fps，快路径帧率 ≈60fps

### 场景二：top/left 动画 vs transform 动画
- **慢路径**：用 top/left 实现位移动画（触发 Layout + Paint + Composite）
- **快路径**：用 transform:translate 实现位移动画（仅 Composite）
- **预期**：Paint flashing 显示差异，transform 无绿色闪烁

### 场景三：逐个 appendChild vs DocumentFragment 批量插入
- **慢路径**：循环中逐个 appendChild（每次触发 Layout）
- **快路径**：DocumentFragment 组装后一次插入（单次 Layout）
- **预期**：批量插入 Layout 事件数量为 1

### 场景四：合成层管理：静态 will-change vs 动态管理
- **慢路径**：所有卡片静态设置 will-change:transform
- **快路径**：仅在 hover 动画时动态设置 will-change
- **预期**：Layers 面板显示图层数量差异

---

## 使用方法

1. 在浏览器中打开 `src/index.html`
2. 每个场景点击"慢路径"和"快路径"按钮对比
3. 观察 FPS 计数器和性能指标面板
4. 打开 DevTools Performance 面板录制，验证 Layout/Paint 事件差异
5. 打开 Rendering 面板的 Paint flashing 查看重绘区域

---

## 预期结论

| 场景 | 慢路径 | 快路径 | 性能提升 |
|------|-------|-------|---------|
| Layout Thrashing | ~15fps | ~60fps | 4x |
| 动画属性 | 有 Paint | 无 Paint | 10x+ |
| DOM 插入 | N 次 Layout | 1 次 Layout | Nx |
| 合成层 | 数百层 | 数层 | 内存 10x+ |

---

## 文件结构

```
experiment/
├── README.md           # 本文件
└── src/
    └── index.html      # 完整实验页面（单文件，无依赖）
```
