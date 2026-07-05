# Step ⑥: 命题组装

**目的**：为每个命题组装四象限研究输出（overview / edge-cases / trade-offs / experiment / references）

**核心流程**：
1. 筛选待组装命题（已有全部文件则跳过）
2. 2-agent-per-命题（Markdown + Experiment 并行）
3. 简单窗口调度（W=5 命题 = 最多 10 agent 并行）

**关键产出**：`{命题目录}/overview + edge-cases + trade-offs + experiment + references`

---

## 前置条件

无需加载额外方法论文件。本步骤的 task 已内联全部指令。读取：
- `assets/07-assemble/schemas.md`（本步输出格式）
- `{workDir}/.meta/capability-graph.json`（含 propositions）
- `{workDir}/.meta/briefings/{seq}-{short_name}.md`（Step ⑤ 产出）

## 输入

- `.meta/briefings/{seq}-{short_name}.md`（Step ⑤ 产出）
- `capability-graph.json`（前处理产出）

## 执行步骤

### 1. 筛选待组装命题

从 capability-graph.json 的 propositions 获取列表。已有以下全部文件的命题跳过：`{workDir}/{seq}-{short_name}/overview.md`、`edge-cases.md`、`trade-offs.md`、`references.md`、`experiment/README.md`。

### 2. 并行 spawn（简单窗口 + 轮询跟踪，2-agent-per-命题）

> ⚠️ 严格遵循 `assets/common/conventions.md` §简单窗口执行流程 + §并行调度规则。
> 调度规则详见 `assets/common/conventions.md` §子 agent 调度。

**步骤特有：2-agent-per-命题**
- 每个命题 spawn 2 个 agent（Markdown + Experiment），两者无相互依赖，可并行
- 命题完成 = 2 个 agent 均完成
- W=5 命题 = 最多 10 个 agent 并行

#### 2.1 初始化

从待办队列取前 W=5 个命题，每个命题 spawn 2 个 agent（Markdown + Experiment）。

| label 模式 | Agent 类型 | 预期产出 |
|------------|-----------|---------|
| `asm-md-{seq}-{short_name}` | Markdown | overview.md + edge-cases.md + trade-offs.md + references.md |
| `asm-exp-{seq}-{short_name}` | Experiment | experiment/README.md + experiment/src/ |

#### 2.2 轮询循环 + 槽位替换

按 `assets/common/conventions.md` §**模式 A：简单窗口** 执行轮询循环。本步骤特有参数：

| 参数 | 值 |
|------|---|
| W | 5（命题数，每命题 2 agent → 最多 10 agent 并行） |
| 超时 | 8 分钟 |
| 槽位替换 | ✅ 简单窗口：1 个命题的 2 个 agent 均结束 → 释放 2 个槽位 → spawn 下一命题的 2 个 agent |
| label | Markdown: `asm-md-{seq}-{short_name}`, Experiment: `asm-exp-{seq}-{short_name}` |
| expected_files | Markdown: overview.md + edge-cases.md + trade-offs.md + references.md; Experiment: experiment/README.md + experiment/src/ |

**Step ⑥ 特殊**：1 个命题 = 2 个 agent（Markdown + Experiment），两者独立可并行。
- 槽位计数：1 个命题占 2 个槽位
- 完成判定：2 个 agent 均结束才释放槽位
- 部分完成：Markdown failed 但 Experiment completed → 标记 partial

#### 2.3 完成判定

- **命题 completed**：2 个 agent 均 completed 且 expected_files 存在
- **命题部分完成**：Markdown failed 但 Experiment completed（或反之）→ 标记 partial
- **命题 failed**：2 个 agent 均 failed

#### 2.4 超时与重试

单 Agent 超过 8 分钟 → kill → 重试一次 → 仍失败则该 agent 标记 failed，不影响同命题的另一个 agent

#### 2.5 退出

所有命题 completed/failed/partial/degraded → 统计结果，进入 ⓕ 检查点

**Markdown 组装 agent** — 负责 overview / edge-cases / trade-offs / references

