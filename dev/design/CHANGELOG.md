# Design Changelog

## [2026-05-26] 引入多维头脑风暴前置阶段

**变更内容：**
- 新增 `processes/00-brainstorm.md`：多维头脑风暴执行文档，定义 4 维度 Agent + 裁判 Agent 的架构
- 新增 `meta/output-contracts.md` §0：`requirement-web.json` 输出契约
- 更新 `meta/paths.md`：新增需求网路径
- 更新 `SKILL.md`：管道全景从"两阶段"扩展为"三阶段"（头脑风暴→前处理→后处理），新增 ⓩ 检查点
- 更新 `processes/01-scan.md`：前置条件和信源采集步骤支持消费 `requirement-web.json` 的定向模式

**触发因素：**
1. 前处理的因果关系是反的：用户一句话直接 scan，分词依赖扫描结果，命题完整性取决于运气
2. 用户意图在 scan 前未被展开——一句话中压缩的域上下文、命题范围、约束条件需要先"揉开"
3. 分词的输入应该是"用户问题的逻辑拆解"而非"扫描到什么就分什么"

**架构变化：**
- 新增前置阶段：用户指令 → 4 维度 Agent 并行分析 → 裁判 Agent 合并收敛 → `requirement-web.json`
- Step ① scan 增加"定向模式"：从需求网获取命题列表和搜索关键词，不再盲目扫描
- Step ② decompose 的输入从"扫描产物"变为"需求网 + 扫描产物"的双重输入
- 需求网是临时性定向输入，不是 capability-graph.json 的草稿——两者职责不同

**4 维度 Agent 定义：**
| Agent | 维度 | 视角 | 产出 |
|-------|------|------|------|
| 场景 Agent | 场景 | "这个知识点会被怎样考" | 场景列表 + 频率 + 深度 |
| 技术 Agent | 技术 | "涉及哪些技术能力" | 能力点 + 依赖 + 分层 |
| 学习 Agent | 学习 | "从不会到会的路径" | 学习路径 + 战略高地 |
| 约束 Agent | 约束 | "哪些该包含/排除" | 约束 + 排除项 + 深度调整 |
| **裁判** | 收敛 | 合并/裁决/补全/排序 | `requirement-web.json` |

**设计决策：**
- 裁判 Agent 是收敛的关键——没有裁判，4 个维度各自独立产出无法合并
- 需求网不复用 capability-graph.json 的 schema：前者是粗粒度的 scan 定向输入，后者是多步提炼后的标准化产物
- 跳过条件：topic 明确 + year 已指定 + platform 已指定 → 跳过头脑风暴，直接进入 Step ①

---

## [2026-05-20] 多线程架构统一

> ⚠️ **废弃标注（2026-05-25）**：本节中所有 `sessions_yield` 相关方案已废弃。原因：同步阻塞机制在并发场景下唤醒链路易断裂，导致主线程永久挂起。替代方案：轮询 `subagents list` 检测完成状态。详见 `processes/00-shared.md` §跟踪方式。

> 本轮改动的统一目标：**后处理四个并行步骤（⑦⑧⑨⑩）的调度模型、prompt 编写规范、术语体系统一收敛。**

### 架构决策

**1. 并发池（Concurrency Pool）取代"滑动窗口"**

原术语"滑动窗口"在 CS 语境下指数据流上的窗口移动（网络协议、数组算法），实际机制是固定槽位的并发调度——任务完成释放槽位，新任务补位。统一为"并发池"。

定义：固定 W=5 个并发槽位，计数单位是 Task Group（不是 agent 数）。

**2. 删除 Heartbeat 跟踪方案，统一为 yield + Cron**

原设计有三种跟踪方案：sessions_yield / Heartbeat / Cron。Heartbeat 存在根本性问题：
- 本质错配：Heartbeat 设计初衷是轻量级周期检查，不适合重量级编排逻辑
- 信噪比差：每 2-3 分钟消耗主 session token，大部分时候检查完发现"没完成"
- 完成延迟：最坏情况等 2-3 分钟才发现 agent 完成
- 上下文污染：tracker 检查逻辑在主 session 执行，污染对话上下文

统一为两方案：
- `sessions_yield`（< 5min）：~~即时响应，零额外开销，主 session 锁死~~ **已废弃** — 并发场景下唤醒链路易断裂
- `轮询 subagents list`（< 5min）：主线程保持活跃，10-15s 轮询间隔，零唤醒依赖
- `Cron`（≥ 5min）：isolated session 执行，主 session 释放，≤2min 完成延迟

**3. 域分组上限 4（Step ⑦）**

原域分组按技术域亲缘性聚合，每组 3-8 个能力。实测发现某些域（通信与数据、构建与工程）单组可达 11-13 个能力，导致：
- agent 上下文膨胀，后期文件质量下降
- 单 agent 耗时过长，失去并行意义

改为：先按域聚合，再按上限拆分。每组 ≤ 4 个能力，>4 时按依赖链切子组（{域}_1, {域}_2）。拆分后从 5 组（最大 13 能力）变为 8 子组（最大 4 能力），总耗时从 ~15min 降至 ~10min。

**4. 子 agent 按需读取取代"只写不读"**

