# 后处理·阶段三：学习阶梯生成

> ⚠️ **架构观测文档** — 不是 skill 执行配置
> 执行真相：`references/post-process.md §阶段三`、`mcp-server/src/domains/template/templates/learning-ladder.md`
>
> **L2 架构说明**：MCP templates (`mcp-server/src/domains/template/templates/*.md`) 是执行指令的 SSoT。
> `references/processes/*.md` 已降级为参考文档，不再是执行手册。
> 执行流程：主 agent 调用 `get_template` → MCP 返回完整指令 → 子 agent 执行。
> 子 agent 只写不读，无需读取 process 文档。

> 触发：阶段二（命题组装）全部完成后自动执行
> 执行者：主 agent 单线程，不 spawn

> ⛔ **禁止在 pipeline 观测文档中添加 MCP 相关内容。**
> MCP 是实现层加速方案，不属于管道定义。MCP 相关内容请参见 [`mcp-server/`](../mcp-server/)。

---

## 输入

| 输入 | 来源 | 路径 | 说明 |
|------|------|------|------|
| 能力依赖图 | 前处理 | `.meta/capability-graph.json` | 命题涉及的能力 + 依赖关系 → 阶段划分 |
| 能力摘要 | 阶段一 | `.meta/summaries/<id>.json` | mechanism/bottlenecks/tradeoffs → 知识锚点 |
| 命题概览 | 阶段二 | `<命题>/overview.md` | 链路解构 → 全局上下文 |
| 坑点 | 阶段二 | `<命题>/edge-cases.md` | 坑点 → "你会踩的坑" |
| 权衡 | 阶段二 | `<命题>/trade-offs.md` | 方案对比 → "怎么选" |
| 实验 | 阶段二 | `<命题>/experiment/` | 可运行代码 → 动手任务 |
| 参考资料 | 阶段二 | `<命题>/references.md` | 补充阅读 |

## 输出

| 输出 | 路径 | 说明 |
|------|------|------|
| 学习阶梯 | `<序号>-<命题简称>/learning-ladder.md` | 每个命题一个，渐进式引导 |

## 涉及文件

### 产物文件（读取）

| 文件 | 用途 |
|------|------|
| `.meta/capability-graph.json` | 提取命题的能力子图 → 拓扑排序 → 阶段划分 |
| `.meta/summaries/*.json` | 每步的知识锚点（mechanism/bottlenecks/tradeoffs） |
| `<命题>/overview.md` | 每步的全局上下文 |
| `<命题>/experiment/` | 动手任务来源 |
| `<命题>/trade-offs.md` | 高阶阶段的权衡素材 |
| `<命题>/edge-cases.md` | 中阶阶段的坑点素材 |

### 产物文件（写入）

| 文件 | 说明 |
|------|------|
| `<命题>/learning-ladder.md` | 唯一新增文件 |

---

## 执行逻辑

### 执行逻辑

```
对每个已组装的命题：
  spawn 一个独立 agent
  task = 学习阶梯生成模板
  输入：
    - proposition（命题文本）
    - capability_graph（能力依赖图）
    - summaries（该命题涉及的能力摘要）
    - proposition_files（该命题的产出文件）
  输出：
    - <序号>-<命题简称>/learning-ladder.md
```

---

## 阶梯结构模板

```markdown
# <命题名称> — 学习阶梯

> 跟着阶梯走，每步有具体任务，做到才算过关。

## 你需要什么基础
- （前置知识要求）

## 阶梯总览
- 阶段一：<阶段名>（对应能力 A?）
- 阶段二：<阶段名>（对应能力 A?）
- 阶段三：<阶段名>（对应能力 A?, A?）
- 阶段四：<阶段名>（综合运用）

---

## 阶段一：<阶段名>

### 你将理解什么
（这个阶段解决什么问题、建立什么认知）

### Step 1：<步骤名>
**做**：（具体动作）
**你会看到什么**：（预期结果）
**这说明了什么**：（观察→知识连接）
**接下来去哪**：（指向下一个产物或步骤）
**做到才算过**：（二值验证）

### 阶段一过关标准
- [ ] （验证点）
做不到？→ 回到 <具体产物路径> 重读

---

## 学完之后你应该能做到
（面试/实战场景的综合能力描述）
```

---

## 设计约束

| 约束 | 说明 |
|------|------|
| **不重写内容** | 阶梯只做编排和指引，不复制 overview/experiment 正文 |
| **精确引用** | 每步指向具体文件路径 + 章节，不模糊引用"相关资料" |
| **可执行** | 每步是"做"的动作，不是"读"的推荐 |
| **二值验证** | 做到/做不到，不是"理解程度" |
| **失败回退** | 每个阶段有明确的"做不到 → 回看 X" |

---

## 上下文消耗

读 capability-graph.json + summaries + 命题产出 ≈ 50-80KB（主 agent 可承受）

---

## ⛔ Barrier

- **上游**：阶段二全部完成后才能进入阶段三
- **下游**：无（阶段三是管线终点）
