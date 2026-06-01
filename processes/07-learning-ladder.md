# Step ⑦: 学习阶梯

## 目的

为每个已组装的命题生成学习阶梯——从"不会"到"能讲"的渐进式引导路径。后处理阶段三。

## 前置条件

无需加载额外方法论文件。本步骤的 task 已内联全部指令。读取：
- `meta/output-contracts.md`§7（本步输出格式）
- `{workDir}/.meta/capability-graph.json`（含能力依赖关系）
- `{workDir}/.meta/summaries/*.json`（Step ④ 产出）
- `{workDir}/{seq}-{short_name}/overview.md`（Step ⑥ 产出）

> **🔒 上下文隔离**
> - ✅ 允许读取：`core/shared-conventions.md`、`meta/output-contracts.md`§7、`{workDir}/.meta/capability-graph.json`（含能力依赖关系）、`{workDir}/.meta/summaries/*.json`（Step ④ 产出）、`{workDir}/{seq}-{short_name}/overview.md`（Step ⑥ 产出）
> - ❌ 禁止读取：`processes/01~06.md`、`core/*.md`、`plugins/*.md`、`.meta/briefings/*.md`（已由 Step ⑥ 消费，无需重复读取）
> - 📌 `output-contracts.md` 只读 §7 节

## 输入

- `capability-graph.json`（前处理产出，含能力依赖关系）
- `.meta/summaries/*.json`（Step ④ 产出）
- `{seq}-{short_name}/overview.md` 等（Step ⑥ 产出的命题文件）

## 执行步骤

### 1. 筛选待生成命题

已有 `learning-ladder.md` 的命题跳过。

### 2. 并行 spawn（简单窗口 + 轮询跟踪）

> ⚠️ 严格遵循 `core/shared-conventions.md` §简单窗口执行流程 + §并行调度规则。
> 调度规则详见 `core/shared-conventions.md` §子 agent 调度。

#### 2.1 初始化

从待办队列取前 W=5 个命题，逐个 spawn。label：`ladder-{seq}-{short_name}`。

**预期产出**：`{workDir}/{seq}-{short_name}/learning-ladder.md`

#### 2.2 轮询循环 + 槽位替换

按 `core/shared-conventions.md` §**模式 A：简单窗口** 执行轮询循环。本步骤特有参数：

| 参数 | 值 |
|------|---|
| W | 5 |
| 超时 | 5 分钟 |
| 槽位替换 | ✅ 简单窗口：agent 完成 → 释放槽位 → 从待办队列取下一个 spawn |
| label | `ladder-{seq}-{short_name}` |
| expected_files | 每个 agent：`{seq}-{short_name}/learning-ladder.md` |

#### 2.3 超时与重试

单 Agent 超过 5 分钟 → kill → 重试一次 → 仍失败则跳过该命题，标记 degraded

#### 2.4 特殊异常

- 能力依赖图有环 → 打断循环依赖，标记 warning（不 kill agent，让 agent 自行处理）
- 所有命题均完成或 degraded → 进入 ⓖ 检查点

**task 模板**：

```
你是「{proposition_name}」的学习阶梯生成专家。

⚠️ 你必须用 write 工具将文件写入磁盘，不要只输出到对话中。

## 任务
为命题「{proposition_name}」生成学习阶梯文档。

## 命题信息
- ID: {proposition_id}
- 名称: {proposition_name}

## 涉及能力
{capability_ids}

## 能力依赖关系
{dependency_edges}

## 能力详情
用 read 工具读取以下文件：
- {workDir}/.meta/summaries/{id}-{name}.json（每个涉及能力各一份）
- {workDir}/{seq}-{short_name}/overview.md（Step ⑥ 产出）

如果某个摘要文件不存在，跳过该能力并在学习阶梯中标注"⚠️ 该能力详情缺失"。
如果 overview.md 不存在，停止执行并输出：`❌ 命题「{proposition_name}」的 overview.md 不存在，无法生成学习阶梯。请先完成 Step ⑥。`

## 输出路径
{workDir}/{seq}-{short_name}/learning-ladder.md

## 执行步骤

### Step 1: 提取能力子图
从上述能力依赖关系中，构建该命题的能力依赖图。

### Step 2: 拓扑排序
- Layer 0: 无依赖的叶子节点（基础能力）
- Layer 1: 依赖 Layer 0 的能力
- Layer 2: 依赖 Layer 0+1 的能力

### Step 3: 归纳阶段
合并相邻层（紧密关联的 1-2 个能力可合并）。
每个阶段 = 一个"你能做到什么"的里程碑。
通常 3-4 个阶段。

### Step 4: 编排步骤
每个阶段内：
- [概念] 读什么 → 建立心智模型
- [技能] 做什么 → 形成操作能力
- [综合] 想什么 → 建立判断力

每步结构：
- 要做什么（具体动作）
- 你会看到什么（预期结果，降低认知门槛）
- 这说明了什么（观察→知识连接）
- 接下来去哪（指向产出文件的精确路径）
- 做到才算过（二值验证标准）

### Step 5: 保存文件
写入 {workDir}/{seq}-{short_name}/learning-ladder.md

## 验证清单
- [ ] 包含 3-4 个阶段
- [ ] 每个阶段有明确的里程碑
- [ ] 每步有"做到才算过"的验证标准
- [ ] 引用路径指向实际产出文件
- [ ] 失败时有明确的回退指引

## 完成后
输出：`学习阶梯「{proposition_name}」完成：已写入 {workDir}/{seq}-{short_name}/learning-ladder.md（N 个阶段）`
```

### 3. 等待全部完成

所有学习阶梯 agent 完成后：

🚨 **🛑 必须停顿，进入 ⓖ 检查点**。展示学习阶梯摘要（完成数/跳过数/失败数），使用 `clarify` 等待用户确认。

## 输出

- `{workDir}/{seq}-{short_name}/learning-ladder.md` × M
- 可选：`{workDir}/learning-ladder.md`（全局学习阶梯，跨命题的渐进式引导）

## 校验清单

- [ ] 每个已组装的命题有对应的学习阶梯
- [ ] 阶段数 3-4 个
- [ ] 每步有二值验证标准（做到/做不到）
- [ ] 引用路径指向实际产出文件
- [ ] 失败回退指引明确

## 异常处理

| 场景 | 处理 |
|------|------|
| 能力依赖图有环 | 打断循环依赖，标记 warning |
| 能力数量过多（>8） | 合并相似能力，减少阶段数 |
| 阶段数超过 5 个 | 合并相邻阶段 |
