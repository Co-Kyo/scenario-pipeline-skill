# Architecture & Design

> 项目架构设计决策的持久化目录。
>
> 本目录存储**设计层的系统定义**——四级模型、加载契约、约束规则、对外架构介绍、策略计划。
> 与 `pipeline/`（观测层，描述管线长什么样）和 `references/`（执行层，agent 怎么做）有明确区分。

---

## 目录索引

| 文件 | 内容 |
|------|------|
| `architecture-model.md` | 四级执行模型定义、加载契约、约束规则 |
| `mcp-skill-architecture.md` | 对外：MCP × Skill 双侧架构介绍（社区/技术论坛） |
| `CHANGELOG.md` | 设计变更日志（时间倒排，追踪设计决策演变） |
| `plans/pre-process-subagent-strategy.md` | 前处理子 agent 隔离策略计划书 |

---

## 变更记录规范

### 何时记录变更

每次对 `design/` 下文件有**实质设计变更**时必须记录。

### 记录粒度（重要约束）

**一条 CHANGELOG 条目 = 一次完整的设计决策 / 需求变更 / 架构升级。**

✅ 正确粒度示例（以一个完整的变更事件为单位）：

```
[2026-05-16] 目录架构重构：pipeline/ → design/
[2026-05-14] 新增 §8 Schema 驱动范式（统一落地方法论）
[2026-05-10] L3 加载契约标准化（架构模型 §3）
```

❌ 错误粒度示例（文件级碎片，禁止）：

```
architecture-model.md v1.2.0 迁入 design/          ✗
mcp-skill-architecture.md v1.0.0 迁入 design/      ✗
pre-process-subagent-strategy.md 迁入 design/plans/ ✗
```

**判断标准**：如果多个文件变更是同一个需求驱动的（同一个决定/同一个问题/同一次评审），合并为一条。只有当变更属于完全独立的设计决策时，才拆成多条。

### 记录格式

每条条目包含三个字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| **变更内容** | 改了什么 | 新增 §8 Schema 驱动范式 |
| **触发因素** | 为什么改 | 实验发现 schema 流程断裂 |
| **影响范围** | 需要同步改什么 | 所有 execute→submit 流程需走 get_output_schema |

### 追溯历史变更

`CHANGELOG.md` 支持回填（backfill）来自 git log 的历史设计变更：

```bash
# 追踪文件历史（含 rename/move）
git log --follow -- design/architecture-model.md

# 查看关键 commit 的变更
git show <hash>
git diff <hash>^ <hash>

# 判断是否为设计变更后，以 [backfill] 标记写入 CHANGELOG
```

回填条目保留原始决策日期（而非回填日期），并标注 `[backfill]` 前缀。详见 `CHANGELOG.md` 示例。
