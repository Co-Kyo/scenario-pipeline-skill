# Step ④: 能力研究（多线程域分组方案）

**目的**：对每个需要研究的原子能力进行深度研究，产出能力知识库主文件 + 结构化摘要

**核心流程**：
1. 筛选待研究能力（覆盖待处理命题 or 扇出度≥30%）
2. 技术域分组（同层归组 + 依赖就近 + 上限 5 能力/组）
3. 依赖拓扑编排（无依赖并行 → 有依赖串行）
4. 并行 spawn 域 Agent（DAG 调度）

**关键产出**：`capabilities/*.md` + `.meta/summaries/*.json`

---

## 前置条件

⛔ 加载：
- `plugins/capability-research-mode.md`（材料块格式 + 深度分级）
- `meta/output-contracts.md`§4（能力研究产出格式）
- `meta/sources.md`（信源分级，T0 域名表）
- `{workDir}/.meta/capability-graph.json`（前处理产出）
- `{workDir}/README.md`（命题列表）

> **🔒 上下文隔离**
> - ✅ 允许读取：`core/shared-conventions.md`、`plugins/capability-research-mode.md`、`meta/output-contracts.md`§4（能力研究产出格式）、`meta/sources.md`（信源分级）、`{workDir}/.meta/capability-graph.json`、`{workDir}/README.md`
> - ❌ 禁止读取：`processes/01~03.md`、`processes/05~07.md`、`core/*.md`（已由 task 内联，无需主 agent 再读）、`plugins/*.md`（除 `capability-research-mode.md` 外）
> - 📌 `output-contracts.md` 只读 §4 节；`sources.md` 只读 T0 域名表

## 输入

- `capability-graph.json`（前处理产出）
- `README.md`（命题列表，用于筛选哪些能力需要研究）

## 执行步骤

### 1. 筛选待研究能力

从 capability-graph.json 中筛选：
- 覆盖待处理命题的能力
- 或扇出度 ≥ 30% 的能力

### 2. 增量检查

对每个待研究能力：
- `capabilities/{id}-{name}.md` 已存在 → 跳过
- `.meta/summaries/{id}-{name}.json` 已存在 → 跳过
- 均不存在 → 需要研究

### 3. 技术域分组（核心优化步骤）

将待研究能力按**技术域亲缘性**分组，每组对应一个子 Agent。

**分组原则**：
- 同一技术层的能力归为一组（如所有"浏览器层"能力归入渲染域）
- 有直接依赖关系的能力尽量归入同组
- **每组上限 5 个能力**（不足 2 个时可与相邻子组合并）
- 特化能力（M 系列）归入其依赖的通用能力所在组

**分组算法**：

```
1. 按 capability-graph.json 的 layer 字段初步分组（域聚合）
2. 检查组间依赖：
   - 若 A 组的能力依赖 B 组的能力 → 跨组依赖
   - 优先将被依赖能力移入下游组（减少跨组依赖）
3. 若无法消除跨组依赖 → 记录为"触发依赖"，安排执行顺序
4. 上限拆分（关键步骤）：
   - 检查每组能力数，上限 CAP=5
   - ≤ 5 → 保持原组
   - > 5 → 按依赖链拆分为子组：
     a. 构建组内依赖树（被依赖能力为上游）
     b. 从上游开始，每 5 个能力切一个子组
     c. 尽量让有直接依赖关系的能力留在同一子组
     d. 子组命名：{域}_1, {域}_2, ...
   - 子组间依赖 → 记录为跨子组依赖，纳入拓扑编排
5. 输出分组方案：
   {
     "group_id": { "name": "...", "capabilities": [...], "depends_on_groups": [...] }
   }
```

**示例分组**（8 个命题、25 个能力的场景，上限 CAP=5）：

| Agent | 技术域 | 能力 | 内部依赖链 | 跨组依赖 |
|-------|--------|------|-----------|---------|
| A_1 | 渲染与引擎① | W1, W2, W4, W6 | W1,W2→W6,W4 | 无 |
| A_2 | 渲染与引擎② | M1, M3 | 依赖 A_1 的 W6,W4 | 等待 A_1 |
| B_1 | 通信与数据 | W3, W5, W7, M2 | W3→W5,W7→M2 | W3 依赖 A_1 的 W1,W2 |
| C_1 | 生命周期 | W8, W9, M4, M5 | W8→W9→M4,M5 | 无 |
| D_1 | 构建与工程① | W10, W11, W12, W13 | W10→W11,W12,W13 | 无 |
| D_2 | 构建与工程② | M6, M7 | 依赖 D_1 | 等待 D_1 |
| E_1 | 编译与跨端① | W14, W15, W16, M8 | W14→W15→W16→M8 | 无 |
| E_2 | 编译与跨端② | M9 | 依赖 E_1 的 M8 | 等待 E_1 |

