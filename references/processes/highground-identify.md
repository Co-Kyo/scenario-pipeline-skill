# Process: 战略高地识别 (highground-identify)

> 基于 capability-graph.json 中的扇出度和限定词耦合度识别战略高地，生成修炼路径，追加写入 JSON。

## 输入

- `capability-graph.json`：原子能力图谱（来自 processes/capability-extract.md 的输出）

## 执行步骤

### Step 1：计算战略价值

```
战略价值 = 扇出度 × (1 / 限定词耦合度)
```

- 耦合度 1 = 完全框架无关
- 耦合度 2 = 部分框架相关
- 耦合度 3 = 高度框架绑定

### Step 2：排序与分级

| 等级 | 战略价值 | 含义 |
|------|---------|------|
| 🏔️ 一级 | ≥ 4.0 | 必须攻克 |
| ⛰️ 二级 | 2.0 - 3.9 | 重要补充 |
| 🏕️ 三级 | 1.0 - 1.9 | 按需学习 |

### Step 3：验证依赖累积

如果高地 A 依赖高地 B，B 的累积价值 += A 的价值

### Step 4：生成修炼路径

按依赖拓扑排序 + 覆盖优先原则

### Step 5：限定词影响分析

同一命题不同限定词下，高地优先级如何变化

### Step 6：追加写入 capability-graph.json

将 `highgrounds` 和 `learning_path` 字段写入 JSON。

---

## 输出：追加到 capability-graph.json

```jsonc
{
  // ... 已有能力字段 ...

  "highgrounds": [
    {
      "capability_id": "A8",
      "name": "DevTools 性能分析",
      "fanout": 7,
      "coupling": 1,
      "strategic_value": 7.0,
      "cumulative_value": 7.0,
      "level": "一级",
      "level_emoji": "🏔️"
    },
    {
      "capability_id": "A1",
      "name": "浏览器渲染管线",
      "fanout": 5,
      "coupling": 1,
      "strategic_value": 5.0,
      "cumulative_value": 16.0,
      "level": "一级",
      "level_emoji": "🏔️"
    }
    // ... 按战略价值降序 ...
  ],

  "learning_path": [
    {
      "step": 1,
      "capability_id": "A8",
      "name": "DevTools 性能分析",
      "coverage": "7/7",
      "rationale": "最大覆盖，工具层入口，所有诊断的起点",
      "verification": "能独立用 Performance 面板定位一个页面的渲染瓶颈"
    },
    {
      "step": 2,
      "capability_id": "A1",
      "name": "浏览器渲染管线",
      "coverage": "5/7",
      "depends_on": [],
      "rationale": "累积覆盖 7/7，框架无关的底层基础",
      "verification": "能解释为什么修改 transform 不触发 Layout 而修改 width 会"
    }
    // ... 拓扑排序后的完整路径 ...
  ]
}
```

---

## 依赖

- 需要先执行 processes/capability-extract.md（提供 capability-graph.json）

## 参考

- core/strategic-highground.md（战略高地方法论）
