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
| `{{scheduling-detail}}` | `assets/01-brainstorm/scheduling-detail.md` | 调度参数 + 超时检查 + 降级策略 |
| `{{barrier-check}}` | `assets/01-brainstorm/barrier-check.md` | Barrier 检查项 + 决策矩阵 + 重试规则 |
| `{{fallback-protocol}}` | `assets/01-brainstorm/fallback-protocol.md` | 收敛者失败时的降级转换协议 |
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

调度参数、超时检查、降级策略详见 `{{scheduling-detail}}`。

### 4. 🛑 Barrier 检查（强制停顿，不可跳过）

详见 `{{barrier-check}}`。

### 5. Spawn 收敛者 Agent（串行，单 Agent）

**⚠️ 前置条件**：Step 4 barrier 检查通过（4/4 完成）或用户明确授权降级。**未通过 barrier 检查时禁止进入本步骤。**

4 个维度 Agent 全部完成后（或用户授权降级后），spawn 收敛者 Agent。

**调度**：
- 单 Agent，无并发，直接 spawn
- **超时**：5 分钟
- 超时后先检查 `{workDir}/.meta/requirement-web.json` 是否已写入磁盘且合法
- 文件完整（含 `propositions` + `capability_web` 字段）→ 直接使用，不重试
- 文件不完整或不存在 → 重试一次（重新 spawn，同一 task）
- 重试仍失败 → **执行 `{{fallback-protocol}}`**
- 等待子 agent 完成（平台自行决定等待方式）

**label**：`brainstorm-integrator`

**完成判定**：Agent 输出包含合法 JSON 且包含 `propositions` 和 `capability_web` 字段。

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
| 收敛者 Agent 超时（>5min） | 检查 requirement-web.json 是否已写入磁盘：完整则直接使用，不完整则重试一次，重试失败 → **执行 `{{fallback-protocol}}`** |
| 收敛者输出 JSON 解析失败 | 重试一次；仍失败 → **执行 `{{fallback-protocol}}`** |
