# 子 agent 调度

> **核心约束**：任务驱动分发——主线程描述任务意图，平台负责分发执行。子 agent 只负责执行单一任务并产出文件，不参与调度决策。**严禁使用 `sessions_yield`**（不稳定，易造成会话假死）。

---

## 全局参数

| 参数 | 值 | 说明 |
|------|---|------|
| 并发上限 W | 5 | 最大同时运行的 Task Group 数（平台可按自身能力调整） |
| 计数单位 | Task Group | 1 个命题 = 1 个 Task Group（Step 08 特殊：1 命题 = 2 agent） |

## 各步骤调度模式一览

| 步骤 | 模式 | Task Group 定义 | 并发策略 |
|------|------|----------------|---------|
| 01 头脑风暴·维度 Agent | 批量并行 | 1 个维度 = 1 个 agent | 全部同时启动 |
| 01 头脑风暴·收敛者 Agent | 串行 | 1 个收敛者 = 1 个 agent | 等待所有维度完成后启动 |
| 03 scan·Phase A | 滚动窗口 | 1 个命题批次 = 1 个 agent | 完成一个补一个，不超过 W |
| 03 scan·Phase B | 滚动窗口 | 1 个 URL 批次 = 1 个 agent | 完成一个补一个，不超过 W |
| 06 能力研究 | 拓扑分批 | 1 个子组 = 1 个 agent（≤5 能力） | 按依赖拓扑顺序分批，每批内并行不超过 W |
| 07 Briefing 组装 | 滚动窗口 | 1 个命题 = 1 个 agent | 完成一个补一个，不超过 W |
| 08 命题组装 | 滚动窗口 | 1 个命题 = 2 个 agent（md + exp） | 两者独立并行，1 命题占 2 个槽位 |
| 09 学习阶梯 | 滚动窗口 | 1 个命题 = 1 个 agent | 完成一个补一个，不超过 W |


## Label 命名规范

| 步骤 | Label 模式 | 示例 |
|------|-----------|------ |
| 01 维度 Agent | `brainstorm-{dimension}` | `brainstorm-scenario` |
| 01 收敛者 Agent | `brainstorm-integrator` | — |
| 03 scan·Phase A | `search-{batch_id}` | `search-B1` |
| 03 scan·Phase B | `extract-{batch_id}` | `extract-B1` |
| 06 能力研究 | `agent-{group_id}` | `agent-A_1`, `agent-B_1` |
| 07 Briefing | `briefing-{seq}-{short_name}` | `briefing-01-长列表渲染` |
| 08 命题组装·Markdown | `asm-md-{seq}-{short_name}` | `asm-md-01-长列表渲染` |
| 08 命题组装·Experiment | `asm-exp-{seq}-{short_name}` | `asm-exp-01-长列表渲染` |
| 09 学习阶梯 | `ladder-{seq}-{short_name}` | `ladder-01-长列表渲染` |

## 完成判定规则

子 agent 完成后，主线程必须验证产出文件存在：

```
completed = 所有 expected_files 存在于磁盘
failed    = 任一 expected_files 缺失
```

expected_files 由各步骤的 processes 文件定义（如 `capabilities/{id}-{name}.md` + `.meta/summaries/{id}-{name}.json`）。

## 即时文件校验（Proactive File Validation）

> **核心问题**：子 agent 报告「completed successfully」≠ 产出文件真实存在且合法。平台只看到进程正常退出 + 有输出，但可能输出是输入骨架的回显而非实际产出。

**触发时机**：每个子 agent 完成事件到达后，**立刻**执行以下校验，不等同批其他 agent 完成。

**校验三步**：

```
Step 1: 文件存在性检查
  → expected_file 是否存在于磁盘？
  → 不存在 → 标记 pending-retry，准备补发

Step 2: JSON 合法性检查（仅 JSON 产物）
  → json.load(file) 是否报错？
  → 报错 → 标记 pending-retry

Step 3: 关键字段匹配检查
  → 维度报告：必须含 dimension 字段 + entries 数组非空
  → 能力研究：必须含 capability_id 字段
  → 组装产物：必须含 overview 字段
  → 字段缺失 → 标记 pending-retry
```

**三步全过** → completed；**任一步失败** → pending-retry（立即补发，不等其他 agent）。

