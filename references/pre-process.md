# 前处理编排

> 纯编排文件：定义前处理的步骤顺序和调用关系。
> 每个步骤的实现在 `processes/` 目录下。

---

## 触发方式

```
扫描：<信息源描述>
```

或：

```
deep scan：<信息源描述>
```

**可选参数：**

| 参数 | 说明 |
|------|------|
| `--source=<url>` | 直接指定一个具体 URL |
| `--feed=<topic>` | 按主题订阅式扫描 |
| `--digest` | 对已入池候选做摘要汇报 |
| `--year=<L1\|L2\|L3\|L4>` | 经验年限约束 |

---

## 流程

> **路径获取**：在执行任何步骤前，必须先调用 MCP `resolve_paths` 获取当前任务的所有路径：
> ```bash
> mcporter call scenario-pipeline.resolve_paths --args '{"task_type":"pre-process","workDir":"<产出目录>","caller":"pre/resolve"}'
> ```

## 🚨 执行协议（每步强制）

前处理每步遵循 **schema 驱动三件套**：

```
Step 0: get_output_schema(step)   → 拿到输出 schema + field_rules + strict_notes
Step N: 按 schema 标准执行        → 生成内容
Final:  submit_output(step, data) → 校验 + 写入
```

**禁止跳过 Step 0**。直接执行而不先读 schema，产出格式必然不匹配、校验失败、返工。
schema 是事前标准，不是事后检查工具。每步的具体 schema 名已在步骤框中标明，
但即使未显式标注，执行前也必须先调 `get_output_schema(step)`。

```
Step 1 ──→ Step 1.5 ──→ ⓐ ──→ Step 2 ──→ Step 3 ──→ Step 4 ──→ Step 5 ──→ ⓑ ──→ Step 6
 scan     加载core/  checkpoint  decompose  capability  highground  evaluate  checkpoint   pool
                                               extract     identify
```

### Step 1：广域扫描（自由搜索 + 信源 filter）

> **执行模式**：主线程执行（依赖 web_search + MCP 信源 filter）
> **核心变化**：agent 自由搜索，不限域名；所有结果经 MCP `classify_sources` 统一分级

```
调用：processes/scan.md
输入：用户指令中的 source_desc + topic
执行前：调用 MCP `get_output_schema(step="scan")` 获取输出 schema 标准
流程：
  1. agent 自由 web_search（多路关键词，不限域名）
  2. 提取搜索结果域名列表
  3. 调 MCP classify_sources(domains) → 获得分级
  4. unknown 域名 → web_fetch 评估内容质量
  5. 达标的 unknown → 调 MCP register_source 动态注册
  6. 按 Tier 排序 + 去重
  7. submit_output 写入 raw-materials.json
输出：raw-materials.json
caller：pre/scan
```

> **信源 filter 机制**：MCP 内置 T0 高可信信源（官方文档/规范），搜索过程中发现的优质域名通过 `register_source` 动态加入。每次 scan 都可能扩展信源池。

### Step 1.5：加载方法论文档（L3 前置条件）

> ⛔ **执行前必须完成**：后续 Step 2-5 均为 L3 任务，依赖 core/ 方法论。编排层统一预加载，避免各步骤重复加载。

```
加载清单：
  - 必须：core/architecture-decomposition.md（分词方法论，Step 2 使用）
  - 必须：core/capability-graph.md（能力图谱方法论，Step 3 使用）
  - 必须：core/strategic-highground.md（战略高地方法论，Step 4 使用）
  - 必须：core/scenario-matrix.md（评估矩阵方法论，Step 5 使用）
```

> 未加载以上文档而进入 Step 2，等同于将 L3 降级为 L4 裸跑。

### ⓐ 检查点 A：扫描结果确认

> 扫描完成后暂停，向用户展示扫描摘要，确认后再进入分词。

```
展示内容：
  - 识别到 N 个信源，成功抓取 M 个
  - 筛选出 K 条相关素材（按 Tier 分布：T0=x, T1=y, T2=z, T3=w）
  - Top 5 素材标题列表

用户操作：
  - "继续" → 进入 Step 2
  - "补充 <URL>" → 追加信源后重新扫描
  - "跳过 <条件>" → 过滤特定素材后继续
  - "查看全部" → 展示完整素材列表
```

