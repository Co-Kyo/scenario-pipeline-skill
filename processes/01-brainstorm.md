# Step 01: 头脑风暴

**目的**：基于共享骨架，通过 4 维度 Agent 并行分析 + 收敛者校验，产出结构化需求网（requirement-web.json）

**核心流程**：
1. 组装 4 份维度 Agent task（角色声明 + 维度任务 + 约束注入 + 骨架注入 + 文件写入指令）
2. 创建输出目录
3. 并行 spawn 4 个维度 Agent（场景/技术/学习/约束）
4. 即时校验 + 降级策略
5. 🛑 Barrier 检查（强制停顿）
6. Spawn 收敛者 Agent（串行）
7. 产出 requirement-web.json

**关键产出**：`{workDir}/.meta/requirement-web.json`

---

## 文件引用

| 变量 | 文件 | 说明 |
|------|------|------|
| `{{schemas-brainstorm}}` | `assets/01-brainstorm/schemas.md` | JSON 格式定义 |
| `{{level-weight}}` | `assets/01-brainstorm/level-weight.md` | level/role 约束 |
| `{{task-templates}}` | `assets/01-brainstorm/task-templates.md` | 年限约束注入块 + 共享骨架注入块 + 收敛者任务模板 |
| `{{scenario-agent}}` | `assets/01-brainstorm/scenario-agent.md` | 场景 Agent 定义 |
| `{{technical-agent}}` | `assets/01-brainstorm/technical-agent.md` | 技术 Agent 定义 |
| `{{learning-agent}}` | `assets/01-brainstorm/learning-agent.md` | 学习 Agent 定义 |
| `{{constraint-agent}}` | `assets/01-brainstorm/constraint-agent.md` | 约束 Agent 定义 |
| `{{protocol-scheduling}}` | `assets/common/protocol-scheduling.md` | 子 agent 调度规则 |
| `{{anchors}}` | `{workDir}/.meta/brainstorm/anchors.json` | Step 00 产出的共享骨架 |

## 输入

- `{{anchors}}`（Step 00 产出）
- 用户指令原文（从 `{{anchors}}` 中提取 topic + constraints）

---

## 执行步骤

### 1. 组装 4 份维度 Agent task

每个 Agent 的 task 由五部分拼接：**角色声明** + **维度任务** + **约束注入** + **锚点注入** + **文件写入指令**。

详见 `{{task-templates}}`

### level_weight 打标规则（level 与 role 的关系）

详见 `{{level-weight}}`

#### 1.1 场景 Agent

详见 `{{scenario-agent}}`

#### 1.2 技术 Agent

详见 `{{technical-agent}}`

#### 1.3 学习 Agent

详见 `{{learning-agent}}`

#### 1.4 约束 Agent

详见 `{{constraint-agent}}`

### 2. 创建输出目录

执行 `mkdir -p {workDir}/.meta/brainstorm`，确保维度 Agent 有写入目标。

### 3. Spawn 4 个维度 Agent（并行 + 轮询跟踪）

> ⚠️ 本步骤采用「简单窗口」调度模式（4 个任务互相独立），严格遵循 `{{protocol-scheduling}}` 的并行调度规则。
> 调度规则详见 `{{protocol-scheduling}}` §子 agent 调度。

#### 3.1 初始化

同时 spawn 4 个 Agent，每个 Agent 的 label 和预期产出：

| label | 维度 | 预期产出 |
|-------|------|---------|
| `brainstorm-scenario` | 场景 | 包含 `dimension: "scenario"` 的 JSON |
| `brainstorm-technical` | 技术 | 包含 `dimension: "technical"` 的 JSON |
| `brainstorm-learning` | 学习 | 包含 `dimension: "learning"` 的 JSON |
| `brainstorm-constraint` | 约束 | 包含 `dimension: "constraint"` 的 JSON |

每个 Agent 的 task 内联全部必要信息（用户指令 + 约束参数 + 年限颗粒度规则 + 维度任务定义 + **共享层次骨架** + 文件写入路径），不读取任何外部文件。其中 `{workDir}` 和骨架内容在组装 task 时从 `{{anchors}}` 提取替换。

#### 3.2 轮询跟踪

按 `{{protocol-scheduling}}` §**模式 A: 简单窗口** 执行轮询循环。本步骤特有参数：

| 参数 | 值 |
|------|---|
| W | 4（维度 Agent 数量固定为 4，一次性全部 spawn） |
| 超时 | 3 分钟 |
| 槽位替换 | ❌ 无（一次性填满 4 个，不补位） |
| label | `brainstorm-scenario`, `brainstorm-technical`, `brainstorm-learning`, `brainstorm-constraint` |
| expected_files | `{workDir}/.meta/brainstorm/{dimension}.json`（dimension = scenario/technical/learning/constraint） |

**特殊**：4 个维度 Agent 一次性全部 spawn，不做分批。任何一个结束不补位，等全部结束后进入收敛者阶段。

#### 3.3 完成判定

