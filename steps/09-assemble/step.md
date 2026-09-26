# 命题组装

## 目标

为每个命题生成四象限研究输出

## 输入

- {workDir}/.meta/briefings/{seq}-{short_name}.md

## 输出

- {workDir}/{seq}-{short_name}/overview.md
- {workDir}/{seq}-{short_name}/edge-cases.md
- {workDir}/{seq}-{short_name}/trade-offs.md
- {workDir}/{seq}-{short_name}/references.md
- {workDir}/{seq}-{short_name}/experiment/README.md
- {workDir}/{seq}-{short_name}/_assembly_ratio_trace.json

## 校验清单

- [ ] [file-exists] {workDir}/{seq}-{short_name}/edge-cases.md: edge-cases 文件存在
- [ ] [field] 筛选_trace: edge-cases 每个坑点包含筛选_trace
- [ ] [file-exists] {workDir}/{seq}-{short_name}/_assembly_ratio_trace.json: 组装占比 trace 存在
- [ ] [json-parse] {workDir}/{seq}-{short_name}/_assembly_ratio_trace.json: 组装占比 trace 可解析
- [ ] [count]: 场景化输入/边界/验证 >= 3，特化占比 >= 30%
- [ ] [count]: 输出文件四个部分齐全：overview／edge-cases／trade-offs／experiment 各一节且非空

## 失败处理

| 触发 | 行为 | 处理 |
|------|------|------|
| Briefing 缺失 | halt | 停止并提示先完成 Step 08 |
| 一个 Agent 失败 | degrade | 标记 partial，不阻塞同命题另一 Agent |

## 下一步

learning-ladder

## 详细说明

每个命题使用 2 个 Agent：

- Markdown Agent：overview / edge-cases / trade-offs / references
- Experiment Agent：experiment/README.md + experiment/src/

两个 Agent 无相互依赖，可并行。

完成判定：

- 两个 Agent 均完成 = 命题完成
- 一个失败 = partial
- 两个失败 = failed

## Markdown Agent

读取 Briefing 和涉及能力摘要。

按数据流顺序编排 overview。

edge-cases 至少 3 个坑点，每个坑点附带筛选_trace。

trade-offs 输出 2-3 种技术路线。

references 按 Tier 排序去重。

每个命题必须包含至少 3 个场景化输入、3 个边界、3 个验证点。
内容比例：通用高地 <= 70%，场景化/特化内容 >= 30%。
完成后写入 _assembly_ratio_trace.json，记录 generic_pct、scenario_pct 和各项计数。

## Experiment Agent

读取 Briefing。

选取战略价值最高的实验代码。

合并为可运行的 HTML/JS 文件。

README 必须包含运行方式、预期结果、成功判据、失败含义和验证检查点。

## 效果契约

本产物的效果契约 E-assemble-ratio：

- 通用高地 <= 70%,场景化/特化内容 >= 30%
- 至少 3 个场景化输入、3 个边界、3 个验证点
- trace 记录 generic_pct/scenario_pct 与各项计数

## 任务模板

### Markdown Agent

```text
你是 {proposition_name} 的 Markdown 组装专家。
读取 Briefing。
组装 overview、edge-cases、trade-offs、references。
每个坑点必须包含筛选_trace。
内容比例：通用高地 <= 70%，场景化/特化内容 >= 30%。
至少 3 个场景化输入、3 个边界、3 个验证点。
写入 _assembly_ratio_trace.json。
```
### Experiment Agent

```text
你是 {proposition_name} 的实验组装专家。
读取 Briefing。
选取战略价值最高的实验代码。
合并为可运行 HTML/JS。
README 说明运行方式、预期结果、成功判据、失败含义和验证检查点。
```


---

## 文件引用

| 类型 | 文件 | 说明 |
|------|------|------|
| 读取 | `{workDir}/.meta/briefings/{seq}-{short_name}.md` | 命题 Briefing |
| 读取 | `{workDir}/.meta/requirement-web.json` | 需求网 |
| 读取 | `{workDir}/.meta/capability-graph.json` | 能力图谱 |
| 读取 | `steps/09-assemble/schemas.md` | Overview 格式契约 |
| 产出 | `{workDir}/{seq}-{short_name}/overview.md` | Overview |
| 产出 | `{workDir}/{seq}-{short_name}/edge-cases.md` | Edge Cases |
| 产出 | `{workDir}/{seq}-{short_name}/trade-offs.md` | Trade-offs |
| 产出 | `{workDir}/{seq}-{short_name}/references.md` | References |
| 产出 | `{workDir}/{seq}-{short_name}/experiment/README.md` | Experiment |
| 产出 | `{workDir}/{seq}-{short_name}/_assembly_ratio_trace.json` | 组装特化占比 trace（须满足本步 E-assemble-ratio） |

## 依赖

前置步骤：`briefing-assemble`

## 调度策略

▦ 滚动窗口：命题组装滚动窗口
  - 最大并发：5 
  - 数据来源：{workDir}/.meta/requirement-web.json#propositions

  Worker：
    - Task：`命题组装 Worker` [agent]
      超时：8 min
      Body：
```
为单个命题组装 overview、edge-cases、trade-offs、references 和 experiment。
```



## 增量复用

| 检查项 | 条件 | 行为 |
|--------|------|------|
| 命题 overview 已存在 | `{workDir}/{seq}-{short_name}/overview.md` 存在 | 跳过该任务 |

## Barrier assemble

**检查项：**
- 完成数 = 命题总数（未完成的逐一列出命题名，标明是部分完成还是失败）
- 部分完成数（每个列出缺哪个维度的分析）
- 失败数（期望为 0；不为 0 时逐条列出命题与原因）

**`clarify` 提示：**
> 请确认命题组装质量。

| 决策 | 行为 |
|------|------|
| 确认 | continue |
| 拒绝 | rollback |

## 运行记录

进入本步骤后的第一件事：

1. 用 date -u +%Y-%m-%dT%H:%M:%SZ 获取真实时间，追加 {workDir}/.meta/run/events.jsonl 的 step_start。
2. 创建 {workDir}/.meta/run/stages/assemble/usage.json、timeline.json、stage-budget.json，写入当前真实时间。
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
{ "ts": "...", "run_id": "...", "step_id": "assemble", "event": "event-type", "ref": "...", "detail": "...", "before_hash": "...", "after_hash": "..." }
```

每次 subagent spawn 后，向 {workDir}/.meta/run/subagent-window.jsonl 追加窗口记录，包含 batch_id、window_count、input_tokens_estimate、read_paths。

barrier 相关事件（barrier_confirmed / barrier_rejected）的 ref 必须使用 {workDir}/.meta/checkpoints/assemble-barrier.md。

### 阶段 Telemetry

本步骤开始和完成时分别更新：

- `{workDir}/.meta/run/stages/assemble/usage.json`：本阶段 token / cost / cacheRead 汇总
- `{workDir}/.meta/run/stages/assemble/timeline.json`：本阶段 step_start / step_end / barrier / retry / timeout 事件时间线
- `{workDir}/.meta/run/stages/assemble/stage-budget.json`：本阶段 wall time、子 agent 等待、重试次数、预算占用

完成本步骤时追加 step_end，并更新根级 `{workDir}/.meta/run/usage.json`、`{workDir}/.meta/run/timeline.json`、`{workDir}/.meta/run/stage-budget.json`。

事件必须实时追加，不能阶段结束后后补；时间戳必须使用真实执行时间。