**跳过条件**：`--batch=pending` 或 `--append` 模式下自动跳过检查点。

### Step 2：架构分词

```
调用：processes/decompose.md
输入：Step 1 的 raw_materials
执行前：调用 MCP `get_output_schema(step="decompose")` 获取输出 schema 标准
加载条件：如果 --year → 额外加载 plugins/year-granularity.md
输出：decompositions.json（通过 MCP `submit_output(step="decompose", data=..., workDir=...)` 校验 + 写入）
```

### Step 3：原子能力提取 + 信源 URL 预查找（子 agent 隔离）

> **隔离收益**：IO + 推理混合，上下文最重（~20K tokens）。是唯一同时高 token + 高时间的双重热区。
> 隔离后主线程释放 ~20K tokens。

**执行模式**：通过 `delegate_task` 调度子 agent 执行，主线程等待结果。

```
主线程编排：
  1. 读取 core/capability-graph.md 和 core/architecture-decomposition.md 完整内容
  2. 准备子 agent task description：
     - 注入 core/ 方法论内容（强制注入，保证 L3 加载契约）
     - 注入 processes/capability-extract.md 的完整内容（作为执行指令）
     - 注入 decompositions.json 和 raw-materials.json 的绝对路径
     - 注入 workDir 绝对路径
     - 注入 MCP 调用语法（mcporter call get_t0_sources / classify_sources / register_source 等）
  3. delegate_task 调度子 agent（toolsets: ["terminal", "file", "web"]）
  4. 等待子 agent 完成，接收 stdout 摘要
  5. 读取子 agent 产出的 capability-graph.json
  6. 校验 JSON 结构完整性（方法论特有字段是否存在）

子 agent 执行：
  - 读取 task description 中的方法论和执行指令
  - 调用 MCP `get_output_schema(step="capability-extract")` 获取输出 schema 标准
  - 执行原子能力提取 + 信源 URL 预查找
  - 按 schema 标准构造 capability-graph.json
  - 调用 MCP `submit_output(step="capability-extract", data=..., workDir=...)` 校验 + 写入
  - 输出 ≤200 字摘要到 stdout

输出：capability-graph.json
caller：subagent/cap-extract
```

**关键变更：** Step 3 现在不仅提取原子能力，还为每个能力按双轨模式预查找参考 URL（T0 官方 + 自由搜索分级）。
- 轨道 A：调用 MCP `get_t0_sources` 获取 T0 域名列表，在每个域内搜索官方文档
- 轨道 B：自由搜索 → MCP `classify_sources` 分级 → 按 tier 归类
- URL 必须 web_fetch 验证过内容相关性
- 查找结果写入 capability-graph.json 每个能力的 `references` 字段

### Step 4：战略高地识别

```
调用：processes/highground-identify.md
输入：Step 3 的 capability-graph.json
执行前：调用 MCP `get_output_schema(step="highground-identify")` 获取输出 schema 标准
输出：highgrounds.json（通过 MCP `submit_output(step="highground-identify", data=..., workDir=...)` 校验 + 写入）
```

> **变更说明**：Step 4 输出独立文件而非追加写入 capability-graph.json。
> 原因：接口规范要求「不得修改输入文件」，追加写入存在半写入风险。
> 合并操作移至 Step 6（pool），由主线程在确定性环境中执行。

### Step 5：四维评估

```
调用：processes/evaluate.md
输入：Step 2 的 decompositions.json + Step 3 的 capability-graph.json（无 highgrounds）+ Step 1 的 raw-materials.json
执行前：调用 MCP `get_output_schema(step="evaluate")` 获取输出 schema 标准
输出：evaluations.json（通过 MCP `submit_output(step="evaluate", data=..., workDir=...)` 校验 + 写入）
```

> **注意**：Step 5 使用 Step 3 的 capability-graph.json（不含 highgrounds 字段）。
> highground_info 在 evaluate 中已是可选参数，不影响核心评分。

