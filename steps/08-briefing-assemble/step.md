# Briefing 组装

## 目标

为每个命题生成包含能力摘要的 Briefing

## 输入

- {workDir}/.meta/requirement-web.json
- {workDir}/.meta/summaries/*.json

## 输出

- {workDir}/.meta/briefings/{seq}-{short_name}.md

## 校验清单

- [ ] [file-exists] {workDir}/.meta/briefings/{seq}-{short_name}.md: Briefing 文件存在
- [ ] [field] 缺失能力标注: 缺失能力已标注
- [ ] [count]: 场景化 Trace >= 3/3/3

## 失败处理

| 触发 | 行为 | 处理 |
|------|------|------|
| 能力摘要缺失 | degrade | 标注缺失并继续处理其余能力 |
| 命题列表为空 | halt | 停止并提示先完成 Step 02 |

## 下一步

assemble

## 详细说明

每个命题读取涉及能力摘要。

提取：

- mechanism_summary
- bottlenecks
- tradeoffs
- experiment_code
- references

缺失能力摘要时标注缺失并继续处理其余能力。

## 内容比例

开篇 10-15%：从限定词痛点切入。
主体 <= 70%：通用工程原理。
场景化/特化 >= 30%：限定词、上下文、边界、验证点。
收尾 10-15%：回到限定词给落地方案。

每个 Briefing 必须包含场景化 Trace，至少 3 个场景输入、3 个边界、3 个验证点。

## 效果契约

本产物的效果契约 E-briefing-trace：

- 场景化 Trace >= 3/3/3
- 缺失能力摘要时标注缺失并继续

## 任务模板

### Briefing Worker

```text
你是 {proposition_name} 的 Briefing 组装专家。
读取涉及能力摘要。
提取机制、瓶颈、权衡、实验和参考。
按内容比例组装 Briefing。
写入场景化 Trace，至少 3/3/3。
写入 {workDir}/.meta/briefings/{seq}-{short_name}.md。
```


---

## 文件引用

| 类型 | 文件 | 说明 |
|------|------|------|
| 读取 | `{workDir}/.meta/requirement-web.json` | 需求网 |
| 读取 | `{workDir}/.meta/summaries/*.json` | 能力摘要 |
| 读取 | `steps/08-briefing-assemble/schemas.md` | 命题 Briefing 格式契约 |
| 产出 | `{workDir}/.meta/briefings/{seq}-{short_name}.md` | 命题 Briefing |

## 依赖

前置步骤：`capability-research`

## 调度策略

▦ 滚动窗口：Briefing 组装滚动窗口
  - 最大并发：5 
  - 数据来源：{workDir}/.meta/requirement-web.json#propositions

  Worker：
    - Task：`Briefing Worker` [agent]
      超时：5 min
      Body：
```
为单个命题读取能力摘要并组装 Briefing。
```



## 增量复用

| 检查项 | 条件 | 行为 |
|--------|------|------|
| Briefing 已存在 | `{workDir}/.meta/briefings/{seq}-{short_name}.md` 存在 | 跳过该任务 |

## Barrier briefing-assemble

**检查项：**
- 完成数
- 跳过数
- 失败数

**`clarify` 提示：**
> 请确认 Briefing 素材完整性。

| 决策 | 行为 |
|------|------|
| 确认 | continue |
| 拒绝 | rollback |

## 运行记录

进入本步骤后的第一件事：

1. 用 date -u +%Y-%m-%dT%H:%M:%SZ 获取真实时间，追加 {workDir}/.meta/run/events.jsonl 的 step_start。
2. 创建 {workDir}/.meta/run/stages/briefing-assemble/usage.json、timeline.json、stage-budget.json，写入当前真实时间。
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
{ "ts": "...", "run_id": "...", "step_id": "briefing-assemble", "event": "event-type", "ref": "...", "detail": "...", "before_hash": "...", "after_hash": "..." }
```

每次 subagent spawn 后，向 {workDir}/.meta/run/subagent-window.jsonl 追加窗口记录，包含 batch_id、window_count、input_tokens_estimate、read_paths。

barrier 相关事件（barrier_confirmed / barrier_rejected）的 ref 必须使用 {workDir}/.meta/checkpoints/briefing-assemble-barrier.md。

### 阶段 Telemetry

本步骤开始和完成时分别更新：

- `{workDir}/.meta/run/stages/briefing-assemble/usage.json`：本阶段 token / cost / cacheRead 汇总
- `{workDir}/.meta/run/stages/briefing-assemble/timeline.json`：本阶段 step_start / step_end / barrier / retry / timeout 事件时间线
- `{workDir}/.meta/run/stages/briefing-assemble/stage-budget.json`：本阶段 wall time、子 agent 等待、重试次数、预算占用

完成本步骤时追加 step_end，并更新根级 `{workDir}/.meta/run/usage.json`、`{workDir}/.meta/run/timeline.json`、`{workDir}/.meta/run/stage-budget.json`。

事件必须实时追加，不能阶段结束后后补；时间戳必须使用真实执行时间。
