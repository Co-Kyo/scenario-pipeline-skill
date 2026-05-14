# 后处理编排

> 纯编排文件：定义后处理的三阶段管线和调用关系。
> 执行指令的 SSoT 在 MCP templates（`mcp-server/src/domains/template/templates/*.md`）。
> `processes/` 目录下的文件为参考文档（L2 改造后降级），仅供人类阅读。

## 路径规范

> 本文档中所有产出路径均通过 MCP `resolve_paths` 工具获取，是唯一的路径事实来源（SSoT）。
> 以下列出本文档涉及的路径字段（参见 `path-config.ts` 的 `PathTemplates` 接口）：
>
> | 字段 | 说明 |
> |------|------|
> | `{{paths.workDir}}` | 管线产出根目录 |
> | `{{paths.capability_file}}` | 能力知识库主文件 |
> | `{{paths.capability_summary}}` | 能力结构化摘要 |
> | `{{paths.capabilities_readme}}` | 能力知识库 README |
> | `{{paths.proposition_dir}}` | 命题目录根 |
> | `{{paths.briefing}}` | Briefing 中间产物 |
> | `{{paths.meta_capability_graph}}` | 能力图谱 JSON |
> | `{{paths.meta_summaries_dir}}` | 摘要目录 |
> | `{{paths.meta_briefings_dir}}` | Briefing 目录 |
> | `{{paths.meta_pipeline_state}}` | 管线状态文件 |
>
> 运行时请调用 `resolve_paths` 获取完整路径对象，禁止自行拼接路径。

---

> **MCP 调用约定**：所有 `save_state`/`restore_state` 调用必须通过 `mcporter call` 执行，并传入 `workDir` 参数指向产出目录，`caller` 参数标识管线阶段（格式：`{phase}/{step}`，详见 pipeline-state.md §caller 规范）：
>
> mcporter call scenario-pipeline.save_state checkpoint="<checkpoint>" context='<context>' --args '{"workDir":"<产出目录>","caller":"<phase/step>"}'
> mcporter call scenario-pipeline.restore_state --args '{"workDir":"<产出目录>","caller":"<phase/step>"}'
> mcporter call scenario-pipeline.get_template template_type="<type>" params='<params>'
> ```
> `get_template` 无需 `workDir`（模板内嵌在 MCP server 中）。

## 触发方式

```
研究：<场景描述>
```

或：

```
deep research：<场景描述>
```

**可选参数：**

| 参数 | 用法 | 说明 |
|------|------|------|
| 深度 | `--depth=deep` | shallow / normal（默认）/ deep |
| 平台 | `--platform=miniapp` | web / miniapp / rn / all |
| 跳过实验 | `--no-experiment` | 跳过 Q4 实验生成 |
| 追加 | `--append` | 在已有目录补充 |
| 批量 | `--batch=pending` | 候选池所有 pending 依次处理 |
| 条件筛选 | `--filter="优先级=high"` | 按条件筛选后批量 |

---

## 三阶段管线

```
阶段一：能力研究 + Briefing组装（两步骤）    阶段二：命题组装（滑动窗口并行）    阶段三：学习阶梯（并行）

  ┌─────────────────────────────────┐            ┌─────────────────────┐            ┌─────────────────┐
  │ 步骤1：capability-research × N   │            │ assemble × 1 命题    │            │ learning-       │
  │ （滑动窗口并行，每 agent 1 文件） │            │ (overview/edge/      │            │ ladder × 1 命题  │
  │         ↓ 双写                    │            │  trade/refs)         │            │ (每 agent 1 命题) │
  │ 步骤2：briefing-assemble × M     │──────────→│         +            │──────────→│                 │
  │ （并行，每 agent 1 命题）         │            │ experiment × 1 命题  │            │                 │
  └─────────────────────────────────┘            └─────────────────────┘            └─────────────────┘
        ↑                                              ↑                                    ↑
        │                                              │                                    │
  {{paths.meta_capability_graph}}                 从 briefings 内联                        读取阶段二产出
  (来自前处理)                                    到组装 agent task                      + {{paths.meta_capability_graph}}
```

**阶段一包含两个步骤**：
1. **能力研究**（并行）：每个 agent 双写主文件 + summary.json
2. **Briefing 组装**（并行）：每 agent 负责 1 个命题的 Briefing 组装

**阶段二包含两类 agent**：
1. **Markdown 组装**（每 agent 1 命题）：负责 overview / edge-cases / trade-offs / references
2. **实验组装**（每 agent 1 命题）：负责 experiment 目录（代码逻辑，独立处理以保证稳定性）

**双写**：每个能力研究 agent 产出两个文件：
1. `{{paths.capability_file}}` — 人类阅读的完整知识库
2. `{{paths.capability_summary}}` — 机器消费的结构化摘要

---

## 执行协议

> 本节定义后处理的执行协议。**必须严格遵循三阶段顺序，禁止合并。**

> ⚠️ 下文中的 `spawn(task)` 是平台无关的伪代码。
> 用自然语言描述"创建独立助手完成 X"，环境自行选择执行方式。

### 执行流程

```
═══════════════════════════════════════════════════════════════════════════════
【检查点 C：后处理启动确认】— 用户确认后才进入研究流程
═══════════════════════════════════════════════════════════════════════════════

