# 路径约定

> 所有产出路径基于 `workDir` 派生。主 agent 按此表拼接路径，无需工具。

## 核心路径

| 用途 | 路径 |
|------|------|
| 总览导航 | `{workDir}/README.md` |
| 全局学习阶梯 | `{workDir}/learning-ladder.md`（可选） |
| 能力知识库目录 | `{workDir}/capabilities/` |
| 能力主文件 | `{workDir}/capabilities/{id}-{name}.md` |
| 能力知识库索引 | `{workDir}/capabilities/README.md` |
| 命题目录 | `{workDir}/{seq}-{short_name}/` |
| 命题 overview | `{workDir}/{seq}-{short_name}/overview.md` |
| 命题 edge-cases | `{workDir}/{seq}-{short_name}/edge-cases.md` |
| 命题 trade-offs | `{workDir}/{seq}-{short_name}/trade-offs.md` |
| 命题 experiment | `{workDir}/{seq}-{short_name}/experiment/` |
| 命题 references | `{workDir}/{seq}-{short_name}/references.md` |
| 命题学习阶梯 | `{workDir}/{seq}-{short_name}/learning-ladder.md` |

## .meta 内部路径

| 用途 | 路径 |
|------|------|
| 共享锚点 | `{workDir}/.meta/brainstorm/anchors.json` |
| 头脑风暴·场景维度 | `{workDir}/.meta/brainstorm/scenario.json` |
| 头脑风暴·技术维度 | `{workDir}/.meta/brainstorm/technical.json` |
| 头脑风暴·学习维度 | `{workDir}/.meta/brainstorm/learning.json` |
| 头脑风暴·约束维度 | `{workDir}/.meta/brainstorm/constraint.json` |
| 能力摘要 | `{workDir}/.meta/summaries/{id}-{name}.json` |
| Briefing | `{workDir}/.meta/briefings/{seq}-{short_name}.md` |
| 能力图谱 | `{workDir}/.meta/capability-graph.json` |
| 评估结果 | `{workDir}/.meta/evaluations.json` |
| 扫描结果索引 | `{workDir}/.meta/.raw-materials/index.json` |
| 扫描结果内容 | `{workDir}/.meta/.raw-materials/*.md` |
| 候选池 | `{workDir}/.meta/candidates.md` |
| 动态信源池 | `{workDir}/.meta/sources/dynamic-sources.json` |
| 需求网 | `{workDir}/.meta/requirement-web.json` |
| 检查点记录 | `{workDir}/.meta/checkpoints/barrier-{N}.md` |

## 命名规则

- **命题序号**：两位数字，从 01 开始（`01`, `02`, `03`...）
- **命题简称**：中文，取命题冒号前的部分（`长列表渲染`、`首屏白屏`）
- **能力 ID**：前缀 + 数字（`A1`=通用, `V1`=Vue, `R1`=React, `W1`=Webpack, `VI1`=Vite）
- **能力名称**：中文，和 capability-graph.json 中的 `name` 字段一致
