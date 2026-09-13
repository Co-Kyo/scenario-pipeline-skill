# sp-skill · Scenario Pipeline

> **本分支是发布产物分支**（`release`）：内容由 CI 从 `dev` 源码构建生成，**请勿手改**。
> 仓库名 **`sp-skill`** ＝ **Scenario Pipeline** 的简称；产物内的 skill 名是 **`scenario-pipeline`**。

## 这是什么

一个给 agent 用的 Markdown Skill：把前端技术文章转化成三层结构化知识产品——

- **命题研究**：overview + edge-cases + trade-offs + experiment
- **能力知识库**：`capabilities/{id}-{name}.md`（跨命题的原子能力）
- **学习阶梯**：`learning-ladder.md`（渐进式引导路径）

它是一条 11 步的长流程管线，分三段：意图锚定 → 头脑风暴 → 前处理（定向扫描 → 能力图谱 → 评估入池）；随后进入后处理（能力研究 → Briefing → 命题组装 → 学习阶梯）。

## 怎么用

1. 把本分支（或 Release 里的 `sp-skill-<tag>.zip`）整体交给 agent；
2. 入口是 `SKILL.md`——agent 从它开始读，其余文件按需加载；
3. 显式调用：`/scenario-pipeline`；支持从任意步骤断点续写。

## 目录

| 路径 | 是什么 |
|---|---|
| `SKILL.md` | 入口：frontmatter（`name` / `description`）＋目录＋正文 |
| `processes/` | 11 个步骤的 Markdown，编号即执行顺序 |
| `assets/` | 运行期 Markdown 资产（公共规则与各步骤私有契约） |
| `plugins/` | 插件片段 |
| `LICENSE` | MIT |
| `VERSION_LINEAGE.json` | 构建血缘：源码版本／发布 tag／构建所用框架版本 |

## 来源

- 源码仓库：`Co-Kyo/sp-skill` 的 **`dev`** 分支（`main` 已退役）；本 `release` 分支只放生成产物。
- 构建器：`skillnomad`（声明式 Markdown skill 打包器）；本分支每次发布由 Release 工作流重建。
- 要改内容：改 `dev` 源码 → 发版 → CI 重建本分支。**本分支上的任何手改都会在下次发布时被覆盖。**
