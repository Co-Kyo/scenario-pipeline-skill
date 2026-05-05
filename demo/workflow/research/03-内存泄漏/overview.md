# 内存泄漏：长时间运行页面的性能退化排查

## 排查链路总览

```
现象观察 → 定位工具 → 根因分类 → 修复验证
```

---

## 一、现象观察

长时间运行的页面（SPA、单页后台、实时仪表盘等）出现以下症状时，应怀疑内存泄漏：

| 现象 | 典型表现 |
|------|----------|
| 内存持续增长 | 任务管理器/`performance.memory` 显示 JS 堆只升不降，GC 后无法回到基线 |
| 页面逐渐卡顿 | 滚动掉帧、输入响应延迟、动画不流畅 |
| 频繁 GC 暂停 | V8 Scavenge（Young 代）频率升高，Long Task 中出现 Mark-Sweep 停顿 |
| 标签页崩溃 | `Aw, Snap!` 或 OOM Kill，尤其在移动端低内存设备 |

**初步判断方法（A12）**：
- 打开 Chrome 任务管理器（Shift+Esc），观察「JavaScript Memory」列是否随时间单调递增。
- 正常情况下，V8 分代回收应使 Young 代内存在 Scavenge 周期（<1ms）内回落。若 Old 代持续膨胀，说明对象被晋升后无法回收。

---

## 二、定位工具

### 2.1 Performance 面板 — 宏观趋势（A17）

录制 30s~2min 的时间线，关注：
- **JS Heap 曲线**：锯齿上升（GC 回收不彻底）→ 确认泄漏存在。
- **火焰图**：定位高频调用栈，找出异常的分配热点。
- **GC 事件条**：Old Generation 的 Mark-Sweep 频率和耗时异常增长。

### 2.2 Memory 面板 — 堆快照对比（A13）

三步对比法：
1. **快照 ①**：页面加载完成、操作前基线。
2. **执行可疑操作**（如反复打开/关闭弹窗、切换路由）。
3. **快照 ②**：操作后，强制 GC 后拍摄。

使用 **Comparison 视图** 对比两次快照：
- #Delta 为正且持续增长的对象 → 泄漏嫌疑。
- 重点关注 `Detached` 状态的 DOM 节点（已被移出 DOM 树但仍被 JS 引用）。

**四种视图用途（A13）**：

| 视图 | 用途 |
|------|------|
| Summary | 快速浏览按构造器分组的对象数量和大小 |
| Comparison | **核心**——对比两次快照，锁定增量对象 |
| Containment | 查看对象引用链（GC Root → 目标对象） |
| Dominators | 找到持有大量内存的支配者节点 |

### 2.3 Allocation Timeline — 分配热点（A17）

录制分配时间线，蓝色竖条代表新分配内存，高度表示大小：
- 持续出现高蓝条且不回落 → 该时段有大量对象被分配且无法回收。
- 点击蓝色条可定位到具体的分配调用栈。

### 2.4 V8 GC 机制理解（A12）

理解 GC 行为有助于判断泄漏严重程度：

```
Young Generation (Scavenge, <1ms)
    ├── 存活对象晋升 → Old Generation
    └── 短命对象快速回收

Old Generation (Mark-Sweep-Compact)
    ├── Orinoco：并发/增量标记，减少主线程阻塞
    └── Idle-time GC：空闲时段主动清理
```

- Young 代 Scavenge 频繁但快速 → 正常，说明大量短命对象在产生。
- Old 代持续增长且 Mark-Sweep 后不回落 → **泄漏确认**。

---

## 三、根因分类

### 3.1 事件监听未清理（A14）

**最常见的泄漏源。**

```javascript
// ❌ 泄漏：组件销毁后监听器仍在
element.addEventListener('click', handler);
// 忘记 removeEventListener

// ✅ 正确：配对清理
element.addEventListener('click', handler);
// on destroy:
element.removeEventListener('click', handler);

// ✅ 更好：使用 AbortController 批量清理（A14）
const controller = new AbortController();
element.addEventListener('click', handler, { signal: controller.signal });
element.addEventListener('scroll', onScroll, { signal: controller.signal });
// 一次性清理所有监听器
controller.abort();
```

**匿名函数陷阱（A14）**：
```javascript
// ❌ 无法移除——匿名函数没有引用
element.addEventListener('click', () => { /* ... */ });

// ✅ 保存引用
const handler = () => { /* ... */ };
element.addEventListener('click', handler);
element.removeEventListener('click', handler);
```

### 3.2 定时器与闭包引用链（A15）

