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
  │ research × N     │──材料块──→│ × M 命题        │
  │ (并行)           │            │ (并行)          │
  └─────────────────┘            └─────────────────┘
        ↑                              ↑
        │                              │
  capability_graph              decompositions[]
  (来自前处理)                  + material_blocks[]
```

---

## 阶段一：能力研究（并行）

### 输入来源

- 前处理产出的候选池（`workflow/research/candidates.md`）
- 其中的原子能力扇出度表 + 战略高地信息

### 执行逻辑

```
对每个扇出度 ≥ 30% 的原子能力（或被待处理命题命中的能力）：
  并行调用 processes/capability-research.md
  输入：capability_id + capability_name + capability_desc + depth
  输出：capability_block（材料块）
```

### 加载条件

- 始终加载：plugins/capability-research-mode.md（材料块格式规范）
- 始终加载：core/capability-graph.md（能力定义参考）

### 并行管理

- 每个能力分配一个独立 agent
- 能力之间无依赖，可完全并行
- 等待所有能力 agent 完成后进入阶段二

### 输出

```
material_blocks[]  — 标准化材料块列表
存储位置：workflow/research/material-blocks/<capability-id>.md
```

---

## 阶段二：命题组装（并行）

### 输入来源

- 阶段一产出的材料块（material_blocks[]）
- 前处理产出的分词结果（decompositions[]）
- 前处理产出的战略高地信息（strategic_highgrounds[]）

### 执行逻辑

```
对每个待处理命题：
  并行调用 processes/assemble.md
  输入：proposition + decomposition + material_blocks（该命题依赖的子集）+ depth + platform
  输出：workflow/research/<slug>/ 目录
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
- 各命题可使用不同的材料块子集

### 输出

```
workflow/research/<场景slug>/
├── overview.md      # Q1: 链路编排
├── edge-cases.md    # Q2: 坑点提取
├── trade-offs.md    # Q3: 方案对比
├── experiment/      # Q4: 实验组装
│   ├── README.md
│   └── src/
└── references.md    # 参考资料
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

当已有部分材料块时：

```
检查 material-blocks/ 目录中已有的能力材料块
  → 已有：直接复用，跳过该能力的研究
  → 缺失：调用 processes/capability-research.md 补充研究
```

这使得新命题的处理成本 = 缺失能力的研究成本 + 组装成本。

---

## 单命题快速路径

当只处理单个命题（非批量）时，可简化为：

```
1. 识别该命题依赖的原子能力（从候选池查或现场分词+提取）
2. 并行研究这些能力（通常 4-6 个）
3. 组装该命题
```

跳过候选池的读写，直接从能力研究开始。
