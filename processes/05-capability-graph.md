# 能力图谱

## 目标

生成能力图谱、依赖图、战略高地与学习路径

## 输入

- {workDir}/.meta/requirement-web.json
- {workDir}/.meta/.raw-materials/index.json

## 输出

- {workDir}/.meta/capability-graph.json
- {workDir}/.meta/dependency-graph.json
- {workDir}/.meta/highgrounds.json
- {workDir}/.meta/learning-path.json

## 校验清单

- [ ] [json-parse] {workDir}/.meta/capability-graph.json: 能力图谱可解析
- [ ] [field] dependencies_trace: 非空依赖包含 dependencies_trace
- [ ] [field] t0_missing: T0 参考状态已记录

## 失败处理

| 触发 | 行为 | 处理 |
|------|------|------|
| T0 信源不可达 | degrade | 标记 t0_missing 并用 T1/T2 补充 |
| 能力数量超过 30 | checkpoint | 提示使用 --filter 缩小范围 |

## 下一步

evaluate-pool

## 详细说明

能力去重：

第一轮按名称+层级匹配。
第二轮读取 raw-materials 内容做语义比对。
描述一致则合并，描述不同则拆分，并记录 merge_trace/split_trace。

依赖推断：

1. 技术层级关系
2. 内容前置引用
3. covers 交集

高置信度直接写入，中置信度附带 dependencies_trace。

## 战略高地

strategic_value = fanout.count x (1 / coupling)。

一级高地 >= 4.0。
二级高地 2.0-3.9。
三级营地 1.0-1.9。

高地 A 依赖高地 B 时，B 的实际价值叠加 A。

## 任务模板

### 能力去重

```text
提取 capability_web 雏形。
按名称+层级匹配候选合并。
读取关联 material 做语义比对。
记录 merge_trace 或 split_trace。
```
### 战略高地

```text
计算每个能力 strategic_value。
按阈值分级。
执行高地依赖累积。
输出 highgrounds.json 和 learning-path.json。
```


---

## 文件引用

| 类型 | 文件 | 说明 |
|------|------|------|
| 读取 | `{workDir}/.meta/requirement-web.json` | 需求网 |
| 读取 | `{workDir}/.meta/.raw-materials/index.json` | 素材索引 |
| 读取 | `assets/04-capability-graph/method.md` | 能力图谱提取方法论 |
| 产出 | `{workDir}/.meta/capability-graph.json` | 能力图谱 |
| 产出 | `{workDir}/.meta/dependency-graph.json` | 依赖图 |
| 产出 | `{workDir}/.meta/highgrounds.json` | 战略高地 |
| 产出 | `{workDir}/.meta/learning-path.json` | 学习路径 |

## 依赖

前置步骤：`scan`

## 调度策略

▸ 顺序执行：能力图谱构建（3 步）

  第 1 步：
    - Task：`能力去重` [agent]
      超时：5 min
      Body：
```
跨命题合并或拆分能力，并记录 merge/split trace。
```

  第 2 步：
    - Task：`标注依赖` [agent]
      超时：5 min
      Body：
```
基于层级、内容引用和 covers 交集推断依赖。
```

  第 3 步：
    - Task：`识别高地` [agent]
      超时：5 min
      Body：
```
计算 strategic_value 并生成 highgrounds 与 learning-path。
```



## Barrier capability-graph

**检查项：**
- 能力数量
- 扇出度 Top 3
- 战略高地数量
- 学习路径

**`clarify` 提示：**
> 请确认能力图谱质量。

| 决策 | 行为 |
|------|------|
| 确认 | continue |
| 拒绝 | rollback |

## 运行记录

进入本步骤后的第一件事：

1. 用 date -u +%Y-%m-%dT%H:%M:%SZ 获取真实时间，追加 {workDir}/.meta/run/events.jsonl 的 step_start。
2. 创建 {workDir}/.meta/run/stages/capability-graph/usage.json、timeline.json、stage-budget.json，写入当前真实时间。
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
{ "ts": "...", "run_id": "...", "step_id": "capability-graph", "event": "event-type", "ref": "...", "detail": "...", "before_hash": "...", "after_hash": "..." }
```

每次 subagent spawn 后，向 {workDir}/.meta/run/subagent-window.jsonl 追加窗口记录，包含 batch_id、window_count、input_tokens_estimate、read_paths。

barrier 相关事件（barrier_confirmed / barrier_rejected）的 ref 必须使用 {workDir}/.meta/checkpoints/capability-graph-barrier.md。

### 阶段 Telemetry

本步骤开始和完成时分别更新：

- `{workDir}/.meta/run/stages/capability-graph/usage.json`：本阶段 token / cost / cacheRead 汇总
- `{workDir}/.meta/run/stages/capability-graph/timeline.json`：本阶段 step_start / step_end / barrier / retry / timeout 事件时间线
- `{workDir}/.meta/run/stages/capability-graph/stage-budget.json`：本阶段 wall time、子 agent 等待、重试次数、预算占用

完成本步骤时追加 step_end，并更新根级 `{workDir}/.meta/run/usage.json`、`{workDir}/.meta/run/timeline.json`、`{workDir}/.meta/run/stage-budget.json`。

事件必须实时追加，不能阶段结束后后补；时间戳必须使用真实执行时间。