> **⚠️ 即时校验**：每个 agent 完成事件到达后，**立刻**执行以下三步校验（详见 `{{protocol-scheduling}}` §即时文件校验），不等同批其他 agent 完成。

- **completed**：三步校验全通过（文件存在 + JSON 合法 + 含 `dimension` 字段且 entries 非空）
- **pending-retry**：任一校验失败 → 立即补发（不等其他 agent）
- **failed**：Agent 返回错误 / 补发仍失败
- **timeout**：单 Agent 运行超过 3 分钟（头脑风暴的维度 Agent 体量小，3 分钟足够；不走 15 分钟的通用超时）

#### 3.3.1 超时后文件检查（必须执行）

Agent 超时后，**禁止直接丢弃该维度**，必须先执行以下检查：

1. kill 超时的 agent
2. 检查 `{workDir}/.meta/brainstorm/{dimension}.json` 是否存在于磁盘
3. 文件存在且通过校验（合法 JSON + 含 `dimension` 字段 + entries 非空）→ **保留该维度**，标记为 completed
4. 文件不存在或校验不通过 → **丢弃该文件**，标记该维度为 pending-retry

**关键原则**：超时 ≠ 产出无效。Agent 可能在超时前已将完整结果写入磁盘。

#### 3.4 降级策略

| 情况 | 处理 |
|------|------|
| 有维度标为 pending-retry | 补发 agent（原样重新 spawn，同一 task），补发仍超时则标为 missing |
| 1 个维度 missing | 标记 missing，进入 Step 3.2 barrier 检查（**禁止自动进入收敛者**） |
| 2 个维度 missing | 标记 missing，进入 Step 3.2 barrier 检查 |
| 3+ 个维度 missing | 标记 missing，进入 Step 3.2 barrier 检查（降级为原始指令扫描） |

**补发规则**：每个维度最多补发 1 次。补发的 agent 使用与原始完全相同的 task，不做任何调整。
**补发时机**：每个维度完成事件到达后立即校验，不通过则立即补发；所有 4 个维度（含补发）均结束后，**进入 Step 3.2 barrier 检查**（而非直接进入收敛者）。

#### 3.5 等待期间行为

轮询期间**不做其他工作**（头脑风暴是前置阶段，没有可并行的后台任务）。每次轮询间隔 15 秒，不做 busy-wait。

---

### 4. 🛑 Barrier 检查（强制停顿，不可跳过）

> **设计理由**：维度 Agent 的产出质量直接决定收敛者和后续整条管线的质量。缺少维度（尤其是技术维度）会导致 capability_web 残缺，错误会沿管线传导。因此在进入收敛者之前必须有一个显式的质量门禁。

#### 4.1 检查项

所有 4 个维度 Agent（含补发）结束后，主 agent 必须执行以下检查：

对每个维度（scenario/technical/learning/constraint）：
1. 检查 `{workDir}/.meta/brainstorm/{dim}.json` 是否存在
2. 读取文件，验证是合法 JSON
3. 验证包含 `dimension` 字段且值与维度名一致
4. 验证对应 entries 数组非空（scenarios/capabilities/learning_path/constraints）

#### 4.2 决策矩阵

| 完成维度 | 缺失维度 | 处理 |
|---------|---------|------|
| 4/4 | 0 | ✅ 直接进入收敛者 |
| 3/4 | 1 | 🛑 **停住**：展示缺失分析，等用户决策（见 4.3） |
| 2/4 | 2 | 🛑 **停住**：展示缺失分析，等用户决策 |
| ≤1/4 | ≥3 | 🛑 **停住**：降级为原始指令扫描，等用户确认 |

**核心原则**：有维度缺失时，**禁止自动推进到收敛者**。必须停住等用户决策。

#### 4.3 缺失维度分析报告

当存在缺失维度时，主 agent 必须输出以下分析：

```
🛑 barrier-1: 维度完整性检查

✅ 已完成:{completed_list}
❌ 缺失:{missing_list}

缺失原因分析:
- {dim}: {failure_reason}（超时/文件未写入/JSON 非法/entries 为空）
- 原因推测:{hypothesis}

影响评估:
- 无 {dim} → {impact_on_pipeline}
- 后续步骤传导:{cascade_effect}

选项:
1. 重试缺失维度（加大超时或简化任务，每个维度最多 2 次重试）
2. 降级进入收敛者（执行§6.0降级协议，基于骨架+存活维度重建最小 requirement-web.json）
```

#### 4.4 写入检查点记录

将分析结果写入 `{workDir}/.meta/checkpoints/barrier-1.md`：

```markdown
# barrier-1: 维度完整性检查

- 时间:{ISO 时间戳}
- 维度完成状态:{summary}
- 缺失维度:{missing_list}
- 失败原因:{failure_analysis}
- 用户决策:(待补)
```

用户决策后，补写决策字段，按用户指令行动。

#### 4.5 用户决策后的处理

