# 头脑风暴

## 目标

收敛出可被 Step 04 消费的 requirement-web.json

## 输入

- {workDir}/.meta/brainstorm/anchors.json

## 输出

- {workDir}/.meta/requirement-web.json

## 校验清单

- [ ] [json-parse] {workDir}/.meta/requirement-web.json: requirement-web.json 可解析
- [ ] [field] context: context 包含 target_level、year_source、year_inference_trace
- [ ] [field] id: 每个 proposition 包含 id
- [ ] [field] name: 每个 proposition 包含 name
- [ ] [field] depth: 每个 proposition 包含 depth
- [ ] [field] search_keywords: 每个 proposition 包含 search_keywords
- [ ] [field] capability_ids: capability_web 与 propositions 的 capability_ids 一致
- [ ] [field] dependencies: dependencies 中引用的 id 全部存在
- [ ] [count]: scope.exclusions 非空
- [ ] [field] level_weight: 每个 proposition 包含 level_weight
- [ ] [field] strategy: strategy 元数据已写入
- [ ] [field] provisional_role: 锚点与 proposition 的 level_weight 一致

## 失败处理

| 触发 | 行为 | 处理 |
|------|------|------|
| 维度 Agent 超时 | retry | 检查文件是否已写入；完整保留，不完整补发一次 |
| 3+ 维度缺失 | degrade | 降级为原始指令扫描，Step 04 按原始指令执行 |
| 收敛者超时 | retry | 检查 requirement-web.json 是否完整；不完整重试一次 |
| 收敛者 JSON 解析失败 | degrade | 执行降级协议重建 requirement-web.json |

## 下一步

partition

## 详细说明

执行步骤：

1. 创建 {workDir}/.meta/brainstorm 目录。
2. 按执行规则包分发场景、技术、学习、约束 4 个维度 Agent。
3. 轮询等待，轮询间隔 15s，每个 Agent 完成时即时校验文件、JSON、dimension 和 entries。
4. 失败 Agent 最多补发 1 次。
5. 4 个维度全部结束后执行质量门禁。
6. 门禁通过后 spawn 收敛者。
7. 收敛者写入 requirement-web.json。
8. 执行当前步骤的 barrier 检查点。

## 质量门禁

检查 4 个维度文件：

- scenario.json 存在且可解析
- technical.json 存在且可解析
- learning.json 存在且可解析
- constraint.json 存在且可解析
- 每个 JSON 包含 dimension 字段和对应 entries

4/4 通过后进入收敛者；存在缺失时停住等待用户决策。

## Step 04 注入

将 requirement-web.json 作为 Step 04 输入：

- propositions 列表
- search_guidance 推荐关键词
- scope.exclusions 排除规则
- context 经验年限
- strategy 策略元数据
- level_weight 驱动密度分级

## 任务模板

### 场景维度

```text
你是场景维度分析专家。
基于 anchors.json 列出 ≥5 个候选场景。
按 target_level 过滤：L1 概念级，L2 方案级，L3 决策级，L4 体系级。
每个场景包含 anchor_ref、level_weight、confidence、depth、frequency、granularity_match。
写入 scenario.json。
```
### 技术维度

```text
你是技术维度分析专家。
拆解原子能力，区分通用与特化能力。
标注 layer、depends_on、covers、level_weight。
检查网络层、工具层、运行时层、安全层，缺失时补充 T_ADD{N}。
写入 technical.json。
```
### 学习维度

```text
你是学习维度分析专家。
设计从不会到目标水平的渐进学习路径。
每个节点包含 prerequisites、estimated_time、verification、is_strategic。
输出有框架经验和无框架经验两条分支。
写入 learning.json。
```
### 约束维度

```text
你是约束维度分析专家。
提取显式和隐式约束，明确排除项。
reason_type 只能是 out_of_scope、below_target、deprecated、not_frontend。
加入排除已停止维护方案和经验年限约束。
写入 constraint.json。
```
### 收敛者

```text
你是头脑风暴的收敛者（Integrator）。收敛五动作的通用做法见模块附录（parallel-methods）；本任务按下列域绑定步骤执行。

你必须用 write 工具将文件写入磁盘。

## 你需要读取的文件
1. 共享骨架：{workDir}/.meta/brainstorm/anchors.json
2. 场景维度报告：{workDir}/.meta/brainstorm/scenario.json
3. 技术维度报告：{workDir}/.meta/brainstorm/technical.json
4. 学习维度报告：{workDir}/.meta/brainstorm/learning.json
5. 约束维度报告：{workDir}/.meta/brainstorm/constraint.json
6. 输出格式：steps/02-brainstorm/requirement-web-schema.md

## 你的任务
1. 校验：检查 4 个维度输出中的 level_weight 是否跨维度一致。
2. 对齐：不一致时按优先级对齐（约束 > 技术 > 场景 > 学习）。
3. 收束：用 anchor_ref 编织跨维度关系图，建立场景与能力映射。
4. 去重：同维度内描述重叠则合并；不同维度同锚点则标注不同视角。
5. 补位：检测 anchor_coverage 覆盖缺口。
6. 图谱构建：产出 capability_web（按能力 ID 组织，含 type/fanout/covers/dependencies）。

## 输出格式
严格按 requirement-web-schema.md 格式输出。
额外字段：context.target_level、context.year_source、context.year_inference_trace、strategy、capability_web、qualifier_injection；每个 proposition 附 capability_ids 和 level_weight。

## 写入
将 requirement-web.json 写入 {workDir}/.meta/requirement-web.json。
```


