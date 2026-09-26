# 依赖分区

## 目标

生成可被 scan 消费的分区分析和执行计划

## 输入

- {workDir}/.meta/requirement-web.json

## 输出

- {workDir}/.meta/partition-analysis.json
- {workDir}/execution-plan.md

## 校验清单

- [ ] [json-parse] {workDir}/.meta/partition-analysis.json: 分区分析可解析
- [ ] [field] current_session: 当前会话的命题列表非空、不超过 12 条、且每条都是需求网中存在的命题编号
- [ ] [field] scan_batches: scan_batches 可消费

## 失败处理

| 触发 | 行为 | 处理 |
|------|------|------|
| 存在循环依赖 | degrade | 断开 related 类型边并记录 warning |
| 当前 session 超过 12 个命题 | degrade | 按社区进一步拆分 |

## 下一步

scan

## 详细说明

依赖类型：

- prerequisite：A 是 B 的前置知识
- enables：A 让 B 更容易理解
- related：无严格先后
- extends：B 是 A 的进阶变体

构建 DAG 时，prerequisite 和 enables 为有向边，related 为无向边。

检测到环时，先断开 related 类型边，直到无环。

## 三层分区

1. 连通分量：每个分量是一个候选 session。
2. 拓扑深度：同 depth 的节点组成反链，可并行。
3. 社区发现：分量节点数大于 8 时运行 Leiden 聚类。

## Session 分配

包含最多 core 命题的分量进入当前 session S1。

当前 session 超过 12 个命题时按社区拆分。

其余分量排期到 S2/S3，并写入恢复指令。

## 任务模板

### DAG 构建

```text
建图与断环的通用做法见模块附录（partition-methods）；本任务按下列步骤执行：
读取 requirement-web.json。
为每对命题判断依赖类型。
构建节点和边。
检测环，断开 related 边直到无环。
```
### Session 分配

```text
分层分批的通用做法见模块附录（partition-methods）；本任务按下列步骤执行：
按连通分量分组。
计算每个分量的拓扑深度。
超过阈值时运行社区发现。
分配 current_session 和 deferred_sessions。
生成 execution-plan.md。
```


---

## 文件引用

| 类型 | 文件 | 说明 |
|------|------|------|
| 读取 | `{workDir}/.meta/requirement-web.json` | 需求网 |
| 读取 | `steps/03-partition/schemas.md` | 分区分析 格式契约 |
| 读取 | （见附录：模块 `partition-methods`） | 依赖分区通用形状（内容包正本） |
| 产出 | `{workDir}/.meta/partition-analysis.json` | 分区分析 |
| 产出 | `{workDir}/execution-plan.md` | 执行计划 |

## 依赖

前置步骤：`brainstorm`

## 调度策略

▸ 顺序执行：依赖分区（3 步）

  第 1 步：
    - Task：`确认依赖` [agent]
      超时：3 min
      Body：
```
读取 requirement-web，确认或推断 dependencies。
```

  第 2 步：
    - Task：`构建 DAG` [agent]
      超时：3 min
      Body：
```
构建命题 DAG，检测并打断循环依赖。
```

  第 3 步：
    - Task：`分配 Session` [agent]
      超时：3 min
      Body：
```
按连通分量、拓扑深度和社区分组生成 sessions。
```



## Barrier partition

**检查项：**
- session 数量（展示供确认，不作过/不过依据）
- 当前会话命题数不超过 12，且是包含核心命题最多的一组
- 排期 session 命题（展示供确认，不作过/不过依据）

**`clarify` 提示：**
> 请确认分区方案和本次执行计划。

| 决策 | 行为 |
|------|------|
| 确认 | continue |
| 拒绝 | rollback |

## 运行记录

进入本步骤后的第一件事：

1. 用 date -u +%Y-%m-%dT%H:%M:%SZ 获取真实时间，追加 {workDir}/.meta/run/events.jsonl 的 step_start。
2. 创建 {workDir}/.meta/run/stages/partition/usage.json、timeline.json、stage-budget.json，写入当前真实时间。
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
{ "ts": "...", "run_id": "...", "step_id": "partition", "event": "event-type", "ref": "...", "detail": "...", "before_hash": "...", "after_hash": "..." }
```

每次 subagent spawn 后，向 {workDir}/.meta/run/subagent-window.jsonl 追加窗口记录，包含 batch_id、window_count、input_tokens_estimate、read_paths。

barrier 相关事件（barrier_confirmed / barrier_rejected）的 ref 必须使用 {workDir}/.meta/checkpoints/partition-barrier.md。

### 阶段 Telemetry

本步骤开始和完成时分别更新：

- `{workDir}/.meta/run/stages/partition/usage.json`：本阶段 token / cost / cacheRead 汇总
- `{workDir}/.meta/run/stages/partition/timeline.json`：本阶段 step_start / step_end / barrier / retry / timeout 事件时间线
- `{workDir}/.meta/run/stages/partition/stage-budget.json`：本阶段 wall time、子 agent 等待、重试次数、预算占用

完成本步骤时追加 step_end，并更新根级 `{workDir}/.meta/run/usage.json`、`{workDir}/.meta/run/timeline.json`、`{workDir}/.meta/run/stage-budget.json`。

事件必须实时追加，不能阶段结束后后补；时间戳必须使用真实执行时间。

## 模块附录

> 本节为执行用正本。

### 模块：`partition-methods`（partition-method）

> 来源：模块 `partition-methods`

# 适用

候选项之间存在依赖关系、无法一次全部处理、需要划分批次依次执行时使用本方法。

各批次之间应当依赖清晰——无依赖的候选项不需要分区，直接并行即可。


# 建图做法

1. **定依赖类型**：先声明本域的依赖类型表（含方向：有向边／无向边）。类型表由使用方声明（本方法不预设类型名）。
2. **建图**：为每对候选项判断依赖类型，构建节点和边。
3. **断环**：检测到环时优先断开无严格先后的边，直到无环；断开须记录。断环顺序由使用方声明。
4. **分层**：判据与检查清单见 《三层分批清单》；按连通分量、拓扑深度、社区规模三层划分批次。
5. **产出**：按使用方声明的格式写出分区分析与执行计划；格式归使用方，本方法只要求每批能指回它的分层依据。


# 三层分批清单

## 分层（进分批前）

- 连通分量：每个分量是一个候选批次。
- 拓扑深度：同深度的节点组成反链，可并行。
- 社区发现：分量节点数超过阈值（由使用方声明）时运行社区聚类。

## 分批（出计划前）

- 含最多核心项的分量进入当前批次。
- 当前批次超过上限（由使用方声明）时按社区拆分；其余分量排期到后续批次，并写入恢复指令。


# 边界

- 本方法不含依赖类型名、聚类阈值、批次上限、产物字段——这些属于使用方的业务内容。
- 建图形状、断环顺序形状、三层分批形状是通用部分；类型有几种、阈值定多少属于业务判断，由使用方给出。
- 依赖枚举的具体中文解释（如"前置知识""更容易理解"）是本域声明，不在本包。


<!-- module:partition-methods -->
