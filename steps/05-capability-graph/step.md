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
- [ ] [count]: 每次合并或拆分都留有对应记录（merge_trace 或 split_trace 非空）

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
两轮去重与依赖推断的通用做法见模块附录（capability-methods）；本任务按下列步骤执行：
提取 capability_web 雏形。
按名称+层级匹配候选合并。
读取关联 material 做语义比对。
记录 merge_trace 或 split_trace。
```
### 战略高地

```text
扇出计数、价值分级、依赖累积、拓扑排序的通用做法见模块附录（capability-methods）；本任务按下列步骤执行：
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
| 读取 | `steps/05-capability-graph/method.md` | 能力图谱提取方法论 |
| 读取 | `steps/05-capability-graph/schemas.md` | 能力图谱 格式契约 |
| 读取 | （见附录：模块 `capability-methods`） | 能力图谱通用形状（内容包正本） |
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
- 展示扇出度最高的前 3 个能力（供人看，不作过/不过依据）
- 一级高地数（价值评分达到 4.0 及以上的战略高地数量）
- 学习路径包含全部战略高地：价值高的排在前面；有前置依赖的能力不先于其前置出现（前置关系取自能力图谱的依赖声明）

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

## 模块附录

> 本节为执行用正本。

### 模块：`capability-methods`（capability-method-pack）

> 来源：模块 `capability-methods`

# 适用

候选项需要提炼为原子能力、计算扇出与战略价值、再排出学习或处理顺序时使用本方法。

候选项之间应当存在可比性——完全正交、无共享成分的候选项算不出扇出。


# 去重做法

1. **提原子项**：把候选项拆解为原子项。拆解口径由使用方声明（本方法不预设分层名）。
2. **两轮去重**：第一轮按名称＋层级匹配候选合并；第二轮读取内容做语义比对，描述一致则合并、不同则拆分，并记录合并／拆分痕迹。
3. **依赖推断**：按层级关系、内容前置引用、覆盖交集三路推断依赖；高置信度直接写入，中置信度附带依赖痕迹。
4. **扇出计数**：判据与检查清单见 《扇出价值清单》；统计每个原子项被多少候选项共享。
5. **产出**：按使用方声明的格式写出图谱与路径产物；格式归使用方，本方法只要求每项能指回它的来源候选项。


# 扇出价值清单

## 扇出（进价值前）

- 每个原子项统计它出现在多少候选项的能力集合中。
- 同一原子项在不同限定词变体中出现时只计一次。

## 价值（出分级前）

- 战略价值＝扇出 ×（1／耦合度）；耦合度标尺（由使用方声明）。
- 按分级阈值（由使用方声明）分为三档以上。
- 高地之间存在依赖时，被依赖者的实际价值叠加依赖者。


# 依赖排序与路径

## 排序

- 将高地按依赖关系拓扑排序，生成最优顺序：无依赖的先行，有依赖的随后。
- 同层中扇出度最高的优先。

## 路径输出

- 每步标注覆盖项、前置、学习内容、工具、验证方式（细目由使用方声明）。


# 边界

- 本方法不含实例词、限定词表、阈值、上限、扇出等级、输出模板、命名规范——这些属于使用方的业务内容。
- 去重形状、扇出形状、价值公式、排序形状是通用部分；实例怎么拆、阈值定多少属于业务判断，由使用方给出。
- 输出模板、内容比例、命名约定、四象限衔接、完整示例是相邻约定，不在本包。


<!-- module:capability-methods -->
