# 学习阶梯

## 目标

为每个命题生成从不会到能讲的渐进学习路径

## 输入

- {workDir}/.meta/dependency-graph.json
- {workDir}/.meta/summaries/*.json
- {workDir}/{seq}-{short_name}/overview.md

## 输出

- {workDir}/{seq}-{short_name}/learning-ladder.md

## 校验清单

- [ ] [file-exists] {workDir}/{seq}-{short_name}/learning-ladder.md: 学习阶梯文件存在
- [ ] [count]: 阶段数 3-4
- [ ] [field] 做到才算过: 每步有二值验证标准

## 失败处理

| 触发 | 行为 | 处理 |
|------|------|------|
| 能力依赖图有环 | degrade | 打断循环依赖并标记 warning |
| 能力数量超过 8 | degrade | 合并相似能力减少阶段数 |

## 下一步

done

## 详细说明

提取命题能力子图。

按依赖拓扑分层：

- Layer 0：无依赖能力
- Layer 1：依赖 Layer 0
- Layer 2：依赖 Layer 0+1

归纳 3-4 个阶段，每阶段包含概念、技能、综合步骤。

## 步骤格式

每步包含：

- 要做什么
- 预计时长(分钟)
- 你会看到什么
- 这说明了什么
- 接下来去哪
- 做到才算过
- 完成标记

失败时给出明确回退指引。

## 判据校准

判据校准表（学习者的 target_level 见 {workDir}/.meta/brainstorm/anchors.json）：

- **L1**：概念级:能复述定义、指认关键部件,判据以「能指出/能说清」为主
- **L2**：方案级:能在指导下完成,判据以「能照做并对照检查表验证」为主
- **L3**：决策级:能独立选型并说明取舍,判据以「能对比方案并给出理由」为主
- **L4**：体系级:能设计体系并教他人,判据以「能从零设计并讲解」为主

为每条「做到才算过」选取与该水平相称的验证动作，禁止对低水平学习者使用高水平判据。

## 效果契约

本产物的效果契约 E-ladder-judgment：

- 每个阶梯 Step 有「做到才算过」二值验证标准
- 阶段数 3-4
- 失败时给出明确回退指引

## 任务模板

### 学习阶梯 Worker

```text
你是 {proposition_name} 的学习阶梯生成专家。
提取能力子图。
拓扑排序并归纳阶段。
每个阶段编排概念、技能、综合步骤，每步给出预计时长(分钟)。
判据按学习者水平校准：依据 anchors.json 的 target_level 参照判据校准表选取相称的验证动作。
每步「接下来去哪」指向可动手的资源：未通过时给更小的步或该能力 §最小验证实验，不得只指向 §核心机制。
每步写入完成标记，并将 {step_id, passed, stuck, date} 追加至 {workDir}/.meta/learning/progress.json。
写入 learning-ladder.md。
```


---

## 文件引用

| 类型 | 文件 | 说明 |
|------|------|------|
| 读取 | `{workDir}/.meta/dependency-graph.json` | 依赖图 |
| 读取 | `{workDir}/.meta/summaries/*.json` | 能力摘要 |
| 读取 | `{workDir}/{seq}-{short_name}/overview.md` | Overview |
| 读取 | `{workDir}/.meta/brainstorm/anchors.json` | 共享骨架 |
| 读取 | `{workDir}/.meta/requirement-web.json` | 需求网 |
| 读取 | `steps/10-learning-ladder/schemas.md` | 学习阶梯 格式契约 |
| 产出 | `{workDir}/{seq}-{short_name}/learning-ladder.md` | 学习阶梯 |

## 依赖

前置步骤：`assemble`

## 调度策略

▦ 滚动窗口：学习阶梯滚动窗口
  - 最大并发：5 
  - 数据来源：{workDir}/.meta/requirement-web.json#propositions

  Worker：
    - Task：`学习阶梯 Worker` [agent]
      超时：5 min
      Body：
```
为单个命题基于依赖图生成学习阶梯。
```



## 增量复用

| 检查项 | 条件 | 行为 |
|--------|------|------|
| 学习阶梯已存在 | `{workDir}/{seq}-{short_name}/learning-ladder.md` 存在 | 跳过该任务 |

## Barrier learning-ladder

**检查项：**
- 完成数
- 跳过数
- 失败数

**`clarify` 提示：**
> 请确认学习阶梯最终产物。

| 决策 | 行为 |
|------|------|
| 确认 | continue |
| 拒绝 | rollback |

## 运行记录

进入本步骤后的第一件事：

1. 用 date -u +%Y-%m-%dT%H:%M:%SZ 获取真实时间，追加 {workDir}/.meta/run/events.jsonl 的 step_start。
2. 创建 {workDir}/.meta/run/stages/learning-ladder/usage.json、timeline.json、stage-budget.json，写入当前真实时间。
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
{ "ts": "...", "run_id": "...", "step_id": "learning-ladder", "event": "event-type", "ref": "...", "detail": "...", "before_hash": "...", "after_hash": "..." }
```

每次 subagent spawn 后，向 {workDir}/.meta/run/subagent-window.jsonl 追加窗口记录，包含 batch_id、window_count、input_tokens_estimate、read_paths。

barrier 相关事件（barrier_confirmed / barrier_rejected）的 ref 必须使用 {workDir}/.meta/checkpoints/learning-ladder-barrier.md。

### 阶段 Telemetry

本步骤开始和完成时分别更新：

- `{workDir}/.meta/run/stages/learning-ladder/usage.json`：本阶段 token / cost / cacheRead 汇总
- `{workDir}/.meta/run/stages/learning-ladder/timeline.json`：本阶段 step_start / step_end / barrier / retry / timeout 事件时间线
- `{workDir}/.meta/run/stages/learning-ladder/stage-budget.json`：本阶段 wall time、子 agent 等待、重试次数、预算占用

完成本步骤时追加 step_end，并更新根级 `{workDir}/.meta/run/usage.json`、`{workDir}/.meta/run/timeline.json`、`{workDir}/.meta/run/stage-budget.json`。

事件必须实时追加，不能阶段结束后后补；时间戳必须使用真实执行时间。
