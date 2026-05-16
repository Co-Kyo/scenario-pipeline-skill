---
title: Pipeline 需求执行模式四级模型
version: 1.2.0
status: current
last_updated: 2026-05-14
supersedes: ~
superseded_by: ~
---

# Pipeline 需求执行模式四级模型（Architecture Model）

本文档定义 scenario-pipeline 中所有需求任务的执行模式分类标准，并作为后续 MCP 模板化改造、Skill 过程文档演进的顶层约束。

---

## 1. 四级模型总览

| 级别 | 模式名 | 决策主体 | 核心判断 |
|------|--------|---------|----------|
| **L1** | 固定规则 | **代码 / 配置** | 输入确定 → 输出完全确定，无推理 |
| **L2** | 模板执行 | **MCP 模板** | 执行框架可枚举，变量由参数填充 |
| **L3** | 方法引导 | **Skill 过程文档** | 方法论固定，具体执行路径需推理 |
| **L4** | 自由推理 | **LLM 自身** | 仅有目标描述，路径与内容都需推理 |

> **Schema 驱动范式**（§8）是四级模型的统一落地方法论：所有级别共享 `get → execute → submit` 链路，区别仅在 schema 粒度。

---

## 2. 判定规则

```
Q1: 输入确定后，输出是否完全确定？
  YES → L1
  NO  ↓

Q2: 执行步骤是否可预先枚举？
  YES → L2
  NO  ↓

Q3: 是否存在可复用的方法论 / 评估框架？
  YES → L3（执行前必须加载方法论定义文档，见 §3 加载契约）
  NO  → L4
```

---

## 3. 各级别架构归属

### L1 固定规则
- **归属**：MCP 工具（纯函数）或配置常量
- **特征**：无 prompt、无推理、可单元测试
- **当前实例**：`save_state`、`restore_state`、`get_sources`、路径生成规则

### L2 模板执行
- **归属**：MCP `get_template`（SSoT，自包含完整指令）
- **特征**：模板即完整执行手册，agent 调用后无需再读取任何 skill 文档
- **当前实例**：`capability-research`、`assemble`、`briefing-assemble`、`learning-ladder`
- **改造要求**：当前四个模板为"薄壳"（仅转发 process 文档引用），需改造为"厚壳"（自包含路径规范、执行步骤、输出要求、验证清单）

### L3 方法引导
- **归属**：Skill 过程文档（`references/processes/*.md`）+ LLM 推理
- **特征**：方法论 / 评估框架固定，但具体提取、识别、打分需推理
- **当前实例**：`decompose`、`capability-extract`、`highground-identify`、`evaluate`
- **注意**：L3 任务不应模板化，其价值在于推理灵活性

**加载契约（L3 执行前置条件）**：

> L3 的"方法论固定"必须落地为显式加载。未加载对应 core/ 方法论文档而执行 L3 任务，等同于将 L3 降级为 L4。

| L3 任务 | 必须加载的 core/ 文档 | 方法论锚点 |
|---------|---------------------|-----------|
| decompose | architecture-decomposition.md | 架构分词：标注不是拆分 |
| capability-extract | capability-graph.md | 原子能力图谱：依赖拓扑 + 扇出度 |
| highground-identify | strategic-highground.md | 战略高地：累积价值 + 覆盖排序 |
| evaluate | scenario-matrix.md | 四维评估：跨栈耦合/文档真空/经验壁垒/时事热度 |

> **可观测性注**：L3 产出质量可通过输出结构的完整性来推断——如果加载契约被执行，输出 JSON 中的方法论特有字段（如 dependency_graph、fanout 对象结构、四维评分）应自然存在。字段缺失是方法论未被加载的信号。
>
> **可控性边界注**：方法论能控制的是——评估维度、计算规则、校验清单、异常处理策略。不能控制的是——具体打分值、具体能力提取结果、具体命题识别。前者是 L3 的"固定"部分，后者是 L3 的"推理"部分。

### L4 自由推理
- **归属**：Skill 入口描述 + LLM 自主决策
- **特征**：仅有目标和约束，路径与内容完全由模型推理
- **当前实例**：`scan`、一次性深度分析、探索性调研

---

## 4. 当前 Pipeline 任务映射

### 前处理阶段

| 步骤 | 级别 | 说明 |
|------|------|------|
| scan | L4 | 扫描结果取决于输入材料，无法预枚举 |
| decompose | L3 | 分解方法论固定（架构分词），具体分法需推理 |
| capability-extract | L3 | 提取框架固定（core/capability-graph.md），结果需推理 |
| highground-identify | L3 | 识别标准固定（core/strategic-highground.md），结果需推理 |
| evaluate | L3 | 评估矩阵固定（core/scenario-matrix.md），打分需推理 |
| pool | L1 | 候选池写入是确定性操作 |

### 后处理阶段

