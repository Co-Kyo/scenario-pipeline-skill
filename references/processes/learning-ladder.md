# Process: 学习阶梯生成 (learning-ladder)

> 将阶段二产出的垂直切片编排成面向学习者的渐进路径。
> **单线程执行，不需要 spawn，主 agent 直接生成。**

## ⚠️ L2 改造说明

**本文档已降级为参考文档，不再是执行手册。**

实际执行指令请调用 MCP `get_template` 工具获取：
```bash
mcporter call scenario-pipeline.get_template template_type="learning-ladder" params='{"seq":"<序号>","workDir":"<产出目录>"}'
```

`get_template` 会返回完整的自包含执行指令，包含：
- 命题信息（从 decompositions.json 自动加载）
- 涉及能力列表（从 capability-graph.json 自动加载）
- Briefing 内容（从 .meta/briefings/ 自动加载）- 仅 assemble 模板
- 执行步骤（从 templates/learning-ladder.md 加载）
- 输出路径（自动解析）
- 验证清单

**子 agent 只需执行 `get_template` 返回的指令，无需读取本文档。**

---

## 参考信息（仅供理解，非执行指令）

## 输入

| 输入 | 来源 | 路径 | 说明 |
|------|------|------|------|
| 能力依赖图 | 前处理 | `{{paths.meta_capability_graph}}` | 命题涉及的能力 + 依赖关系 → 阶段划分 |
| 能力摘要 | 阶段一 | `{{paths.meta_summaries_dir}}<id>.json` | mechanism/bottlenecks/tradeoffs → 知识锚点 |
| 命题概览 | 阶段二 | `{{paths.proposition_overview}}` | 链路解构 → 全局上下文 |
| 坑点 | 阶段二 | `{{paths.proposition_edge_cases}}` | 坑点 → "你会踩的坑" |
| 权衡 | 阶段二 | `{{paths.proposition_trade_offs}}` | 方案对比 → "怎么选" |
| 实验 | 阶段二 | `{{paths.proposition_experiment}}` | 可运行代码 → 动手任务 |
| 参考资料 | 阶段二 | `{{paths.proposition_references}}` | 补充阅读 |

## 输出

| 输出 | 路径 | 说明 |
|------|------|------|
| 学习阶梯 | `{{paths.proposition_learning_ladder}}` | 每个命题一个，渐进式引导 |

## 定位

阶段二产出的 overview / edge-cases / trade-offs / experiment / references 是**垂直切片**——
同一命题的不同技术视角，适合已掌握基础的人做参考，但对正在学习的人不够友好。

学习阶梯的作用是把这些切片**编排成一条渐进路径**：
- 基于 {{paths.meta_capability_graph}} 的能力依赖关系确定学习顺序
- 每一步给出具体的"做什么 → 你会看到什么 → 这说明了什么 → 接下来去哪"
- 读者"捡到 handler 就能执行"，带着问题去读现有产出

## 执行步骤

> **路径获取**：在执行任何步骤前，必须先调用 MCP `resolve_paths` 获取当前任务的所有路径：
> ```bash
> mcporter call scenario-pipeline.resolve_paths params='{"task_type":"learning-ladder","workDir":"<产出目录>","seq":"<序号>","short_name":"<命题简称>"}'
> ```
> 后续所有路径均使用返回的 `{{paths.xxx}}` 变量，禁止自行拼接。

```
对每个已组装的命题：

  1. 提取能力子图
     从 {{paths.meta_capability_graph}} 获取该命题涉及的能力 ID + 依赖边

  2. 拓扑排序
     Layer 0：无依赖的叶子节点（基础能力）
     Layer 1：依赖 Layer 0 的能力
     Layer 2：依赖 Layer 0+1 的能力
     ...

  3. 归纳阶段
     合并相邻层（紧密关联的 1-2 个能力可合并）
     每个阶段 = 一个"你能做到什么"的里程碑
     通常 3-4 个阶段

  4. 编排步骤
     每个阶段内：
       [概念] 读什么 → 建立心智模型
       [技能] 做什么 → 形成操作能力
       [综合] 想什么 → 建立判断力

     每步结构：
       - 要做什么（具体动作）
       - 你会看到什么（预期结果，降低认知门槛）
       - 这说明了什么（观察→知识连接）
       - 接下来去哪（指向 pipeline 产出的精确路径）
       - 做到才算过（二值验证标准）

  5. 写入 {{paths.proposition_learning_ladder}}
```

## 阶梯结构模板

```markdown
# <命题名称> — 学习阶梯

> 跟着阶梯走，每步有具体任务，做到才算过关。
> 不需要从头到尾读完 overview/experiment/trade-offs，阶梯会告诉你什么时候去看什么。

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

## 设计约束

| 约束 | 说明 |
|------|------|
| **不重写内容** | 阶梯只做编排和指引，不复制 overview/experiment 正文 |
| **精确引用** | 每步指向具体文件路径 + 章节，不模糊引用"相关资料" |
| **可执行** | 每步是"做"的动作，不是"读"的推荐 |
| **二值验证** | 做到/做不到，不是"理解程度" |
| **失败回退** | 每个阶段有明确的"做不到 → 回看 X" |

## 上下文消耗

读 {{paths.meta_capability_graph}} + summaries + 命题产出 ≈ 50-80KB（主 agent 可承受）

## 依赖

- 需要先完成阶段一（能力研究，产出 {{paths.capability_file}} 所在目录 + {{paths.meta_summaries_dir}}）
- 需要先完成阶段二（命题组装，产出 `{{paths.proposition_overview}}` 等文件）

## 参考

- `pipeline/05-learning-ladder.md`（阶段规范）
