# R1 - React Key 与 Diff 策略

## 核心机制

### Reconciliation（协调）算法概述
React 的 diff 算法（Reconciliation）是 Virtual DOM 更新的核心。传统树 diff 算法复杂度为 O(n³)，React 通过三条启发式策略将其降至 O(n)：

1. **Tree 层级比较**：只比较同一层级的节点，不跨层级移动
2. **类型判断**：不同类型的元素产生不同的树，直接销毁重建
3. **Key 标识**：通过 `key` 属性标识同一列表中哪些元素是"同一个"

### Key 在 Diff 中的作用
在列表渲染中，React 使用 key 来匹配新旧 VNode：
- **有 key**：通过 key 建立旧节点的 Map，新列表遍历时按 key 查找可复用节点
- **无 key / index 作为 key**：按顺序逐一比较，遇到不匹配就触发更新

```jsx
// 正确：使用稳定唯一 ID
{items.map(item => <ListItem key={item.id} data={item} />)}

// 危险：使用 index 作为 key
{items.map((item, index) => <ListItem key={index} data={item} />)}
```

### 为什么 index 作为 key 是危险的
当列表发生**插入、删除、排序**操作时，index key 会导致：
- 组件实例错误复用（state 错位）
- 不必要的 DOM 更新
- 潜在的 bug（如输入框内容错乱）

## 工程瓶颈

1. **列表排序/过滤场景**：使用 index key 时，排序后每个组件的 state 会跟随 index 而非数据
2. **列表头部插入**：index key 会导致所有后续节点被视为"变更"，触发全量 re-render
3. **大列表性能**：即使 key 正确，大量节点的 diff 仍有 O(n) 开销，需要虚拟滚动配合
4. **Fragment 列表**：`<Fragment key={}>` 中的 key 同样影响 diff 行为
5. **动态列表 key 生成**：使用 `Math.random()` 或 `Date.now()` 作为 key 会导致每次 render 都销毁重建

## 调试工具

- **React DevTools**：高亮 re-render 组件，观察 key 变化
- **Why Did You Render**：第三方库，追踪不必要的 re-render
- **React Profiler**：内置性能分析工具，查看组件渲染耗时
- **`<StrictMode>`**：开发模式下双次渲染，帮助发现副作用

## 典型权衡

### 权衡 1：唯一性 vs 稳定性
- 数据库 ID 是理想 key，但有些数据天然无 ID（如搜索结果）
- 此时需在数据层生成稳定 ID，而非用 index 妥协

### 权衡 2：key 粒度
- 粗粒度 key（整个列表一个 key）→ 整列表重建
- 细粒度 key（每个 item 一个 key）→ 精准复用
- 需要根据更新频率选择合适的粒度

### 权衡 3：性能 vs 代码简洁
- 使用 `useMemo` + 稳定 key 可以减少不必要的 diff
- 但过度优化会增加代码复杂度

## 最小验证实验

```jsx
// 实验：观察 index key vs id key 在列表头部插入时的行为差异
import { useState } from 'react';

function Item({ label }) {
  const [text, setText] = useState('');
  return (
    <div>
      <span>{label}</span>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="输入一些文字" />
    </div>
  );
}

function App() {
  const [items, setItems] = useState(['A', 'B', 'C']);
  return (
    <div>
      <button onClick={() => setItems(['NEW', ...items])}>头部插入</button>
      {/* 方式1：index key — 头部插入后输入框内容会错位 */}
      {items.map((item, i) => <Item key={i} label={item} />)}
      {/* 方式2：id key — 输入框内容保持正确 */}
      {/* {items.map((item, i) => <Item key={item} label={item} />)} */}
    </div>
  );
}
```

**预期结果**：使用 index key 时，在第一个输入框输入文字后点击"头部插入"，文字会"跳"到第二个输入框。使用唯一 id key 则不会。

## 参考资料

1. [React 官方文档 - Lists and Keys](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key)
2. [React 官方文档 - Reconciliation](https://legacy.reactjs.org/docs/reconciliation.html)
3. [React diff 算法详解 - 掘金](https://juejin.cn/post/6844903944796258317)
4. [Virtual DOM Diff 算法 - 知乎](https://zhuanlan.zhihu.com/p/510191553)
5. [Understanding React's Key Prop - Kent C. Dodds](https://kentcdodds.com/blog/understanding-reacts-key-prop)