**补发规则**：
- 每个 agent 最多补发 1 次
- 补发使用与原始完全相同的 task
- 补发仍失败 → 标记 degraded，不阻塞后续流程
- 补发期间继续接受其他 agent 的完成事件

**与批量并行模式的关系**：
- 批量并行（01 维度 Agent）：所有 agent spawn 后，每收到一个完成事件就立刻校验，不等全部完成
- 滚动窗口（03070809）：同理，每完成一个立刻校验，校验通过才补位下一个
- 拓扑分批（06）：批内每完成一个立刻校验，批内全部 completed 后才进入下一批

---

## 调度模式一：批量并行（适用 01 维度 Agent）

**意图**：所有任务无依赖，一次性全部启动。

1. 组装所有任务的 task
2. **一次性**启动全部（不超过 W 个，超出则分两批）
3. 等待全部完成
4. 验证 expected_files，标记 completed/failed
5. 失败的任务重试一次；仍失败则标记 degraded，不阻塞后续

## 调度模式二：滚动窗口（适用 03070809）

**意图**：任务互相独立，完成一个补一个，保持并发数接近 W。

1. 待办队列 = 所有未完成任务（按序号排序）
2. 跳过：产出文件已存在的任务 → 直接标记 completed
3. 启动前 W 个任务
4. 循环：等待任一任务完成 → 验证文件 → 补位下一个待办任务
5. 全部完成后统计结果，进入下一步

**超时重试**：超时的任务重试一次。仍失败则标记 degraded，不阻塞其他任务。

**Step 08 特殊处理**：1 个命题 = 2 个 agent（Markdown + Experiment），两者独立可并行。
- 槽位计数：1 个命题占 2 个槽位
- 部分完成：Markdown failed 但 Experiment completed → 标记 partial，不影响另一个

## 调度模式三：拓扑分批（适用 06 能力研究）

**意图**：任务间有依赖关系，必须按拓扑顺序分批执行。

1. 读取 capability-graph 的依赖关系，计算拓扑批次：
   - batch_1 = 无依赖的子组
   - batch_2 = 依赖 batch_1 的子组
   - ...
2. 对每个批次：按滚动窗口模式执行（批次内并行不超过 W）
3. 一批全部 completed 后才进入下一批
4. 批内失败的任务重试一次；仍失败则标记 degraded

---

## task 组装规则

每个子 agent 的 task 由三部分拼接：

1. **角色声明**：一句话（如"你是「浏览器渲染管线」技术域的深度研究员"）
2. **执行指令**：从 processes 文件提取的具体步骤
3. **变量替换**：workDir、capability_id、命题名称等

约束：
- Step 06 的 task **全部内联**（能力信息在分组时已确定，不读外部文件）
- Step 070809 的 task **指定文件路径**（前置步骤产出量大，用 read 工具按需读取）
- 文件不存在时的降级动作必须在 task 中声明（08 标注"缺失"继续；0910 停止并报错）

## 大文件写入规则

子 agent 产出合并型 JSON（多源合并，预估 > 20KB）时，使用 write 工具写入。

---

## 平台适配说明

本 skill 的调度描述是**声明式**的——定义了"做什么"和"约束是什么"，不规定"怎么调用 API"。不同 agent 平台应自行将上述调度模式映射到自身能力：

| 调度意图 | 可能的平台实现 |
|---------|--------------|
| 启动子 agent | spawn / delegate_task / sub_agent.create / ... |
| 等待完成 | 轮询检查状态 / 同步阻塞等待 / 回调通知 / ... |
| 验证文件 | 文件系统 stat / read / find / ... |
| 超时处理 | kill + 重试 / 设置 timeout 参数 / 忽略（同步模型无超时概念） / ... |
| 并发控制 | 信号量 / 槽位计数 / 平台内置限制 / ... |

**同步 vs 异步**：
- **异步平台**（支持 spawn + poll）：按滚动窗口模式实现，可实现"完成一个补一个"
- **同步平台**（delegate_task 阻塞）：每批启动 W 个子 agent，同步等待全部完成后再启动下一批。退化为"批次并行"，但正确性不受影响

**降级原则**：如果平台不支持某种调度能力（如无法 kill 超时 agent），跳过该机制，标记 degraded 继续。调度策略的正确性不应依赖某个特定平台能力。
