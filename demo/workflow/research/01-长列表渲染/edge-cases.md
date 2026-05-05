# 长列表渲染 — 坑点提取

> 命题：长列表渲染：万级数据的流畅滚动方案
> 限定词：通用（React/Vue）

---

## 一、致命级（直接导致页面不可用）

### EC-01 列表头部插入导致全量重建

- **现象描述**：在列表头部插入一条数据后，整个列表闪烁或长时间白屏，页面完全卡死数秒
- **触发条件**：使用 index 作为 key，数据从头部插入时，React/Vue 认为所有节点都发生了变更，触发全量 DOM diff 和重建
- **检测手段**：Performance 面板录制，观察 Recalculate Style + Layout 耗时；React DevTools Profiler 观察组件全量 re-render
- **缓解策略**：始终使用稳定唯一 ID 作为 key（如数据库主键），禁止使用 index 或 `Math.random()` 作为 key
- **关联能力ID**：R1

### EC-02 布局抖动（Layout Thrashing）导致帧率归零

- **现象描述**：滚动过程中页面严重卡顿，帧率降到个位数（<5fps），浏览器主线程完全被阻塞
- **触发条件**：JS 代码在循环中交替读写布局属性（如先 `element.style.width = x` 再 `element.offsetHeight`），触发强制同步布局（Forced Synchronous Layout），浏览器被迫反复计算布局
- **检测手段**：Chrome DevTools Performance 面板查看 Long Task（>50ms）；Console 中启用 "Layout Shift Regions" 可视化
- **缓解策略**：批量写入样式后再统一读取布局属性；使用 `requestAnimationFrame` 分离读写阶段；使用 `getBoundingClientRect` 前确保无待处理的样式变更
- **关联能力ID**：A1, A3

### EC-03 动态高度计算错误导致无限循环

- **现象描述**：滚动条不断跳动，列表项反复闪烁，页面陷入"计算高度→触发滚动→重新计算"的死循环
- **触发条件**：虚拟列表依赖运行时测量列表项高度，但测量结果不稳定（图片未加载、字体渲染差异、padding/border 计算误差），导致高度值反复变化，触发滚动位置重算
- **检测手段**：Performance 面板观察 Layout 事件是否连续触发；在高度计算函数中打断点观察调用频率
- **缓解策略**：设置合理的预估高度（estimatedItemSize）；缓存已测量高度并设置容差阈值（如 ±2px 内视为不变）；使用 ResizeObserver 替代主动测量
- **关联能力ID**：A4

---

## 二、严重级（明显影响用户体验）

### EC-04 快速滚动白屏

- **现象描述**：用户快速滚动时，可视区域内出现大面积空白，列表项延迟出现
- **触发条件**：虚拟列表的 overscan（预渲染缓冲区）设置过小，快速滚动时新区域的 DOM 节点尚未创建完成；单个列表项渲染耗时过高（嵌套复杂组件）进一步加剧延迟
- **检测手段**：肉眼观察；Performance 面板查看帧时间和 Scripting 耗时；截屏对比可视区与实际渲染区
- **缓解策略**：适当增大 overscan（建议 5-10 个列表项）；对复杂列表项使用 `React.memo` / `Vue.markRaw` 减少不必要的渲染；考虑骨架屏占位
- **关联能力ID**：A4

### EC-05 动画使用几何属性触发连续回流

- **现象描述**：列表项动画（如展开/收起、拖拽排序）严重掉帧，动画卡顿不流畅
- **触发条件**：使用 `left`、`top`、`width`、`height` 等几何属性做动画，每帧触发 Layout → Paint → Composite 全流程；使用 `getComputedStyle` 在动画循环中读取样式，强制同步回流
- **检测手段**：Performance 面板查看每帧的 Layout 耗时；Rendering 面板启用 "Paint Flashing" 观察重绘区域
- **缓解策略**：动画只使用 `transform` 和 `opacity`（仅触发 Composite，跳过 Layout 和 Paint）；预读样式值后再批量写入，避免读写交替
- **关联能力ID**：A3

### EC-06 内容不可搜索（content-visibility 副作用）