---

## 文件引用

| 类型 | 文件 | 说明 |
|------|------|------|
| 读取 | `{workDir}/.meta/brainstorm/anchors.json` | 共享骨架 |
| 读取 | `steps/02-brainstorm/schemas.md` | 需求网 格式契约 |
| 读取 | （见附录：模块 `parallel-methods`） | 并行分析方法（内容包正本） |
| 读取 | （见附录：模块 `brainstorm-rules-methods`） | 头脑风暴执行规则（内容包正本） |
| 产出 | `{workDir}/.meta/requirement-web.json` | 需求网 |

## 依赖

前置步骤：`intent-anchor`

## 调度策略

▤ 并行分支：4 维度并行分析（4 条分支）

  分支 1：
    - Task：`场景维度` [agent]
      超时：3 min
      Body：
```
列出候选场景，按 target_level 过滤，写入 scenario.json。
```

  分支 2：
    - Task：`技术维度` [agent]
      超时：3 min
      Body：
```
拆解原子能力，标注 layer/depends_on/covers，写入 technical.json。
```

  分支 3：
    - Task：`学习维度` [agent]
      超时：3 min
      Body：
```
设计渐进学习路径，写入 learning.json。
```

  分支 4：
    - Task：`约束维度` [agent]
      超时：3 min
      Body：
```
提取显式/隐式约束和排除项，写入 constraint.json。
```

  🛑 质量门禁
    - 规则：4/4 completed or user authorizes degrade
    - 通过 → 启动收敛者
    - 失败 → 用户决策
  收敛者：`收敛者` [agent]
    超时：5 min
    Body：
```
读取四份维度报告，执行校验、对齐、收束、去重、补位，生成 requirement-web.json。
```


## Barrier brainstorm

**检查项：**
- 命题数量
- 能力数量
- 依赖关系数
- 排除项数

**`clarify` 提示：**
> 请确认头脑风暴收敛后的需求网。

| 决策 | 行为 |
|------|------|
| 确认 | continue |
| 拒绝 | rollback |

### Decision Summary

> 示例值——以下为历史运行示例，非本次运行时数据。

- gate_type: `human_gate`
- confirm: 确认需求网
- metrics: 命题=10; 年限推断=L2; 排除项=20
- selection: 10/10 命题默认选中，可按命题或分组调整。

> 当前阶段：需求网确认；本次确认：命题/年限/排除边界；下一步：分区确认；命题 10，年限 L2，排除项 20；10/10 已选。

## 插件加载

- `year-granularity`

## 运行记录

进入本步骤后的第一件事：

1. 用 date -u +%Y-%m-%dT%H:%M:%SZ 获取真实时间，追加 {workDir}/.meta/run/events.jsonl 的 step_start。
2. 创建 {workDir}/.meta/run/stages/brainstorm/usage.json、timeline.json、stage-budget.json，写入当前真实时间。
禁止阶段结束后统一回填时间；禁止使用合成或猜测时间戳。

先读取 {workDir}/.meta/run/run.json 获取 run_id；若不存在，由 initialize 创建。

事件类型：

- `step_start`
- `step_end`
- `file_written`
- `validation_failed`
- `validation_passed`
- `retry`
- `degrade`
- `fallback`
- `self_corrected`
- `reuse_skipped`
- `barrier_rejected`
- `barrier_confirmed`
- `user_modified`
- `task_timeout`
- `task_failed`
- `judgment_passed`
- `judgment_failed`
- `judgment_stuck`

事件格式：

```json
{ "ts": "...", "run_id": "...", "step_id": "brainstorm", "event": "event-type", "ref": "...", "detail": "...", "before_hash": "...", "after_hash": "..." }
```

每次 subagent spawn 后，向 {workDir}/.meta/run/subagent-window.jsonl 追加窗口记录，包含 batch_id、window_count、input_tokens_estimate、read_paths。

barrier 相关事件（barrier_confirmed / barrier_rejected）的 ref 必须使用 {workDir}/.meta/checkpoints/brainstorm-barrier.md。

### 阶段 Telemetry

本步骤开始和完成时分别更新：

- `{workDir}/.meta/run/stages/brainstorm/usage.json`：本阶段 token / cost / cacheRead 汇总
- `{workDir}/.meta/run/stages/brainstorm/timeline.json`：本阶段 step_start / step_end / barrier / retry / timeout 事件时间线
- `{workDir}/.meta/run/stages/brainstorm/stage-budget.json`：本阶段 wall time、子 agent 等待、重试次数、预算占用

