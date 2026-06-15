# Step ④: 评估与入池

## 目的

用四维评估矩阵对每个命题打分（含学习难度评估），确定优先级和学习顺序，写入总览导航，完成前处理阶段。

## 前置条件

⛔ 加载：
- `core/scenario-matrix.md`（四维评估矩阵方法论）
- `meta/output-contracts.md`§3（本步输出格式）
- `{workDir}/.meta/requirement-web.json`（⓪ 产出，含命题和能力图谱雏形）
- `{workDir}/.meta/capability-graph.json`（③ 产出，含能力、高地、学习路径）
- `{workDir}/.meta/.raw-materials/index.json`（② 产出索引）
- `{workDir}/.meta/partition-analysis.json`（① 产出，确定当前 session 命题范围）

> **🔒 上下文隔离**
> - ✅ 允许读取：`core/shared-conventions.md`、`core/scenario-matrix.md`、`meta/output-contracts.md`§3、`{workDir}/.meta/requirement-web.json`、`{workDir}/.meta/capability-graph.json`、`{workDir}/.meta/.raw-materials/index.json`、`{workDir}/.meta/partition-analysis.json`
> - ❌ 禁止读取：`processes/01~02.md`、`processes/05~08.md`、`core/capability-graph.md`、`core/strategic-highground.md`、`plugins/*.md`（`--year` 参数存在时，`plugins/year-granularity.md` 除外）
> - 📌 `output-contracts.md` 只读 §3 节

## 输入

- `requirement-web.json`（⓪ 产出）
- `capability-graph.json`（③ 产出）
- `.raw-materials/index.json`（② 产出索引）
- `partition-analysis.json`（① 产出，含 `current_session.proposition_ids`）

## 执行步骤

> **快捷方式**：可用脚本自动完成四维评估：
> ```bash
> python {skillDir}/scripts/evaluate-propositions.py {workDir}
> ```
> 脚本产出 `evaluations.json`。如脚本执行成功，可跳过下方手动步骤 0-3，直接进入步骤 4（入池归档）。

### 0. 过滤评估范围

从 `partition-analysis.json` 读取 `current_session.proposition_ids`。**只评估当前 session 的命题**——deferred 命题缺乏 scan 素材，「文档真空」和「经验壁垒」两个维度无法可靠打分。

deferred 命题会在其对应 session 执行 evaluate-pool 时被独立评估。若 partition-analysis.json 不存在（分区步骤被跳过），则评估全部命题作为降级策略。

### 1. 逐命题四维打分

对当前 session 的每个命题，按以下四个维度打分（1-3 分）：

| 维度 | 含义 | 3 分标准 | 2 分标准 | 1 分标准 |
|------|------|---------|---------|---------|
| 跨栈耦合 | 是否横跨 2 个以上技术层？ | ≥3 层 | 2 层 | 1 层 |
| 文档真空 | 是否存在覆盖全貌的权威文档？ | 几乎无文档 | 部分文档 | 文档完善 |
| 经验壁垒 | 不做能否凭空理解？ | 需大量实战 | 需少量实践 | 阅读即懂 |
| 时事热度 | 近期出现频率是否上升？ | 高频面试题 | 偶尔出现 | 冷门 |

**打分校准规则**：
1. **跨栈耦合**：参考 `capability-graph.json` 中该命题涉及能力的技术层数量
2. **文档真空**：以 Google 搜索结果为客观依据
3. **经验壁垒**：必须锚定具体场景规模
4. **防虚高兜底**：若 4 个维度均为 2 分及以上，必须重新审视

### 2. 年限阈值适配

根据 `requirement-web.json` 的 `context.year_level` 调整入池阈值：

| 年限 | 入池阈值 | 说明 |
|------|---------|------|
| L1 | 通常不入池 | 不满足"经验壁垒"维度 |
| L2 | 总分 ≥ 6 | 方案级命题 |
| L3 | 总分 ≥ 5 | 降低阈值，低频命题本身有价值 |
| L4 | 一票入池 | 任何维度得分 ≥ 2 即入池 |

**一票入池条件**（所有年限通用）：
- 该命题在 2 个以上不同信息源同时被讨论
- 包含明确的 Trade-off 决策
- 涉及新兴技术与既有体系的碰撞

**优先级决策记录**：每个命题必须记录 `priority_trace`。

**示例**：`priority_trace: "总分10（跨栈耦合3+文档真空2+经验壁垒3+时事热度2），阈值判定（L2：≥6→high）：10≥6 → high"`

### 3. 学习难度评估

对优先级为 `high` 的命题，基于原子能力评估学习掌握难度。

**评估依据**：
1. 能力依赖链深度（主要权重）：从 `capability-graph.json` 的 `dependency_graph` 计算 max_depth
2. 涉及能力数量与耦合度
3. 概念抽象度：操作层面 < 机制层面 < 设计层面

**难度分级**：
- 🟢 low：依赖链 depth ≤ 1，操作/机制层面
- 🟡 medium：依赖链 depth=2，或跨 3 个技术层
- 🔴 high：依赖链 depth ≥ 3，或需全新知识体系

**学习顺序**：low → medium → high，同难度内按依赖关系排序。

### 4. 入池归档

#### 4.1 写入总览导航

读 `meta/output-contracts.md`§3 获取完整模板。按模板写入 `{workDir}/README.md`。

模板内容包含：
- 命题索引（来自 evaluations）
- 推荐学习顺序（来自 highgrounds + capability-graph）
- 学习路径（来自 highgrounds）
- 能力知识库索引链接

#### 4.2 写入候选池

将原始候选数据写入 `{workDir}/.meta/candidates.md`（pipeline 内部存档）。

#### 4.3 更新 capability-graph.json

将 `highgrounds` 和 `learning_path` 字段追加到 capability-graph.json（如 ② 已写入则跳过）。

## 输出

⚠️ 本步骤产出 3 个文件，必须全部写入磁盘：

- `{workDir}/.meta/evaluations.json` — 评估结果
- `{workDir}/README.md` — 命题总览导航
- `{workDir}/.meta/candidates.md` — 候选命题原始数据存档

## 校验清单

- [ ] 每个命题包含四个维度的评分
- [ ] 每个评分在 1-3 范围内
- [ ] 总分 = 四维之和
- [ ] 优先级判定与总分对应（考虑年限阈值适配）
- [ ] 每个命题包含 priority_trace
- [ ] 入池命题包含 difficulty（low/medium/high）
- [ ] 入池命题包含 recommended_order
- [ ] README.md 的命题索引与 evaluations.json 一致
- [ ] 学习路径与 capability-graph.json 的 learning_path 一致

## 异常处理

| 场景 | 处理 |
|------|------|
| 信息不足以打分 | 标记为 medium，reasoning 说明信息不足 |
| 所有命题 rejected | 提示用户调整搜索范围 |
| 难度评估信息不足 | 依赖链深度为主要依据，标记 difficulty_reason 说明 |

## 检查点

🚨 **🛑 必须停顿，进入 ⓑ 检查点**。展示评估摘要（命题评估表、优先级分布、难度分级、推荐学习顺序、后处理执行计划），使用 `clarify` 等待用户确认后才进入后处理。
