# 评估入池

## 目标

生成按年限阈值入池的评估结果与推荐顺序

## 输入

- {workDir}/.meta/capability-graph.json
- {workDir}/.meta/dependency-graph.json

## 输出

- {workDir}/.meta/evaluations.json
- {workDir}/README.md
- {workDir}/.meta/candidates.md

## 校验清单

- [ ] [file-exists] {workDir}/README.md: 命题总览存在
- [ ] [json-parse] {workDir}/.meta/evaluations.json: 评估结果可解析
- [ ] [field] priority_trace: 每个命题包含 priority_trace
- [ ] [field] recommended_order: 推荐顺序合理

## 失败处理

| 触发 | 行为 | 处理 |
|------|------|------|
| 信息不足以打分 | degrade | 标记 medium 并说明 reasoning |
| 所有命题 rejected | halt | 提示用户调整搜索范围 |

## 下一步

capability-research

## 详细说明

四维评分：

- cross_stack_coupling：跨栈耦合
- doc_vacuum：文档真空
- experience_barrier：经验壁垒
- topical_heat：时事热度

每个维度 1-3 分，总分 12。

防虚高：4 个维度均 >= 2 时必须重新审视并压低至少 1 分，除非有明确论据。

## 年限阈值

L1：通常不入池。
L2：总分 >= 6。
L3：总分 >= 5。
L4：任一维度 >= 2 即入池。

一票入池条件：多源讨论、明确 trade-off、新兴与既有体系碰撞。

## 任务模板

### 四维评分

```text
逐维打分、记录依据、防虚高的通用做法见模块附录（evaluate-methods）；本任务按下列步骤执行：
对每个命题按四维矩阵打分。
记录每个维度的 reasoning。
检查防虚高规则（阈值见下文详细说明）。
写入 evaluations.json。
```
### 入池归档

```text
阈值门禁、直通、难度分级与排序的通用做法见模块附录（evaluate-methods）；本任务按下列步骤执行：
按年限阈值判定 priority。
记录 priority_trace。
评估 difficulty 和 recommended_order。
生成 README.md 和 candidates.md。
```


---

## 文件引用

| 类型 | 文件 | 说明 |
|------|------|------|
| 读取 | `{workDir}/.meta/capability-graph.json` | 能力图谱 |
| 读取 | `{workDir}/.meta/dependency-graph.json` | 依赖图 |
| 读取 | `steps/06-evaluate-pool/method.md` | 评估方法论（投影） |
| 读取 | `steps/06-evaluate-pool/schemas.md` | 评估结果 格式契约 |
| 读取 | （见附录：模块 `evaluate-methods`） | 评估方法通用形状（内容包正本） |
| 读取 | `references/year-granularity.md` | 经验年限命题颗粒度规则 |
| 产出 | `{workDir}/.meta/evaluations.json` | 评估结果 |
| 产出 | `{workDir}/README.md` | 命题总览 |
| 产出 | `{workDir}/.meta/candidates.md` | 候选池 |

## 依赖

前置步骤：`capability-graph`

## 调度策略

▸ 顺序执行：评估入池（3 步）

  第 1 步：
    - Task：`四维评分` [agent]
      超时：5 min
      Body：
```
按四维矩阵逐命题打分。
```

  第 2 步：
    - Task：`年限阈值` [agent]
      超时：3 min
      Body：
```
按 L1-L4 阈值判定入池并记录 priority_trace。
```

  第 3 步：
    - Task：`入池归档` [agent]
      超时：3 min
      Body：
```
生成 evaluations.json、README.md 和 candidates.md。
```



## Barrier evaluate-pool

**检查项：**
- 评估表
- 优先级分布
- 难度分级
- 推荐顺序

**`clarify` 提示：**
> 请确认评估结果和后处理范围。

| 决策 | 行为 |
|------|------|
| 确认 | continue |
| 拒绝 | rollback |

## 插件加载

- `year-granularity`

## 运行记录

进入本步骤后的第一件事：

