# 能力研究

## 目标

生成能力知识库主文件、结构化摘要和索引

## 输入

- {workDir}/.meta/capability-graph.json
- {workDir}/README.md
- {workDir}/.meta/.raw-materials/index.json

## 输出

- {workDir}/.meta/research-plan.json
- {workDir}/capabilities/*.md
- {workDir}/.meta/summaries/*.json
- {workDir}/capabilities/README.md

## 校验清单

- [ ] [file-exists] {workDir}/.meta/research-plan.json: 研究素材分配计划存在
- [ ] [json-parse] {workDir}/.meta/research-plan.json: 研究素材分配计划可解析
- [ ] [field] coverage: 研究计划包含素材覆盖率
- [ ] [field] material_usage: 每个能力摘要包含 material_usage
- [ ] [file-exists] {workDir}/capabilities/{id}-{name}.md: 能力主文件存在
- [ ] [json-parse] {workDir}/.meta/summaries/{id}-{name}.json: 能力摘要可解析
- [ ] [count]: 分组能力数不超过 5

## 失败处理

| 触发 | 行为 | 处理 |
|------|------|------|
| 子组 Agent 超时 | retry | 拆分为更小子组重试 |
| 全部失败 | degrade | 降级为逐个 spawn 重试 |

## 下一步

briefing-assemble

## 详细说明

分组规则：

开始前必须先读取 {workDir}/.meta/.raw-materials/index.json，生成 {workDir}/.meta/research-plan.json。

1. 按技术层初步分组。
2. 有直接依赖的能力尽量同组。
3. 每组上限 5 个能力，不足 2 个可与相邻组合并。
4. M 系列特化能力归入其依赖的通用能力组。

依赖编排：

1. 无跨组依赖的组第一批并行。
2. 有跨组依赖的组等待依赖组完成。
3. 同一批内并行，W=本 skill 并发上限 5。

## 域 Agent 任务

每个域 Agent 读取能力描述、扇出度、标签和参考 URL。

按依赖顺序执行：

- 无依赖能力直接产出
- 有依赖能力先读取前置摘要再产出

每个能力写入：

- {workDir}/.meta/research-plan.json
- {workDir}/capabilities/{id}-{name}.md
- {workDir}/.meta/summaries/{id}-{name}.json

## 素材分配与 usage trace

生成 research-plan.json 时必须满足：

1. 从 index.json 读取全部 fetch_status=ok 素材。
2. 按能力描述、covers、layer 和 reference 关联分配素材。
3. 每个素材的 usage 只能是 primary / supporting / optional：
   - primary：该能力独有的核心证据
   - supporting：补充机制、工具或权衡
   - optional：可复用但不是本能力必要证据
4. 每个 ok 素材必须至少出现在一个能力的 materials 中，不能静默丢弃。
5. 无法按能力边界分配的素材标记 usage=optional，并写 selection_reason。
6. 输出 coverage：ok_total、assigned_unique、optional_count、assigned_pct。

域 Agent 必须读取自己能力的 research-plan 子集，并在摘要中写 material_usage。

## 效果契约

本产物的效果契约 E-capability-coverage：

- 每个 fetch_status=ok 素材至少分配到一个能力,不能静默丢弃
- 每个摘要包含 material_usage(逐条 material_id/file_path/usage/selection_reason)
- 分组上限 5 个能力

## 任务模板

### 域 Agent 任务

```text
你是 {domain_name} 技术域的深度研究员。
研究以下原子能力，按依赖顺序执行。
先读取 {workDir}/.meta/research-plan.json 中分配给本能力的 materials 子集。
每个能力产出主文件和结构化摘要。
每个摘要必须包含 material_usage，逐条记录 material_id、file_path、usage、selection_reason。
T0 优先，缺失时按 T1/T2/T3 补充。
禁止凭记忆生成，必须 web_fetch 验证内容。
```
### 能力主文件模板

```text
# {capability_name}
> {description}

## 核心机制
## 工程瓶颈
## 调试工具
## 典型权衡
## 最小验证实验
## 参考资料
```


---

## 契约引用

- `references/ref-sources.md`：T0 域名表 + 反爬域名表 + 信源分级规则

## 文件引用

| 类型 | 文件 | 说明 |
|------|------|------|
| 读取 | `{workDir}/.meta/capability-graph.json` | 能力图谱 |
| 读取 | `{workDir}/README.md` | 命题总览 |
| 读取 | `{workDir}/.meta/.raw-materials/index.json` | 素材索引 |
| 读取 | `steps/07-capability-research/schemas.md` | 能力研究素材分配与 usage trace 格式契约 |
| 产出 | `{workDir}/.meta/research-plan.json` | 能力研究素材分配与 usage trace |
| 产出 | `{workDir}/capabilities/*.md` | 能力主文件（跨命题长期资产） |
| 产出 | `{workDir}/.meta/summaries/*.json` | 能力摘要 |
| 产出 | `{workDir}/capabilities/README.md` | 能力索引 |

## 依赖

前置步骤：`evaluate-pool`

## 调度策略

▦ 滚动窗口：能力研究滚动窗口
  - 最大并发：5 
  - 数据来源：{workDir}/.meta/capability-graph.json#capabilities

  Worker：
    - Task：`能力研究 Worker` [agent]
      超时：15 min
      Body：
```
研究一个原子能力，写入能力主文件和结构化摘要。
```



## 增量复用

| 检查项 | 条件 | 行为 |
|--------|------|------|
| 能力主文件已存在 | `{workDir}/capabilities/{id}-{name}.md` 存在 | 跳过该任务 |
| 能力摘要已存在 | `{workDir}/.meta/summaries/{id}-{name}.json` 存在 | 跳过该任务 |

## Barrier capability-research

**检查项：**
- 完成数
- 跳过数
- 失败数
- 素材覆盖率

**`clarify` 提示：**
> 请确认能力研究质量。

| 决策 | 行为 |
|------|------|
| 确认 | continue |
| 拒绝 | rollback |

## 插件加载

- `capability-research-mode`

## 运行记录

进入本步骤后的第一件事：

1. 用 date -u +%Y-%m-%dT%H:%M:%SZ 获取真实时间，追加 {workDir}/.meta/run/events.jsonl 的 step_start。
2. 创建 {workDir}/.meta/run/stages/capability-research/usage.json、timeline.json、stage-budget.json，写入当前真实时间。
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
{ "ts": "...", "run_id": "...", "step_id": "capability-research", "event": "event-type", "ref": "...", "detail": "...", "before_hash": "...", "after_hash": "..." }
```

每次 subagent spawn 后，向 {workDir}/.meta/run/subagent-window.jsonl 追加窗口记录，包含 batch_id、window_count、input_tokens_estimate、read_paths。

barrier 相关事件（barrier_confirmed / barrier_rejected）的 ref 必须使用 {workDir}/.meta/checkpoints/capability-research-barrier.md。

### 阶段 Telemetry

本步骤开始和完成时分别更新：

- `{workDir}/.meta/run/stages/capability-research/usage.json`：本阶段 token / cost / cacheRead 汇总
- `{workDir}/.meta/run/stages/capability-research/timeline.json`：本阶段 step_start / step_end / barrier / retry / timeout 事件时间线
- `{workDir}/.meta/run/stages/capability-research/stage-budget.json`：本阶段 wall time、子 agent 等待、重试次数、预算占用

完成本步骤时追加 step_end，并更新根级 `{workDir}/.meta/run/usage.json`、`{workDir}/.meta/run/timeline.json`、`{workDir}/.meta/run/stage-budget.json`。

事件必须实时追加，不能阶段结束后后补；时间戳必须使用真实执行时间。
