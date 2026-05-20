# Design Changelog

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
