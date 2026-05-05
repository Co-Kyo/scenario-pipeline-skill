# A16 - WeakMap/WeakRef 弱引用

## 核心机制

### WeakMap

`WeakMap` 是一个键值对集合，其中 **键必须是对象或非注册 Symbol**，且对键的引用是**弱引用**（Weak Reference）。

**核心特性**：
- **弱引用键**：WeakMap 不阻止其键对象被 GC 回收。当键对象没有其他强引用时，GC 可以回收该对象及其在 WeakMap 中的条目。
- **不可枚举**：没有 `keys()`、`values()`、`entries()`、`forEach()`、`size` 属性。因为条目可能随时被 GC 清除，枚举结果不确定。
- **仅保留值直到键被回收**：当键对象被 GC 回收后，对应的值也可以被回收。

**API**：`get(key)`、`set(key, value)`、`has(key)`、`delete(key)`

**典型使用场景**：
1. **为对象附加私有数据**：将对象作为键，关联元数据而不修改对象本身
2. **缓存/记忆化**：以输入对象为键缓存计算结果，输入被回收时缓存自动清除
3. **DOM 节点元数据**：为 DOM 节点关联附加信息，节点移除时自动清理

```javascript
// 私有数据模式
const privateData = new WeakMap();

class User {
  constructor(name, password) {
    privateData.set(this, { password });
    this.name = name;
  }
  checkPassword(pwd) {
    return privateData.get(this).password === pwd;
  }
}
// User 实例被回收后，password 自动清除
```

### WeakRef

`WeakRef` 是 ES2021 引入的构造函数，创建对目标对象的弱引用。

```javascript
const ref = new WeakRef(targetObject);
const obj = ref.deref(); // 返回目标对象，若已被 GC 则返回 undefined
```

**核心特性**：
- **`deref()` 方法**：若目标对象仍存活则返回它，否则返回 `undefined`
- **不阻止 GC**：WeakRef 本身不保持目标对象存活
- **不确定性**：不能依赖 GC 时机，`deref()` 可能在任何时刻开始返回 `undefined`
- **当前 Job 保证**：刚创建的 WeakRef 或刚通过 `deref()` 获取的对象在当前 Job 结束前不会被回收

**典型使用场景**：
1. **大对象缓存**：缓存大型计算结果，在内存压力下自动释放
2. **观察者模式**：弱引用观察者，观察者被回收后自动停止通知
3. **DOM 引用**：弱引用 DOM 节点，避免阻止节点回收

```javascript
// 大对象缓存
const cache = new Map();

function getCachedData(key) {
  const ref = cache.get(key);
  if (ref) {
    const data = ref.deref();
    if (data !== undefined) return data; // 缓存命中
  }
  const data = expensiveComputation(key);
  cache.set(key, new WeakRef(data));
  return data;
}
```

### FinalizationRegistry

`FinalizationRegistry` 提供在对象被 GC 回收后执行清理回调的能力。

```javascript
const registry = new FinalizationRegistry((heldValue) => {
  console.log(`Object with held value ${heldValue} was garbage collected`);
});

registry.register(targetObject, 'some identifier');
// 可选：注册取消令牌
registry.register(targetObject, 'id', unregisterToken);

// 取消注册
registry.unregister(unregisterToken);
```

**核心特性**：
- **清理回调不保证时机**：回调可能在 GC 后很久才执行，或根本不执行
- **不应用于关键逻辑**：仅用于清理非关键资源（如日志、统计）
- **heldValue 可以是任意值**：但若是对象，Registry 会持有强引用
- **unregister token**：Registry 对 token 持有弱引用

**典型使用场景**：
1. **关闭外部资源**：对象被回收时关闭文件句柄、网络连接
2. **清理缓存条目**：配合 WeakRef 清理缓存 Map 中的过期条目
3. **调试与监控**：追踪对象生命周期

```javascript
// 缓存清理模式
const cache = new Map();
const registry = new FinalizationRegistry((key) => {
  cache.delete(key); // 清理过期缓存条目
});

function setCache(key, value) {
  cache.set(key, value);
  registry.register(value, key); // value 被回收时清理 key
}
```