```
你是「{proposition_name}」的 Markdown 组装专家。

⚠️ 你必须用 write 工具将文件写入磁盘，不要只输出到对话中。

## 任务
为命题「{proposition_name}」组装四象限研究输出中的 Markdown 文件。

## 命题信息
- ID: {proposition_id}
- 命题: {proposition}
- 限定词: {qualifier}
- 技术关键词: {tech_keyword}
- 内容占比: {content_weight}

## 涉及能力
{capability_ids}

## 通用层分解
{generic_core}

## 特化层分解
{specialization}

## Briefing 内容
用 read 工具读取：{workDir}/.meta/briefings/{seq}-{short_name}.md

如果文件不存在（read 返回错误），停止执行并输出：`❌ 命题「{proposition_name}」的 Briefing 文件不存在，无法组装。请先完成 Step ⑤。`

## 输出目录
{workDir}/{seq}-{short_name}/

## 执行步骤

### Step 1: 链路编排（→ overview.md）
按数据流顺序排列涉及的能力，形成完整链路。
- 引用各能力的 mechanism_summary
- 补充命题特有的上下文（限定词注入的特化内容）
- 标注原子能力 ID

### Step 2: 坑点提取（→ edge-cases.md）
从各能力的 bottlenecks 提取与该命题相关的坑点：
- 过滤：只保留与命题场景相关的
- 优先级排序：P0/P1 必须保留
- 补充：命题特有的极端场景
- 至少 3 个坑点

**筛选决策记录**：每个坑点条目末尾附 `筛选_trace` 字段，记录：
- 候选来源：从哪些能力的 bottlenecks 中提取（列出能力 ID + 瓶颈名称）
- 排除项：哪些候选被排除及原因（与命题场景不相关 / 信息不足 / 重复）
- 保留理由：为什么判定为 P0/P1

### Step 3: 方案对比（→ trade-offs.md）
从各能力的 tradeoffs 构建对比表：
- 2-3 种技术路线
- 每种标注涉及的能力及其 tradeoff 选择
- 表格形式，标注牺牲点

### Step 4: 参考资料汇总（→ references.md）
从各能力的参考资料汇总，按 Tier 排序去重。

### Step 5: 内容比例校验
- 通用高地内容 ≥ {content_weight}
- 特化内容 ≤ 剩余比例
- 开篇（10-15%）从限定词切入
- 主体（70-80%）讲通用原理
- 收尾（10-15%）回到限定词

## 验证清单
- [ ] overview.md 包含完整链路解构
- [ ] edge-cases.md 包含至少 3 个坑点
- [ ] edge-cases.md 每个坑点包含 `筛选_trace`（记录取舍依据）
- [ ] trade-offs.md 包含对比表格
- [ ] references.md 按 Tier 排序
- [ ] 内容比例符合要求
- [ ] 所有文件使用 {qualifier} 作为限定词

## 完成后
输出：`Markdown「{proposition_name}」完成：已写入 overview / edge-cases / trade-offs / references（共 4 个文件）`
```

**实验组装 agent** — 负责 experiment 目录

```
你是「{proposition_name}」的实验组装专家。

⚠️ 你必须用 write 工具将文件写入磁盘，不要只输出到对话中。

## 任务
为命题「{proposition_name}」组装可运行的验证实验。

## 命题信息
- 命题: {proposition}
- 限定词: {qualifier}

## Briefing 内容
用 read 工具读取：{workDir}/.meta/briefings/{seq}-{short_name}.md

如果文件不存在（read 返回错误），停止执行并输出：`❌ 命题「{proposition_name}」的 Briefing 文件不存在，无法组装实验。请先完成 Step ⑤。`

如 Briefing 中无 experiment_code 字段或字段为空，按 common/sources.md 的 T0 域名列表搜索补充，禁止凭记忆生成代码。

## 输出目录
{workDir}/{seq}-{short_name}/experiment/

## 执行步骤

### Step 1: 选取实验代码
从 Briefing 中各能力的 experiment_code，选取战略价值最高的能力的实验代码。

### Step 2: 合并为可运行文件
将多个能力的实验代码合并为一个可运行的 HTML/JS 文件。

### Step 3: 编写 README.md
说明实验目的、运行方式、验证检查点（对应原子能力 ID）。

### Step 4: 保存文件
- {workDir}/{seq}-{short_name}/experiment/README.md
- {workDir}/{seq}-{short_name}/experiment/src/index.html

## 验证清单
- [ ] experiment/ 包含可运行代码
- [ ] README.md 说明了运行方式
- [ ] 验证检查点标注了对应的原子能力 ID
- [ ] 如 Briefing 无 experiment_code，已通过搜索补充并注明来源

## 完成后
输出：`Experiment「{proposition_name}」完成：已写入 experiment/README.md + experiment/src/index.html`
```

### 3. 等待全部完成

所有命题 agent 完成后：

🚨 **🛑 必须停顿，进入 ⓕ 检查点**。展示命题组装摘要（完成数/跳过数/失败数，各命题文件行数统计），使用 `clarify` 等待用户确认后才进入 Step ⑦。

## 输出

每命题产出：
- `{workDir}/{seq}-{short_name}/overview.md`
- `{workDir}/{seq}-{short_name}/edge-cases.md`
- `{workDir}/{seq}-{short_name}/trade-offs.md`
- `{workDir}/{seq}-{short_name}/references.md`
- `{workDir}/{seq}-{short_name}/experiment/README.md`
- `{workDir}/{seq}-{short_name}/experiment/src/`

## 校验清单

- [ ] 每个命题的 edge-cases.md 每个坑点包含 `筛选_trace`（记录取舍依据）
- [ ] 内容比例符合要求（通用 ≥ 70%，特化 ≤ 30%）
