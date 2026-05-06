# P3-内存泄漏 — 方案对比

> 每组对比聚焦一个决策维度，给出适用场景和推荐。

---

## 对比 1：WeakRef vs 手动清理引用

| 维度 | WeakRef | 手动清理（= null） |
|------|---------|-------------------|
| 原理 | 弱引用，不阻止 GC 回收目标对象 | 显式断开引用，使对象不可达 |
| 时机控制 | 不可控（GC 时机由引擎决定） | 可控（代码执行到 = null 时立即断开） |
| 使用成本 | 需要检查 `.deref()` 是否返回 undefined | 每个引用点都需要手动清空 |
| 适用对象 | 缓存、观察者模式、关联数据 | 组件状态、大对象、DOM 节点 |
| GC 压力 | 低（弱引用不增加 GC 复杂度） | 低（直接断引用） |
| 兼容性 | Chrome 84+、Firefox 79+、Safari 14.1+ | 全兼容 |

**决策矩阵**：

```
需要在"目标对象存活期间"访问它？ 
  → 是：WeakRef（缓存场景，目标可能被回收）
  → 否：手动 = null（确定不再需要，立即释放）

目标是 DOM 节点且被事件监听器引用？
  → AbortController 清理监听器 + 手动清空引用

目标被多个位置引用？
  → WeakRef 统一管理（一处释放不影响其他）
  → 或 WeakMap（键为对象，值自动释放）
```

**[用于: trade-offs, overview]**

---

## 对比 2：WeakMap vs Map 缓存

| 维度 | WeakMap | Map |
|------|---------|-----|
| 键类型 | 仅对象 | 任意类型 |
| 强引用 | 否（键弱引用） | 是（键和值都强引用） |
| 可枚举 | 否（无 keys/values/entries） | 是 |
| 大小属性 | 无 `.size` | 有 `.size` |
| GC 行为 | 键被回收后条目自动消失 | 条目永远存在，除非手动 delete |
| 适用场景 | 关联元数据、DOM 节点缓存 | 通用键值缓存 |

**决策矩阵**：

```
键是对象（DOM 节点、组件实例）？
  → 是：WeakMap（对象销毁时缓存自动释放）
  → 否：Map + LRU（字符串/数字键需手动淘汰）

需要遍历缓存？
  → 是：Map（WeakMap 不可枚举）
  → 否：WeakMap

需要知道缓存大小？
  → 是：Map
  → 否：WeakMap
```

**[用于: trade-offs, edge-cases]**

---

## 对比 3：Heap Snapshot vs Allocation Sampling

| 维度 | Heap Snapshot | Allocation Sampling |
|------|--------------|-------------------|
| 数据完整性 | 完整快照（所有对象） | 采样（约每 16KB 记录一次） |
| 精确度 | 精确到每个对象 | 统计级别（函数调用栈分布） |
| 文件大小 | 大（100MB+ 堆可能产生 50MB+ 快照） | 小（几 KB） |
| 对性能影响 | 拍摄时暂停（几百 ms ~ 几秒） | 几乎无影响（<1% 开销） |
| 适用场景 | 开发环境精确定位泄漏 | 线上持续监控内存趋势 |
| 关键视图 | Comparison / Containment / Summary | 分配热点函数排名 |

**决策矩阵**：

```
开发/调试阶段？
  → Heap Snapshot（精确对比两个快照，找增量对象）
  → 流程：Snapshot #1 → 操作 → GC → Snapshot #2 → Comparison

线上生产环境？
  → Allocation Sampling（低开销持续监控）
  → 或 PerformanceObserver + performance.measureUserAgentSpecificMemory()

需要看对象引用链？
  → 必须 Heap Snapshot（Allocation Sampling 不记录引用关系）

移动端低内存设备？
  → Allocation Sampling（Heap Snapshot 在 1GB 内存设备上可能 OOM）
```

**[用于: trade-offs, overview, experiment]**

---

## 对比 4：AbortController vs 逐一 removeEventListener

| 维度 | AbortController.signal | 逐一 removeEventListener |
|------|----------------------|------------------------|
| 清理方式 | 一行 `controller.abort()` 清理所有 | 每个监听器单独 remove |
| 出错风险 | 低（统一管理，不会遗漏） | 高（容易遗漏某个监听器） |
| 动态监听器 | 天然支持（传入 signal 即可） | 需要保存每个回调引用 |
| 兼容性 | Chrome 90+、Firefox 84+、Safari 15+ | 全兼容 |
| 代码量 | 少（声明式） | 多（命令式） |

**决策矩阵**：

```
需要管理 2+ 个监听器？
  → AbortController（一行清理，不遗漏）

需要兼容旧浏览器？
  → 逐一 removeEventListener + useRef 保存回调

第三方库不支持 signal？
  → 包装层：库的 on/off + useEffect return 中手动 off
```

**[用于: trade-offs, overview]**

---

## 对比 5：FinalizationRegistry vs 主动清理

| 维度 | FinalizationRegistry | 主动清理 |
|------|---------------------|---------|
| 触发时机 | GC 回收后异步回调（不确定何时） | 代码确定执行时 |
| 可靠性 | 不保证一定执行（浏览器可能跳过） | 100% 执行 |
| 适用场景 | 资源兜底清理、调试监控 | 关键资源释放、确定性清理 |
| 可测试性 | 差（GC 时机不确定） | 好（同步执行） |

**决策**：永远以主动清理为主，FinalizationRegistry 仅作为兜底/监控手段。

**[用于: trade-offs]**

---

## 决策速查表

| 场景 | 推荐方案 | 替代方案 |
|------|---------|---------|
| DOM 节点缓存 | WeakMap | Map + 手动 delete |
| 事件监听器清理 | AbortController.signal | 逐一 removeEventListener |
| 大对象释放 | 手动 = null | WeakRef（非关键对象） |
| 缓存淘汰 | LRU Cache | WeakMap（键为对象时） |
| 开发环境诊断 | Heap Snapshot Comparison | Allocation Timeline |
| 线上内存监控 | Allocation Sampling | measureUserAgentSpecificMemory() |
| 资源兜底清理 | FinalizationRegistry | — |
| 组件卸载清理 | useEffect return + AbortController | componentDidMount + componentWillUnmount |
