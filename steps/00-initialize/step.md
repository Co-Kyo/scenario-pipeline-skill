# 初始化

## 目标

确认 workDir 并建立可追溯的初始化记录

## 输入

- raw_input

## 执行动作

1. 解析输出目录
2. 确认 workDir
3. 写入初始化记录
4. 写入运行信封

## 输出

- {workDir}/.meta/init.json
- {workDir}/.meta/run/run.json

## 校验清单

- [ ] [file-exists] {workDir}/.meta/init.json: 初始化记录存在
- [ ] [json-parse] {workDir}/.meta/init.json: 初始化记录可解析
- [ ] [field] workDir: 初始化记录包含 workDir
- [ ] [field] confirmed: 初始化记录包含确认状态
- [ ] [file-exists] {workDir}/.meta/run/run.json: 运行信封存在
- [ ] [json-parse] {workDir}/.meta/run/run.json: 运行信封可解析

## 失败处理

| 触发 | 行为 | 处理 |
|------|------|------|
| 用户未确认 workDir | halt | 停止并等待用户修正输出目录 |

## 下一步

intent-anchor

## 详细说明

初始化只负责对齐 workDir 和共享文档：

1. 用户未指定目录时，默认使用 {当前日期}-{场景简称}。
2. 向用户展示目录，等待确认；用户可修正。
3. 确认后写入 {workDir}/.meta/init.json。
4. 创建 {workDir}/.meta/run/run.json，作为本次运行的 run envelope。
5. 后续步骤按需加载 references/ 共享文档，不再重复确认 workDir。


---

## 契约引用

- `references/protocol-checkpoint.md`：检查点五步流程与跳过条件

## 文件引用

| 类型 | 文件 | 说明 |
|------|------|------|
| 产出 | `{workDir}/.meta/init.json` | 初始化记录 |
| 产出 | `{workDir}/.meta/run/run.json` | 运行信封 |

## 依赖

前置步骤：无

## 调度策略

▸ 顺序执行：初始化（4 步）

  第 1 步：
    - Task：`解析输出目录` [agent]
      Body：
```
解析用户指定目录或默认 {当前日期}-{场景简称}，确认目录可用。
```

  第 2 步：
    - Task：`确认 workDir` [agent]
      Body：
```
向用户展示输出目录并等待确认；用户可修正路径。
```

  第 3 步：
    - Task：`写入初始化记录` [agent]
      Body：
```
写入 workDir、确认状态和共享文档加载结果。
```

  第 4 步：
    - Task：`写入运行信封` [agent]
      Body：
```
创建 {workDir}/.meta/run/run.json，记录 run_id、started_at、workdir、输入摘要和 scenario-pipeline 版本（VERSION_LINEAGE.json 的发布 tag）。
```



## Barrier initialize

**检查项：**
- workDir 已确认
- init.json 已写入
- run.json 已创建
- 共享文档可加载

**`clarify` 提示：**
> 请确认 workDir 与初始化规则。

| 决策 | 行为 |
|------|------|
| 确认 | continue |
| 拒绝 | rollback |

## 运行记录

进入本步骤后的第一件事：

1. 用 date -u +%Y-%m-%dT%H:%M:%SZ 获取真实时间，追加 {workDir}/.meta/run/events.jsonl 的 step_start。
2. 创建 {workDir}/.meta/run/stages/initialize/usage.json、timeline.json、stage-budget.json，写入当前真实时间。
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
{ "ts": "...", "run_id": "...", "step_id": "initialize", "event": "event-type", "ref": "...", "detail": "...", "before_hash": "...", "after_hash": "..." }
```

每次 subagent spawn 后，向 {workDir}/.meta/run/subagent-window.jsonl 追加窗口记录，包含 batch_id、window_count、input_tokens_estimate、read_paths。

barrier 相关事件（barrier_confirmed / barrier_rejected）的 ref 必须使用 {workDir}/.meta/checkpoints/initialize-barrier.md。

### 阶段 Telemetry

本步骤开始和完成时分别更新：

- `{workDir}/.meta/run/stages/initialize/usage.json`：本阶段 token / cost / cacheRead 汇总
- `{workDir}/.meta/run/stages/initialize/timeline.json`：本阶段 step_start / step_end / barrier / retry / timeout 事件时间线
- `{workDir}/.meta/run/stages/initialize/stage-budget.json`：本阶段 wall time、子 agent 等待、重试次数、预算占用

完成本步骤时追加 step_end，并更新根级 `{workDir}/.meta/run/usage.json`、`{workDir}/.meta/run/timeline.json`、`{workDir}/.meta/run/stage-budget.json`。

事件必须实时追加，不能阶段结束后后补；时间戳必须使用真实执行时间。