> 以上为 CAP=4 时的分组示例。CAP=5 时，部分子组可合并（如 A_1+A_2 → A_1 个 5 能力组），子组总数减少，更多场景落入 yield 直接等待。

### 4. 依赖拓扑编排

**目标**：最大化并行度，同时保证跨组依赖的正确性。

**算法**：
```
1. 计算每个组的"入度"（被多少其他组依赖）
2. 无跨组依赖的组 → 第一批并行启动
3. 有跨组依赖的组 → 等待依赖组完成后启动
4. 同一批内的组完全并行
```

**典型时序**（以上述 8 个子组为例）：

```
T=0      启动 A_1, B_1, C_1, D_1, E_1（5 路并行，无跨组依赖）
T=4min   A_1 完成 → spawn A_2（读取 A_1 的 W6/W4 摘要）
T=4min   D_1 完成 → spawn D_2（读取 D_1 摘要）
T=4min   E_1 完成 → spawn E_2（读取 E_1 的 M8 摘要）
T=8min   A_2, D_2, E_2 完成 → 全部 25 个能力就绪
```

### 5. 信源预查找

为每个待研究能力准备 T1/T2 URL：
- 根据能力名称确定 T0 来源（从 capability-graph.json 的 references.t0 读取）
- 补充 T1/T2 来源（大厂博客、优质社区）

### 6. 域 Agent 任务组装

**每个子组 Agent 的 task 包含以下信息**（全部内联，不引用外部文件）：

```
你是「{domain_name}」技术域（子组 {sub_group_id}）的深度研究员。

⚠️ 你必须用 write 工具将所有文件写入磁盘，不要只输出到对话中。

## 任务概览
研究以下原子能力，按依赖顺序执行：
1. {capability_1}（无依赖）→ 直接产出
2. {capability_2}（无依赖）→ 直接产出
3. {capability_3}（依赖 {capability_1}）→ 先读取 {capability_1} 摘要再产出
...

## 产出路径
- 能力主文件：{workDir}/capabilities/{id}-{name}.md
- 结构化摘要：{workDir}/.meta/summaries/{id}-{name}.json

## 每个能力的研究格式
（主文件模板 + 摘要 JSON 模板，见下方 §task-template）

## 信源规则
- T0 域名：（从 sources.md 提取相关域名）
- T1/T2/T3 分级规则
- 每个 URL 必须 web_fetch 验证

## 上下文数据
（每个能力的描述、扇出度、标签、已知参考 URL）

## 跨组依赖处理
（如有跨组依赖，说明：读取哪个文件、文件路径、需要提取的字段）

## 完成后
输出：`Agent-{group_id} 完成：已研究 {能力列表}（共 N 个能力）`
```

### 7. 并行 spawn 域 Agent（DAG 调度 + 轮询跟踪）

> ⚠️ 严格遵循 `core/shared-conventions.md` §并行调度规则。
> 调度规则详见 `core/shared-conventions.md` §子 agent 调度。
> 本步骤使用 **DAG 调度**模式（子组间有跨依赖，按拓扑批次执行）。

#### 7.1 第一批 spawn

所有无跨组依赖的子组 Agent 并行启动（上限 W=5）：

对 batch_1 中所有无跨组依赖的子组（按 fanout 降序），启动子 agent：
- label: `agent-{group.id}`
- task: 拼接角色声明 + 执行指令 + 变量替换
- 记录每个 agent 的 label 和 expected_files

#### 7.2 轮询循环 + 后续批次

按 `core/shared-conventions.md` §**模式 B：DAG 调度** 执行轮询循环。本步骤特有参数：

| 参数 | 值 |
|------|---|
| W | 5 |
| 超时 | 15 分钟 |
| 槽位替换 | ✅ DAG 模式：前置子组全部 completed → spawn 后续子组 |
| label | `agent-{group_id}`（如 `agent-A_1`, `agent-B_1`） |
| expected_files | 每个 agent：`capabilities/{id}-{name}.md` + `.meta/summaries/{id}-{name}.json`（按该子组负责的能力列表） |

**DAG 特有**：阶段 B 中，`ready_groups` 的判定基于该子组的 `depends_on_groups` 是否全部 completed。

