# 阅读树样板 01：头脑风暴（brainstorm）

> 基线日 2026-09-16。行数均为当日实测（`wc -l`）。概念数为人工数（本文件首次出现）。
> 读法：按"先读"序号走，每步工作集（同时打开的文件）≤4 即合格。

```
先读1 产物层 ── dist/sp-skill/processes/02-brainstorm.md（346 行）
  │ 先知道长什么样：目标/校验清单/失败处理/门禁/任务模板/收敛者/附录
  │ 新概念 1：模块附录（包正文渲染进产物）
  │
先读2 装配层 ── src/steps/index.ts（26 行，只看 brainstorm 一行）
  │ 谁跟谁接线：id brainstorm，dependsOn intent-anchor
  │ 新概念 1：步骤声明顺序即产物顺序
  │
先读3 装配层 ── src/contracts.ts（104 行，只看 7 处）
  │ agentInit/barrierCheck/fallbackProtocol（3 条 rule 登记）
  │ parallelMethodRef＋parallel-method 条目（模块通道，逻辑标识路径）
  │ 新概念 2：逻辑标识路径（不落盘）／模块通道（module 字段）
  │
先读4 装配层 ── src/modules.ts（58 行，只看 parallelMethods 一段）
  │ packageModule(./packages/parallel) → modules 数组第 3 项
  │ 新概念 1：纯声明包（skill.json＋blocks，无可执行入口）
  │
先读5 装配层 ── src/domain/entities.ts（115 行，只看 anchors＋requirementWeb 两条）
  │ refOf('anchors') 输入，refOf('requirementWeb') 输出
  │ 新概念 0（复用"实体登记"概念）
  │
先读6 单步层 ── src/steps/brainstorm.ts（134 行）
  │ reads 6 项：anchors＋3 rule＋1 schema＋1 包引用
  │ taskTemplate 5 个（4 维度＋收敛者）／verify 11 项／onFail 4 条
  │ parallel('brainstorm-parallel')：4 分支＋门＋收敛者
  │ 新概念 3：taskTemplate／verify 规则／parallel 门禁收敛
  │
先读7 单步层 ── src/domain/content/brainstorm.ts（123 行）
  │ DIMENSION_FILES／POLL_INTERVAL／RETRY_MAX／CONVERGE_PRIORITY／REASON_TYPES
  │ detail／qualityGateSection／scanInjectSection／5 个任务函数
  │ 新概念 2：内容域唯一数据源／派生文本（函数返回正文）
  │
先读8 单步层 ── assets/01-brainstorm/（5 文件，705 行）
  │ agent-init.md 65／barrier-check.md 88／fallback-protocol.md 50
  │ requirement-web-schema.md 141／schemas.md 361
  │ 新概念 1：assets 是步骤的散文附件（rule/schema 两身份）
  │
先读9 内容包层 ── src/packages/parallel/blocks/（4 块，31 行）
  │ when 5／how 7（含唯一标记 [[parallel-gate]]）／gate 14／scope 5
  │ 新概念 1：显式标记引用（源里标记，产物里人话）
  │
先读10 单步层 ── 机制配角（按需，不必首日读）
  │ src/policies.ts barrier／src/verify.ts fail/verify
  │ src/actions.ts agentAction/doAction／src/domain/mechanics.ts displayFoldMulti
  │ 新概念 2：barrier 检查点／action 动词
```

## 今日五数（brainstorm）

| 数 | 今日值 | 怎么来的 |
|---|---|---|
| 阅读步数 | 10 节点 | 上树节点数 |
| 单步三处总行数 | 962 行 | 134（步骤）＋123（内容域）＋705（assets） |
| 接线中枢行数 | 277 行 | 104＋58＋115（全仓共用，不止这一步） |
| 包块尺寸 | 最大 14 行 | gate.md 14 为四块最大 |
| 跨层跳数 | 5 目录 | dist/processes＋steps＋contracts/modules/entities＋assets＋packages |

## 读完标准：敢改清单

读完这棵树的人，应当敢做以下改动且知道验收在哪：

1. 改维度名 → 只动 `src/steps/brainstorm.ts` 并行段＋`brainstorm.ts` 内容域（验收：构建＋产物 diff）。
2. 改门禁规则 → 只动步骤 gate 段（验收：同上）。
3. 改包内措辞 → 只动 `blocks/gate.md`（验收：包自检 11 项）。

## 树的坏味道（本样板诚实记录）

1. 单步三处 962 行是全仓最胖：读懂一步要开 10 节点，是第二名（evaluate 约 400 行）的两倍多。
2. assets 705 行里 schemas.md 占 361 行一半：数据契约与规则散文混在一个目录，新人分不清"做法"和"格式"。
3. 接线中枢 277 行是全仓共用：读一步被迫读全仓接线，这是下一步该拆的负担（modules 按包分组、contracts 按步分组的方向）。
