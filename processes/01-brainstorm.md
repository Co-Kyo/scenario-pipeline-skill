# Step 01: 头脑风暴

**目的**：基于共享骨架，通过 4 维度 Agent 并行分析 + 收敛者校验，产出结构化需求网（requirement-web.json）

**核心流程**：
1. 读取共享骨架（anchors.json），提取元数据
2. 分发路径：为 4 个维度 Agent 组装 task（元数据注入 + 文件路径分发，不读取 agent 定义文件）
3. 并行 spawn 4 个维度 Agent，各自读取自己的角色定义 + 骨架，从自己的维度加工
4. 即时校验 + 降级策略
5. 🛑 Barrier 检查（强制停顿）
6. Spawn 收敛者 Agent，汇总 4 份产出为 requirement-web.json
7. 产出 requirement-web.json

**关键产出**：`{workDir}/.meta/requirement-web.json`

---

## 文件引用

> 主 agent 读取的文件：`{{schemas-brainstorm}}`、`{{level-weight}}`、`{{task-templates}}`、`{{scheduling-detail}}`、`{{barrier-check}}`、`{{fallback-protocol}}`、`{{protocol-scheduling}}`、`{{anchors}}`
>
> Sub-agent 读取的文件（主 agent 只分发路径，不读取内容）：`{{scenario-agent}}`、`{{technical-agent}}`、`{{learning-agent}}`、`{{constraint-agent}}`、`{{year-rules}}`、`{{schemas-brainstorm}}`、`{{anchors}}`

| 变量 | 文件 | 读取者 | 说明 |
|------|------|--------|------|
| `{{schemas-brainstorm}}` | `assets/01-brainstorm/schemas.md` | 主 agent + sub-agent | JSON 格式定义 |
| `{{level-weight}}` | `assets/01-brainstorm/level-weight.md` | 主 agent | level/role 约束 |
| `{{task-templates}}` | `assets/01-brainstorm/task-templates.md` | 主 agent | task 组装模板（维度 Agent + 收敛者） |
| `{{scheduling-detail}}` | `assets/01-brainstorm/scheduling-detail.md` | 主 agent | 调度参数 + 超时检查 + 降级策略 |
| `{{barrier-check}}` | `assets/01-brainstorm/barrier-check.md` | 主 agent | Barrier 检查项 + 决策矩阵 + 重试规则 |
| `{{fallback-protocol}}` | `assets/01-brainstorm/fallback-protocol.md` | 主 agent | 收敛者失败时的降级转换协议 |
| `{{protocol-scheduling}}` | `assets/common/protocol-scheduling.md` | 主 agent | 子 agent 调度规则 |
| `{{anchors}}` | `{workDir}/.meta/brainstorm/anchors.json` | 主 agent + sub-agent | Step 00 产出的共享骨架 |
| `{{scenario-agent}}` | `assets/01-brainstorm/scenario-agent.md` | sub-agent | 场景 Agent 定义 |
| `{{technical-agent}}` | `assets/01-brainstorm/technical-agent.md` | sub-agent | 技术 Agent 定义 |
| `{{learning-agent}}` | `assets/01-brainstorm/learning-agent.md` | sub-agent | 学习 Agent 定义 |
| `{{constraint-agent}}` | `assets/01-brainstorm/constraint-agent.md` | sub-agent | 约束 Agent 定义 |
| `{{year-rules}}` | `plugins/year-granularity.md` | sub-agent | 年限颗粒度规则 |

## 输入

- `{{anchors}}`（Step 00 产出）
- 用户指令原文（从 `{{anchors}}` 中提取 topic + constraints）

---

## 执行步骤

### 1. 读取共享骨架

读取 `{{anchors}}`，提取以下元数据供组装 task 时注入：
- `target_level`：目标经验年限（L1/L2/L3/L4）
- `strategy`：策略元数据（core_label / premise_label / outlook_label / ratios）
- `year_inference_trace`：年限推断依据

> **主 agent 不读取 agent 定义文件**（scenario-agent.md 等），只读 anchors.json 一次，提取元数据后分发路径。

### 2. 为 4 个维度 Agent 组装 task

按 `{{task-templates}}` §维度 Agent 任务模板 组装。每个 task 只包含：
- **文件路径**（sub-agent 自己读）：agent 定义 + 年限规则 + 共享骨架 + 输出格式
- **元数据**（主 agent 注入）：target_level / strategy / role 标签和占比
- **工作流指引**（固定模板）

主 agent **不读取、不内联** agent 定义文件和年限规则文件的内容。

#### 4 个 Agent 的路径分发

| Agent | agent_definition_path | output_path |
|-------|----------------------|-------------|
| 场景 | `assets/01-brainstorm/scenario-agent.md` | `{workDir}/.meta/brainstorm/scenario.json` |
| 技术 | `assets/01-brainstorm/technical-agent.md` | `{workDir}/.meta/brainstorm/technical.json` |
| 学习 | `assets/01-brainstorm/learning-agent.md` | `{workDir}/.meta/brainstorm/learning.json` |
| 约束 | `assets/01-brainstorm/constraint-agent.md` | `{workDir}/.meta/brainstorm/constraint.json` |

#### level_weight 打标规则

每个维度 Agent 在输出中为每个条目标注 `level_weight`（level + role + reason），规则详见 `{{level-weight}}`。