1. 用 date -u +%Y-%m-%dT%H:%M:%SZ 获取真实时间，追加 {workDir}/.meta/run/events.jsonl 的 step_start。
2. 创建 {workDir}/.meta/run/stages/evaluate-pool/usage.json、timeline.json、stage-budget.json，写入当前真实时间。
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
{ "ts": "...", "run_id": "...", "step_id": "evaluate-pool", "event": "event-type", "ref": "...", "detail": "...", "before_hash": "...", "after_hash": "..." }
```

每次 subagent spawn 后，向 {workDir}/.meta/run/subagent-window.jsonl 追加窗口记录，包含 batch_id、window_count、input_tokens_estimate、read_paths。

barrier 相关事件（barrier_confirmed / barrier_rejected）的 ref 必须使用 {workDir}/.meta/checkpoints/evaluate-pool-barrier.md。

### 阶段 Telemetry

本步骤开始和完成时分别更新：

- `{workDir}/.meta/run/stages/evaluate-pool/usage.json`：本阶段 token / cost / cacheRead 汇总
- `{workDir}/.meta/run/stages/evaluate-pool/timeline.json`：本阶段 step_start / step_end / barrier / retry / timeout 事件时间线
- `{workDir}/.meta/run/stages/evaluate-pool/stage-budget.json`：本阶段 wall time、子 agent 等待、重试次数、预算占用

完成本步骤时追加 step_end，并更新根级 `{workDir}/.meta/run/usage.json`、`{workDir}/.meta/run/timeline.json`、`{workDir}/.meta/run/stage-budget.json`。

事件必须实时追加，不能阶段结束后后补；时间戳必须使用真实执行时间。

## 模块附录

> 本节为执行用正本。

### 模块：`evaluate-methods`（evaluate-method）

> 来源：模块 `evaluate-methods`

# 适用

候选项需要从多个方面打分、并按档位判定是否入池、再排出学习或处理顺序时使用本方法。

维度之间应当相互独立——可互相推导的维度只是重复计分。


# 打分做法

1. **定维度**：选取 N 个相互独立的评估维度。维度清单由使用方声明（本方法不预设维度名）。
2. **逐维打分**：每个维度按固定档位打分；每维打出分数的同时记录依据（reasoning），依据的客观口径由使用方声明。
3. **防虚高**：全部维度得分偏高时必须重新审视并压低至少一个维度，除非有明确论据支撑。
4. **门禁判定**：判据与检查清单见 《阈值门禁与直通清单》；达标进入排序，未达标记录理由后跳过，直通条件满足时直接入池。
5. **产出**：按使用方声明的格式写出评估结果与候选清单；格式归使用方，本方法只要求每条结论能指回它的打分依据。


# 阈值门禁与直通清单

## 门禁（进排序前）

- 每档对应一条入池阈值（阈值由使用方声明）。
- 判定：达标 → 进入排序；未达标 → 记录理由后跳过。
- 直通：满足任一条直通条件（由使用方声明）即直接入池，不受阈值限制。

## 排序（出清单前）

- 按难度分级：见《难度分级与排序》。
- 未达标项已记录理由；直通项已标注依据。


# 难度分级与排序

## 分级

- 按依赖链深度分三级：浅 → 中 → 深（分级界线由使用方声明）。
- 同级内按知识跨度与抽象度辅助判断。

## 排序规则

1. 浅 → 中 → 深。
2. 同难度内，被其他项依赖更多的排前面。
3. 同难度同依赖，准入壁垒低的排前面。


# 边界

- 本方法不含维度名、阈值、校准口径、直通条目、产物字段——这些属于使用方的业务内容。
- 打分形状、防虚高、门禁形状、排序规则是通用部分；维度如何划分、阈值定多少属于业务判断，由使用方给出。
- 相邻方法排除：研究展开框架（如链路解构、极致场景、权衡雷达、最小实验）是另一个方法，不在本包。
- 命名约定排除：命题或条目的命名模板与粒度原则是命名约定，不在本包。


<!-- module:evaluate-methods -->
