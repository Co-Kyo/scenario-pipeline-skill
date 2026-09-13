# sp-skill Agent Contract

> 状态：active
> 定位：根级 agent 契约，只放跨会话不变量和分级规则。内容型 Skill 仓（scenario-pipeline），dev/release 双分支（main 已退役，见 §2）。
> **§1 角色先行是最高优先级，凌驾于一切便利；与下文冲突时以 §1 为准。**

## 1. 角色先行（每次任务进门执行）

> 来源：本项目角色先行约定（2026-09-04）—— 后续工作流与讨论视角先夯实角色，否则会在三个角色里迷失。

| 角色 | 是谁 | 他关心 | 他不需要 |
|---|---|---|---|
| A · 产物使用者 | 照着 md 干活的人 | 文件里有什么/缺什么 | 源码行号、构建细节 |
| B · 框架开发者 | 上游框架维护者 | 复现步骤与产物证据 | 本仓业务细节 |
| C · Skill 作者 | 维护本仓的人 | 改哪几行；验收标准 | 框架内部实现 |

铁律：

1. 每次任务先声明读者（A/B/C）与问题归属；T1/T2 动手前经用户确认，T0 在回复开头声明假设。
2. 每个回答先给结论，再给证据；不确定的标出来，不猜。
3. 术语首次出现即解释；改动保持最小。
4. 多角色任务按角色分节，每节只讲给一个人。
5. 本机私有 overlay 见 `agents.local.md`（gitignore，不入库）。

## 2. 项目边界（dev/release 双分支是红线，main 已退役）

- `dev` = TS 源码开发分支（真相源）；`release` = CI 生成的纯 Markdown 产物分支（可导入成品，只读）；`main` 已退役删除，不再使用。
- 铁律：**绝不手改 `release` 下 `processes/*.md` 与 `SKILL.md`**（生成物）；源码改动只在 `dev`；push dev 前跑全绿（pre-push hook 强制，见 §6）。
- 本机私有 overlay 见 `agents.local.md`（gitignore，不入库）。

## 3. 内容→角色映射

| 内容 | 约束角色 | 讲什么 / 不讲什么 |
|---|---|---|
| 产物 md 差异、断点续写体感 | A | 只讲章节有无与执行者后果；禁止用源码 diff 回答 |
| 步骤声明、管线语义 | C | 行号、改哪几行、验收 grep；框架机制只给指针 |
| 上游框架根因、修法 | B（指针） | 指上游 skillnomad 仓库；不在本仓修框架 |

## 4. 冷启动

1. 跑 `git branch -a` 确认 dev / release 双分支状态（main 应不存在）。
2. 读 `README.md`（生成物声明）、`SKILL.md`（scenario-pipeline 入口）、`VERSION_LINEAGE.json`。
3. 列 `src/steps/` 清单；抽查 release 分支 `processes/` 章节（`grep '^## '`，只读不改）。

## 5. 执行分级

| 级别 | 适用 | 最低要求 |
|---|---|---|
| T0 | 只读核验（`git show` / `grep`）、问答 | 直接执行，不切分支 |
| T1 | dev 源码小改 | 改后 `typecheck` / `build` / `test` 全绿才报（pre-push hook 在 push 前强制复检） |
| T2 | 上游依赖大版本对齐、发布 | 回归断言 + 产物 diff 抽查 |

## 6. 通用规则

- 生成物不手改；相关框架问题记 issue 候选，不在本仓修。
- T1/T2 把实际命令、输出摘要、改动文件和结论写入回复。

- 代码风格：TS/JS 与 JSON 配置统一 **4 空格**缩进；提交前跑 `npm run lint`（自动修 `npm run format`）——配置 `eslint.config.mjs`（只约束缩进；模板字符串跳过，避免动到文案产物；`package-lock.json` 不纳入）。

## 7. 用户门（到达必须停下确认）

- 改 `dev`、打 tag / 发布、动 release 产物、改变分支结构。
- 改变本契约。

## 8. 文档关系

- 本契约：根级，保持短小。
- `SKILL.md`：产物入口；`VERSION_LINEAGE.json`：版本血缘。
