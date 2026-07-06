# Agent 任务模板

> **核心原则**：主 agent 不读取 agent 定义文件，只分发文件路径。Sub-agent 自己读取所需的文件。

---

## 维度 Agent 任务模板（场景/技术/学习/约束通用）

主 agent 组装 task 时，将以下模板中的变量替换后内联到 sub-agent 的 task 中。Sub-agent 收到 task 后，自行读取所需文件。

```
你是「{proposition_name}」的{dimension_name}维度分析专家。

⚠️ 你必须用 write 工具将文件写入磁盘，不要只输出到对话中。

## 你需要读取的文件

用 read 工具依次读取以下文件：

1. **你的角色定义**：`{agent_definition_path}`
   - 定义了你的身份、任务、具体要求、输出格式

2. **经验年限规则**：`{year_rules_path}`
   - 定义了年限阶梯映射和颗粒度要求

3. **共享骨架**：`{anchors_path}`
   - Step 00 产出的锚点列表，是你的核心输入

4. **输出格式**：`{schemas_path}§{schema_section}`
   - 定义了你产出 JSON 的结构

## 已解析的约束（主 agent 注入，无需读取文件）

- target_level: {target_level}
- year_inference_trace: {year_inference_trace}
- strategy: {strategy_summary}
- core_label: {core_label}（占 {core_ratio}）
- premise_label: {premise_label}（占 {premise_ratio}）
- outlook_label: {outlook_label}（占 {outlook_ratio}）

## 你的工作流

1. 读取上述 4 个文件
2. 从共享骨架中理解核心锚点（{core_label}）的定义和 reasoning
3. 从你的角色定义中理解本维度的加工要求
4. 按年限规则过滤不符合目标年限的内容
5. 围绕核心锚点展开你的维度分析
6. 向下检查 {premise_label} 是否有遗漏，向上检查 {outlook_label}
7. 自检比例：core 占 {core_ratio}，premise 占 {premise_ratio}，outlook 占 {outlook_ratio}
8. 自检 level_weight：确认每个条目的 level 与 role 关系正确
9. 用 write 工具将产出 JSON 写入 `{output_path}`
```

### 主 agent 组装时填充的变量

| 变量 | 来源 | 说明 |
|------|------|------|
| `{proposition_name}` | `{{anchors}}` 的 topic | 主题名称 |
| `{dimension_name}` | 固定值 | 场景/技术/学习/约束 |
| `{agent_definition_path}` | assets 文件路径 | 如 `assets/01-brainstorm/scenario-agent.md` |
| `{year_rules_path}` | `plugins/year-granularity.md` | 年限规则 |
| `{anchors_path}` | `{workDir}/.meta/brainstorm/anchors.json` | 共享骨架 |
| `{schemas_path}` | `assets/01-brainstorm/schemas.md` | 输出格式 |
| `{schema_section}` | 固定值 | §scenario / §technical / §learning / §constraint |
| `{target_level}` | `{{anchors}}` 的 target_level | L1/L2/L3/L4 |
| `{year_inference_trace}` | `{{anchors}}` 的 year_inference_trace | 推断依据 |
| `{strategy_summary}` | `{{anchors}}` 的 strategy | 策略元数据摘要 |
| `{core_label}` | `{{anchors}}` 的 strategy.core_label | 核心标签 |
| `{core_ratio}` | `{{anchors}}` 的 strategy.ratios.core | 核心占比 |
| `{premise_label}` | `{{anchors}}` 的 strategy.premise_label | 基础标签 |
| `{premise_ratio}` | `{{anchors}}` 的 strategy.ratios.premise | 基础占比 |
| `{outlook_label}` | `{{anchors}}` 的 strategy.outlook_label | 展望标签 |
| `{outlook_ratio}` | `{{anchors}}` 的 strategy.ratios.outlook | 展望占比 |
| `{output_path}` | 固定路径 | `{workDir}/.meta/brainstorm/{dimension}.json` |

### 主 agent 不做的事

- ❌ 不读取 `scenario-agent.md` / `technical-agent.md` / `learning-agent.md` / `constraint-agent.md`
- ❌ 不读取 `plugins/year-granularity.md`
- ❌ 不读取 `schemas.md`
- ❌ 不将上述文件内容内联到 task 中

---

## 收敛者任务模板

```
你是头脑风暴的收敛者（Integrator）。你收到了 4 个维度 Agent 的输出和一份共享骨架，需要执行校验、对齐、收束、去重、补位，最终产出 requirement-web.json。

## 你需要读取的文件

用 read 工具依次读取以下文件：

1. **共享骨架**：`{anchors_path}`
2. **场景维度报告**：`{workDir}/.meta/brainstorm/scenario.json`（entries 命名：scenarios）
3. **技术维度报告**：`{workDir}/.meta/brainstorm/technical.json`（entries 命名：capabilities）
4. **学习维度报告**：`{workDir}/.meta/brainstorm/learning.json`（entries 命名：learning_path）
5. **约束维度报告**：`{workDir}/.meta/brainstorm/constraint.json`（entries 命名：constraints）
6. **输出格式**：`{schemas_path}`§requirement-web

## 已解析约束（主 agent 注入）

- raw_input: {raw_input}
- year={year}（{year_source}），target_level={target_level}，platform={platform}，depth={depth}
- strategy: {strategy_summary}

## 你的任务

1. **校验**：检查 4 个维度输出中的 level_weight 是否跨维度一致（同一锚点 T1 在不同维度中的 level/role 应一致）
2. **对齐**：不一致时按优先级对齐（约束维度 > 技术维度 > 场景维度 > 学习维度），记录对齐原因
3. **收束**：用 anchor_ref 编织跨维度关系图，建立场景↔能力映射、学习节点↔能力前置关系
4. **去重**：
   - 同一维度内：两个条目引用相同锚点且描述重叠 → 合并（保留更详细的）
   - 不同维度：引用相同锚点但命名不同 → 不合并，标注为"同一锚点的不同视角"
5. **补位**：检测 anchor_coverage 覆盖缺口（骨架中有锚点但 4 个维度都没覆盖），决定是否补充
6. **图谱构建**：产出 capability_web（按能力 ID 组织，含 type、fanout、covers、dependencies），每个命题附带 capability_ids

## 写入产出

将 requirement-web.json 写入 `{workDir}/.meta/requirement-web.json`

## 输出格式

严格按 `{schemas_path}`§requirement-web 格式输出。

注意：requirement-web.json 除了标准字段外，还必须包含：
- context.target_level（L1/L2/L3/L4）
- context.year_source（推断依据）
- context.year_inference_trace（完整推断过程）
- strategy（从 anchors.json 继承的策略元数据）
- capability_web（能力图谱雏形）
- qualifier_injection（限定词注入映射）
- 每个 proposition 附带 capability_ids 和 level_weight
```

### 收敛者 task 中的变量

| 变量 | 来源 |
|------|------|
| `{anchors_path}` | `{workDir}/.meta/brainstorm/anchors.json` |
| `{schemas_path}` | `assets/01-brainstorm/schemas.md` |
| `{raw_input}` | 用户原文 |
| `{year}`, `{year_source}`, `{target_level}`, `{platform}`, `{depth}` | 从 `{{anchors}}` 提取 |
| `{strategy_summary}` | 从 `{{anchors}}` 提取 |