- **现象描述**：使用 `content-visibility: auto` 优化后，用户 Ctrl+F 搜索列表内容时找不到被跳过的列表项
- **触发条件**：`content-visibility: auto` 会跳过视口外元素的渲染，浏览器的页面内搜索无法索引这些未渲染的内容
- **检测手段**：使用 `content-visibility: auto` 后，在页面中 Ctrl+F 搜索一个视口外的内容，验证是否能定位到
- **缓解策略**：对需要支持搜索的列表，避免使用 `content-visibility: auto`；或使用 `contains: layout style paint`（不含 size）替代；提供自定义搜索功能而非依赖浏览器内置搜索
- **关联能力ID**：A27

### EC-07 rAF 回调中执行耗时操作

- **现象描述**：使用 `requestAnimationFrame` 做渲染调度时，帧率反而下降，动画不够流畅
- **触发条件**：rAF 回调中执行了大量计算或 DOM 操作（如批量创建节点、复杂数据处理），单帧时间超过 16ms（60Hz）或 8ms（120Hz）；高刷新率屏幕（120Hz）下每帧时间预算减半，更容易超时
- **检测手段**：Performance 面板查看 rAF 回调耗时；对比 60Hz 和 120Hz 屏幕下的表现差异
- **缓解策略**：rAF 回调中只做轻量级操作（设置 transform/opacity），重计算放到 `requestIdleCallback` 或 Web Worker 中；根据 `devicePixelRatio` 和刷新率动态调整批量大小
- **关联能力ID**：A30

### EC-08 动态 key 导致列表项全量销毁重建

- **现象描述**：列表排序或过滤后，所有列表项的内部状态（如展开/折叠、输入框内容）全部丢失，动画重新播放
- **触发条件**：使用 `Math.random()` 或每次渲染都变化的值作为 key；排序/过滤后 index key 导致 state 跟随位置而非跟随数据
- **检测手段**：React DevTools 观察组件是否全部 unmount → mount；在列表项内维护状态（如 useState），排序后验证状态是否保持
- **缓解策略**：key 必须是数据本身的稳定唯一标识；排序/过滤操作不改变 key 映射
- **关联能力ID**：R1

---

## 三、隐蔽级（难以发现的长期退化）

### EC-09 事件监听器泄漏

- **现象描述**：页面使用时间越长越卡，内存占用持续增长，最终导致页面崩溃或被浏览器杀死
- **触发条件**：虚拟列表的列表项组件在 `componentDidMount` / `onMounted` 中注册了全局事件监听器（scroll、resize、IntersectionObserver 等），但销毁时未移除；频繁创建/销毁列表项（滚动时）导致监听器累积
- **检测手段**：Chrome DevTools Memory 面板拍摄堆快照，对比前后 snapshot 中 Detached DOM 节点数量；Performance Monitor 观察 JS Heap 大小是否持续增长
- **缓解策略**：始终在 `componentWillUnmount` / `onUnmounted` 中清理监听器；使用 AbortController 管理事件绑定；框架层面利用自动清理机制（如 React 18 的自动批处理、Vue 的 EffectScope）
- **关联能力ID**：A2

### EC-10 DOM 复用池残留旧数据

- **现象描述**：复用的列表项偶尔显示上一条数据的内容，或样式错乱，但刷新后恢复正常
- **触发条件**：虚拟列表为了性能维护了 DOM 节点复用池，但复用时未完全清理旧节点的属性、事件绑定、子节点内容；特别是列表项包含动态 class/style 绑定时，残留的样式会污染新数据
- **检测手段**：在复用节点的 render 函数中打断点，检查 props 和 DOM 实际状态是否一致；编写 E2E 测试覆盖快速滚动 + 数据切换场景
- **缓解策略**：复用前强制重置所有动态属性（class、style、data-*）；使用框架的 key 机制确保复用正确性；对关键属性做防御性检查
- **关联能力ID**：A4

### EC-11 过多合成层导致 GPU 内存暴涨