> **路径解析**：在执行任何步骤之前，必须先调用 MCP `resolve_paths` 工具获取完整路径对象。
> 所有后续步骤中的 `{{paths.xxx}}` 变量均来自此调用的返回值。

0a. 展示后处理执行计划：
    - 待处理命题列表（来自 {{paths.readme}} / {{paths.meta_candidates}}）
    - 涉及的原子能力数量
    - 预估 spawn agent 数量：能力数 × 1 + 命题数 × 2（阶段二：markdown + experiment）+ 命题数 × 1（阶段三）+ 命题数 × 1（Briefing组装）
    - 预估执行时间

    用户操作：
    - "开始" → 进入阶段一
    - "只研究 <命题列表>" → 缩小范围后继续
    - "跳过实验" → 添加 --no-experiment，减少 agent 数量

    **跳过条件**：`--batch=pending` 模式下自动跳过检查点。

═══════════════════════════════════════════════════════════════════════════════
【阶段 1-3：研究执行】— 用户研究任务执行阶段
═══════════════════════════════════════════════════════════════════════════════

1. 读取前处理产出
   ├── {{paths.meta_capability_graph}} → 获取原子能力列表 + 依赖关系 + 战略高地
   └── {{paths.readme}} / {{paths.meta_candidates}} → 获取待处理命题列表 + 分词结果

   ┌─ 状态初始化 ─────────────────────────────────────────────────┐
   │ 调用 MCP 工具 save_state，初始化管线状态：                      │
   │   - checkpoint: "init"                                        │
   │   - context: { status: "running", stages: {...} }             │
   └───────────────────────────────────────────────────────────────┘

2. 【阶段一步骤1】能力研究
   ├── 筛选：覆盖待处理命题的能力（或扇出度 ≥ 30% 的能力）
   ├── 增量检查：{{paths.capability_file}} 所在目录中已有 → 跳过，缺失 → 研究
   ├── 为每个能力预查找 T1/T2 URL
   ├── 按滑动窗口并行 spawn（每 agent 1 个能力文件）← 具体API见运行时适配层插件
   ├── 每个 agent 双写：主文件 + summary.json
   └── ⛔ 全部完成后才能进入 ⓔ 检查点

   ┌─ 状态持久化 ─────────────────────────────────────────────────┐
   │ 调用 MCP 工具 save_state：                                    │
   │   - checkpoint: "ⓔ"                                          │
   │   - context: {                                                │
   │       "capability-research": {                                │
   │         "total": N, "completed": [...], "failed": [...],      │
   │         "retried": {...}                                      │
   │       }                                                       │
   │     }                                                         │
   └───────────────────────────────────────────────────────────────┘

   ┌─ ⓔ 检查点 E：能力研究审查 ──────────────────────────────────┐
   │ 展示内容：                                                   │
   │   - 研究完成统计：成功 N / 失败 M / 跳过 K                   │
   │   - 每个能力的质量指标（字数、信源数、覆盖象限数）            │
   │   - 失败能力列表（如有）                                     │
   │   - 战略高地能力覆盖情况                                     │
   │                                                               │
   │ 推荐操作指引：                                                │
   │   → 建议先查看战略高地能力的研究质量（影响面最大）            │
   │   → 如有失败能力，建议重跑或跳过后再继续                      │
   │   → 全部成功且无异常 → 直接"继续"即可                        │
   │                                                               │
   │ 用户操作：                                                    │
   │   - "继续" → 进入阶段一步骤2 Briefing 组装（推荐）           │
   │   - "查看 <能力ID>" → 展示该能力的完整研究内容               │
   │   - "重跑 <能力ID>" → 重新研究指定能力                       │
   │   - "跳过 <能力ID>" → 标记跳过，不参与后续组装               │
   │   - "补充信源 <能力ID> <URL>" → 追加信源后重跑               │
   └───────────────────────────────────────────────────────────────┘

