---
name: scenario-pipeline
description: "前端复合工程场景知识管线。两阶段工作流：前处理（扫描→分词→能力提取→高地识别→评估→入池）+ 后处理（能力研究并行→命题组装并行）。触发词：'扫描' / '研究' / 'deep scan' / 'deep research' / 'scenario research' / '面试题' / '技术调研'。用于：扫描技术文章提取研究主题、收集面试题、深度研究复合工程场景、构建技术知识库。"
---

# Scenario Pipeline

Two-phase knowledge production pipeline for composite engineering scenarios.

**Pre-processing** = scan → decompose → capability extract → highground identify → evaluate → pool
**Post-processing** = capability research (parallel) → assembly (parallel) ⛔ 两阶段有显式 barrier

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
ROADMAP.md        ← 全景执行路径（完整数据流 + 上下文加载地图 + 故障恢复）
core/             ← 元能力（定义方法论，稳定不常变）
plugins/          ← 增强插件（可热插拔的能力扩展）
environment/      ← 环境探测（多 Agent 能力探测 + 适配协议）
references/       ← 流程控制
  ├── pre-process.md    ← 前处理编排（纯胶水，调用 processes/）
  ├── post-process.md   ← 后处理编排（两阶段管线 + 执行协议 + barrier）
  └── processes/        ← 步骤实现（无序，可组合）
      ├── scan.md
      ├── decompose.md
      ├── capability-extract.md   ← 输出 .meta/capability-graph.json
      ├── highground-identify.md  ← 追加 JSON 的 highgrounds + learning_path
      ├── evaluate.md
      ├── capability-research.md  ← 输出 capabilities/<id>-<name>.md
      ├── briefing-assemble.md    ← 输出 .meta/briefings/<命题简称>.md
      └── assemble.md             ← 输出 <序号>-<命题简称>/
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
- **Source Registry** — 信源质量白名单 + 域名映射 + 反爬黑名单（增强信源获取）：[plugins/source-registry.md](plugins/source-registry.md)

### Environment — 环境探测

跨平台多 Agent 能力探测与动态适配。

- **Probe Protocol** — 两阶段探测（C0 元探测 → C1-C7 能力探测）+ 自然语言诱导实验 + 动态适配：[environment/probe-protocol.md](environment/probe-protocol.md)

> 后处理启动时加载 probe-protocol，先测 C0（能否自建子 agent），
> 再用诱导实验探测 C1-C7，按能力指标选择执行策略。

### References — 流程控制

编排文件定义步骤顺序，processes/ 定义步骤实现。

