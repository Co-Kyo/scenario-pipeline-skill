# P7-渲染性能 · 链路编排

> **命题**：渲染性能：重排重绘触发机制与合成层优化
> **能力链路**：DOM操作 → 渲染管线 → CSS合成层 → 事件循环调度 → DevTools诊断

---

## 一、全局链路总览

```
JS 执行（事件循环）
    │
    ▼
DOM 操作（创建/更新/删除节点）
    │
    ▼
Style 计算（CSSOM + Render Tree）
    │
    ▼
Layout（布局/重排）──→ 可被强制同步触发
    │
    ▼
Paint（绘制/重绘）──→ 复杂 CSS 效果开销大
    │
    ▼
Composite（合成）──→ 仅 transform/opacity 走这里，GPU 加速
    │
    ▼
屏幕像素
```

**关键认知**：从 Layout 往后的每个阶段都可能被 JS 重新触发。理解这条链路是所有渲染优化的前提。

---

## 二、阶段一：DOM 操作（A2）

### 2.1 节点生命周期

```
createElement / createTextNode
        │
        ▼
appendChild / insertBefore  ←── 挂载触发 Layout
        │
        ▼
属性/子树变更              ←── 更新可能触发 Layout 或 Paint
        │
        ▼
removeChild / remove        ←── 卸载，但 JS 引用可能阻止 GC
        │
        ▼
垃圾回收（GC）              ←── Detached DOM 泄漏的根因
```

### 2.2 批量操作的性能影响

| 操作模式 | Layout 触发次数 | 推荐场景 |
|---------|---------------|---------|
| 循环逐个 appendChild | N 次 | ❌ 禁止 |
| DocumentFragment 批量插入 | 1 次 | ✅ 通用首选 |
| innerHTML 批量插入 | 1 次 | ⚠️ 纯展示可用，会销毁已有子树 |
| requestAnimationFrame 分帧 | 每帧 1 次 | ✅ 大量节点渐进渲染 |

**工程要点**：DocumentFragment 是"读-写分离"在 DOM 层的体现——先在内存中组装完所有节点，再一次插入触发单次 Layout。

---

## 三、阶段二：渲染管线（A1）

### 3.1 Critical Rendering Path 全链路

```
HTML ──→ DOM Tree ──┐
                    ├──→ Render Tree ──→ Layout ──→ Paint ──→ Composite
CSS  ──→ CSSOM   ──┘
```

**每个阶段的开销量级**：
- **Style 计算**：选择器匹配复杂度，O(选择器数量 × DOM 节点数)
- **Layout**：计算几何属性（位置、尺寸），开销与受影响节点数成正比
- **Paint**：生成绘制指令（像素填充），开销与绘制区域面积成正比
- **Composite**：GPU 合成图层，开销最低，与图层数量相关

### 3.2 触发范围对比

| 属性类型 | 触发阶段 | 典型属性 |
|---------|---------|---------|
| 几何属性 | Layout → Paint → Composite | width, height, top, left, margin, padding |
| 绘制属性 | Paint → Composite | color, background, box-shadow, border |
| 合成属性 | Composite only | transform, opacity, filter（部分） |

**核心原则**：动画和频繁变化的属性，必须只触发 Composite。这是渲染性能优化的第一定律。

### 3.3 强制同步布局（Forced Reflow）

```javascript
// ❌ 反模式：读写交替触发强制同步布局
for (const box of boxes) {
  const height = box.offsetHeight;  // 读 → 强制刷新布局队列
  box.style.height = height * 2 + 'px';  // 写 → 脏标记
}

// ✅ 正确：先批量读，再批量写
const heights = boxes.map(box => box.offsetHeight);  // 批量读
boxes.forEach((box, i) => {
  box.style.height = heights[i] * 2 + 'px';  // 批量写
});
```

浏览器维护一个"布局脏标记"队列。读取布局属性（offsetWidth、getBoundingClientRect 等）时，如果队列中有待处理的样式变更，浏览器被迫立即执行 Layout——这就是"强制同步布局"。

---

## 四、阶段三：CSS 合成层（A6）