3. 【阶段一步骤2】Briefing 组装（并行）
   ├── 对每个待处理命题：
   │   ├── spawn 一个独立 agent
   │   ├── 从 {{paths.meta_capability_graph}} 确定该命题涉及的能力 ID 列表
   │   ├── 读取这些能力的 summary.json
   │   ├── 按 5 种文件类型定向提取内容（见 §Briefing 组装规则）
   │   └── 生成完整 briefing，保存到 {{paths.briefing}}
   └── ⛔ 全部 briefing 生成后才能进入 ⓓ 检查点

   ┌─ 状态持久化 ─────────────────────────────────────────────────┐
   │ 调用 MCP 工具 save_state：                                    │
   │   - checkpoint: "ⓓ"                                          │
   │   - context: {                                                │
   │       "briefing-assemble": {                                  │
   │         "status": "completed",                                │
   │         "completed": [...已生成的命题列表...]                  │
   │       }                                                       │
   │     }                                                         │
   └───────────────────────────────────────────────────────────────┘

   ┌─ ⓓ 检查点 D：Briefing 预审（阶段一完成）───────────────────┐
   │ 展示内容：                                                     │
   │   - 生成的 briefing 文件列表                                    │
   │   - 每个 briefing 的能力覆盖情况（哪些能力有摘要、哪些缺失）    │
   │   - 预估阶段二 spawn 数量：                                    │
   │     - 命题数 × 2（每 agent 1 个命题：Markdown组装 + 实验组装）│
   │                                                                 │
   │ 推荐操作指引：                                                  │
   │   → 建议关注能力覆盖缺失的命题，缺失 = 组装时该维度空白        │
   │   → 阶段二 agent 数 = 命题数 × 2（Markdown组装 + 实验组装）│
   │   → 覆盖无缺失 + 不跳过实验 → 直接"继续"即可                  │
   │                                                                 │
   │ 用户操作：                                                      │
   │   - "继续" → 进入阶段二（推荐：覆盖无缺失时）                  │
   │   - "查看 <命题> briefing" → 展示具体内容                       │
   │   - "跳过实验" → 减少 experiment 文件的 spawn                   │
   │   - "回退研究 <能力ID>" → 回到阶段一步骤1重跑该能力            │
   └─────────────────────────────────────────────────────────────────┘

3. 【阶段二】命题组装
   ├── 按命题并行（每命题 2 个 agent）← 具体API见运行时适配层插件
   │   ├── Markdown组装 agent：负责 overview / edge-cases / trade-offs / references
   │   ├── 实验组装 agent：负责 experiment 目录（独立处理，避免高上下文压力下写代码）
   │   └── 每个 agent 的 task 中内联完整 briefing
   └── agent 只写文件，不读任何能力文件

   ┌─ 状态持久化 ─────────────────────────────────────────────────┐
   │ 调用 MCP 工具 save_state：                                    │
   │   - checkpoint: "ⓕ"                                          │
   │   - context: {                                                │
   │       "assembly": {                                           │
   │         "status": "completed",                                │
   │         "completed": [...已完成的命题列表...],                 │
   │         "failed": [...失败的命题列表...]                       │
   │       }                                                       │
   │     }                                                         │
   └───────────────────────────────────────────────────────────────┘

   ┌─ ⓕ 检查点 F：命题组装审查 ──────────────────────────────────┐
   │ 展示内容：                                                     │
   │   - 组装完成统计：成功 N / 失败 M / 跳过 K                     │
   │   - 每个命题的文件完整性（5 文件是否齐全）                      │
   │   - 失败文件列表（如有）                                       │
   │   - 内容比例检查（通用 ≥ 70% vs 特化 ≤ 30%）                  │
   │   - 预估阶段三 spawn 数量：                                    │
   │     - 命题数 × 1（每 agent 1 个命题）                          │
   │                                                                 │
   │ 推荐操作指引：                                                  │
   │   → 建议先查看优先级最高命题的产出质量                          │
   │   → 学习阶梯依赖文件齐全，缺失文件需补齐或跳过该命题           │
   │   → 阶段三为并行生成，可放心继续│
   │   → 文件齐全 + 无异常 → 直接"继续"即可                        │
   │                                                                 │
   │ 用户操作：                                                      │
   │   - "继续" → 进入阶段三生成学习阶梯（推荐：文件齐全时）         │
   │   - "查看 <命题>" → 展示该命题的完整目录和关键内容             │
   │   - "重跑 <命题> <文件>" → 重新组装指定文件                    │
   │   - "跳过阶梯 <命题>" → 该命题不生成学习阶梯                   │
   │   - "侧重 <命题> <方向>" → 为学习阶梯指定侧重方向              │
   └─────────────────────────────────────────────────────────────────┘

5. 【阶段三】学习阶梯生成
   ├── 并行化（每 agent 1 个命题的学习阶梯）
   │   ├── 对每个已组装的命题：
   │   │   ├── spawn 一个独立 agent
   │   │   ├── 读取阶段二产出的命题文件 + {{paths.meta_capability_graph}}
   │   │   └── 生成 {{paths.proposition_learning_ladder}}
   │   └── ⛔ 全部学习阶梯生成后才能进入 ⓖ 检查点
   └── ⛔ 全部学习阶梯生成后才能进入 ⓖ 检查点

   ┌─ 状态持久化 ─────────────────────────────────────────────────┐
   │ 调用 MCP 工具 save_state：                                    │
   │   - checkpoint: "ⓖ"                                          │
   │   - context: {                                                │
   │       "learning-ladder": {                                    │
   │         "status": "completed",                                │
   │         "completed": [...已完成的命题列表...]                  │
   │       },                                                      │
   │       "status": "completed"                                   │
   │     }                                                         │
   └───────────────────────────────────────────────────────────────┘

   ┌─ ⓖ 检查点 G：全局收尾确认 ──────────────────────────────────┐
   │ 展示内容：                                                     │
   │   - 完整产出目录结构                                           │
   │   - 各命题学习阶梯摘要（阶段数、核心能力覆盖）                  │
   │   - 全局学习路径摘要                                           │
   │   - pipeline 执行统计（总 agent 数、重跑次数）                  │
   │                                                                 │
   │ 推荐操作指引：                                                  │
   │   → 建议从学习阶梯入手，评估渐进路径是否合理                    │
   │   → 阶梯可单独重跑（并行或单线程），不满意随时调整              │
   │   → 所有产出已持久化，随时可中断、后续追加研究                  │
   │   → 产出满意 → 直接"确认完成"                                  │
   │                                                                 │
   │ 用户操作：                                                      │
   │   - "确认完成" → pipeline 结束（推荐）                          │
   │   - "查看 <命题> 阶梯" → 展示该命题的学习阶梯                  │
   │   - "重跑阶梯 <命题>" → 重新生成指定命题的学习阶梯             │
   │   - "追加研究 <新命题>" → 以 --append 模式启动新一轮           │
   └─────────────────────────────────────────────────────────────────┘
