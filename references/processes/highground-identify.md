# Process: 战略高地识别 (highground-identify)

> 基于 {{paths.meta_capability_graph}} 中的扇出度和限定词耦合度识别战略高地，生成修炼路径，追加写入 JSON。

## 输入

- `{{paths.meta_capability_graph}}`：原子能力图谱（来自 processes/capability-extract.md 的输出）

## 加载清单

> ⛔ **L3 执行前置条件**

```
必须加载：core/strategic-highground.md（战略高地方法论）
理由：累积价值计算规则、覆盖排序算法、修炼路径生成策略定义在此文件中
必须加载：core/capability-graph.md（能力图谱方法论）
理由：需要理解 dependency_graph 和 fanout 的结构定义才能做传递覆盖计算
```

## 执行步骤

> **路径获取**：在执行任何步骤前，必须先调用 MCP `resolve_paths` 获取当前任务的所有路径：
> ```bash
> mcporter call scenario-pipeline.resolve_paths params='{"task_type":"highground-identify","workDir":"<产出目录>","caller":"pre/highground"}'
> ```

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

**必须使用 `{{paths.meta_capability_graph}}` 中的 `dependency_graph` 做传递计算**：

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

### Step 5.5：写入前校验

> 校验由 MCP `submit_output` 工具统一管理。
> 调用 `submit_output(step="highground-identify", data=..., workDir=...)` 时自动执行。
> 高地特有校验规则（cumulative_value ≥ fanout、verification 必填等）定义在 schema 中。

### Step 6：追加写入 {{paths.meta_capability_graph}}

将 `highgrounds` 和 `learning_path` 字段写入 JSON。

---

## 输出：追加到 {{paths.meta_capability_graph}}

输出格式由 MCP `get_output_schema(step="highground-identify")` 定义（待注册）。
写入前调用 MCP `submit_output(step="highground-identify", data=..., workDir=...)` 自动校验。

---

## 依赖

- 需要先执行 processes/capability-extract.md（提供 {{paths.meta_capability_graph}}）

## 参考

- [必须加载] core/strategic-highground.md（战略高地方法论）— 已在加载清单中标注
- [必须加载] core/capability-graph.md（能力图谱方法论）— 已在加载清单中标注
