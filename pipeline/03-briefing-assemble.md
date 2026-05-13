# 后处理·阶段一步骤2：Briefing 组装

> ⚠️ **架构观测文档** — 不是 skill 执行配置
> 执行真相（L2 架构）：MCP template `briefing-assemble.md`（`mcp-server/src/domains/template/templates/`）
> 参考文档：`references/post-process.md §阶段一步骤2`、`references/archive/briefing-assemble.md`（已降级）

> 触发：阶段一步骤1（能力研究）全部完成后自动执行
> 执行者：主 agent 单线程，不 spawn

> **L2 架构说明**：主 agent 调用 MCP `get_template("briefing-assemble")` 获取完整执行指令 → 子 agent 执行。子 agent 只写不读，无需访问 `references/processes/`。

---

## 输入

| 输入 | 来源 | 路径 | 说明 |
|------|------|------|------|
| 结构化摘要 | 阶段一产出 | `.meta/summaries/<id>.json` | 能力的 mechanism/bottlenecks/tradeoffs/exp/refs |
| 能力→命题映射 | 前处理 | `.meta/capability-graph.json` | 确定每个命题涉及哪些能力 |
| 命题列表 | 前处理 | `workflow/research/README.md` | 待处理命题列表 |

## 输出

| 输出 | 路径 | 说明 |
|------|------|------|
| 组装 Briefing | `.meta/briefings/<命题简称>.md` | 每个命题一个，内联到阶段二 agent task |

## 涉及文件

### Skill 内部文件

| 文件 | 角色 |
|------|------|
| `references/post-process.md` | 编排（参考） |
| MCP template `briefing-assemble.md` | **组装逻辑 SSoT**（主 agent 通过 `get_template` 获取） |
| `references/archive/briefing-assemble.md` | 参考文档（已降级，不再用于执行） |

### 产物文件（读取）

| 文件 | 用途 |
|------|------|
| `.meta/summaries/*.json` | 能力摘要（5 种字段） |
| `.meta/capability-graph.json` | 能力→命题映射 |
| `workflow/research/README.md` | 命题列表 |

### 产物文件（写入）

| 文件 | 说明 |
|------|------|
| `.meta/briefings/<命题简称>.md` | 组装好的 briefing |

---

## 执行逻辑

### 执行逻辑

```
对每个待处理命题：
  spawn 一个独立 agent
  task = Briefing组装模板
  输入：
    - proposition（命题文本）
    - capability_ids（该命题涉及的能力ID列表）
    - summary_files（这些能力的summary.json内容）
  输出：
    - .meta/briefings/<命题简称>.md
```

## 定向提取规则

| 目标文件 | 从 summary 提取 | 不提取 |
|---------|----------------|--------|
| overview | mechanism_summary | bottlenecks, tradeoffs, experiment_code |
| edge-cases | bottlenecks(name+category+priority+trigger+symptom+版本相关字段) | mechanism_summary, experiment_code |
| trade-offs | tradeoffs(完整四列) | mechanism_summary, experiment_code |
| experiment | experiment_code | mechanism_summary, bottlenecks |
| references | references(tier+url+title) | 正文内容 |

## 上下文消耗

读 32KB summaries + 写 30KB briefings ≈ 62KB（主 agent 可承受）

---

## ⛔ Barrier

全部 briefing 生成后才能进入阶段二（命题组装）。
