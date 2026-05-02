---
name: scenario-pipeline
description: "Frontend composite engineering scenario pipeline. Two-phase workflow: pre-processing (scan → decompose → capability extract → highground identify → evaluate → pool) and post-processing (capability research in parallel → assembly in parallel). Use when user asks to scan technical articles/blogs for research topics, collect interview questions, do deep research on composite engineering topics, or says '扫描' / '研究' / 'deep scan' / 'deep research' / 'scenario research' followed by a topic description. Also triggers on requests to collect frontend interview questions, analyze engineering trade-offs, or build a knowledge base of technical scenarios."
---

# Scenario Pipeline

Two-phase knowledge production pipeline for composite engineering scenarios.

**Pre-processing** = scan → decompose → capability extract → highground identify → evaluate → pool
**Post-processing** = capability research (parallel) → assembly (parallel)

## Trigger Patterns

**Pre-processing (scan):**
```
扫描：<信息源描述>
deep scan：<信息源描述>
```

**Post-processing (research):**
```
研究：<场景描述>
deep research：<场景描述>
```

**Parameters:** `--depth=shallow|normal|deep` `--platform=web|miniapp|rn|all` `--no-experiment` `--append` `--batch=pending` `--filter="<条件>"` `--source=<url>` `--digest` `--year=<L1|L2|L3|L4>`

## Architecture

```
SKILL.md          ← Roadmap（本文件：触发方式 + 流程概览 + 导航）
core/             ← 元能力（定义方法论，稳定不常变）
plugins/          ← 增强插件（可热插拔的能力扩展）
references/       ← 流程控制
  ├── pre-process.md    ← 前处理编排（纯胶水，调用 processes/）
  ├── post-process.md   ← 后处理编排（两阶段管线）
  └── processes/        ← 步骤实现（无序，可组合）
      ├── scan.md
      ├── decompose.md
      ├── capability-extract.md
      ├── highground-identify.md
      ├── evaluate.md
      ├── capability-research.md
      └── assemble.md
```

### Core — 元能力

定义"什么是 X"以及"如何评判 X"。

- **Architecture Decomposition** — 架构分词：识别命题内部的通用工程层与框架特化层结构：[core/architecture-decomposition.md](core/architecture-decomposition.md)
- **Capability Graph** — 原子能力图谱：从分词结果中提取原子能力，建立跨命题共享关系：[core/capability-graph.md](core/capability-graph.md)
- **Strategic Highground** — 战略高地识别：基于扇出度和限定词耦合度识别制高点：[core/strategic-highground.md](core/strategic-highground.md)
- **Scenario Framework** — 四维评估矩阵 + 四象限研究框架：[core/scenario-matrix.md](core/scenario-matrix.md)

### Plugins — 增强插件

对 core 能力的增强/扩展/配置化。

- **Year-Granularity** — 经验年限与命题颗粒度匹配规则（增强分词能力）：[plugins/year-granularity.md](plugins/year-granularity.md)
- **Capability Research Mode** — 材料块标准格式 + 研究深度分级（增强能力研究）：[plugins/capability-research-mode.md](plugins/capability-research-mode.md)

### References — 流程控制

编排文件定义步骤顺序，processes/ 定义步骤实现。

- **Pre-process** — 前处理编排：[references/pre-process.md](references/pre-process.md)
- **Post-process** — 后处理编排（两阶段管线）：[references/post-process.md](references/post-process.md)
- **Processes/** — 步骤实现（7 个可组合的独立模块）：
  - [scan.md](references/processes/scan.md) — 广域扫描
  - [decompose.md](references/processes/decompose.md) — 架构分词
  - [capability-extract.md](references/processes/capability-extract.md) — 原子能力提取
  - [highground-identify.md](references/processes/highground-identify.md) — 战略高地识别
  - [evaluate.md](references/processes/evaluate.md) — 四维评估
  - [capability-research.md](references/processes/capability-research.md) — 能力研究 → 材料块
  - [assemble.md](references/processes/assemble.md) — 材料块组装 → 四象限输出

## 上下文加载策略

Agent 执行时必须按需加载文件，禁止全量注入。

### 前处理上下文

| 触发条件 | 必须加载 | 按需加载 |
|---------|---------|---------|
| 任意扫描指令 | 编排：pre-process.md + 涉及的 processes/*.md + core/*.md | — |
| 指令含 `--year` | 同上 | plugins/year-granularity.md |
| 指令含 `--digest` | core/architecture-decomposition.md + core/capability-graph.md + core/scenario-matrix.md | — |

### 后处理上下文

| 触发条件 | 必须加载 | 按需加载 |
|---------|---------|---------|
| 任意研究指令 | 编排：post-process.md + 涉及的 processes/*.md + core/*.md | — |
| 能力研究阶段 | plugins/capability-research-mode.md + processes/capability-research.md | — |
| 命题组装阶段 | plugins/capability-research-mode.md + processes/assemble.md | — |
| 指令含 `--year` | 同上 | plugins/year-granularity.md |
| 指令含 `--no-experiment` | 同上 | 象限IV 相关可省略 |

### 禁止事项

- 不同时加载 pre-process.md 和 post-process.md（前后处理互斥）
- 不加载未命中按需条件的 plugins 文件

## Pre-processing Flow

1. **Scan** — 调用 [processes/scan.md](references/processes/scan.md)
2. **Decompose** — 调用 [processes/decompose.md](references/processes/decompose.md)
3. **Capability Extract** — 调用 [processes/capability-extract.md](references/processes/capability-extract.md)
4. **Highground Identify** — 调用 [processes/highground-identify.md](references/processes/highground-identify.md)
5. **Evaluate** — 调用 [processes/evaluate.md](references/processes/evaluate.md)
6. **Pool** — 写入 `workflow/research/candidates.md`

## Post-processing Flow

**阶段一：能力研究（并行）**
- 对每个扇出度 ≥ 30% 的原子能力，并行调用 [processes/capability-research.md](references/processes/capability-research.md)
- 产出：标准化材料块，存储于 `workflow/research/material-blocks/`

**阶段二：命题组装（并行）**
- 对每个待处理命题，并行调用 [processes/assemble.md](references/processes/assemble.md)
- 产出：四象限研究输出，存储于 `workflow/research/<slug>/`

## Output Structure

```
workflow/research/
├── candidates.md                    # 候选池（前处理产出）
├── material-blocks/                 # 能力材料块仓库（后处理阶段一产出）
│   ├── A1-浏览器渲染管线.md
│   ├── A2-DOM生命周期.md
│   └── ...
└── <scenario-slug>/                 # 命题研究（后处理阶段二产出）
    ├── overview.md                  # Q1: 链路编排
    ├── edge-cases.md                # Q2: 坑点提取
    ├── trade-offs.md                # Q3: 方案对比
    ├── experiment/                  # Q4: 实验组装
    │   ├── README.md
    │   └── src/
    └── references.md                # 参考资料
```