原规则"子 agent 只写不读，所有信息内联到 task"在 Step ⑦（能力研究）成立——一个 agent 研究一组能力，全部信息已内联。但 Step ⑧⑨⑩ 的 agent 需要读取前置步骤的产出文件（summaries、briefings、overview），全部内联会导致 task 过长。

改为分层策略：
- Step ⑦：全部内联（不读外部文件），因为能力信息在分组时已确定
- Step ⑧⑨⑩：task 中指定具体文件路径 + 用 `read` 工具读取 + 文件不存在时有明确降级动作

**5. Prompt 编写规范：动作 > 程度，示例 > 描述**

agent 执行长流程时，抽象描述会导致失真。每个步骤的调度逻辑必须自包含：
- 完整的分批流程代码块（不是"参考 00-shared"）
- 具体的工具调用指令（"用 read 工具读取"，不是"读取文件"）
- 明确的降级动作（文件不存在时做什么，不是"标注缺失"）
- 统一的完成输出格式（agent 产出可被 tracker 解析的声明）

### 改动清单

| 文件 | 改动 |
|------|------|
| `processes/00-shared.md` | 删除 Heartbeat 整节；并发池从实现级文档压缩为动作级指令（-229 行）；示例补完成输出；数据流规则更新 |
| `processes/07-capability-research.md` | 分组上限 4 + 拆分算法 + 性能对比更新 + 策略移除 Heartbeat + 校验清单新增上限检查 |
| `processes/08-briefing-assemble.md` | 文件读取具体化（read 工具 + 分支动作）+ 校验清单补充 + 完成输出格式 |
| `processes/09-assemble.md` | 补并发池分批流程 + Markdown/Experiment 独立声明 + Briefing 读取具体化 + Experiment 信源降级 + 完成输出 |
| `processes/10-learning-ladder.md` | 补并发池分批流程 + 异常处理 + 文件读取具体化 + 完成输出 |
| `meta/output-contracts.md` | cleanup_log 示例移除 heartbeat_clear |
| `design/pipeline/00-overview.md` | 术语同步 + 补并发池架构说明 |
| `design/pipeline/01-data-flow.md` | 数据流规则更新（按需读取）+ 交接方式细化 |
| `design/pipeline/02-failure-modes.md` | 术语同步 + 故障模式补全 |

### 架构状态快照

```
后处理并发模型（当前）：

  Step ⑦  能力研究    并发池 W=5（计子组）   DAG 调度（有跨组依赖）   task 全内联
  Step ⑧  Briefing   并发池 W=5（计命题）   简单窗口（无依赖）       task 指定 read 路径
  Step ⑨  命题组装    并发池 W=5（计命题）   简单窗口（无依赖）       task 指定 read 路径
  Step ⑩  学习阶梯    并发池 W=5（计命题）   简单窗口（无依赖）       task 指定 read 路径

  跟踪方式：< 5min → 轮询 `subagents list` / ≥ 5min → Cron（isolated session）
  完成判断：expected_files 全部存在 = completed
  Step ⑨ 特殊：1 命题 = 2 agent（Markdown + Experiment），W=5 命题 = 最多 10 agent
```

---

## [2026-05-20] v2 架构重构：MCP → 纯 Markdown

**变更内容：**
- 删除整个 `mcp-server/` 目录（15 个 TypeScript 工具、schema、validators、templates）
- 删除 `references/` 目录（内容合并进 `processes/`）
- 删除 `pipeline/` 目录（观测层价值低，必要信息合并进 `design/`）
- 新增 `meta/` 目录：`sources.md`（信源分级表）、`output-contracts.md`（输出示例）、`paths.md`（路径约定）
- 新增 `processes/` 目录：00-shared + 01~10 共 11 个自包含执行文档
- 重写 `SKILL.md`：~2KB 精简入口，只放"做什么"

**触发因素：**
1. MCP 导致修改一个步骤需要同步 6-9 个文件，维护成本超出个人能力
2. MCP 函数调用指令和 skill 流程编排指令在上下文中混合，管理成本高
3. 主线程提前执行 MCP 函数获取上下文再传给子 agent，违背了动态指令的初衷
4. LLM 上下文特性：排版靠前的内容循迹更强、示例权重极高——要求扁平化架构 + 每步自包含示例

**架构变化：**
- 扁平化：SKILL.md → processes/01~10 直连，去掉中间的编排层
- 示例驱动：每个 process 文件包含完整的输出示例（来自 output-contracts.md）
- 子 agent 指令内联：task 从 process 文件提取，不依赖外部工具调用
- 状态管理降级为文件读写：pipeline-state.json 直接读写，不需要 MCP 工具
- 路径约定降级为查表：meta/paths.md 提供所有路径模板

**删除：**
- `architecture-model.md`（四级模型）— 该模型为论证 MCP 架构合理性而设计，v2 去掉 MCP 后失去锚点

**保留不变：**
- `core/` 方法论文档（architecture-decomposition、capability-graph、strategic-highground、scenario-matrix）
- `plugins/` 插件文档（capability-research-mode、year-granularity）
- 检查点协议（ⓐⓑⓒⓓⓔⓕⓖ）
- 滑动窗口并行调度
- 增量复用和中断恢复机制
