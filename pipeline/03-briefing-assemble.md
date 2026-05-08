# 后处理·阶段一步骤2：Briefing 组装

> ⚠️ **架构观测文档** — 不是 skill 执行配置
> 执行真相：`references/post-process.md §阶段一步骤2`、`references/processes/briefing-assemble.md`

> 触发：阶段一步骤1（能力研究）全部完成后自动执行
> 执行者：主 agent 单线程，不 spawn

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
| `references/post-process.md` | 编排 |
| `references/processes/briefing-assemble.md` | 组装逻辑细节 |

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

```
对每个待处理命题：
  1. 从 capability-graph.json 获取该命题涉及的能力 ID 列表
  2. 读取这些能力的 summary.json
  3. 按 5 种文件类型定向提取，组装为 briefing
  4. 保存到 .meta/briefings/<命题简称>.md
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