## 工程瓶颈

1. **WeakMap 键限制**：只能用对象/Symbol 作键，不能用原始值（string、number）。
2. **不可枚举**：无法遍历 WeakMap 内容，调试困难。
3. **GC 时机不确定**：WeakRef.deref() 和 FinalizationRegistry 回调的时机不可预测。
4. **FinalizationRegistry 可靠性**：清理回调可能不执行（如页面关闭、GC 策略变化），不能依赖它做关键清理。
5. **内存压力感知缺失**：WeakRef 在低内存环境下可能延迟回收，缓存未能及时释放。
6. **跨 Worker 限制**：WeakMap/WeakRef 不能跨 Worker 边界传递（键/目标必须在同一 Isolate）。
7. **调试不可见性**：WeakMap 中的条目在 Heap Snapshot 中可能不直接可见。

## 调试工具

| 工具 | 用途 |
|------|------|
| Chrome DevTools → Memory → Heap Snapshot | 观察 WeakMap 条目（需在 Containment 视图中查找） |
| `--expose-gc` + `global.gc()` | 手动触发 GC，验证 WeakRef.deref() 行为 |
| `WeakRef.prototype.deref()` 测试 | 在代码中主动检查 WeakRef 是否已失效 |
| Performance Observer | 监控 FinalizationRegistry 回调执行 |
| V8 `--trace-gc` | 观察 GC 事件，间接验证弱引用回收 |

## 典型权衡

| 维度 | 权衡 |
|------|------|
| WeakMap vs Map | WeakMap 自动清理但不可枚举；Map 可枚举但需手动清理 |
| WeakRef vs 强引用缓存 | WeakRef 自动释放但缓存命中率不可控；强引用缓存命中率高但可能内存膨胀 |
| FinalizationRegistry vs 手动清理 | FinalizationRegistry 自动化但时机不确定；手动清理可靠但需开发者自律 |
| WeakMap vs WeakRef | WeakMap 适合"对象→附加数据"模式；WeakRef 适合"缓存/观察"模式 |
| 闭包 vs WeakMap 私有数据 | 闭包实现私有变量更简洁；WeakMap 实现更灵活但代码更多 |

## 最小验证实验

### 实验 1：WeakMap 自动清理

```javascript
let key = { id: 1 };
const wm = new WeakMap();
wm.set(key, 'value');

console.log(wm.has(key)); // true
key = null; // 断开强引用

// 手动触发 GC（需 --expose-gc）
global.gc();
// wm 中的条目可能已被清除（GC 时机不确定）
// 注意：不能直接检查 wm.has() 因为 key 已经是 null
```

### 实验 2：WeakRef 缓存

```javascript
const cache = new Map();

function memoize(obj) {
  const ref = cache.get(obj);
  if (ref) {
    const cached = ref.deref();
    if (cached) return cached;
  }
  const result = { computed: heavyCompute(obj) };
  cache.set(obj, new WeakRef(result));
  return result;
}

let input = { data: [1, 2, 3] };
const result1 = memoize(input);
const result2 = memoize(input);
console.log(result1 === result2); // true（缓存命中）

input = null; // 断开引用
global.gc();
// 下次 memoize 调用将重新计算
```

### 实验 3：FinalizationRegistry 清理

```javascript
const registry = new FinalizationRegistry((heldValue) => {
  console.log(`Cleaned up: ${heldValue}`);
});

let obj = { name: 'test' };
registry.register(obj, 'test-object');

obj = null; // 断开引用
global.gc();
// 最终会输出 "Cleaned up: test-object"（时机不确定）
```

## 参考资料

1. [MDN: WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
2. [MDN: WeakRef](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef)
3. [MDN: FinalizationRegistry](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry)
4. [TC39 Proposal: WeakRefs](https://github.com/tc39/proposal-weakrefs) - 提案原文
5. [V8 Blog: Ignition + Turbofan](https://v8.dev/blog) - V8 引擎弱引用实现细节
6. [MDN: Memory Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management) - 引用与 GC 基础