### 4.1 合成层提升机制

浏览器将页面元素组织为多个图层（Layer），Composite 阶段由 GPU 将这些图层合成为最终画面。

**触发合成层提升的条件**：
- `will-change: transform` / `will-change: opacity`
- `transform` 不为 `none`
- `backface-visibility: hidden`
- `<video>`、`<canvas>`、CSS 3D transform 等

**提升后的优势**：该元素的 transform/opacity 变化仅走 Composite 阶段，不触发 Layout 和 Paint。

### 4.2 contain 属性——布局隔离

```css
.card {
  contain: layout style paint;  /* 组件级隔离 */
}
```

| 隔离模式 | 效果 | 副作用 |
|---------|------|-------|
| `contain: size` | 子树尺寸变化不影响外部布局 | 需显式设置尺寸 |
| `contain: layout` | 创建新的 containing block | position:fixed 相对元素定位 |
| `contain: style` | counter 作用域隔离 | counter 被重置 |
| `contain: paint` | 裁剪溢出 + 创建 stacking context | 类似 overflow:hidden |
| `contain: content` | layout + style + paint（推荐） | — |
| `contain: strict` | size + layout + style + paint | 必须显式设置尺寸 |

### 4.3 content-visibility——屏幕外跳过

```css
.below-fold {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;  /* 必须配合！否则滚动条跳动 */
}
```

长页面中，屏幕外元素设置 `content-visibility: auto` 后，浏览器会跳过其渲染（Layout + Paint），首屏加载可缩短 50%-90%。

---

## 五、阶段四：事件循环调度（A4）

### 5.1 渲染帧的调度模型

```
一个渲染帧的完整周期：

┌─ 宏任务 ─────────────────────┐
│  setTimeout / setInterval     │
│  I/O 回调                     │
│  用户事件（click/scroll）     │
└──────────────────────────────┘
           │
           ▼
┌─ 微任务 ─────────────────────┐
│  Promise.then                 │
│  MutationObserver             │
│  queueMicrotask               │
└──────────────────────────────┘
           │
           ▼
┌─ 渲染更新（每帧一次）─────────┐
│  requestAnimationFrame 回调   │
│  Style → Layout → Paint       │
│  requestIdleCallback（空闲时）│
└──────────────────────────────┘
```

### 5.2 长任务与帧预算

- **帧预算**：16.6ms（60fps）——JS 执行 + 渲染必须在此时间内完成
- **Long Tasks API**：>50ms 的任务会被标记为长任务
- **INP（Interaction to Next Paint）**：衡量交互响应速度，受长任务直接影响

### 5.3 任务分片策略

```javascript
// 方案 1：requestIdleCallback（Safari 不支持）
function processInIdle(tasks) {
  const deadline = requestIdleCallback((idle) => {
    while (idle.timeRemaining() > 0 && tasks.length) {
      tasks.shift()();
    }
    if (tasks.length) processInIdle(tasks);
  });
}

// 方案 2：scheduler.yield()（新 API，切分到下一个宏任务）
async function processWithYield(tasks) {
  for (const task of tasks) {
    task();
    if (navigator.scheduling?.isInputPending?.() || shouldYield()) {
      await scheduler.yield();
    }
  }
}

// 方案 3：requestAnimationFrame（与渲染同步）
function processInFrames(tasks, batchSize = 5) {
  function frame() {
    const batch = tasks.splice(0, batchSize);
    batch.forEach(t => t());
    if (tasks.length) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
```

---

## 六、阶段五：DevTools 诊断（A8）

### 6.1 Performance 面板诊断流程

```
1. 打开 Chrome DevTools → Performance 面板
2. 点击录制 → 操作页面（滚动/点击/动画）
3. 停止录制 → 分析火焰图

关键指标检查顺序：
┌─────────────────────────────────────┐
│ ① 帧率（FPS 轨道）                 │
│   → 是否有红色掉帧区域？           │
├─────────────────────────────────────┤
│ ② Long Task（Main 轨道红色块）      │
│   → 哪个任务 >50ms？               │
│   → Attribution 归属到哪个脚本？   │
├─────────────────────────────────────┤
│ ③ Layout 事件密度                  │
│   → 是否存在 Layout Thrashing？    │
├─────────────────────────────────────┤
│ ④ Paint 事件耗时                   │
│   → 是否 >4ms？哪些区域重绘？     │
├─────────────────────────────────────┤
│ ⑤ Composite 图层数量               │
│   → Layers 面板检查合成层爆炸     │
└─────────────────────────────────────┘
```