| 步骤 | 当前级别 | 目标级别 | 改造说明 |
|------|---------|---------|----------|
| capability-research | L2（薄壳） | **L2（厚壳 SSoT）** | 充实模板内容，消除对 process 文档依赖 |
| briefing-assemble | L2（薄壳） | **L2（厚壳 SSoT）** | 同上 |
| assemble | L2（薄壳） | **L2（厚壳 SSoT）** | 同上 |
| learning-ladder | L2（薄壳） | **L2（厚壳 SSoT）** | 同上 |
| save_state / restore_state | L1 | **L1** | 无需变更 |
| 路径生成 | L1（隐式） | **L1（显式 MCP 工具）** | 收敛到 MCP，消除分散定义 |

---

## 5. MCP ↔ Skill 双侧改造原则

> **每一层的迁移都同时涉及 MCP 改造和 Skill 文档改造。**
> 四级模型定义的是需求重心归属，不是改造范围边界。
> MCP 和 Skill 是协作关系：MCP 提供工具/模板/数据底座，Skill 提供流程编排/方法论/行为指导。
> 任何一层的改造如果只动了一侧，都不算完成。

| 层级 | MCP 侧职责 | Skill 侧职责 | 典型联动 |
|------|-----------|-------------|---------|
| **L1** | 实现确定性工具（路径解析、状态管理） | 将散文式路径/规则替换为 MCP 工具调用说明 | MCP 新增 `resolve_paths` → Skill 文档消除硬编码路径 |
| **L2** | 厚壳模板（自包含完整执行指令） | 编排文档更新调用方式、检查点消费逻辑 | MCP 模板自包含化 → Skill 过程文档降级为引用层 |
| **L3** | 提供数据支撑（摘要查询、状态恢复） | 加载 core/ 方法论文档 + 保留推理灵活性 | MCP 提供数据 → Skill 必须加载 core/ 后再推理 |
| **L4** | 最小化支持（仅状态持久化） | 入口描述、目标约束 | MCP 仅兜底 → Skill 全权引导 |

**改造验收标准**：每层改造完成后，必须同时验证 MCP 侧行为正确 + Skill 文档引用一致。单侧完成不算闭环。

---

## 6. 模型约束

1. **L2 模板必须自包含**：模板即完整执行手册，不得引用外部 process 文档作为补充
2. **L2 参数必须显式化**：所有动态变量使用 `{{param}}` 占位符，调用方必须显式传入
3. **L2 路径规范必须集中在 MCP**：工作目录、输出路径、临时文件路径的生成规则统一在 MCP 模板内定义
4. **L3 不得模板化**：L3 任务的价值在于推理灵活性，模板化会扼杀这一特性
5. **L1 不得包含推理**：L1 工具必须是确定性函数，任何需要判断的逻辑都应上移到 L2/L3
6. **每层改造必须双侧同步**：MCP 和 Skill 都要改，单侧完成不算闭环
7. **L3 执行必须加载方法论定义**：L3 process 文档执行前，必须将 §3 加载契约中对应的 core/ 方法论文档加载到上下文。未加载方法论而直接执行 process 步骤，视为 L4 裸跑，不符合 L3 执行标准

---

## 7. 演进策略

当一个 L4 任务经过多次实践后变得可枚举：
1. 提取其执行模式到 Skill 过程文档 → 降级为 L3
2. 当 L3 的方法论进一步固化，执行步骤完全可枚举 → 升级为 L2，收入 MCP 模板
3. 当 L2 的所有参数都可自动生成（无需 LLM 推理） → 降级为 L1，改写为 MCP 工具函数

---

## 8. 统一 Schema 驱动范式

> 本节定义四级模型的**统一落地方法论**。四级模型定义了"谁决策"，本节定义"怎么保证产出质量"。

### 8.1 核心链路

所有步骤（L1-L4）共享同一条产出链路：

```
获取标准 → 执行任务 → 产出合规文件
```

区别仅在于**标准的粒度**：

| 级别 | 标准来源 | 标准内容 | 执行自由度 |
|------|---------|---------|-----------|
| **L1** | MCP 工具的 inputSchema | 输入/输出契约 | 无（纯函数） |
| **L2** | `get_template` | 执行指令 + 输出 schema + 校验规则 | 无（按模板填充） |
| **L3** | `get_template` | 输出 schema + 校验规则（不含执行指令） | 高（推理路径自由） |
| **L4** | `get_template` | 仅输出 schema | 完全自由 |

