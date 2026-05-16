# Design Changelog

> 本文件记录 `design/` 下设计文档的重大架构变更。
>
> 变更粒度：以一个完整需求面为单位（目录重构、新增约束、范式升级等）。
> 日常小修小改不记入本日志，由 git log 追踪。
>
> 回填条目（`[backfill]`）来自 git log 历史，保留原始决策日期。
> 详见 `design/README.md` 版本管理规范。

---

## [2026-05-16] 目录架构重构：pipeline/ → design/

**变更内容：**
- 将架构定义文件从 `pipeline/` 迁出至独立的 `design/` 目录
- 新增 `design/README.md` 版本管理规范（文档生命周期、变更记录格式、git 追溯回填流程）
- 新增 `design/CHANGELOG.md` 设计变更日志
- 为迁入文件增加 YAML frontmatter（title / version / status / supersedes）

**触发因素：**
`pipeline/` 目录混杂管线观测描述与架构定义/策略计划，导致：
- 人类无法区分"这是给我看的还是给 agent 读的"
- agent 可能误读架构文件作为执行指令
- 目录定位模糊，新文件常被误放入

**影响范围：**
- `SKILL.md` — 移除对 architecture-model.md 的引用
- `pipeline/README.md` — 增加迁移说明
- `references/processes/capability-extract.md` — 路径引用更新
- `references/processes/decompose.md` — 同上
- `references/processes/evaluate.md` — 同上
- `references/processes/highground-identify.md` — 同上
- 外部 skill（`scenario-pipeline-architecture`）— 4 处路径引用更新