### 3. 创建输出目录

执行 `mkdir -p {workDir}/.meta/brainstorm`，确保维度 Agent 有写入目标。

### 4. 并行 spawn 4 个维度 Agent

> ⚠️ 严格遵循 `{{protocol-scheduling}}` 的并行调度规则。

4 个 Agent 同时启动，各自独立工作：
- 每个 Agent 读取自己 task 中的骨架（已内联），从自己的维度加工
- 每个 Agent 用 write 工具将产出写入对应文件
- 轮询期间不做其他工作，每次间隔 15 秒

调度参数、完成判定、超时检查、降级策略详见 `{{scheduling-detail}}`。

### 5. 🛑 Barrier 检查（强制停顿，不可跳过）

4 个维度 Agent 全部完成后（含补发），执行质量门禁。详见 `{{barrier-check}}`。

### 6. Spawn 收敛者 Agent（串行，单 Agent）

**⚠️ 前置条件**：Barrier 检查通过（4/4 完成）或用户明确授权降级。

收敛者 Agent 的工作：
1. **读取**：用 read 工具逐个读取 4 份维度报告 + `{{anchors}}`
2. **校验**：检查 level_weight 跨维度一致性
3. **对齐**：不一致时按优先级对齐（约束 > 技术 > 场景 > 学习）
4. **收束**：用 anchor_ref 编织跨维度关系图，建立场景↔能力映射
5. **去重**：同维度内描述重叠→合并；不同维度同锚点→标注不同视角
6. **补位**：检测 anchor_coverage 覆盖缺口
7. **图谱构建**：产出 capability_web（按能力 ID 组织，含 type / fanout / covers / dependencies）
8. **写入**：将 requirement-web.json 写入 `{workDir}/.meta/requirement-web.json`

**调度**：
- 单 Agent，无并发，直接 spawn
- **超时**：5 分钟
- 超时后先检查 requirement-web.json 是否已写入磁盘且合法
- 文件完整 → 直接使用；不完整 → 重试一次；仍失败 → **执行 `{{fallback-protocol}}`**

**label**：`brainstorm-integrator`

**收敛者任务模板**：详见 `{{task-templates}}`

---

### 7. 写入

收敛者 Agent 将产出写入 `{workDir}/.meta/requirement-web.json`。
头脑风暴的中间产物（4 份维度报告 + `{{anchors}}`）已持久化在 `{workDir}/.meta/brainstorm/` 目录下，可供回溯审查。

**传递到 requirement-web.json 的元数据**：
- `strategy`：从 `{{anchors}}` 继承的策略元数据（core_label / premise_label / outlook_label / ratios）
- `level_weight`：每个 proposition 携带 level_weight（level + role + reason）

### 8. 注入 Step 02

将 `requirement-web.json` 作为 Step 02 scan 的附加输入。Step 02 在执行时读取以下数据：
- 从 requirement-web 中读取 `propositions` 列表，为每个命题执行定向搜索
- 从 `search_guidance` 中获取每个命题的推荐关键词
- 从 `scope.exclusions` 中获取排除规则，过滤不相关内容
- 从 `context` 中获取经验年限（含推断依据），影响信源深度判断
- 从 `strategy` 中获取策略元数据，影响后续步骤的行为参数
- 从每个 proposition 的 `level_weight` 中获取 level + role，驱动后续步骤的密度分级（core 深扫、premise 浅扫、outlook 确认存在）

---

## 输出

- 文件：`{workDir}/.meta/requirement-web.json`
- 摘要（stdout，≤200 字）：域上下文、年限推断结果、命题数量、能力数量、依赖关系数、排除项数

## 校验清单

- [ ] requirement-web.json 包含 context、propositions、dependencies、scope、search_guidance 五个顶层字段
- [ ] context 包含 target_level、year_source、year_inference_trace
- [ ] 每个 proposition 包含 id、name、depth、search_keywords、capability_ids
- [ ] capability_web 中的能力 ID 与 propositions 的 capability_ids 一致
- [ ] dependencies 中引用的 id 全部在 propositions 中存在
- [ ] scope.exclusions 非空（至少有 1 条排除规则）
- [ ] 排序后的 proposition 顺序与 search_priority 一致
- [ ] 收敛者 Agent 的输出可被 JSON.parse 解析
- [ ] 每个 proposition 包含 level_weight（level + role + reason）
- [ ] strategy 元数据已写入 requirement-web.json
- [ ] 锚点的 provisional_level/provisional_role 与 proposition 的 level_weight 一致

## 异常处理

| 场景 | 处理 |
|------|------|
| 维度 Agent 超时（>3min） | 检查输出文件是否已写入磁盘：完整则保留使用，不完整则丢弃并补发一次（最多补发 1 次），补发仍超时则标为 missing |
| 4 个维度 Agent 全部超时 | 检查各维度文件：保留完整的，缺失的尝试补发，补发后仍 3+ 个缺失 → 跳过头脑风暴，Step 02 按原始指令扫描 |
| 收敛者 Agent 超时（>5min） | 检查 requirement-web.json 是否已写入磁盘：完整则直接使用，不完整则重试一次，重试失败 → **执行 `{{fallback-protocol}}`** |
| 收敛者输出 JSON 解析失败 | 重试一次；仍失败 → **执行 `{{fallback-protocol}}`** |