### 8.2 三件套模型

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP Server                              │
│                                                             │
│  get_template(step)        → 执行指令 + 数据上下文          │
│  get_output_schema(step)   → 输出 schema + field_rules     │
│  submit_output(step, data) → 校验 + 写入                    │
│                                                             │
│  三者关系：                                                  │
│  - get_template 告诉 agent "怎么做"                         │
│  - get_output_schema 告诉 agent "产出什么格式"              │
│  - submit_output 保证"产出符合标准"                         │
└─────────────────────────────────────────────────────────────┘
```

**各层使用组合**：

| 级别 | get_template | get_output_schema | submit_output |
|------|-------------|-------------------|---------------|
| L1 | — | — | —（纯函数，无需 schema） |
| L2 | ✅ 完整模板 | ✅（模板内嵌或独立引用） | ✅ 校验 + 写入 |
| L3 | ✅ 仅 schema + 校验 | ✅ 独立调用 | ✅ 校验 + 写入 |
| L4 | — | ✅ 仅输出 schema | ✅（可选，仅格式校验） |

### 8.3 现有实现与泛化路径

**已有实现**（summary 域）：

```
get_summary_schema  → 返回 template + field_rules + strict_note
submit_summary      → 校验 + 写入 summary.json
schema.ts           → 模板定义 + 字段规则 + 校验函数
```

**泛化方向**：

```
get_summary_schema  →  get_output_schema(step)     参数化，复用到所有步骤
submit_summary      →  submit_output(step, data)   参数化，复用到所有步骤
schema.ts           →  schemas/<step>.ts           每个步骤独立 schema 文件
```

**命名演进**：

| 当前名称 | 问题 | 目标名称 | 理由 |
|---------|------|---------|------|
| `get_summary_schema` | "summary" 硬编码，无法泛化 | `get_output_schema` | 统一所有步骤的 schema 获取 |
| `submit_summary` | "summary" 硬编码，无法泛化 | `submit_output` | 统一所有步骤的输出提交 |
| `get_template` | 职责过重（模板+schema+校验耦合） | 保持，但内部职责拆分 | 名称准确，不改名 |

### 8.4 各步骤 Schema 管理现状

| 步骤 | 级别 | 格式定义 | 校验机制 | 完整度 |
|------|------|---------|---------|--------|
| scan | L4 | MCP schema (raw-materials.schema.ts) | submit_output 自动校验 | 10/10 |
| decompose | L3 | MCP schema (decompositions.schema.ts) | submit_output 自动校验 | 10/10 |
| capability-extract | L3 | MCP schema (capability-graph.schema.ts) | submit_output 自动校验 | 10/10 |
| highground-identify | L3 | MCP schema (highgrounds.schema.ts) | submit_output 自动校验 | 10/10 |
| evaluate | L3 | MCP schema (evaluations.schema.ts) | submit_output 自动校验 | 10/10 |
| capability-research | L2 | MCP schema (summary/schema.ts) | submit_output 自动校验 | 10/10 |
| assemble | L2 | MCP 模板内结构定义 | 验证清单 | 7/10 |
| briefing-assemble | L2 | MCP 模板内 | 验证清单 | ?/10 |
| learning-ladder | L2 | MCP 模板内 | 验证清单 | ?/10 |

**关键问题**：
- decompose 和 evaluate 的输出示例是 YAML，但编排层期望 JSON — 格式断裂
- capability-extract 有完善校验，decompose/evaluate 完全无校验 — 覆盖不均
- 前处理 process 文档和后处理 MCP 模板各自独立描述同一数据结构 — 无共享 schema

### 8.5 信息流 Schema 完整性

```
scan ──→ decompose ──→ capability-extract ──→ highground-identify ──→ evaluate ──→ pool
  │          │                │                      │                   │          │
  ↓          ↓                ↓                      ↓                   ↓          ↓
raw-     decompositions   capability-graph      highgrounds         evaluations  README
materials .json          .json                 .json               .json        .md
.json

Schema 断裂点：
  ✗ decompose 输出(YAML) ≠ capability-extract 输入(JSON)
  ✗ evaluate 输出(YAML) ≠ 编排层期望(JSON)
  ✗ 前处理 capability-graph.json 和后处理 MCP 模板各自独立描述，无共享 schema
```

### 8.6 Schema Registry 设计

```
mcp-server/src/
  schemas/                          ← 集中管理所有步骤的输出 schema
    raw-materials.schema.ts         ← scan 输出
    decompositions.schema.ts        ← decompose 输出
    capability-graph.schema.ts      ← capability-extract 输出（前处理+后处理共享）
    highgrounds.schema.ts           ← highground-identify 输出
    evaluations.schema.ts           ← evaluate 输出

  validators/                       ← 通用校验框架
    index.ts                        ← 校验器注册 + 通用校验逻辑

  domains/
    summary/                        ← 现有，后续泛化为 output/
      schema.ts                     ← 迁移到 schemas/capability-research.schema.ts
      get-summary-schema.ts         ← 泛化为 get-output-schema.ts
      submit-summary.ts             ← 泛化为 submit-output.ts
```

### 8.7 与四级模型的关系

本范式是四级模型的**落地方法论**，不是替代：

```
四级模型（§1-§7）：定义"谁决策"
  L1 = 代码决策，L2 = 模板决策，L3 = 方法论+推理，L4 = 纯推理

Schema 驱动范式（§8）：定义"怎么保证质量"
  所有级别共享 get → execute → submit 链路
  区别仅在 schema 粒度
```

两者共同构成完整的执行框架：
- 四级模型决定**执行主体**（MCP/模板/方法论/LLM）
- Schema 范式决定**产出标准**（格式/校验/写入）
