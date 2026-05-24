# Step ⑨: 命题组装

## 目的

为每个命题组装四象限研究输出（overview / edge-cases / trade-offs / experiment / references）。后处理阶段二。

## 输入

- `.meta/briefings/{seq}-{short_name}.md`（Step ⑧ 产出）
- `capability-graph.json`（前处理产出）

## 执行步骤

### 1. 筛选待组装命题

从 capability-graph.json 的 propositions 获取列表。已有以下全部文件的命题跳过：`{workDir}/{seq}-{short_name}/overview.md`、`edge-cases.md`、`trade-offs.md`、`references.md`、`experiment/README.md`。

### 2. 并行 spawn（简单窗口）

> ⚠️ 按 `00-shared.md §简单窗口执行流程` + `§并行调度规则` 执行。禁止 `sessions_yield`。

命题组装之间无依赖，W=5 命题，先完成先补位。

**步骤特有：2-agent-per-命题**
- 每个命题 spawn 2 个 agent（Markdown + Experiment），两者无相互依赖，可并行
- 命题完成 = 2 个 agent 均完成
- W=5 命题 = 最多 10 个 agent 并行
- 某命题的 Markdown agent 失败 → Experiment agent 仍可继续

**性能提示**：
- 10 个命题（W=5）：约 2-3 分钟完成（2 个窗口批次，每批 10 个文件）
- 5 个命题（W=5）：约 2 分钟完成（1 个窗口批次）

**异常处理**：
- 某命题的 Markdown agent 失败 → Experiment agent 仍可继续（不依赖其产出）
- 某命题的 2 个 agent 均失败 → 标记该命题为 failed，窗口继续推进
- 所有命题均完成或失败 → 进入 ⓕ 检查点

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

如果文件不存在（read 返回错误），停止执行并输出：`❌ 命题「{proposition_name}」的 Briefing 文件不存在，无法组装。请先完成 Step ⑧。`

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

**筛选决策记录**：在 edge-cases.md 末尾附 `## 筛选决策` 节，记录：
- 从哪些能力的 bottlenecks 中提取了候选坑点
- 哪些坑点被排除及原因（与命题场景不相关 / 信息不足 / 重复）
- 为什么保留的坑点被判定为 P0/P1

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
- [ ] edge-cases.md 末尾包含「筛选决策」节（记录坑点取舍依据）
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

如果文件不存在（read 返回错误），停止执行并输出：`❌ 命题「{proposition_name}」的 Briefing 文件不存在，无法组装实验。请先完成 Step ⑧。`

如 Briefing 中无 experiment_code 字段或字段为空，按 meta/sources.md 的 T0 域名列表搜索补充，禁止凭记忆生成代码。

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

所有命题 agent 完成后，进入 ⓕ 检查点。

## 输出

每命题产出：
- `{workDir}/{seq}-{short_name}/overview.md`
- `{workDir}/{seq}-{short_name}/edge-cases.md`
- `{workDir}/{seq}-{short_name}/trade-offs.md`
- `{workDir}/{seq}-{short_name}/references.md`
- `{workDir}/{seq}-{short_name}/experiment/README.md`
- `{workDir}/{seq}-{short_name}/experiment/src/`

## 校验清单

- [ ] 每个命题的 edge-cases.md 包含「筛选决策」节（记录坑点取舍依据，对应 _trace 要求）
- [ ] 内容比例符合要求（通用 ≥ 70%，特化 ≤ 30%）
