# 维度 Agent 初始化定义

> 本文件定义 4 个维度 Agent 的初始调用设定。主 agent 按此文件分发 spawn，sub-agent 自行读取对应文件完成任务。
>
> **注意**：收敛者 Agent 不在此文件定义范围内。收敛者的 task 直接在 `processes/02-brainstorm.md` §5 中内联定义。

---

## ⛔ 禁止主 agent 读取的文件

以下文件**只能由 sub-agent 读取**，主 agent 严禁 read 或加载其内容：

- `plugins/year-granularity.md`
- `{workDir}/.meta/brainstorm/anchors.json`

主 agent 的职责仅限于：将上述文件的**路径**写入 sub-agent 的 task 中，由 sub-agent 自行读取。

> 维度角色定义变更（D32 W2）：4×维度 agent 静态文件（`scenario-agent.md`/`technical-agent.md`/`learning-agent.md`/`constraint-agent.md`）已删除，维度任务由 `src/domain/content/brainstorm.ts` 内联工厂唯一定义（`scenarioTask()`/`technicalTask()`/`learningTask()`/`constraintTask()`），经 `src/steps/brainstorm.ts` 的 `.taskTemplate()` 装配；主 agent 不再向 sub-agent 分发外部角色文件。

## Agent 清单

| Agent | label | agent_definition_path | output_path |
|-------|-------|----------------------|-------------|
| 场景 | `brainstorm-scenario` | 内联：`brainstormRules.scenarioTask()`（`src/domain/content/brainstorm.ts:64-70`） | `{workDir}/.meta/brainstorm/scenario.json` |
| 技术 | `brainstorm-technical` | 内联：`brainstormRules.technicalTask()`（`src/domain/content/brainstorm.ts:72-78`） | `{workDir}/.meta/brainstorm/technical.json` |
| 学习 | `brainstorm-learning` | 内联：`brainstormRules.learningTask()`（`src/domain/content/brainstorm.ts:80-86`） | `{workDir}/.meta/brainstorm/learning.json` |
| 约束 | `brainstorm-constraint` | 内联：`brainstormRules.constraintTask()`（`src/domain/content/brainstorm.ts:88-94`） | `{workDir}/.meta/brainstorm/constraint.json` |

## Sub-agent 自主读取的文件

每个 Agent 启动后，自行用 read 工具读取：

1. **自己的角色定义**：上表中的 `agent_definition_path`（定义身份、任务、输出格式）
2. **共享骨架**：`{workDir}/.meta/brainstorm/anchors.json`（意图锚定(intent-anchor)产出，含锚点 + 策略 + 年限）
3. **年限规则**：`plugins/year-granularity.md`（阶梯映射 + 颗粒度要求）
4. **输出格式**：`assets/01-brainstorm/schemas.md§{schema_section}`（JSON 结构定义）

## Task 模板

主 agent spawn 每个 Agent 时，task 内容为：

```
你是「{topic}」的{维度}维度分析专家。
⚠️ 你必须用 write 工具将文件写入磁盘。

## 你需要读取的文件
1. 你的角色定义：见步骤 taskTemplate 内联任务（`agent_definition_path` 列）
2. 共享骨架：{anchors_path}
3. 年限规则：plugins/year-granularity.md
4. 输出格式：assets/01-brainstorm/schemas.md§{schema_section}

## 写入
用 write 工具将产出 JSON 写入 {output_path}
```

主 agent 从 raw_input 中提取 topic 填入模板，其余所有内容由 sub-agent 自行读取和提取。

## Schema Section 映射

| Agent | schema_section |
|-------|---------------|
| 场景 | §scenario |
| 技术 | §technical |
| 学习 | §learning |
| 约束 | §constraint |