#### 7.3 完成判定

- **completed**：Agent status=completed 且 expected_files 均存在
- **failed**：Agent status failed 或 expected_files 缺失
- **degraded**：超时重试仍失败，降级跳过

#### 7.4 退出

所有子组 completed/failed/degraded → 统计结果，进入 ⓒ 检查点

### 8. 跨 Agent 依赖的文件协调

当 Agent-B 依赖 Agent-A 的产出时：
- Agent-A 完成后，其摘要文件已写入磁盘
- Agent-B 的 task 中指定依赖文件路径，启动时读取
- **不需要** Agent-A 先输出到对话——直接读文件即可

**关键约束**：依赖文件路径必须在 Agent-B 的 task 中明确列出：
```
## 前置依赖文件（已由 Agent-A 产出，直接读取）
- {workDir}/.meta/summaries/{dep_capability_1}.json
- {workDir}/.meta/summaries/{dep_capability_2}.json
```

### 9. 等待全部完成

所有域 Agent 完成后（即上一步轮询循环退出后）：

🚨 **🛑 必须停顿，进入 ⓒ 检查点**。展示能力研究质量摘要（完成数/跳过数/失败数，各能力主文件行数统计），使用 `clarify` 等待用户确认后才进入 Step ⑤。

---

## task-template：单能力研究指令

以下内容嵌入每个域 Agent 的 task 中，按能力数量重复：

```
### {capability_name}（ID: {capability_id}）

#### 信源
{urls_from_capability_graph}
T0 缺失: {t0_missing}

#### Step 1: 信源获取
1. 优先使用上述预查找信源，按 Tier 优先级：T0 → T1 → T2 → T3
2. 如全部不可达，读取 meta/sources.md 的 T0 域名列表逐个搜索补充
3. 禁止凭记忆生成，必须 web_fetch 验证内容

#### Step 2: 内容研究
按以下结构产出能力主文件（≥2000 字）：

# {capability_name}
> {description}

## 核心机制
（详细描述技术原理，≥500 字）

## 工程瓶颈
### 瓶颈 N：{名称}
- **触发条件**：...
- **表现症状**：...
- **解决方案**：...

## 调试工具

## 典型权衡
| 维度 | 方案 A | 方案 B | 建议 |

## 最小验证实验
（可运行的代码，15 分钟内跑通）

## 参考资料
- [Tier] title — url

#### Step 3: 结构化摘要
产出 JSON：
{
  "id": "{capability_id}",
  "name": "{capability_name}",
  "tech_layer": "{layer}",
  "mechanism_summary": "1-3 句核心机制摘要",
  "bottlenecks": [
    { "name": "", "trigger": "", "symptom": "", "category": "" }
  ],
  "tradeoffs": [
    { "dimension": "", "option_a": "", "option_b": "", "recommendation": "" }
  ],
  "experiment_code": "代码或 null",
  "references": [
    { "tier": "T0|T1|T2|T3", "url": "", "title": "" }
  ]
}

#### Step 4: 保存文件
用 write 工具写入：
- {workDir}/capabilities/{capability_id}-{capability_name}.md
- {workDir}/.meta/summaries/{capability_id}-{capability_name}.json
```

---

## 输出

- `{workDir}/capabilities/{id}-{name}.md` × N
- `{workDir}/.meta/summaries/{id}-{name}.json` × N

## 校验清单

- [ ] 分组方案已记录（含每组能力列表和跨组依赖）
- [ ] **每个子组能力数 ≤ 5**（上限约束）
- [ ] 依赖拓扑已计算（批次顺序正确）
- [ ] 每个已研究的能力有两个文件（主文件 + 摘要）
- [ ] 主文件内容 ≥ 2000 字
- [ ] 摘要 JSON 可解析
- [ ] 参考资料中的 URL 经过 web_fetch 验证
- [ ] 跨子组依赖的 Agent 正确读取了前置文件

## 异常处理

| 场景 | 处理 |
|------|------|
| 子组 Agent 超时（>15min） | 检查卡在哪个能力，可进一步拆分为更小的子组重试 |
| 跨子组依赖文件不存在 | 等待依赖 Agent 完成后再启动，或跳过该能力标记 failed |
| 某个子组 Agent 全部失败 | 将该子组能力降级为逐个 spawn 重试 |
| 所有子组 Agent 均无跨组依赖 | 全部并行启动，无需拓扑编排 |
| 拆分后子组能力数 > 4 | 违反上限约束，必须重新拆分；检查拆分算法是否遗漏依赖链 |
