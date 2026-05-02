# 后处理编排

> 纯编排文件：定义后处理的两阶段管线和调用关系。
> 每个步骤的实现在 `processes/` 目录下。

---

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

## 两阶段管线

```
阶段一：能力研究（并行）          阶段二：命题组装（并行）

  ┌─────────────────┐            ┌─────────────────┐
  │ capability-      │            │ assemble        │
  │ research × N     │──知识库──→│ × M 命题        │
  │ (并行)           │            │ (并行)          │
  └─────────────────┘            └─────────────────┘
        ↑                              ↑
        │                              │
  .meta/capability-graph.json    decompositions[]
  (来自前处理)                  + capabilities/
```

---

## 编排者指令（Orchestrator Instructions）

> 本节定义编排者（主 agent）的执行协议。**必须严格遵循两阶段顺序，禁止合并。**

### 执行流程

```
1. 读取前处理产出
   ├── .meta/capability-graph.json → 获取原子能力列表 + 依赖关系 + 战略高地
   └── README.md / .meta/candidates.md → 获取待处理命题列表 + 分词结果

2. 【阶段一】识别需要研究的原子能力
   ├── 筛选：覆盖待处理命题的能力（或扇出度 ≥ 30% 的能力）
   ├── 增量检查：capabilities/ 中已有 → 跳过，缺失 → 研究
   ├── 并行 spawn 能力研究 agent（每个能力一个 agent）
   └── ⛔ 阻塞等待：全部能力 agent 完成后，才能进入阶段二

3. 【阶段二】组装命题
   ├── 并行 spawn 组装 agent（每个命题一个 agent）
   └── 各 agent 读取 capabilities/ 中的共享知识库
```

### ⛔ 阶段间 Barrier（强制）

**阶段一必须全部完成，才能开始阶段二。**

原因：
- 阶段二依赖阶段一的 capabilities/ 知识库作为输入
- 如果阶段一未完成就开始阶段二，组装 agent 会缺少能力参考，导致内容不完整或重复研究
- 这正是两阶段管线的核心价值：**先原子化，再组装复用**

错误模式（禁止）：
```
❌ 给每个命题分配一个 agent，让它自己「研究+组装」→ 知识库不共享，重复工作
❌ 阶段一的 agent 还没完成就开始 spawn 阶段二的 agent
❌ 把阶段一和阶段二写在同一个 agent 的 task 里
```

正确模式：
```
✅ 主 agent 作为编排者，先 spawn 全部阶段一 agent → 等完成 → 再 spawn 全部阶段二 agent
✅ 阶段一和阶段二是两个独立的 spawn 批次，中间有显式的等待/检查点
```

---

## 阶段一：能力研究（并行）

### 输入来源

- 前处理产出的 `.meta/capability-graph.json`（原子能力图谱）
- 前处理产出的 `README.md`（命题列表，用于筛选哪些能力需要研究）

### 执行逻辑

```
对每个需要研究的原子能力：
  并行调用 processes/capability-research.md
  输入：capability_id + capability_name + capability_desc + depth
  输出：capabilities/<id>-<name>.md（能力知识库条目）
```

### 加载条件

- 始终加载：plugins/capability-research-mode.md（材料块格式规范）
- 始终加载：core/capability-graph.md（能力定义参考）

### 并行管理

- 每个能力分配一个独立 agent
- 能力之间无依赖，可完全并行
- **等待所有能力 agent 完成后才能进入阶段二**（见编排者指令）

### 输出

```
capabilities/                      ← 能力知识库
├── README.md                      ← 能力索引 + 依赖图 + 学习路径（从 JSON 派生）
├── A1-浏览器渲染管线.md
├── A2-DOM节点生命周期.md
└── ...
```

**capabilities/README.md 模板：**

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

（从 capability-graph.json 的 learning_path 派生，带链接）
```

---

## 阶段二：命题组装（并行）

### 输入来源

- 阶段一产出的 `capabilities/` 知识库
- 前处理产出的 `.meta/capability-graph.json`（能力依赖 + 战略高地）
- 前处理产出的 `README.md`（命题列表 + 分词结果）

### 执行逻辑

```
对每个待处理命题：
  并行调用 processes/assemble.md
  输入：proposition + decomposition + capabilities/（该命题依赖的子集）+ depth + platform
  输出：workflow/research/<序号>-<命题简称>/ 目录
```

### 加载条件

- 始终加载：plugins/capability-research-mode.md（组装格式参考）
- 始终加载：core/scenario-matrix.md（四象限框架）

### 内容比例约束

组装产出必须遵循：
- 通用高地内容（框架无关）≥ 70%
- 特化内容（框架相关）≤ 30%
- 开篇（10-15%）从限定词切入建立共鸣
- 主体（70-80%）讲通用原理
- 收尾（10-15%）回到限定词给落地方案

### 并行管理

- 每个命题分配一个独立 agent
- 命题之间无依赖，可完全并行
- 各命题可使用不同的能力知识库子集

### 输出

```
workflow/research/<序号>-<命题简称>/
├── overview.md      # Q1: 链路编排
├── edge-cases.md    # Q2: 坑点提取
├── trade-offs.md    # Q3: 方案对比
├── experiment/      # Q4: 实验组装
│   ├── README.md
│   └── src/
└── references.md    # 参考资料
```

### 命题目录命名规范

```
格式：<两位序号>-<命题中文简称>
示例：
  ✓ 01-长列表渲染
  ✓ 02-首屏白屏
  ✓ 03-网络优化
  ✗ long-list-virtual（slug 不直观）
  ✗ P1（纯编号无语义）
```

---

## 摘要回传

每个命题组装完成后，输出 ≤200 字摘要：
- 核心链路（一句话）
- 最大坑点（一个）
- 推荐首选技术路线（附理由）
- 覆盖的战略高地（列出能力 ID）
- 实验目录路径

---

## 增量复用

当已有部分能力知识库时：

```
检查 capabilities/ 目录中已有的能力条目
  → 已有：直接复用，跳过该能力的研究
  → 缺失：调用 processes/capability-research.md 补充研究
```

这使得新命题的处理成本 = 缺失能力的研究成本 + 组装成本。

---

## 单命题快速路径

当只处理单个命题（非批量）时，可简化为：

```
1. 从 .meta/capability-graph.json 识别该命题依赖的原子能力
2. 增量检查 capabilities/，缺失的并行研究（通常 4-6 个）
3. 组装该命题
```

跳过候选池筛选，直接从能力研究开始。**但两阶段顺序不变：先研究完全部能力，再组装。**