完成本步骤时追加 step_end，并更新根级 `{workDir}/.meta/run/usage.json`、`{workDir}/.meta/run/timeline.json`、`{workDir}/.meta/run/stage-budget.json`。

事件必须实时追加，不能阶段结束后后补；时间戳必须使用真实执行时间。

## 模块附录

> 本节为执行用正本。

### 模块：`parallel-methods`（parallel-method）

> 来源：模块 `parallel-methods`

# 适用

同一主题需要多个相互独立的维度分别分析、最后汇总为一份结论时使用本方法。

维度之间必须信息不重叠——互补视角才有汇总价值；同质视角只是重复劳动。


# 做法

1. **定维度**：选取 3–5 个互补视角，维度之间信息尽量不重叠。维度清单由使用方声明（本方法不预设维度名）。
2. **并行分析**：每个维度一个分析者，各自独立完成并写出一份维度报告到约定位置；过程中轮询等待完成，失败的分析者按约定次数补发。
3. **质量门禁**：判据与检查清单见 《门禁与收敛检查清单》；全部齐备（或用户显式授权降级）才进入下一步，缺项时停住等用户决策，不自行补齐。
4. **收敛汇总**：由收敛者读取全部维度报告，依次执行——校验（跨维度一致性，同一事实口径不同即为不一致）、对齐（按使用方声明的优先级取舍）、收束（把各维度结论编织成关系图）、去重（同维度重叠合并，跨维度同源标注为不同视角）、补位（检测覆盖缺口）。
5. **产出**：按使用方声明的格式写出汇总产物；格式归使用方，本方法只要求可追溯——每条结论能指回它来自哪个维度。


# 门禁与收敛检查清单

## 门禁（进收敛前）

- 每份维度报告存在且可解析。
- 每份报告带有归属字段：能指回它由哪个维度产出。
- 判定：全部齐备 → 进入收敛；存在缺项 → 停住，等用户决策（降级或补做）。

## 收敛（出汇总前）

- 一致性：同一事实跨维度口径一致；不一致项已按优先级对齐并记录取舍理由。
- 去重：同维度重叠已合并；跨维度同源已标注为不同视角。
- 补位：覆盖缺口已补或已明确记为空白。
- 可追溯：汇总中每条结论能指回来源维度。


# 边界

- 本方法不含维度名、文件名、字段名与优先级具体值——这些属于使用方的业务内容。
- 门禁判定与收敛动作是通用部分；维度如何切分属于业务判断，由使用方给出。
- 不含产物格式：汇总怎么写由使用方声明。


<!-- module:parallel-methods -->
### 模块：`brainstorm-rules-methods`（brainstorm-rules-method）

> 来源：模块 `brainstorm-rules-methods`

# 适用

多维度 Agent 并行分析、需要显式分发设定、质量门禁与失败降级时使用本方法。

维度之间应当相互独立——分发、门禁、降级三件只管执行形状，不管维度内容。


# 分发做法

1. **定分发**：主 agent 按分发设定 spawn 各维度 Agent，不直接读子任务文件，只下发路径。维度清单与角色定义由使用方声明（本方法不预设维度名）。
2. **自主读取**：每个 Agent 启动后自行读取角色定义、共享骨架与输出格式，各读各的，互不等待。
3. **质量门禁**：判据与检查清单见 《门禁与降级清单》；全部齐备才进入下一步，缺项时停住等用户决策，不自行补齐。
4. **失败降级**：收敛失败时按降级协议用存活维度重建最小汇总产物，并标注降级痕迹。
5. **产出**：按使用方声明的格式写出汇总产物；格式归使用方，本方法只要求每步可追溯——分发有记录、门禁有报告、降级有标注。


# 门禁与降级清单

## 分发（进并行前）

- 主 agent 只下发路径，不读子任务文件内容。
- 每个维度的角色定义、输出路径、格式章节由使用方声明。

## 门禁（进收敛前）

- 每份维度报告存在、可解析、带归属字段、条目非空。
- 判定：全部齐备 → 进入收敛；存在缺项 → 停住，输出缺失分析，等用户决策（重试或降级）。
- 重试有上限：达到上限后仅保留降级选项。

## 降级（收敛失败时）

- 触发：收敛者超时、重试仍失败、输出解析失败。
- 动作：读存活维度报告＋共享骨架，按字段映射表重建最小汇总产物（映射表由使用方声明），标注降级痕迹。
- 校验：重建产物含核心字段（非空）才算成功。


# 边界

- 本方法不含维度名、文件名、字段名、阈值（超时分钟数、重试次数）、产物格式——这些属于使用方的业务内容。
- 分发形状、门禁形状、降级形状是通用部分；分几个维度、等几分钟、重试几次属于业务判断，由使用方给出。
- 维度任务的具体写法是另一个方法（并行分析包），不在本包。


<!-- module:brainstorm-rules-methods -->
