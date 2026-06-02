# 共享约定

> 上下文隔离规范从 Step 01 起适用；子 agent 调度从 Step ④ 起适用；其余规则按需查阅。

---

## 上下文隔离规范（Context Isolation）

> **每一步只加载当前步骤所需的文件，严禁预加载后续步骤。**

### 分步执行协议

```
前处理循环（Step 01 → 03）：
  1. 读 processes/{step}.md           ← 仅当前步骤定义
  2. 读该步骤"前置条件"中列出的文件   ← 仅该步需要的方法论/契约
  3. 执行 → 产出文件
  4. 进入下一步

后处理循环（Step 04 → 07）：
  同样遵循：读一步 → 执行一步 → 读下一步
```

### 读取规则引擎

**核心原则**：每步的具体读取需求由该步的 `processes/{step}-xxx.md` 中的"前置条件"部分声明，不在本文档中硬编码。

**执行逻辑**：
1. 读取 `processes/{step}-xxx.md` 的"前置条件"部分
2. 按照该部分列出的文件清单，逐个加载
3. 仅加载"前置条件"中明确指示的文件，不加载其他
4. 如果前置条件未指示某个文件，则禁止加载

**文件类型分类**：
- **🔵 meta 数据文件**（路径约定、信源分级、输出契约）：根据前置条件指示，按需加载对应 §N 节
- **🟢 core 方法论文件**（能力图谱、高地、评估矩阵）：仅在对应步骤的前置条件中加载
- **🟠 plugins 可选增强**：仅在对应步骤的前置条件中加载
- **🔴 processes 执行文件**：严格禁止跨步加载（Step N 不能加载 Step N+1 的文件）

