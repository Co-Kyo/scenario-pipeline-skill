# 意图锚定

## 目标

生成 8-15 个锚点并注入策略元数据

## 输入

- raw_input

## 执行动作

1. 轻量提取
2. 年限推断
3. 跳过判断
4. 生成骨架

## 输出

- {workDir}/.meta/brainstorm/anchors.json

## 校验清单

- [ ] [count]: 锚点数量为 8-15 个
- [ ] [field] provisional_level: 每个锚点包含 provisional_level
- [ ] [field] provisional_role: 每个锚点包含 provisional_role

## 失败处理

| 触发 | 行为 | 处理 |
|------|------|------|
| 年限推断置信度低 | checkpoint | 默认 L2，并在初始化 Barrier 请用户确认 |
| 锚点不足 8 个 | halt | 提示用户补充信息或降低核心锚点门槛 |

## 下一步

brainstorm

## 详细说明

年限推断优先级：

1. 显式参数 --year
2. 显式数字，例如 3-5 年
3. 隐式信号，例如 高级、架构师、面试准备
4. 无信号默认 L2

锚点生成要求：

- 数量 8-15 个
- 每个锚点包含 id、name、provisional_level、provisional_role、reasoning、description、type、tags
- role 与 level 强制约束：core=target_level、premise=target_level-1、outlook=target_level+1

## 跳过判断

跳过头脑风暴需要同时满足：

- topic 明确，tech_stack 都是具体工具/框架名
- 年限推断置信度高
- 无场景化拦截词，例如 面试、场景、分析、复杂、考察、问、中大型、多团队

否则进入 Step 02。

## 任务模板

### 锚点生成

```text
提取 8-15 个核心技术关键词。
为每个关键词标注 provisional_level 和 provisional_role。
从 strategy-level 注入 core_label、premise_label、outlook_label 和 ratios。
写入 anchors.json。
```


---

## 契约引用

- `references/strategy-level.md`：密度参数查表

## 文件引用

| 类型 | 文件 | 说明 |
|------|------|------|
| 读取 | `steps/01-intent-anchor/schemas.md` | 共享骨架 格式契约 |
| 读取 | `steps/01-intent-anchor/year-rules.md` | 年限推断规则 |
| 读取 | `steps/01-intent-anchor/skip-rules.md` | 跳过判断规则 |
| 产出 | `{workDir}/.meta/brainstorm/anchors.json` | 共享骨架 |

## 依赖

前置步骤：`initialize`

## 调度策略

▸ 顺序执行：意图锚定（4 步）

  第 1 步：
    - Task：`轻量提取` [agent]
      Body：
```
提取 topic、tech_stack 和显式年限参数。
```

  第 2 步：
    - Task：`年限推断` [agent]
      Body：
```
按优先级链推断 target_level 并记录 year_inference_trace。
```

  第 3 步：
    - Task：`跳过判断` [agent]
      Body：
```
判断是否跳过头脑风暴。
```

  第 4 步：
    - Task：`生成骨架` [agent]
      Body：
```
生成锚点并注入 strategy 元数据。
```



## Barrier intent-anchor

**检查项：**
- 锚点数量
- 年限推断依据
- 跳过判断结果

**`clarify` 提示：**
> 请确认意图锚定结果、年限推断和跳过判断。

| 决策 | 行为 |
|------|------|
| 确认 | continue |
| 拒绝 | rollback |

## 运行记录

进入本步骤后的第一件事：

1. 用 date -u +%Y-%m-%dT%H:%M:%SZ 获取真实时间，追加 {workDir}/.meta/run/events.jsonl 的 step_start。
2. 创建 {workDir}/.meta/run/stages/intent-anchor/usage.json、timeline.json、stage-budget.json，写入当前真实时间。
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
{ "ts": "...", "run_id": "...", "step_id": "intent-anchor", "event": "event-type", "ref": "...", "detail": "...", "before_hash": "...", "after_hash": "..." }
```

每次 subagent spawn 后，向 {workDir}/.meta/run/subagent-window.jsonl 追加窗口记录，包含 batch_id、window_count、input_tokens_estimate、read_paths。

barrier 相关事件（barrier_confirmed / barrier_rejected）的 ref 必须使用 {workDir}/.meta/checkpoints/intent-anchor-barrier.md。

### 阶段 Telemetry

本步骤开始和完成时分别更新：

- `{workDir}/.meta/run/stages/intent-anchor/usage.json`：本阶段 token / cost / cacheRead 汇总
- `{workDir}/.meta/run/stages/intent-anchor/timeline.json`：本阶段 step_start / step_end / barrier / retry / timeout 事件时间线
- `{workDir}/.meta/run/stages/intent-anchor/stage-budget.json`：本阶段 wall time、子 agent 等待、重试次数、预算占用

完成本步骤时追加 step_end，并更新根级 `{workDir}/.meta/run/usage.json`、`{workDir}/.meta/run/timeline.json`、`{workDir}/.meta/run/stage-budget.json`。

事件必须实时追加，不能阶段结束后后补；时间戳必须使用真实执行时间。
