# Agent 任务模板

## 年限约束注入块（所有 Agent 共享）

在每个 Agent 的 task 中注入以下约束块：

```
## 经验年限约束
- 推断年限:{target_level}({year_desc})
- 命题粒度要求:{粒度描述}
- 命题命名模式:{命名模式}
- 入池阈值:{阈值}
- 深度要求:{深度调整}
- 排除范围:{排除项}
```

注入内容来源：`plugins/year-granularity.md` 对应阶梯的定义。

## 共享骨架注入块（所有 Agent 共享）

在每个 Agent 的 task 中注入以下层次骨架块（内容来自 anchors.json）：

```
## 共享层次骨架（主 agent 已按 {target_level} 核心预组织）

### {core_label}（占 {core_ratio}，你的主要工作区域）
{core_anchors 格式化列表，每项含 id/name/description/reasoning}

### {premise_label}（占 {premise_ratio}）
{premise_anchors 格式化列表}

### {outlook_label}（占 {outlook_ratio}）
{outlook_anchors 格式化列表}

## 你的工作流
1. **检阅{core_label}**：理解核心锚点的定义和 reasoning，形成你的行动内核
2. **完善{core_label}**：围绕核心锚点展开你的维度分析（{dimension_specific_instruction}）
3. **向下扩展**：检查{premise_label}中是否有遗漏，补充必要的 premise 条目
4. **向上扩展**：检查{outlook_label}中是否有遗漏，补充必要的 outlook 条目
5. **自检比例**：确认你的输出中 core 占 {core_ratio}，premise 占 {premise_ratio}，outlook 占 {outlook_ratio}
6. **自检 level_weight**：确认每个条目的 level 与 role 关系正确（见 level-weight.md）
7. **报告完成**
```

## 收敛者任务模板

```
你是头脑风暴的收敛者（Integrator）。你收到了 4 个维度 Agent 的输出和一份共享骨架，需要执行校验、对齐、收束、去重、补位，最终产出 requirement-web.json。

## 用户原始指令
{raw_input}

## 已解析约束
year={year}（{year_source}），target_level={L1/L2/L3/L4}，platform={platform}，depth={depth}

## 策略元数据
{strategy 对象，从 anchors.json 中提取}

## 共享骨架
`{workDir}/.meta/brainstorm/anchors.json`（使用 read 工具读取）

## 4 份维度报告（文件路径，使用 read 工具逐个读取）

- 场景维度：`{workDir}/.meta/brainstorm/scenario.json`（entries 命名：scenarios）
- 技术维度：`{workDir}/.meta/brainstorm/technical.json`（entries 命名：capabilities）
- 学习维度：`{workDir}/.meta/brainstorm/learning.json`（entries 命名：learning_path）
- 约束维度：`{workDir}/.meta/brainstorm/constraint.json`（entries 命名：constraints）

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

严格按 `assets/00-brainstorm/schemas.md` 的 requirement-web.json 格式输出。

注意：requirement-web.json 除了标准字段外，还必须包含：
- context.target_level（L1/L2/L3/L4）
- context.year_source（推断依据）
- context.year_inference_trace（完整推断过程）
- strategy（从 anchors.json 继承的策略元数据）
- capability_web（能力图谱雏形）
- qualifier_injection（限定词注入映射）
- 每个 proposition 附带 capability_ids 和 level_weight
```
