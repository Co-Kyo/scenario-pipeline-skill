# 路径约定

> 所有产出路径基于 `workDir` 派生。主 agent 按此表拼接路径，无需工具。

## 核心路径

| 用途 | 路径模板 | 示例 |
|------|---------|------|
| 总览导航 | `{workDir}/README.md` | `workflow/research/README.md` |
| 全局学习阶梯 | `{workDir}/learning-ladder.md`（可选） | `workflow/research/learning-ladder.md` |
| 能力知识库目录 | `{workDir}/capabilities/` | `workflow/research/capabilities/` |
| 能力主文件 | `{workDir}/capabilities/{id}-{name}.md` | `.../capabilities/A1-浏览器渲染管线.md` |
| 能力知识库索引 | `{workDir}/capabilities/README.md` | `.../capabilities/README.md` |
| 命题目录 | `{workDir}/{seq}-{short_name}/` | `.../01-长列表渲染/` |
| 命题 overview | `{workDir}/{seq}-{short_name}/overview.md` | `.../01-长列表渲染/overview.md` |
| 命题 edge-cases | `{workDir}/{seq}-{short_name}/edge-cases.md` | `.../01-长列表渲染/edge-cases.md` |
| 命题 trade-offs | `{workDir}/{seq}-{short_name}/trade-offs.md` | `.../01-长列表渲染/trade-offs.md` |
| 命题 experiment | `{workDir}/{seq}-{short_name}/experiment/` | `.../01-长列表渲染/experiment/` |
| 命题 references | `{workDir}/{seq}-{short_name}/references.md` | `.../01-长列表渲染/references.md` |
| 命题学习阶梯 | `{workDir}/{seq}-{short_name}/learning-ladder.md` | `.../01-长列表渲染/learning-ladder.md` |

## .meta 内部路径

| 用途 | 路径模板 | 示例 |
|------|---------|------|
| 能力摘要 | `{workDir}/.meta/summaries/{id}-{name}.json` | `.../summaries/A1-浏览器渲染管线.json` |
| Briefing | `{workDir}/.meta/briefings/{seq}-{short_name}.md` | `.../briefings/01-长列表渲染.md` |
| 能力图谱 | `{workDir}/.meta/capability-graph.json` | `...` |
| 评估结果 | `{workDir}/.meta/evaluations.json` | `...` |
| 扫描结果 | `{workDir}/.meta/raw-materials.json` | `...` |
| 候选池 | `{workDir}/.meta/candidates.md` | `...` |
| 动态信源池 | `{workDir}/.meta/sources/dynamic-sources.json` | `...` |
| 需求网 | `{workDir}/.meta/requirement-web.json` | `...` |

## 命名规则

- **命题序号**：两位数字，从 01 开始（`01`, `02`, `03`...）
- **命题简称**：中文，取命题冒号前的部分（`长列表渲染`、`首屏白屏`）
- **能力 ID**：前缀 + 数字（`A1`=通用, `V1`=Vue, `R1`=React, `W1`=Webpack, `VI1`=Vite）
- **能力名称**：中文，和 capability-graph.json 中的 `name` 字段一致