### ⓑ 检查点 B：评估结果确认

> 评估完成后暂停，向用户展示评估摘要，确认后再入池。

```
展示内容：
  - 命题评估表（命题名 | 四维评分 | 判定）
  - 战略高地 Top 3（能力名 | 扇出度 | 战略价值）
  - 入池统计：high=N, medium=M, rejected=K

用户操作：
  - "继续" → 进入 Step 6 入池
  - "调整 <命题> 为 high/medium" → 手动调整优先级
  - "排除 <命题>" → 从候选池移除
  - "全部确认" → 跳过后续检查点，直接入池
```

**跳过条件**：`--batch=pending` 模式下自动跳过检查点。

### Step 6：入池归档

**合并操作**：将 Step 4 的 `highgrounds.json` 合并入 `capability-graph.json`（追加 `highgrounds` + `learning_path` 字段）。

写入两个文件：
- `{{paths.readme}}` — 总览导航（人类可读，替代旧 candidates.md 的展示角色）
- `{{paths.meta_candidates}}` — 原始候选池记录（pipeline 内部存档）

### Step 7：状态持久化

调用 MCP 工具 `save_state`（必须传入 `workDir` 指向产出目录）：

```bash
mcporter call scenario-pipeline.save_state checkpoint="pre-process-done" context='{"stages":{"pre-process":{"status":"completed","completed_at":"<当前时间>","artifacts":["{{paths.meta_capability_graph}}","{{paths.meta_candidates}}","{{paths.readme}}"]}}}' --args '{"workDir":"<产出目录>","caller":"pre/save-state"}'
```

> ⚠️ `workDir` 必须指向管线产出目录（如 `{{paths.workDir}}`），确保状态文件与产出文件在同一目录下。

---

## 前处理产出结构

```
{{paths.workDir}}
├── {{paths.readme}}             ← 总览导航（用户第一眼看到的）
├── {{paths.meta_capability_graph}}  ← 结构化数据（Step 3 产出 + Step 6 合并 highgrounds）
├── highgrounds.json             ← 战略高地（Step 4 产出，独立文件）
├── evaluations.json             ← 四维评估（Step 5 产出）
└── {{paths.meta_candidates}}        ← 内部存档
```

### 数据流关系

```
{{paths.meta_capability_graph}}  ←── 被 {{paths.readme}} 引用（学习路径摘要从 JSON 派生）
                     ←── 被后处理 agent 直接读取（阶段一筛选能力）
                     ←── 被 {{paths.capabilities_readme}} 引用（能力索引从 JSON 派生）

{{paths.meta_candidates}} ←── 原始扫描记录，pipeline 内部存档，不面向用户
```

---

## 总览导航结构

```markdown
# <研究主题> — 命题研究

> 目标人群：<年限>
> 扫描时间：<日期>
> 扫描范围：<描述>

## 命题索引

| # | 命题 | 四维评分 | 优先级 | 研究目录 |
|---|------|---------|--------|---------|
| P1 | 长列表渲染：... | 10 | high | [01-长列表渲染](01-长列表渲染/) |
| P2 | 首屏白屏：... | 10 | high | [02-首屏白屏](02-首屏白屏/) |
| ... | | | | |

## 学习路径（Top 3 战略高地）

1. 🏔️ **A8-DevTools 性能分析**（覆盖 7/7 命题）→ 所有诊断的起点
2. 🏔️ **A1-浏览器渲染管线**（覆盖 5/7 命题）→ 框架无关的底层基础
3. 🏔️ **A2-DOM 节点生命周期**（覆盖 4/7 命题）→ 深化渲染下游理解

完整能力图谱：[capabilities/README.md]({{paths.capabilities_readme}})
结构化数据：[{{paths.meta_capability_graph}}]({{paths.meta_capability_graph}})

## 能力知识库

按原子能力组织的跨命题参考手册：[capabilities/]({{paths.workDir}}capabilities/)
```

---

## 摘要回传

前处理完成后，输出 ≤200 字摘要：
- 识别了多少个命题
- 战略高地排序（Top 3）
- 推荐修炼路径
- 入池/淘汰统计
- 产出目录结构
