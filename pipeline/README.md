# Pipeline 架构观测文档

> ⚠️ **本目录是架构观测文档，不是 skill 执行配置。**
> 
> - **执行真相（L2 架构）**：MCP `templates/*.md`（`mcp-server/src/domains/template/templates/`）
> - **参考文档**：`references/pre-process.md`、`references/post-process.md`、`references/processes/*.md`（已降级为参考）
> - **本目录用途**：理解设计、数据流、阶段边界，供人类阅读参考

> **L2 架构说明**：MCP templates 现在是执行指令的 SSoT。主 agent 调用 `get_template` → MCP 返回完整指令 → 子 agent 执行。`references/processes/*.md` 已降级为参考文档。

---

## 文件索引

| 文件 | 内容 |
|------|------|
| `00-overview.md` | 全局视图：数据流图 + 阶段边界 |
| `01-pre-process.md` | 前处理观测：输入/输出/涉及文件 |
| `02-capability-research.md` | 阶段一观测：能力研究 |
| `03-briefing-assemble.md` | 中间步骤观测：Briefing 组装 |
| `04-proposition-assembly.md` | 阶段二观测：命题组装 |
| `05-learning-ladder.md` | 阶段三观测：学习阶梯生成 |
| `99-shared.md` | 跨阶段共享参考：数据实体、插件关系、故障模式 |

## 与 MCP templates / references/ 的关系

```
pipeline/ (观测)              MCP templates/ (执行真相 SSoT)         references/ (参考)
├── 00-overview.md            ├── capability-research.md            ├── pre-process.md
├── 01 ~ 05 各阶段观测        ├── briefing-assemble.md              ├── post-process.md
└── 99-shared.md 共享参考     └── ...                               └── processes/
```

### L2 架构执行流程

1. 主 agent 调用 MCP `get_template(template_name)` 获取完整执行指令
2. MCP 从 `mcp-server/src/domains/template/templates/*.md` 读取模板并返回
3. 主 agent 将模板内容作为 task 分配给子 agent
4. 子 agent **只写不读**，无需访问 `references/processes/*.md`

- `pipeline/` 描述"是什么"和"为什么"
- `MCP templates/*.md` 定义"怎么做"（SSoT）
- `references/processes/*.md` 降级为参考文档，不再用于执行

---

> **关于架构定义文件**
>
> 本项目早期的架构定义（architecture-model.md）、对外架构介绍（mcp-skill-architecture.md）和策略计划书（subagent-strategy.md）原存于本目录。
> 2026-05-16 已迁至 `design/` 目录统一管理，以保持 `pipeline/` 的纯观测层定位。
> 相关文件现位于：
> - 架构层 → `design/architecture-model.md`
> - 对外技术介绍 → `design/mcp-skill-architecture.md`
> - 策略计划 → `design/plans/pre-process-subagent-strategy.md`
