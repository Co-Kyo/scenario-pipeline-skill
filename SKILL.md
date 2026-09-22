---
name: scenario-pipeline
description: "前端复合工程场景知识管线。工作流：意图锚定→头脑风暴→前处理（广域扫描→能力图谱构建→评估入池）＋后处理（能力研究→Briefing→命题组装→学习阶梯）。用自然语言显式调用（见 SKILL.md 调用方式），支持从任意步骤断点续写。"
---

# Scenario Pipeline

将前端技术文章转化为三层结构化知识产品：
- **命题研究** → overview + edge-cases + trade-offs + experiment
- **能力知识库** → capabilities/{id}-{name}.md（跨命题原子能力）
- **学习阶梯** → learning-ladder.md（渐进式引导路径）

## 调用方式

使用自然语言显式调用，推荐以下句式：

| 场景 | 推荐句式 |
|------|----------|
| 完整流程 | "使用 scenario-pipeline，对 <场景描述> 进行完整研究" |
| 仅前处理 | "使用 scenario-pipeline，对 <信息源> 进行前处理" |
| 仅后处理 | "使用 scenario-pipeline，从能力研究开始，处理 <场景>" |
| 断点续写 | "使用 scenario-pipeline，从 Step <N> 继续处理 <场景>" |

系统从自然语言自动推断：经验年限、研究深度、目标平台等约束。

## 参数

| 参数 | 说明 |
|------|------|
| `--year=L1|L2|L3|L4` | 经验年限，可省略并自动推断 |
| `--source=<url|file>` | 指定扫描信源，可省略并自动推断 |

## 流程总览

> ⚠️ 每步只读该步文件，严禁提前加载后续步骤；长文档按需分段查阅。

### 完整流程

```
初始化 → 意图锚定 → 头脑风暴 → 依赖分区 → 前处理 → 后处理
 (00)      (01)       (02)       (03)     (04-06)  (07-10)
```

### 步骤详情

| # | 步骤 | 核心目的 | 关键产出 |
|---|------|----------|----------|
| 00 | 初始化 | 确认 workDir（交互步骤），各步骤按需加载 references/ 共享文档 | `.meta/init.json`, `.meta/run/run.json` |
| 01 | 意图锚定 | 解析用户指令，推断年限，生成共享骨架 | `.meta/brainstorm/anchors.json` |
| 02 | 头脑风暴 | 4维度Agent并行分析，产出结构化需求网 | `.meta/requirement-web.json` |
| 03 | 依赖分区 | 整理命题依赖DAG，识别分区点分批执行 | `.meta/partition-analysis.json`, `execution-plan.md` |
| 04 | 广域扫描 | 按level_weight差异化搜索信源，结构化提取 | `.meta/.raw-materials/index.json`, `.meta/.raw-materials/*.md` |
| 05 | 能力图谱 | 跨命题去重合并原子能力，计算战略价值 | `.meta/capability-graph.json`, `.meta/dependency-graph.json`, `.meta/highgrounds.json`, `.meta/learning-path.json` |
| 06 | 评估入池 | 四维评估矩阵打分，确定优先级和学习顺序 | `.meta/evaluations.json`, `README.md`, `.meta/candidates.md` |
| 07 | 能力研究 | 深度研究原子能力，产出知识库主文件 | `.meta/research-plan.json`, `capabilities/*.md`, `.meta/summaries/*.json`, `capabilities/README.md` |
| 08 | Briefing 组装 | 从能力摘要提取关键信息，组装Briefing | `.meta/briefings/{seq}-{short_name}.md` |
| 09 | 命题组装 | 组装四象限研究输出（overview/edge-cases/trade-offs/experiment） | `{seq}-{short_name}/overview.md`, `{seq}-{short_name}/edge-cases.md`, `{seq}-{short_name}/trade-offs.md`, `{seq}-{short_name}/references.md`, `{seq}-{short_name}/experiment/README.md`, `{seq}-{short_name}/_assembly_ratio_trace.json` |
| 10 | 学习阶梯 | 生成从"不会"到"能讲"的渐进式路径 | `{seq}-{short_name}/learning-ladder.md` |

### 阶段划分

| 阶段 | 步骤 | 说明 |
|------|------|------|
| **初始化** | initialize | 确认 workDir（交互步骤），各步骤按需加载 references/ 共享文档 |
| **意图锚定** | intent-anchor | 解析用户指令，推断年限，生成共享骨架 |
| **头脑风暴** | brainstorm | 4维度Agent并行分析，产出结构化需求网 |
| **依赖分区** | partition | 整理命题依赖DAG，识别分区点分批执行 |
| **前处理** | scan → capability-graph → evaluate-pool | 串行扫描、建图、评估入池 |
| **后处理** | capability-research → briefing-assemble → assemble → learning-ladder | 串行研究、Briefing、组装、学习阶梯 |

### 初始化规则

执行任何步骤前，必须先完成初始化：

1. **确认 workDir**：向用户展示将要使用的输出目录并等待确认；如果用户未指定，默认使用 {当前日期}-{场景简称} 作为 workDir；用户可修正 workDir 路径
2. **初始化记录**：workDir 确认后写入 {workDir}/.meta/init.json，后续所有步骤的产出路径均基于此目录派生


## 执行

执行 Step N 时引用 Step N+1 文件内容即为违规。
每步只读 steps/ 中该步的 step.md + 该步声明的文件（references/ 与 assets/）。