- **现象描述**：页面渲染正常但移动端设备发热严重、电量消耗快，低端设备出现闪退
- **触发条件**：对大量列表项设置 `will-change: transform` 或 `transform: translateZ(0)` 强制提升为合成层，每个合成层都占用独立的 GPU 纹理内存；万级列表项 × 每个节点的纹理大小 = 可观的 GPU 内存消耗
- **检测手段**：Chrome DevTools Layers 面板查看合成层数量和内存占用；`chrome://gpu` 查看 GPU 内存使用
- **缓解策略**：仅对当前可视区域内的列表项提升合成层，离开视口后降级；避免对所有列表项统一设置 `will-change`；使用 CSS `contain` 属性替代部分场景
- **关联能力ID**：A1

### EC-12 IntersectionObserver 回调风暴

- **现象描述**：滚动时页面偶发性卡顿，CPU 使用率出现周期性尖峰
- **触发条件**：使用 IntersectionObserver 监听数千个列表项的可见性，`threshold` 设置过于精细（如 0, 0.1, 0.2, ... 1.0），快速滚动时每个列表项多次触发回调，产生大量回调队列
- **检测手段**：Performance 面板观察 Task 列表中的 Microtask 数量；在回调中 `console.count` 统计触发频率
- **缓解策略**：减少 threshold 档位（通常 0 和 1 两个即可）；对回调做防抖/批处理；只 observe 当前 overscan 范围内的元素，动态增删观察目标
- **关联能力ID**：A5

### EC-13 contain-intrinsic-size 不准确导致滚动条跳动

- **现象描述**：页面滚动条长度在滚动过程中突然变化，用户感觉"页面在动"
- **触发条件**：使用 `content-visibility: auto` 配合 `contain-intrinsic-size` 时，预设尺寸与实际渲染尺寸偏差较大，浏览器在元素进入视口后重新计算高度，导致滚动条总长度突变
- **检测手段**：滚动页面时观察滚动条长度变化；对比 `contain-intrinsic-size` 设定值与实际元素高度
- **缓解策略**：基于历史渲染数据动态更新 `contain-intrinsic-size` 值；初始值应接近实际平均高度；对高度差异大的列表项单独处理
- **关联能力ID**：A27

### EC-14 innerHTML 导致子节点全量重建

- **现象描述**：列表项更新时性能远低于预期，明明只改了一个字段却触发了整个节点的重建
- **触发条件**：列表项内部使用 `innerHTML` 操作 DOM，而非框架的声明式渲染；每次 `innerHTML` 赋值都会销毁所有子节点并重新解析 HTML，事件监听器全部丢失
- **检测手段**：Performance 面板对比声明式渲染与 innerHTML 的 Scripting 耗时；DevTools Elements 面板观察节点 ID 是否变化
- **缓解策略**：禁止在框架组件中使用 `innerHTML`；对富文本内容使用 `v-html` / `dangerouslySetInnerHTML`（框架优化过的路径）；将动态内容隔离到独立子组件中
- **关联能力ID**：A2

### EC-15 滚动事件节流与渲染不同步

- **现象描述**：滚动时列表项位置与手指位置不一致，有"拖拽感"或"滞后感"
- **触发条件**：对 scroll 事件做了 throttle（如每 100ms 执行一次），但渲染更新延迟了用户的手指位置；节流粒度过大时，中间帧的滚动位置被跳过
- **检测手段**：在移动端对比手指位置和列表项位置；Performance 面板查看 scroll handler 和 rAF 之间的时间差
- **缓解策略**：使用 passive scroll listener 减少主线程阻塞；将滚动位置同步到 CSS `transform: translateY()` 而非 JS 计算布局；使用 `scrollend` 事件做最终校正；节流粒度不超过一帧时间（~16ms）
- **关联能力ID**：A4

### EC-16 动态插槽降低 Vue Block Tree 优化

- **现象描述**：Vue 3 长列表中，使用动态插槽的列表项渲染性能明显差于静态插槽
- **触发条件**：列表项组件使用动态插槽名（`<slot :name="dynamicName">`），Vue 编译器无法将插槽内容提升为静态 Block，每次渲染都需要完整 diff 插槽内容
- **检测手段**：Vue DevTools 观察组件的 patch flag；对比模板编译产物中是否包含 `FULL_PROPS` 标记
- **缓解策略**：尽量使用静态插槽名；将动态内容通过 props 传递而非插槽；使用 `v-memo` 缓存不常变化的列表项
- **关联能力ID**：V1