### 6.2 关键诊断命令

| 工具 | 用途 | 命令/操作 |
|-----|------|---------|
| Performance 面板 | 火焰图 + Long Task | 录制 → 分析 Main 轨道 |
| Layers 面板 | 合成层可视化 | More tools → Layers |
| Rendering 面板 | Paint flashing | More tools → Rendering → Paint flashing |
| PerformanceObserver | Long Task 实时监控 | `new PerformanceObserver(cb).observe({type:'longtask',buffered:true})` |
| Lighthouse | 自动化审计 | CLI: `lighthouse URL` 或 DevTools |
| Heap Snapshot | Detached DOM 检测 | Memory → Heap Snapshot → 过滤 "Detached" |

### 6.3 生产环境监控

```javascript
// Long Task 监控
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.warn('Long Task:', {
      duration: entry.duration,
      startTime: entry.startTime,
      attribution: entry.attribution // 归属到哪个脚本
    });
  }
});
observer.observe({ type: 'longtask', buffered: true });

// web-vitals 集成（生产推荐）
import { onCLS, onINP, onLCP } from 'web-vitals';
onLCP(console.log);
onINP(console.log);
onCLS(console.log);
```

---

## 七、链路全景图

```
用户交互（click/scroll/resize）
    │
    ▼
事件循环（宏任务队列）──────────────────────────────────────┐
    │                                                       │
    ▼                                                       │
JS 执行（主线程）                                           │
    │                                                       │
    ├── 读布局属性（offsetWidth 等）→ 可能触发强制同步布局  │
    │                                                       │
    ├── 写样式（style.width 等）→ 设置脏标记               │
    │                                                       │
    └── DOM 操作（appendChild 等）→ 触发节点生命周期        │
    │                                                       │
    ▼                                                       │
微任务队列（Promise.then 等）                               │
    │                                                       │
    ▼                                                       │
requestAnimationFrame 回调                                  │
    │                                                       │
    ▼                                                       │
Style 计算（选择器匹配）                                    │
    │                                                       │
    ▼                                                       │
Layout（布局计算）←── contain:layout 可缩小范围             │
    │                                                       │
    ▼                                                       │
Paint（像素绘制）←── contain:paint 可缩小范围               │
    │                                                       │
    ▼                                                       │
Composite（GPU 合成）←── transform/opacity 仅走这里         │
    │                                                       │
    ▼                                                       │
屏幕更新                                                    │
    │                                                       │
    ▼                                                       │
requestIdleCallback（空闲期）──────────────────────────────┘
    │
    ▼
DevTools 诊断（Performance/Layers/Memory）
```

---

## 八、核心优化清单

| 优先级 | 优化手段 | 涉及阶段 | 效果 |
|-------|---------|---------|------|
| P0 | 动画用 transform/opacity 替代 top/left | Composite only | 性能提升 10x+ |
| P0 | 读写分离，避免 Layout Thrashing | Layout | 消除强制同步布局 |
| P0 | DocumentFragment 批量 DOM 操作 | Layout | 单次 Layout 替代 N 次 |
| P1 | contain:content 组件级隔离 | Layout + Paint | 缩小重排重绘范围 |
| P1 | will-change 动态管理 | Composite | 避免合成层常驻内存 |
| P1 | content-visibility:auto | Layout + Paint | 跳过屏幕外渲染 |
| P1 | 事件委托替代逐个绑定 | DOM | 减少监听器数量 |
| P2 | scheduler.yield() 任务分片 | 事件循环 | 避免长任务阻塞 |
| P2 | PerformanceObserver 监控 Long Task | 诊断 | 线上实时告警 |