```

### ⛔ 阶段间 Barrier（强制）

**阶段一（能力研究 + Briefing 组装）必须全部完成，才能开始阶段二；阶段二必须全部完成，才能开始阶段三。**

**Barrier 通过检查点强制执行**：每个 barrier 处都有对应的检查点（ⓔⓓⓕⓖ），检查点必须暂停等待用户确认后才放行。详见 §后处理检查点协议。

原因：
- 阶段一包含两个步骤：能力研究（产出 summary.json）和 Briefing 组装（消费 summary.json）
- 如果阶段一步骤1未完成就开始组装 briefing，会缺少能力摘要
- 如果阶段一（含 Briefing 组装）未完成就开始阶段二，组装 agent 会缺少素材
- 阶段三（学习阶梯）依赖阶段二产出的完整命题文件（overview / edge-cases / trade-offs / experiment / references）
- 如果阶段二未完成就开始生成阶梯，会缺少关键的内容来源

错误模式（禁止）：
```
❌ 给每个命题分配一个 agent，让它自己「研究+组装」→ 知识库不共享，重复工作
❌ 阶一步骤1的 agent 还没完成就开始组装 briefing
❌ 阶段一未完成就开始 spawn 阶段二的 agent
❌ 把阶段一和阶段二写在同一个 agent 的 task 里
❌ 组装 agent 自己去读 {{paths.capability_file}} 所在目录的完整文件
❌ 阶段二未完成就开始生成学习阶梯
❌ 跳过检查点直接进入下一阶段（ⓔⓓⓕⓖ 是强制的，不可绕过）
```

正确模式：
```
✅ 主 agent 用滑动窗口 spawn 阶段一步骤1 agent → 全部完成（API见运行时插件）
✅ ⓔ 检查点 E：审查能力研究质量 → 用户确认后继续
✅ 主 agent 用滑动窗口 spawn 阶段一步骤2 agent（每 agent 1 个命题的 Briefing 组装）→ 全部完成
✅ ⓓ 检查点 D：预审 Briefing 覆盖情况（阶段一完成）→ 用户确认后继续
✅ 用滑动窗口 spawn 阶段二 agent：
   - Markdown 组装 agent（每 agent 1 命题，负责 overview/edge-cases/trade-offs/references）
   - 实验组装 agent（每 agent 1 命题，负责 experiment 目录）