- **Pre-process** — 前处理编排：[references/pre-process.md](references/pre-process.md)
- **Post-process** — 后处理编排（两阶段管线 + 执行协议）：[references/post-process.md](references/post-process.md)
- **Processes/** — 步骤实现（8 个可组合的独立模块）：
  - [scan.md](references/processes/scan.md) — 广域扫描
  - [decompose.md](references/processes/decompose.md) — 架构分词
  - [capability-extract.md](references/processes/capability-extract.md) — 原子能力提取 → 输出 `.meta/capability-graph.json`
  - [highground-identify.md](references/processes/highground-identify.md) — 战略高地识别 → 追加 JSON
  - [evaluate.md](references/processes/evaluate.md) — 四维评估
  - [capability-research.md](references/processes/capability-research.md) — 能力研究（双写：主文件 + summary.json）→ 输出 `capabilities/` + `.meta/summaries/`
  - [briefing-assemble.md](references/processes/briefing-assemble.md) — Briefing 组装（从 summary.json 定向提取）→ 输出 `.meta/briefings/`
  - [assemble.md](references/processes/assemble.md) — 材料块组装（接收 briefing，只写不读）→ 输出 `<序号>-<命题简称>/`

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
| Briefing 组装 | processes/briefing-assemble.md | — |
| 命题组装阶段 | plugins/capability-research-mode.md + processes/assemble.md | — |
| 指令含 `--year` | 同上 | plugins/year-granularity.md |
| 指令含 `--no-experiment` | 同上 | 象限IV 相关可省略 |
| 后处理启动时 | environment/probe-protocol.md | — |

### 禁止事项

- 不同时加载 pre-process.md 和 post-process.md（前后处理互斥）
- 不加载未命中按需条件的 plugins 文件

## Pre-processing Flow

1. **Scan** — 调用 [processes/scan.md](references/processes/scan.md)
2. **ⓒ 检查点 A** — 展示扫描摘要（信源数/素材数/Tier 分布），用户确认后继续
3. **Decompose** — 调用 [processes/decompose.md](references/processes/decompose.md)
4. **Capability Extract** — 调用 [processes/capability-extract.md](references/processes/capability-extract.md) → 输出 `.meta/capability-graph.json`
5. **Highground Identify** — 调用 [processes/highground-identify.md](references/processes/highground-identify.md) → 追加 JSON 的 `highgrounds` + `learning_path`
6. **Evaluate** — 调用 [processes/evaluate.md](references/processes/evaluate.md)
7. **ⓒ 检查点 B** — 展示评估结果（命题评分表/战略高地/入池统计），用户确认后入池
8. **Pool** — 写入 `workflow/research/README.md`（总览导航）+ `.meta/candidates.md`（原始记录）

## Post-processing Flow

> ⛔ **两阶段必须顺序执行，有显式 barrier。详见 [post-process.md](references/post-process.md) §执行协议。**

**阶段一：能力研究（并行）**
- 读取 `.meta/capability-graph.json`，识别需要研究的原子能力
- 对每个缺失材料块的能力，并行调用 [processes/capability-research.md](references/processes/capability-research.md)
- ⚠️ spawn 后按环境档案 `preserve_level` 执行主线程保全（单例窗口下主线程易丢失）
- 每个 agent 双写：主文件 `capabilities/<id>-<name>.md` + 结构化摘要 `.meta/summaries/<id>-<name>.json`
- **⛔ 全部完成后才能进入 Briefing 组装**

**中间步骤：Briefing 组装**
- 调用 [processes/briefing-assemble.md](references/processes/briefing-assemble.md)
- 读取 `.meta/summaries/` 下的摘要，按命题+文件类型定向提取，组装为 briefing
- 保存到 `.meta/briefings/<命题简称>.md`
- **⛔ 全部 briefing 生成后才能进入阶段二**

**阶段二：命题组装（并行）**
- 将 briefing 内联到 agent task，对每个待处理命题并行调用 [processes/assemble.md](references/processes/assemble.md)
- ⚠️ spawn 后按环境档案 `preserve_level` 执行主线程保全（单例窗口下主线程易丢失）
- 组装 agent **只写不读**，不读取 `capabilities/` 下的任何文件
- 产出：按命题组织的深度研究 `<序号>-<命题简称>/`

## Output Structure

```
workflow/research/
│
├── README.md                          ← 总览导航（研究范围 + 命题索引 + 学习路径摘要）
│
├── 01-长列表渲染/                      ← 命题研究（用户的主要交付物）
│   ├── overview.md                    # Q1: 链路编排
│   ├── edge-cases.md                  # Q2: 坑点提取
│   ├── trade-offs.md                  # Q3: 方案对比
│   ├── experiment/                    # Q4: 实验组装
│   │   ├── README.md
│   │   └── src/
│   └── references.md                  # 参考资料
│
├── 02-首屏白屏/
│   └── ...
│
├── 03-网络优化/
│   └── ...
│
├── capabilities/                      ← 原子能力知识库（跨命题复用的参考手册）
│   ├── README.md                      # 能力索引 + 依赖图 + 学习路径
│   ├── A1-浏览器渲染管线.md
│   ├── A2-DOM节点生命周期.md
│   └── ...
│
└── .meta/                             ← 内部数据（pipeline 工具用）
    ├── capability-graph.json          # 结构化图谱（供后处理 agent 读取）
    ├── candidates.md                  # 原始候选池记录
    ├── summaries/                     # 结构化摘要（阶段一双写，Briefing 组装时消费）
    │   ├── A1-浏览器渲染管线.json
    │   ├── A2-DOM节点生命周期.json
    │   └── ...
    └── briefings/                     # 组装 Briefing（中间步骤生成，阶段二消费）
        ├── 01-长列表渲染.md
        ├── 02-首屏白屏.md
        └── ...
```

### 三层用户价值

| 层 | 目录 | 用户价值 | 使用场景 |
|----|------|---------|---------|
| 命题研究 | `<序号>-<命题简称>/` | 面试场景的深度答案 | 面试前针对特定命题速查 |
| 能力知识库 | `capabilities/` | 跨命题的原子能力参考 | 系统性学习某个技术点 |
| 学习路径 | `capabilities/README.md` | 战略性修炼地图 | 规划学习优先级 |
