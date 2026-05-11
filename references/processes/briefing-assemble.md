# Process: Briefing 组装 (briefing-assemble)

> 从阶段一产出的 summary.json 中定向提取内容，按命题组装为 briefing，供阶段二组装 agent 消费。
> **单线程执行，不需要 spawn。**

## 输入

- `{{paths.meta_summaries_dir}}*.json` — 阶段一双写的结构化摘要
- `{{paths.meta_capability_graph}}` — 能力与命题的映射关系
- `{{paths.readme}}` — 待处理命题列表 + 分词结果

## 执行步骤

### Step 1：确定每个命题涉及的能力

从 `capability-graph.json` 获取每个待处理命题涉及的能力 ID 列表。

### Step 2：读取摘要

读取这些能力的 `summary.json`。

### Step 3：定向提取

按 5 种目标文件类型定向提取内容：

| 目标文件 | 从 summary.json 提取 | 不提取 |
|---------|---------------------|--------|
| overview | `mechanism_summary` | bottlenecks、tradeoffs、experiment_code |
| edge-cases | `bottlenecks`（name+category+priority+trigger+symptom+版本相关字段） | mechanism_summary、experiment_code |
| trade-offs | `tradeoffs`（完整四列） | mechanism_summary、experiment_code |
| experiment | `experiment_code` | mechanism_summary、bottlenecks |
| references | `references`（tier+url+title） | 正文内容 |

### Step 4：生成 Briefing

对每个待处理命题生成一个 briefing 文件，格式如下：

```markdown
# <命题名称> — 组装 Briefing

## 命题信息
命题：<完整命题文本>
通用占比：<百分比>
限定词：<框架/平台（如有）>

## 涉及能力摘要

### <能力ID>-<能力名称>
机制：<mechanism_summary>
瓶颈：
  - B1 <瓶颈名>（<分类>，<优先级>）：<触发条件> → <表现症状>
    - 版本相关性：<强相关/弱相关/无关>
    - [如强相关] 涉及工具：<工具名>，受影响版本：<版本范围>，修复版本：<版本号>（来源：<URL>）
  - B2 <瓶颈名>（<分类>，<优先级>）：<触发条件> → <表现症状>
    - 版本相关性：<强相关/弱相关/无关>
权衡：
  - <维度>：<方案A> vs <方案B>，建议 <选择建议>
实验代码：<experiment_code 或 "无（非 deep 模式）">
参考：<references 列表>

### <下一个能力>
（同上格式）

## 内容比例约束
开篇 10-15%：从 <限定词> 痛点切入
主体 70-80%：通用工程原理
收尾 10-15%：回到 <限定词> 给落地方案

## 参考资料（已去重，按 Tier 排序）
- [T1] <标题>: <URL>
- [T2] <标题>: <URL>
```

### Step 5：保存

```
{{paths.meta_briefings_dir}}
├── 01-长列表渲染.md
├── 02-首屏白屏.md
└── ...
```

## 复用规则

- 如果同一能力被多个命题引用，其 `summary.json` 只读一次，内容复用到多个 briefing
- 如果已有部分 briefing（增量模式），只生成缺失命题的 briefing
- briefing 生成后可预审：每个能力的瓶颈是否 ≥ 2 个？权衡是否完整？不满足的标记提醒

## 上下文消耗估算

```
16 个能力 × ~2KB/summary = ~32KB（读取量）
3 个命题 × ~10KB/briefing = ~30KB（写入量）
总计：~62KB（远低于读 16 个完整文件的 128KB+）
```

---

## 异常与 Fallback

| 异常场景 | 触发条件 | 处理动作 |
|---------|---------|---------|
| summary.json 缺失 | 某能力的 summary 文件不存在 | 跳过该能力，在 briefing 中注明"⚠️ 该能力摘要缺失"，不编造内容 |
| summary.json 格式错误 | JSON 解析失败 | 标记 `parse_error: true`，跳过该能力，告知用户 |
| 命题无关联能力 | capability-graph.json 中该命题无能力映射 | 生成空 briefing + 建议："该命题无关联能力，请检查分词结果" |
| 部分字段为空 | summary 中 mechanism_summary 为空 | 对应 section 写"（该能力未提供机制摘要）"，不编造 |
| briefing 文件已存在 | 增量模式下文件已存在 | 跳过生成（默认），或询问用户"覆盖 / 跳过 / 追加" |
| 上下文超限 | summaries 总量 > 50KB | 分批读取：每次读 5 个 summary，组装对应命题的 briefing，分批写入 |

## 依赖

- 需要先执行 processes/capability-research.md（阶段一，产出 `{{paths.meta_summaries_dir}}`）

## 参考

- core/capability-graph.md（能力定义与命题映射）
