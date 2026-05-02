---
name: scenario-pipeline
description: "Frontend composite engineering scenario pipeline. Two-phase workflow: pre-processing (scan internet sources, extract technical topics, evaluate against four-dimension criteria, pool candidates) and post-processing (scenario research using four-quadrant framework). Use when user asks to scan technical articles/blogs for research topics, collect interview questions, do deep research on composite engineering topics, or says '扫描' / '研究' / 'deep scan' / 'deep research' / 'scenario research' followed by a topic description. Also triggers on requests to collect frontend interview questions, analyze engineering trade-offs, or build a knowledge base of technical scenarios."
---

# Scenario Pipeline

Two-phase knowledge production pipeline for composite engineering scenarios.

**Pre-processing** = scan → extract → evaluate → pool
**Post-processing** = candidate → four-quadrant research → structured output

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
core/             ← 元能力（评估框架，稳定不常变）
plugins/          ← 规则配置（可热插拔替换）
references/       ← 工作流细节（前后处理的具体步骤）
```

### Core — 元能力

评估方法论，定义"什么是复合工程场景"以及"如何评判"。

- **Architecture Decomposition** — 架构分词：识别命题内部的通用工程层与框架特化层结构（标注，不拆分）：[core/architecture-decomposition.md](core/architecture-decomposition.md)
- **Scenario Framework** — 四维评估矩阵 + 四象限研究框架 + 命名规范：[core/scenario-matrix.md](core/scenario-matrix.md)

执行顺序：**先分词，再评估**。任何命题进入评估矩阵之前，必须先经过架构分词。

### Plugins — 规则配置

可独立替换的规则模块，修改无需改动其他文件。

- **Year-Granularity** — 经验年限与命题颗粒度匹配规则：[plugins/year-granularity.md](plugins/year-granularity.md)

### References — 工作流细节

前后处理的具体执行步骤和输出规范。

- **Pre-process** — 扫描触发 + 信息源 + 提取规则 + 候选池：[references/pre-process.md](references/pre-process.md)
- **Post-process** — 研究触发 + 四步流程 + 输出规范：[references/post-process.md](references/post-process.md)

## 上下文加载策略

Agent 执行时必须按需加载文件，禁止全量注入。

### 前处理上下文

| 触发条件 | 必须加载 | 按需加载 |
|---------|---------|---------|
| 任意扫描指令 | `core/architecture-decomposition.md` + `core/scenario-matrix.md` + `references/pre-process.md` | — |
| 指令含 `--year` 参数 | 同上 | `plugins/year-granularity.md` |
| 指令含 `--digest` 参数 | `core/architecture-decomposition.md` + `core/scenario-matrix.md` | — |

### 后处理上下文

| 触发条件 | 必须加载 | 按需加载 |
|---------|---------|---------|
| 任意研究指令 | `core/architecture-decomposition.md` + `core/scenario-matrix.md` + `references/post-process.md` | — |
| 指令含 `--year` 参数 | 同上 | `plugins/year-granularity.md` |
| 指令含 `--no-experiment` | 同上 | 象限IV 相关指令可省略 |

### 禁止事项

- 不同时加载 `pre-process.md` 和 `post-process.md`（前后处理互斥）
- 不加载未命中按需条件的 plugins 文件

## Pre-processing Flow

1. **Scan** — Crawl information sources (see [references/pre-process.md](references/pre-process.md) §三)
2. **Extract** — Identify independent technical topics from raw materials
3. **Evaluate** — Score each topic against four-dimension matrix (see [core/scenario-matrix.md](core/scenario-matrix.md) §二)
4. **Pool** — Write qualified candidates to `workflow/research/candidates.md`

If year constraint present, apply granularity filter from [plugins/year-granularity.md](plugins/year-granularity.md).

## Post-processing Flow

1. **Parse** — Extract tech stack, constraints, depth from trigger input
2. **Four-quadrant research** — Execute sequentially (see [core/scenario-matrix.md](core/scenario-matrix.md) §三)
3. **Output** — Write to `workflow/research/<slug>/` directory
4. **Summarize** — Return ≤200 word summary to user

## Output Structure

```
workflow/research/
├── candidates.md           # Candidate pool
└── <scenario-slug>/
    ├── overview.md         # Q1: Chain deconstruction
    ├── edge-cases.md       # Q2: Extreme scenarios
    ├── trade-offs.md       # Q3: Trade-off comparison
    ├── experiment/         # Q4: Minimal viable experiment
    │   ├── README.md
    │   └── src/
    └── references.md       # Source links
```