| 用户选择 | 处理 |
|---------|------|
| 重试缺失维度 | 重新 spawn 对应 Agent。**首次重试**使用原始 task；**第二次重试**（3.4 已补发 1 次）使用简化 task：减少锚点覆盖（仅保留 core 锚点，跳过 premise/outlook）、降低输出要求（跳过 insights、跳过补充能力）、超时加倍。完成后重新执行 4 检查。**每个维度最多重试 2 次**（含 3.4 的 1 次补发）。达到上限后重试选项消失，仅保留「降级进入收敛者」 |
| 降级进入收敛者 | 在收敛者 task 中标注缺失维度，标注"低置信度"，继续管线 |

**重试上限规则**：每个维度的总重试次数 = 3.4 补发(1次) + 4.5 用户决策重试(最多1次) = 2次。超过上限后，主 agent 在 4.3 分析报告中移除「重试」选项，仅展示「降级进入收敛者」。

**简化 task 规则**（第二次重试时使用）：
- 超时：原始超时 × 2（如 180s → 360s）
- 锚点范围：仅覆盖 core 锚点（跳过 premise 和 outlook）
- 输出要求：跳过 `insights` 字段、跳过 `supplemented` 补充能力步骤
- task 中明确标注：「简化模式：仅输出核心能力列表，不需要 insights 和补充能力」

---

### 5. Spawn 收敛者 Agent（串行，单 Agent）

**⚠️ 前置条件**：Step 4 barrier 检查通过（4/4 完成）或用户明确授权降级。**未通过 barrier 检查时禁止进入本步骤。**

4 个维度 Agent 全部完成后（或用户授权降级后），spawn 收敛者 Agent。

**调度**：
- 单 Agent，无并发，直接 spawn
- **超时**：5 分钟
- 超时后先检查 `{workDir}/.meta/requirement-web.json` 是否已写入磁盘且合法
- 文件完整（含 `propositions` + `capability_web` 字段）→ 直接使用，不重试
- 文件不完整或不存在 → 重试一次（重新 spawn，同一 task）
- 重试仍失败 → **降级：基于骨架 + 存活维度数据重建最小可用 requirement-web.json**（见下方降级协议）
- 等待子 agent 完成（平台自行决定等待方式）

**label**：`brainstorm-integrator`

**完成判定**：Agent 输出包含合法 JSON 且包含 `propositions` 和 `capability_web` 字段。

#### 6.0 降级协议（收敛者失败时触发）

> **⚠️ 核心约束**：维度报告格式（`{dimension, scenarios[]}`）与 requirement-web.json 格式（`{context, propositions[], dependencies, capability_web, scope, search_guidance}`）完全不兼容。禁止直接用维度报告替代 requirement-web.json，必须执行格式转换。

**降级时主 agent 执行以下转换**：

1. **读取存活的维度报告**：逐个检查 scenario/technical/learning/constraint.json 是否存在，读取有效内容
2. **读取骨架**：读取 `{{anchors}}` 获取 target_level、strategy 等元数据
3. **重建 requirement-web.json**：
   - context：从 `{{anchors}}` 提取 target_level、year_inference_trace，填充默认值
   - propositions：将 scenario 维度的 scenarios[] 转换为 propositions[] 格式
   - capability_web：将 technical 维度的 capabilities[] 转换为 capability_web 格式
   - scope.exclusions：从 constraint 维度的 exclusions[] 提取
   - search_guidance.global_keywords：从 `{{anchors}}` 的 tags[] 提取
   - convergence_trace：标注 degraded=true 和 missing_dimensions
4. **写入**：将重建的 requirement-web.json 写入 `{workDir}/.meta/`
5. **校验**：验证写入的 JSON 包含 propositions（非空）、context、scope 字段

**降级后行为**：标注 `"degraded": true` + `"missing_dimensions": [...]` 在 `convergence_trace` 中，后续步骤读取时可据此调整深度（如跳过深度研究，仅做基础扫描）。

收敛者 Agent 读取共享骨架 + 4 份维度报告，执行校验、对齐、收束、去重、补位。

**收敛者任务模板**：详见 `{{task-templates}}`

---

### 6. 写入

收敛者 Agent 将产出写入 `{workDir}/.meta/requirement-web.json`。
头脑风暴的中间产物（4 份维度报告 + `{{anchors}}`）已持久化在 `{workDir}/.meta/brainstorm/` 目录下，可供回溯审查。

**传递到 requirement-web.json 的元数据**：
- `strategy`：从 `{{anchors}}` 继承的策略元数据（core_label / premise_label / outlook_label / ratios）
- `level_weight`：每个 proposition 携带 level_weight（level + role + reason）

### 7. 注入 Step 02

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
| 收敛者 Agent 超时（>5min） | 检查 requirement-web.json 是否已写入磁盘：完整则直接使用，不完整则重试一次，重试失败 → **执行 §6.0 降级协议**（基于骨架+存活维度重建最小 requirement-web.json） |
| 收敛者输出 JSON 解析失败 | 重试一次；仍失败 → **执行 §6.0 降级协议** |
