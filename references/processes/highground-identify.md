# Process: 战略高地识别 (highground-identify)

> 基于 capability-graph.json 中的扇出度和限定词耦合度识别战略高地，生成修炼路径，追加写入 JSON。

## 输入

- `capability-graph.json`：原子能力图谱（来自 processes/capability-extract.md 的输出）

## 执行步骤

### Step 1：计算战略价值

```
战略价值 = fanout.count × (1 / 限定词耦合度)
```

其中 `fanout.count` 是该能力被多少个命题引用（绝对计数，非百分比）。

- 耦合度 1 = 完全框架无关
- 耦合度 2 = 部分框架相关
- 耦合度 3 = 高度框架绑定

### Step 2：排序与分级

| 等级 | 战略价值 | 含义 |
|------|---------|------|
| 🏔️ 一级 | ≥ 4.0 | 必须攻克 |
| ⛰️ 二级 | 2.0 - 3.9 | 重要补充 |
| 🏕️ 三级 | 1.0 - 1.9 | 按需学习 |

### Step 3：验证依赖累积（传递覆盖）

如果高地 A 依赖高地 B，B 的累积价值 += A 的价值。

**必须使用 `capability-graph.json` 中的 `dependency_graph` 做传递计算**：

```
cumulative_value(B) = fanout(B) + Σ fanout(X)  // X = 所有直接或间接依赖 B 的能力
```

示例：
- A1（渲染管线）fanout=4，被 A2、A3、A8、A9、A27、A30 依赖
- A2 fanout=3，A3 fanout=2，A8 fanout=5，A9 fanout=1，A27 fanout=2，A30 fanout=1
- A1 cumulative_value = 4 + 3 + 2 + 5 + 1 + 2 + 1 = **18.0**（而非仅 fanout=4）

> ⛔ **禁止简化**：cumulative_value 必须包含传递覆盖，不得等于 fanout 本身。
> 如果 dependency_graph 中某能力无下游依赖，则 cumulative_value = fanout，但必须显式计算确认。

### Step 4：生成修炼路径

按依赖拓扑排序 + 覆盖优先原则

**每一步必须包含以下字段**：
- `step`：序号
- `capability_id`：能力 ID
- `name`：能力名称
- `coverage`：该能力直接覆盖的命题数（如 `"5/7"`）
- `cumulative_coverage`：含传递覆盖的累计进度（如 `"7/7（含下游能力）"`）
- `depends_on`：前置依赖的能力 ID 数组（无前置则为 `[]`）
- `rationale`：为什么排在这一步（自然语言，1-2 句）
- `verification`：**验证标准**——用一句话描述"做到什么程度算掌握"（如 `"能解释为什么修改 transform 不触发 Layout 而修改 width 会"`）

> ⛔ **`verification` 和 `cumulative_coverage` 是必填字段**，不可省略。
> 缺少 verification 的修炼路径无法闭环验证学习效果，等于没有终点。

### Step 5：限定词影响分析

同一命题不同限定词下，高地优先级如何变化

### Step 5.5：⛔ 写入前校验

追加写入前，逐项检查：

| # | 字段 | 位置 | 格式要求 | 缺失处理 |
|---|------|------|---------|---------|
| 1 | `cumulative_value` | 每个 highground 内 | 数值，**必须 ≥ fanout**（含传递覆盖） | 返回 Step 3 重新计算 |
| 2 | `covers_capabilities` | 每个 highground 内 | 数组，该高地覆盖的下游能力 ID 列表 | 必须补充 |
| 3 | `verification` | 每个 learning_path 步骤内 | 字符串，具体可验证的掌握标准 | 返回 Step 4 补全 |
| 4 | `cumulative_coverage` | 每个 learning_path 步骤内 | 字符串，含"含下游能力"标注 | 返回 Step 4 补全 |
| 5 | `depends_on` | 每个 learning_path 步骤内 | 数组，前置依赖 ID | 返回 Step 4 补全 |

**任何一项缺失 → 禁止写入，返回对应步骤补全后重新校验。**

### Step 6：追加写入 capability-graph.json

将 `highgrounds` 和 `learning_path` 字段写入 JSON。

---

## 输出：追加到 capability-graph.json

```jsonc
{
  // ... 已有能力字段 ...

  "highgrounds": [
    {
      "capability_id": "A1",
      "name": "浏览器渲染管线",
      "fanout": { "count": 6, "total": 7, "ratio": "6/7", "level": "核心" },
      "coupling": 1,
      "strategic_value": 6.0,
      "cumulative_value": 18.0,
      "covers_capabilities": ["A2", "A3", "A4", "A8", "A9", "A27", "A30"],
      "level": "一级",
      "level_emoji": "🏔️"
    },
    {
      "capability_id": "A8",
      "name": "DevTools 性能分析",
      "fanout": { "count": 7, "total": 7, "ratio": "7/7", "level": "核心" },
      "coupling": 1,
      "strategic_value": 7.0,
      "cumulative_value": 7.0,
      "covers_capabilities": [],
      "level": "一级",
      "level_emoji": "🏔️"
    }
    // ... 按战略价值降序 ...
  ],

  "learning_path": [
    {
      "step": 1,
      "capability_id": "A1",
      "name": "浏览器渲染管线",
      "coverage": "6/7",
      "cumulative_coverage": "7/7（含下游能力 A2, A3, A4, A8, A9, A27, A30）",
      "depends_on": [],
      "rationale": "累积覆盖最高，框架无关的底层基础，所有渲染相关命题的入口",
      "verification": "能解释为什么修改 transform 不触发 Layout 而修改 width 会"
    },
    {
      "step": 2,
      "capability_id": "A8",
      "name": "DevTools 性能分析",
      "coverage": "7/7",
      "cumulative_coverage": "7/7",
      "depends_on": [],
      "rationale": "直接覆盖全部命题，工具层入口，所有诊断的起点",
      "verification": "能独立用 Performance 面板定位一个页面的渲染瓶颈"
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