✅ ⓕ 检查点 F：审查命题组装质量 → 用户确认后继续
✅ 用滑动窗口 spawn 阶段三 agent（每 agent 1 个命题的学习阶梯）→ 全部完成
✅ ⓖ 检查点 G：全局收尾确认 → 用户确认后 pipeline 结束
✅ 失败的 agent 可精确重跑，不影响其他
```

---

## 后处理检查点协议

> 后处理涉及大量并行 spawn，用户需在关键产物节点介入审查。
> 每个检查点主动暂停并给出操作指引，防止用户在长流程中迷失方向。

### 检查点总览

```
ⓒ 启动确认 → ⓔ 能力研究审查（阶段一步骤1）→ ⓓ Briefing 预审（阶段一完成）→ ⓕ 命题组装审查（阶段二完成）→ ⓖ 全局收尾（阶段三完成）
```

| 检查点 | 位置 | 核心产物 | 介入价值 |
|--------|------|---------|---------|
| ⓒ C | 后处理启动前 | 执行计划 | 确认范围、调整参数、减少 agent 数量 |
| ⓔ E | 阶段一步骤1完成后 | `{{paths.capability_file}}` + `{{paths.capability_summary}}` | 审查能力研究质量，决定重跑/跳过/补充 |
| ⓓ D | 阶段一完成后（含 Briefing 组装） | `{{paths.meta_briefings_dir}}` | 审查素材提取完整性，决定是否跳过实验 |
| ⓕ F | 阶段二完成后 | `{{paths.proposition_dir}}/*.md` | 审查命题组装质量，决定阶梯侧重方向 |
| ⓖ G | 阶段三完成后 | `{{paths.proposition_learning_ladder}}` | 确认最终产出，追加研究或结束 |

### 检查点行为规范

每个检查点**必须**依次执行以下三步：

1. **展示摘要**：输出当前阶段的关键产物统计和质量指标
2. **给出指引**：主动推荐最可能的下一步操作（带理由），降低用户决策负担
3. **等待输入**：暂停执行，等待用户指令后才继续

**指引原则**：
- 优先推荐"继续"（当一切正常时），并说明**为什么可以放心继续**
- 当存在异常（失败/缺失/质量不达标）时，优先推荐修复操作
- 始终告知用户当前检查点的上下游关系（"上一步产出了什么、下一步要做什么"）
- 给出明确的快速路径（"全部成功 → 直接继续"），避免用户在正常情况下也需要思考

### 跳过条件

- `--batch=pending` 模式：自动跳过所有检查点（无人值守批量处理）
- 用户在任意检查点输入"全部确认"：跳过后续所有检查点（ⓔⓓⓕⓖ），直接推进到完成
- ⓖ 检查点 G 不可跳过（必须确认最终产出）

---

## 滑动窗口并行调度

### 核心原则

- **阶段一**：每 agent 只负责 1 个能力文件（双写主文件 + summary.json）
- **阶段一步骤2**：每 agent 负责 1 个命题的 Briefing 组装（并行化方案）
- **阶段二**：每 agent 负责 1 个命题的全部象限文件（Markdown组装）+ 1 个命题的experiment（实验组装）
- **阶段三**：每 agent 负责 1 个命题的学习阶梯生成（并行化）
- **滑动窗口**：维持 N 个并发 agent，谁完成谁补位，不等整批（避免分批等待策略）
- **窗口大小**：默认 4（基于大部分平台最大5个并发子agent的限制，保留1个槽位给主agent）

### 调度算法

```
窗口大小 W = 4  # 基于大部分平台最大5个并发子agent的限制，保留1个槽位给主agent
待处理队列 Q = [任务1, 任务2, ..., 任务N]
进行中集合 running = {}
完成集合 done = {}

循环：
  while |running| < W 且 Q 非空：
    task = Q.dequeue()
    agent = spawn(task)  ← 具体API见运行时适配层插件
    running.add(agent)

  等待任意一个 agent 完成
  running.remove(完成的 agent)
  done.add(完成的 agent)

  if 该 agent 失败：
    记录失败原因，可选择重入 Q

  重复直到 Q 为空且 running 为空
```

### 状态追踪

主 agent 维护以下状态表，在每个 agent 完成时更新：

```
| 能力ID | 状态 | agent session | 备注 |
|--------|------|--------------|------|
| A1     | ✅ done | xxx | 主文件+摘要均已写入 |
| A2     | ⏳ running | xxx | |
| A3     | ❌ failed | xxx | 超时，已重入队列 |
| A4     | ⬜ pending | — | |
```

---

## 阶段一步骤1：能力研究（滑动窗口并行）

### 输入来源

- 前处理产出的 `{{paths.meta_capability_graph}}`（原子能力图谱）
- 前处理产出的 `{{paths.readme}}`（命题列表，用于筛选哪些能力需要研究）

### 信源预查找：为每个能力准备 T1/T2 URL

在 spawn agent 之前，为每个原子能力准备 T1/T2 URL：

```
对每个待研究的能力：
  1. 根据能力名称和描述，确定 T1 来源（官方文档）：
     - MDN Web Docs（浏览器 API 类）
     - Chrome DevTools 官方文档（工具类）
     - W3C/WHATWG 规范（标准类）
     - 框架官方文档（特化能力类）
  2. 确定 T2 来源（技术博客）：
     - web.dev / developer.chrome.com（Google 技术博客）
     - 大厂技术博客（Vercel/Cloudflare/字节/美团等）
  3. 将 URL 列表传入 agent 的 task
```

### 执行逻辑

```
对每个需要研究的原子能力：
  spawn 一个独立 agent
  task = 简化任务指令（见下方）
  输入：capability_id + capability_name + capability_desc + t1_urls + t2_urls + depth
  输出：
    - {{paths.capability_file}}（主文件）
    - {{paths.capability_summary}}（结构化摘要）
```

#### 简化任务指令（主 agent 发送给子 agent）

```
你是 [能力名称] 的深度研究员。

调用 `mcporter call scenario-pipeline.get_template template_type="capability-research" params='{"capability_id":"[id]","workDir":"<产出目录>"}'` 获取完整研究模板。

按返回的指令执行，无需读取其他文档。
```

### 加载条件

- 执行指令由 MCP `get_template("capability-research")` 提供，子 agent 无需读取任何文档。
- 格式规范已内嵌到 MCP 模板中（源自 plugins/capability-research-mode.md）。

### 并行管理

- 每个能力分配一个独立 agent（**一个 agent 一个文件，禁止合并**）
- 能力之间无依赖，可完全并行
- 使用滑动窗口调度，维持稳定并发数
- **等待所有能力 agent 完成后才能进入 Briefing 组装**

### 输出

```
{{paths.capabilities_readme}} 所在目录     ← 能力知识库（人类阅读）
├── README.md                      ← {{paths.capabilities_readme}}：能力索引 + 依赖图 + 学习路径（从 JSON 派生）
├── A1-浏览器渲染管线.md            ← {{paths.capability_file}} 示例
├── A2-DOM节点生命周期.md
└── ...

{{paths.meta_summaries_dir}}               ← 结构化摘要（机器消费）
├── A1-浏览器渲染管线.json           ← {{paths.capability_summary}} 示例
├── A2-DOM节点生命周期.json
└── ...
```

**{{paths.capabilities_readme}} 模板：**

```markdown
# 原子能力知识库

> 本目录是跨命题复用的原子能力参考手册。
> 每个能力条目包含：核心机制、工程瓶颈、调试工具、典型权衡、最小验证实验。

## 能力索引

| ID | 能力 | 技术层 | 扇出度 | 耦合度 | 战略价值 | 级别 |
|----|------|--------|--------|--------|---------|------|
| A8 | DevTools 性能分析 | 工具层 | 7/7 | 1 | 7.0 | 🏔️ 一级 |
| A1 | 浏览器渲染管线 | 浏览器层 | 5/7 | 1 | 5.0 | 🏔️ 一级 |
| ... | | | | | | |

## 依赖关系

（用文本树或 Mermaid 图展示能力之间的依赖）

## 学习路径

（从 {{paths.meta_capability_graph}} 的 learning_path 派生，带链接）
```

---

## 阶段一步骤2：Briefing 组装

> 阶段一步骤1（能力研究）全部完成后执行此步骤。

### 执行逻辑

#### 并行化Briefing组装

```
对每个待处理命题：
  spawn 一个独立 agent
  task = 简化任务指令（见下方）
  输入：
    - proposition（命题文本）
    - capability_ids（该命题涉及的能力ID列表）
    - summary_files（这些能力的summary.json内容）
  输出：
    - {{paths.briefing}}
```

#### 简化任务指令（主 agent 发送给子 agent）

```
你是 [命题名称] 的 Briefing 组装专家。

调用 `mcporter call scenario-pipeline.get_template template_type="briefing-assemble" params='{"seq":"[序号]","workDir":"<产出目录>"}'` 获取完整组装模板。

按返回的指令执行，无需读取其他文档。
```

### 加载条件

- 执行指令由 MCP `get_template("briefing-assemble")` 提供，子 agent 无需读取任何文档。

---

## 阶段二：命题组装（滑动窗口并行）

### 输入来源

- 阶段一产出的 `{{paths.briefing}}`（已内联到 agent task）
- 前处理产出的 `{{paths.readme}}`（命题列表 + 分词结果）

### 执行逻辑

#### 执行逻辑

```
对每个待处理命题：
  spawn 两个独立 agent：
    1. Markdown组装 agent
       task = 简化任务指令（见下方）
       输入：
         - proposition（命题文本）
         - decomposition（分词结果）
         - briefing（完整briefing）
       输出：
         - {{paths.proposition_overview}}
         - {{paths.proposition_edge_cases}}
         - {{paths.proposition_trade_offs}}
         - {{paths.proposition_references}}
    2. 实验组装 agent
       task = 简化任务指令（见下方）
       输入：
         - proposition（命题文本）
         - decomposition（分词结果）
         - briefing（完整briefing）
       输出：
         - {{paths.proposition_experiment}}
```

#### 简化任务指令 - Markdown组装 agent

```
你是 [命题名称] 的 Markdown 组装专家。

调用 `mcporter call scenario-pipeline.get_template template_type="assemble" params='{"seq":"[序号]","workDir":"<产出目录>"}'` 获取完整组装模板。

按返回的指令执行，无需读取其他文档。
```

#### 简化任务指令 - 实验组装 agent

```
你是 [命题名称] 的实验组装专家。

调用 `mcporter call scenario-pipeline.get_template template_type="assemble" params='{"seq":"[序号]","workDir":"<产出目录>"}'` 获取完整组装模板。

按返回的指令执行，无需读取其他文档。
```

### 加载条件

- 执行指令由 MCP `get_template("assemble")` 提供，子 agent 无需读取任何文档。
- 组装格式和四象限框架已内嵌到 MCP 模板中。

### 内容比例约束

组装产出必须遵循：
- 通用高地内容（框架无关）≥ 70%
- 特化内容（框架相关）≤ 30%
- 开篇（10-15%）从限定词切入建立共鸣
- 主体（70-80%）讲通用原理
- 收尾（10-15%）回到限定词给落地方案

### 并行管理

#### 按命题并行（Markdown组装 + 实验组装）

- 每个命题分配两个独立 agent：
  - **Markdown组装 agent**：负责 overview / edge-cases / trade-offs / references
  - **实验组装 agent**：负责 experiment 目录（独立处理，避免高上下文压力下写代码）
- 不同命题之间可并行
- 使用滑动窗口调度（窗口大小默认4）



### 输出

```
{{paths.proposition_dir}}
├── {{paths.proposition_overview}}      # Q1: 链路编排
├── {{paths.proposition_edge_cases}}    # Q2: 坑点提取
├── {{paths.proposition_trade_offs}}    # Q3: 方案对比
├── {{paths.proposition_experiment}}    # Q4: 实验组装
│   ├── README.md
│   └── src/
└── {{paths.proposition_references}}    # 参考资料
```

### 命题目录命名规范

```
格式：<两位序号>-<命题中文简称>
示例：
  ✓ 01-长列表渲染
  ✓ 02-首屏白屏
  ✓ 03-网络优化
```

## 摘要回传

每个命题组装完成后，输出 ≤200 字摘要：
- 核心链路（一句话）
- 最大坑点（一个）
- 推荐首选技术路线（附理由）
- 覆盖的战略高地（列出能力 ID）
- 实验目录路径

---

## ⛔ 阶段间 Barrier（阶段一 → 阶段二 → 阶段三）

**阶段一（能力研究 + Briefing 组装）必须全部完成，才能开始阶段二；阶段二必须全部完成，才能开始阶段三。**

原因：
- 阶段二的 briefing 依赖阶段一步骤1产出的 summary.json
- 如果阶段一步骤1未完成就开始组装 briefing，会缺少能力摘要
- 如果阶段一（含 Briefing 组装）未完成就开始阶段二，组装 agent 会缺少素材
- 阶段三（学习阶梯）依赖阶段二产出的完整命题文件（overview / edge-cases / trade-offs / experiment / references）
- 如果阶段二未完成就开始生成阶梯，会缺少关键的内容来源

---

## 阶段三：学习阶梯生成

> 阶段二全部完成后执行此步骤。

### 执行逻辑

#### 并行化学习阶梯生成

```
对每个已组装的命题：
  spawn 一个独立 agent
  task = 简化任务指令（见下方）
  输入：
    - proposition（命题文本）
    - capability_graph（能力依赖图）
    - summaries（该命题涉及的能力摘要）
    - proposition_files（该命题的产出文件）
  输出：
    - {{paths.proposition_learning_ladder}}
```

#### 简化任务指令（主 agent 发送给子 agent）

```
你是 [命题名称] 的学习阶梯生成专家。

调用 `mcporter call scenario-pipeline.get_template template_type="learning-ladder" params='{"seq":"[序号]","workDir":"<产出目录>"}'` 获取完整生成模板。

按返回的指令执行，无需读取其他文档。
```



### 输入

| 输入 | 来源 | 路径 |
|------|------|------|
| 能力依赖图 | 前处理 | `{{paths.meta_capability_graph}}` |
| 能力摘要 | 阶段一 | `{{paths.meta_summaries_dir}}<id>.json` |
| 命题产出 | 阶段二 | `{{paths.proposition_overview}}`、`{{paths.proposition_edge_cases}}`、`{{paths.proposition_trade_offs}}`、`{{paths.proposition_experiment}}`、`{{paths.proposition_references}}` |

### 输出

```
{{paths.proposition_learning_ladder}}    ← 每个命题一个，唯一新增文件
```

### 详细执行逻辑

执行指令由 MCP `get_template("learning-ladder")` 提供。详见 MCP templates 中的 `learning-ladder.md`。

---

## 增量复用

当已有部分能力知识库时：

```
检查 {{paths.capability_file}} 所在目录中已有的能力条目
  → 已有：直接复用，跳过该能力的研究
  → 同时检查 {{paths.meta_summaries_dir}} 中是否有对应摘要
    → 有摘要：复用，跳过
    → 无摘要：需要补生成（可从已有主文件中提取）
  → 缺失：调用 MCP template `get_template("capability-research")` 补充研究（双写）
```

### 阶段一步骤2增量（Briefing 组装）

```
检查 {{paths.meta_briefings_dir}} 中已有的 briefing
  → 已有该命题的 briefing：复用，跳过
  → 缺失：从 summary.json 重新生成
  → 命题涉及的能力有变更：重新生成该命题的 briefing
```

---

## 单命题快速路径

当只处理单个命题（非批量）时，可简化为：

```
1. 从 {{paths.meta_capability_graph}} 识别该命题依赖的原子能力
2. 增量检查 {{paths.capability_file}} 所在目录 + {{paths.meta_summaries_dir}}，缺失的用滑动窗口并行研究（双写）
3. 阶段一步骤2：从 summary.json 组装该命题的 briefing（可并行化）
4. 阶段二：组装该命题（1个agent负责Markdown文件，1个agent负责experiment）
5. 阶段三：生成该命题的学习阶梯（并行化）
```

---

## 中断恢复协议（Interrupt & Resume Protocol）

> 本节定义管线执行过程中用户中断、接管、恢复的标准流程。
> 核心原则：**用户随时可以暂停，暂停后随时可以恢复，恢复后不丢失已完成工作。**

### 中断类型

| 类型 | 触发方式 | 影响范围 | 终止行为 | 状态持久化 |
|------|---------|---------|---------|-----------|
| **检查点中断** | 用户在检查点(ⓒⓔⓓⓕⓖ)选择"暂停" | 当前阶段已完成，等待确认 | 无需终止（自然暂停） | ✅ 自动持久化 |
| **阶段内中断** | 用户在阶段执行中输入"暂停"/"停" | 当前 agent 完成后暂停，不启动新 agent | 等待运行中 agent 自然完成（不强制终止） | ✅ 已完成产出持久化 |
| **紧急中断** | 用户输入"立即停止" | 立即停止 spawn 新 agent，运行中 agent 发送终止信号 | 发送终止信号 → 等待 10s → 超时强制清理；半成品产出标记 `status: incomplete`，不参与后续管线 | ✅ 已完成产出持久化 + 半成品标记 |

### 阶段内中断流程

当用户在阶段执行中（非检查点位置）请求暂停时：

```
1. 主 agent 停止 spawn 新的子 agent
2. 等待当前运行中的子 agent 完成（不强制终止，避免产出损坏）
3. 收集已完成的产出，更新 {{paths.meta_pipeline_state}}
4. 向用户展示：
   - 已完成的能力/命题数量
   - 未完成的能力/命题列表
   - 当前管线阶段（阶段一/二/三）
5. 暂停，等待用户指令
```

### 状态持久化：{{paths.meta_pipeline_state}}

管线运行过程中自动维护状态文件，支持断点恢复：

```json
{
  "pipeline_id": "20260507-1918",
  "started_at": "2026-05-07T19:18:00Z",
  "current_phase": "phase1",
  "current_step": "capability-research",
  "status": "paused",
  "phase1": {
    "step1_capability_research": {
      "total_capabilities": 16,
      "completed": ["A1", "A2", "A3", "A4", "A5"],
      "running": ["A6"],
      "pending": ["A7", "A8", "A9", "W1", "W2", "VI1", "VI2", "VI3", "R1", "R2"],
      "failed": []
    },
    "step2_briefing_assemble": {
      "completed": false,
      "briefings_completed": []
    }
  },
  "phase2": {
    "total_propositions": 8,
    "assembled": [],
    "pending": []
  },
  "phase3": {
    "learning_ladders_completed": [],
    "pending": []
  },
  "checkpoints_passed": ["ⓒ"],
  "last_checkpoint": "ⓒ",
  "interrupt_type": "checkpoint",
  "interrupt_reason": "user_requested"
}
```

### 紧急中断后的特殊处理

紧急中断后，`{{paths.meta_pipeline_state}}` 的 `interrupt_type` 字段为 `"emergency"`。恢复时需额外步骤：

```
1. 读取 {{paths.meta_pipeline_state}}，检测 interrupt_type
2. 如果 interrupt_type == "emergency"：
   a. 扫描产出目录，识别 status: incomplete 的半成品文件
   b. 展示半成品列表，询问用户：丢弃 / 保留但标记 / 重新生成
   c. 清理已丢弃的半成品后，再进入正常恢复流程
3. 如果 interrupt_type != "emergency"：直接进入正常恢复流程
```

### 恢复流程

用户说"继续"/"恢复"时：

```
1. 调用 `mcporter call scenario-pipeline.restore_state --args '{"workDir":"<产出目录>"}'`
   - 返回恢复指令：resume_from, current_stage, completed_items, pending_items, failed_items, interrupt_type
2. 确认当前阶段和进度
3. 增量检查：
   - {{paths.capability_file}} 所在目录中已有 → 跳过
   - {{paths.meta_summaries_dir}} 中已有 → 跳过
   - {{paths.meta_briefings_dir}} 中已有 → 跳过
   - 命题目录中已有文件 → 跳过
4. 从断点继续：
   - 阶段一步骤1中断 → 从未完成的能力继续 spawn
   - 阶段一步骤2中断 → 重新执行 Briefing 组装
   - 阶段二中断 → 从未完成的命题继续组装
   - 阶段三中断 → 从未完成的学习阶梯继续生成
5. 展示恢复摘要："从 [阶段X-步骤Y] 恢复，已完成 N/M，继续处理剩余..."
```

### 接管协议（Takeover Protocol）

用户在管线执行中要求接管部分产出时：

```
用户："停，我要手动调整 02-首屏白屏的 overview"

1. 管线暂停（同阶段内中断流程）
2. 允许用户查看/编辑指定文件
3. 用户完成修改后说"继续"
4. 管线从断点恢复，已修改的文件不被覆盖
5. 未完成的命题继续组装
```

**接管约束**：
- 用户只能接管已生成的文件，不能干预正在运行的子 agent
- 接管修改后的文件需用户确认"OK"才标记为已完成
- 接管不影响其他命题的组装进度

### 中断后操作菜单

用户中断后，展示以下操作选项：

```
┌─ 🛑 管线已暂停 ──────────────────────────────────────────┐
│ 当前阶段：[阶段X - 步骤Y]                                │
│ 已完成：N/M 个能力/命题                                   │
│ 未完成：[列表]                                           │
│                                                           │
│ 可选操作：                                                │
│   "继续" — 从断点恢复管线                                 │
│   "查看 <ID>" — 查看指定能力/命题的产出                   │
│   "修改 <文件路径>" — 接管指定文件的编辑                   │
│   "跳过 <ID>" — 跳过指定能力/命题                         │
│   "重跑 <ID>" — 重新处理指定能力/命题                     │
│   "缩小范围" — 只处理部分命题                             │
│   "结束" — 保存当前产出，终止管线                         │
└───────────────────────────────────────────────────────────┘
```