```javascript
// ❌ 泄漏：interval 持有大数组引用，组件销毁后仍在运行
function startPolling() {
  const hugeData = new Array(100000).fill('x');
  setInterval(() => {
    console.log(hugeData.length); // 闭包引用 hugeData
  }, 1000);
  // 即使组件卸载，interval 仍运行，hugeData 无法回收
}

// ✅ 清理定时器
const timerId = setInterval(callback, 1000);
// on destroy:
clearInterval(timerId);

// ✅ 堆叠问题替代方案（A15）：用递归 setTimeout 替代 setInterval
function poll() {
  doWork();
  setTimeout(poll, 1000); // 每次执行完再调度，避免堆叠
}
```

### 3.3 Detached DOM 节点（A13）

```javascript
// ❌ DOM 已移除但 JS 仍持有引用
let detachedNode = document.getElementById('heavy-widget');
document.body.removeChild(detachedNode);
// detachedNode 仍指向已移除节点，无法 GC

// ✅ 移除后释放引用
document.body.removeChild(detachedNode);
detachedNode = null;
```

在堆快照中搜索 `Detached` 可快速定位此类问题（A13）。

### 3.4 全局缓存无上限（通用）

```javascript
// ❌ 缓存只增不减
const cache = {};
function addToCache(key, value) {
  cache[key] = value; // 永远不会清理
}

// ✅ 使用 WeakMap 自动清理（A16）
const cache = new WeakMap();
function trackElement(el, metadata) {
  cache.set(el, metadata); // el 被 GC 后，缓存自动清理
}
```

### 3.5 闭包持有意外引用（通用）

```javascript
// ❌ 外层函数的变量被内层闭包无意持有
function createProcessor() {
  const hugeBuffer = new ArrayBuffer(10 * 1024 * 1024);
  
  return function process(data) {
    // 即使没使用 hugeBuffer，某些引擎仍可能保留引用
    return data.length;
  };
  // ✅ 显式释放
  // hugeBuffer = null;
}
```

---

## 四、修复验证

### 4.1 WeakMap / WeakRef / FinalizationRegistry（A16）

针对「关联数据」型泄漏的防御性编程：

```javascript
// WeakMap：键为对象时，键被 GC 后值自动清理
const metadata = new WeakMap();

// WeakRef：允许缓存大对象，GC 后 deref() 返回 undefined（A16）
let ref = new WeakRef(largeObject);
// 使用时检查
const obj = ref.deref();
if (obj) { /* 仍存活 */ }

// FinalizationRegistry：对象被 GC 后执行清理回调（A16）
const registry = new FinalizationRegistry((heldValue) => {
  console.log(`对象 ${heldValue} 已被回收，执行清理`);
});
registry.register(targetObject, 'my-resource-id');
```

### 4.2 V8 Idle-time GC 利用（A12）

在页面空闲时主动触发垃圾回收：
```javascript
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    // V8 会在空闲时段进行增量 GC
  });
}
```

### 4.3 验证流程

| 步骤 | 操作 | 工具 |
|------|------|------|
| 1. 建立基线 | 页面加载完成后拍摄堆快照 ① | Memory 面板（A13） |
| 2. 压力操作 | 反复执行可疑操作 50~100 次 | 手动/脚本 |
| 3. 触发 GC | 点击 Memory 面板垃圾桶图标强制 GC | DevTools |
| 4. 拍摄快照 ② | 对比快照 ①②，确认 #Delta 为 0 或极小 | Comparison 视图（A13） |
| 5. 长期录制 | 用 Performance 面板录制 2~5 分钟，确认 JS Heap 平稳 | Performance 面板（A17） |
| 6. 分配检查 | 用 Allocation Timeline 确认无异常分配热点 | Memory 面板（A17） |

**判定标准**：
- ✅ 修复成功：JS Heap 在多次操作后趋于平稳，GC 后回落至基线附近。
- ❌ 仍有泄漏：Comparison 视图中仍有大量 `Object`/`Array`/`Detached DOM` 增量。

---

## 能力索引

| 能力 ID | 主题 | 在本命题中的角色 |
|---------|------|-----------------|
| A12 | V8 GC 机制 | 理解 GC 行为，判断泄漏严重程度，利用 Idle-time GC |
| A13 | 堆快照分析 | 核心定位工具，Detached DOM 检测，四视图对比法 |
| A14 | 事件监听生命周期 | 最常见泄漏根因，AbortController 批量清理 |
| A15 | 定时器与闭包 | 闭包引用链分析，setInterval 堆叠替代方案 |
| A16 | WeakMap/WeakRef | 防御性编程，自动清理关联数据 |
| A17 | DevTools 面板 | Performance 火焰图、堆快照对比、Allocation Timeline |