**违规检查清单**：
- ❌ Step N 加载 Step N+1 或更后续的 processes 文件
- ❌ 初始化阶段加载 core/*.md（应在对应步骤的前置条件中加载）
- ❌ 一次性加载 `meta/output-contracts.md` 全文（应按 §N 节分段查阅）
- ❌ 子 agent 在 spawn 前预加载后续步骤的 processes 文件

**规则验证**：
每个 processes 文件的"前置条件"部分应遵循以下模板验证：
```
✅ 前置条件包含 meta/ 数据文件引用（如 sources.md、output-contracts.md§N）
✅ 前置条件包含必要的 core/*.md 方法论（如 capability-graph.md）
✅ 前置条件包含前序步骤的产出文件
✅ 不包含同层或后续步骤的 processes 文件引用
✅ 不包含未被该步骤使用的 core 或 plugins 文件
```

**示例**（如何在 processes 文件中声明）：
```markdown
## 前置条件

⛔ 加载：
- `core/capability-graph.md`（能力图谱方法论）
- `meta/output-contracts.md`§2（本步输出格式）
- `{workDir}/.meta/.raw-materials/index.json`（Step 01 产出索引）

> **🔒 上下文隔离**
> - ✅ 允许读取：`core/shared-conventions.md`、`core/capability-graph.md`、`meta/output-contracts.md`§2、`{workDir}/.meta/.raw-materials/index.json`（Step 01 产出）
> - ❌ 禁止读取：`processes/01.md`、`processes/03~07.md`、其他 `core/*.md`、`plugins/*.md`
> - 📌 `output-contracts.md` 只读 §2 节
```

**维护原则**：
- 如果修改了 Step N 的输入/输出或依赖，**仅更新** `processes/{step}-xxx.md` 的前置条件
- **不需要**同时修改本文档

### output-contracts.md 分节查阅

`meta/output-contracts.md` 包含全部步骤的输出示例（§0-§7），**不要一次性全文加载**。
每步执行时只查阅对应的 §N 节。如果文件较长，用 offset/limit 精确读取对应段落。

---

## 动态标准策略

> 根据 `target_level`（L1/L2/L3/L4）动态调整头脑风暴的骨架结构和各阶段行为参数。

### 策略表

| 参数 | L1（1-3年） | L2（3-5年） | L3（5-8年） | L4（8+年） |
|------|------------|------------|------------|------------|
| 核心标签 | 核心概念 | 方案攻克 | 决策训练 | 体系设计 |
| 基础标签 | — | 概念确认 | 能力盘点 | 能力盘点 |
| 展望标签 | 方案预览 | 决策方向 | 体系展望 | — |
| 核心占比 | 85-90% | 70-80% | 65-70% | 75-80% |
| 基础占比 | — | 10-15% | 15-20% | 20-25% |
| 展望占比 | 10-15% | 5-10% | 10-15% | — |
| 扫描密度（核心） | kw=2, r=5 | kw=2, r=8 | kw=3, r=10 | kw=3, r=10 |
| 扫描密度（基础） | — | kw=1, r=3 | kw=1, r=3 | kw=1, r=3 |
| 扫描密度（展望） | kw=1, r=2 | kw=1, r=2 | kw=1, r=3 | — |
| 能力研究（核心） | normal, 无实验 | normal | deep | deep |
| 能力研究（基础） | — | 摘要 | 摘要 | 摘要 |
| 能力研究（展望） | 跳过 | 名称+描述 | 摘要 | — |
| 组装（核心） | overview+edge+refs | 完整四象限 | 完整+架构分析 | 完整+治理分析 |
| 组装（基础） | — | overview+refs | overview+refs | overview+refs |
| 组装（展望） | overview only | overview+refs | overview+refs | — |
| 学习阶梯阶段 | 概念掌握→动手验证 | 基础确认→方案攻克→进阶展望 | 能力盘点→决策训练→体系认知 | 能力盘点→体系设计→治理实践 |

### level_weight 传导规则

`level_weight`（level + role）是贯穿管线的核心标记。

**level 与 role 的强制约束关系**：

| role | level 必须是 | 含义 |
|------|------------|------|
| `core` | = target_level | 概念本身属于目标层 |
| `premise` | = target_level - 1 | 概念本身低于目标层 |
| `outlook` | = target_level + 1 | 概念本身高于目标层 |

level 描述概念的客观归属层，role 描述概念相对于目标用户的主观定位。两者独立但存在上述约束。

以下步骤必须读取并按 role 调整行为：

| 步骤 | 如何使用 level_weight |
|------|----------------------|
| ⓪ 头脑风暴·维度 Agent | 源头打标：每个条目自标 level_weight |
| ⓪ 头脑风暴·收敛者 | 校验对齐：跨维度一致性检查，不一致时按优先级对齐 |
| ① scan | 密度分级：core 深扫、premise 浅扫、outlook 确认存在 |
| ② capability-graph | 预查找深度：core 双轨（T0+T1/T2）、premise 仅 T0、outlook 只记录名称 |
| ③ evaluate-pool | 评分范围：core 完整四维、premise/outlook 简化评分 |
| ④ capability-research | 研究深度：core 按 depth 参数、premise 摘要、outlook 名称+描述 |
| ⑥ assemble | 组装完整度：core 完整四象限、premise/outlook 仅 overview+refs |
| ⑦ learning-ladder | 阶段编排：premise→core→outlook 组织学习路径 |

### 收敛者（Integrator）

头脑风暴的收敛角色，替代原"裁判 Agent"。职责：

1. **校验**：读取 4 个维度 Agent 的输出，检查 level_weight 跨维度一致性
2. **对齐**：同一锚点在不同维度的 level_weight 不一致时，按优先级对齐（约束 > 技术 > 场景 > 学习）
3. **收束**：用 anchor_ref 编织跨维度关系图，建立场景↔能力映射
4. **去重**：同一维度内，两个条目引用相同锚点且描述重叠 → 合并；不同维度引用相同锚点 → 不合并，标注为"同一锚点的不同视角"
5. **补位**：检测 anchor_coverage 覆盖缺口，决定是否补充
6. **产出**：requirement-web.json（含 strategy 元数据 + level_weight 标注）

## 子 agent 调度

> **核心约束**：任务驱动分发——主线程描述任务意图，平台负责分发执行。子 agent 只负责执行单一任务并产出文件，不参与调度决策。**严禁使用 `sessions_yield`**（不稳定，易造成会话假死）。

### 全局参数

| 参数 | 值 | 说明 |
|------|---|------|
| 并发上限 W | 5 | 最大同时运行的 Task Group 数（平台可按自身能力调整） |
| 计数单位 | Task Group | 1 个命题 = 1 个 Task Group（Step ⑥ 特殊：1 命题 = 2 agent） |

### 各步骤调度模式一览

| 步骤 | 模式 | Task Group 定义 | 并发策略 |
|------|------|----------------|---------|
| ⓪ 头脑风暴·维度 Agent | 批量并行 | 1 个维度 = 1 个 agent | 全部同时启动 |
| ⓪ 头脑风暴·收敛者 Agent | 串行 | 1 个收敛者 = 1 个 agent | 等待所有维度完成后启动 |
| ① scan·Phase A | 滚动窗口 | 1 个命题批次 = 1 个 agent | 完成一个补一个，不超过 W |
| ① scan·Phase B | 滚动窗口 | 1 个 URL 批次 = 1 个 agent | 完成一个补一个，不超过 W |
| ④ 能力研究 | 拓扑分批 | 1 个子组 = 1 个 agent（≤5 能力） | 按依赖拓扑顺序分批，每批内并行不超过 W |
| ⑤ Briefing 组装 | 滚动窗口 | 1 个命题 = 1 个 agent | 完成一个补一个，不超过 W |
| ⑥ 命题组装 | 滚动窗口 | 1 个命题 = 2 个 agent（md + exp） | 两者独立并行，1 命题占 2 个槽位 |
| ⑦ 学习阶梯 | 滚动窗口 | 1 个命题 = 1 个 agent | 完成一个补一个，不超过 W |

### Label 命名规范

| 步骤 | Label 模式 | 示例 |
|------|-----------|------ |
| ⓪ 维度 Agent | `brainstorm-{dimension}` | `brainstorm-scenario` |
| ⓪ 收敛者 Agent | `brainstorm-integrator` | — |
| ① scan·Phase A | `search-{batch_id}` | `search-B1` |
| ① scan·Phase B | `extract-{batch_id}` | `extract-B1` |
| ④ 能力研究 | `agent-{group_id}` | `agent-A_1`, `agent-B_1` |
| ⑤ Briefing | `briefing-{seq}-{short_name}` | `briefing-01-长列表渲染` |
| ⑥ 命题组装·Markdown | `asm-md-{seq}-{short_name}` | `asm-md-01-长列表渲染` |
| ⑥ 命题组装·Experiment | `asm-exp-{seq}-{short_name}` | `asm-exp-01-长列表渲染` |
| ⑦ 学习阶梯 | `ladder-{seq}-{short_name}` | `ladder-01-长列表渲染` |

### 完成判定规则

子 agent 完成后，主线程必须验证产出文件存在：

```
completed = 所有 expected_files 存在于磁盘
failed    = 任一 expected_files 缺失
```

expected_files 由各步骤的 processes 文件定义（如 `capabilities/{id}-{name}.md` + `.meta/summaries/{id}-{name}.json`）。

### 调度模式一：批量并行（适用 ⓪ 维度 Agent）

**意图**：所有任务无依赖，一次性全部启动。

1. 组装所有任务的 task
2. **一次性**启动全部（不超过 W 个，超出则分两批）
3. 等待全部完成
4. 验证 expected_files，标记 completed/failed
5. 失败的任务重试一次；仍失败则标记 degraded，不阻塞后续

### 调度模式二：滚动窗口（适用 ①⑤⑥⑦）

**意图**：任务互相独立，完成一个补一个，保持并发数接近 W。

1. 待办队列 = 所有未完成任务（按序号排序）
2. 跳过：产出文件已存在的任务 → 直接标记 completed
3. 启动前 W 个任务
4. 循环：等待任一任务完成 → 验证文件 → 补位下一个待办任务
5. 全部完成后统计结果，进入下一步

**超时重试**：超时的任务重试一次。仍失败则标记 degraded，不阻塞其他任务。

**Step ⑥ 特殊处理**：1 个命题 = 2 个 agent（Markdown + Experiment），两者独立可并行。
- 槽位计数：1 个命题占 2 个槽位
- 部分完成：Markdown failed 但 Experiment completed → 标记 partial，不影响另一个

### 调度模式三：拓扑分批（适用 ④ 能力研究）

**意图**：任务间有依赖关系，必须按拓扑顺序分批执行。

1. 读取 capability-graph 的依赖关系，计算拓扑批次：
   - batch_1 = 无依赖的子组
   - batch_2 = 依赖 batch_1 的子组
   - ...
2. 对每个批次：按滚动窗口模式执行（批次内并行不超过 W）
3. 一批全部 completed 后才进入下一批
4. 批内失败的任务重试一次；仍失败则标记 degraded

### task 组装规则

每个子 agent 的 task 由三部分拼接：

1. **角色声明**：一句话（如"你是「浏览器渲染管线」技术域的深度研究员"）
2. **执行指令**：从 processes 文件提取的具体步骤
3. **变量替换**：workDir、capability_id、命题名称等

约束：
- Step ④ 的 task **全部内联**（能力信息在分组时已确定，不读外部文件）
- Step ⑤⑥⑦ 的 task **指定文件路径**（前置步骤产出量大，用 read 工具按需读取）
- 文件不存在时的降级动作必须在 task 中声明（⑧ 标注"缺失"继续；⑨⑩ 停止并报错）

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

---

## 检查点协议

🚨 每个检查点**强制停顿**，依次执行四步，**严禁跳过或自动推进**：

1. **展示摘要**：当前阶段的关键产物统计和质量指标
2. **写入检查点记录**：将产物摘要写入 `{workDir}/.meta/checkpoints/barrier-{N}.md`（此时决策字段留空）
3. **🛑 停住等待**：使用 `clarify` 工具向用户提问，**必须等待用户回复后才能继续**。不得在用户未回复时自动进入下一步
4. **收到确认后**：将用户决策补写到记录文件中，按用户指令进入下一步或回溯修改

### 检查点记录

每个检查点写一个独立文件，分两阶段写入：

初始写入（展示摘要后立即写入）：
```markdown
# barrier-{N}: {检查点名称}

- 时间：{ISO 时间戳}
- 产物：{关键统计}
- 决策：（待补）
```

用户确认后补写决策：
```markdown
- 决策：{用户回复原文}
```

### 检查点总览

| 编号 | 文件 | 位置 | 核心产物 | 介入价值 |
|------|------|------|---------|---------| 
| ⓩ | barrier-0.md | Step ⓪ 完成后 | requirement-web.json | 确认需求网、年限推断、命题拆分 |
| ⓧ | barrier-1.md | Step ① 完成后 | partition-analysis.json + execution-plan.md | 确认分区方案、执行计划 |
| ⓐ | barrier-2.md | Step ③ 完成后 | capability-graph.json | 确认能力图谱质量 |
| ⓑ | barrier-3.md | Step ④ 完成后（后处理启动前） | evaluations.json + 执行计划 | 确认命题优先级、范围、调整参数 |
| ⓒ | barrier-4.md | Step ⑤ 完成后 | capability 文件 + summary | 审查研究质量 |
| ⓓ | barrier-5.md | Step ⑥ 完成后 | briefing 文件 | 审查素材提取完整性 |
| ⓕ | barrier-6.md | Step ⑦ 完成后 | 命题目录文件 | 审查组装质量 |
| ⓖ | barrier-7.md | Step ⑧ 完成后 | learning-ladder.md | 确认最终产出 |

### 跳过条件

- `--batch=pending` 模式：自动跳过所有检查点
- 用户输入"全部确认"：跳过后续所有检查点

---

## 增量复用

基于文件存在性判断，不需要状态文件：

| 检查项 | 条件 | 行为 |
|--------|------|------|
| 能力主文件已存在 | `capabilities/{id}-{name}.md` 存在 | 跳过该能力研究 |
| 能力摘要已存在 | `.meta/summaries/{id}-{name}.json` 存在 | 跳过该能力摘要生成 |
| Briefing 已存在 | `.meta/briefings/{seq}-{short_name}.md` 存在 | 跳过该 Briefing |
| 命题文件已存在 | `{seq}-{short_name}/overview.md` 存在 | 跳过该命题组装 |
| 学习阶梯已存在 | `{seq}-{short_name}/learning-ladder.md` 存在 | 跳过该阶梯生成 |

---

## 决策凭据规范（_trace 字段）

管线中的关键决策（影响后续产出、可能导致内容丢失的决策）必须保留原始决策凭据。

### 规则

1. **命名**：在决策字段旁添加同名 `_trace` 后缀字段
2. **内容**：记录做出该决策时的原始依据（不是事后总结），包含：
   - 输入数据是什么
   - 判定标准是什么
   - 为什么选了这个值而不是其他值
3. **粒度**：只给关键决策字段加 `_trace`，客观事实字段和可重算字段不加
4. **不影响消费方**：`_trace` 字段是可选的，下游步骤不依赖它

### 需要加 _trace 的字段清单

| 步骤 | 字段 | trace 内容 |
|------|------|-----------|
| ⓪ brainstorm | `year_inference_trace` | 年限推断依据（显式匹配/隐式信号/默认值） |
| ① scan | `source_tier` | unknown 域名的评估依据（哪几个维度达标/不达标） |
| ① scan | `fetch_status: "failed"` | 失败原因（超时/403/内容不相关） |
| ① scan | 被丢弃的素材 | 丢弃原因（不达标/重复/无关），记录在 `discarded` 字段 |
| ② capability-graph | `dependencies_trace` | 为什么 A 依赖 B |
| ② capability-graph | `merge_trace` | 为什么合并为一个（多个命题的相似能力合并） |
| ② capability-graph | `split_trace` | 为什么拆分为多个（一个粗粒度能力拆分为细粒度能力） |
| ③ evaluate | `priority_trace` | 总分与阈值的对比判定过程 |
| ⑥ assemble | `筛选_trace` | 候选来源、排除原因、保留理由 |

---

## 内容比例约束（命题组装通用）

- 通用高地内容（框架无关）≥ 70%
- 特化内容（框架相关）≤ 30%
- 开篇（10-15%）从限定词切入建立共鸣
- 主体（70-80%）讲通用原理
- 收尾（10-15%）回到限定词给落地方案
