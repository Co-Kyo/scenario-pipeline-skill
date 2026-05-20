# Step ⑧: Briefing 组装

## 目的

为每个待处理命题组装 Briefing——从能力摘要中提取关键信息，供后续命题组装 agent 使用。后处理阶段一的第二步。

## 输入

- `capability-graph.json`（前处理产出，含 propositions 和 capabilities）
- `.meta/summaries/*.json`（Step ⑦ 产出的能力摘要）

## 执行步骤

### 1. 筛选待处理命题

从 capability-graph.json 的 propositions 字段获取命题列表。

### 2. 增量检查

对每个命题：`.meta/briefings/{seq}-{short_name}.md` 已存在 → 跳过。

### 3. 并行 spawn

按 `processes/00-shared.md` §子 agent 调度规则，为每个命题 spawn 独立 agent。

**task 模板**：

```
你是「{proposition_name}」的 Briefing 组装专家。

⚠️ 你必须用 write 工具将文件写入磁盘，不要只输出到对话中。

## 任务
为命题「{proposition_name}」组装 Briefing 文档。

## 命题信息
- ID: {proposition_id}
- 名称: {proposition_name}
- 限定词: {qualifier}
- 内容占比: {content_weight}

## 涉及能力
{capability_ids}

## 执行步骤

### Step 1: 读取能力摘要
对每个涉及的能力，读取 {workDir}/.meta/summaries/{id}-{name}.json。
如果某个摘要不存在，在 Briefing 中注明"⚠️ 该能力摘要缺失"。

### Step 2: 提取关键信息
从每个能力摘要中提取：
- mechanism_summary
- bottlenecks（只保留与该命题相关的）
- tradeoffs
- experiment_code
- references

### Step 3: 组装 Briefing
按以下格式组装：

# {proposition_name} — 组装 Briefing

## 命题信息
命题：{proposition_name}
限定词：{qualifier}

## 涉及能力摘要

### [能力ID]-[能力名称] [用于: overview/edge-cases/trade-offs/experiment]
机制：（mechanism_summary）
瓶颈：
  - [名称]：[触发条件] → [表现症状]
权衡：
  - [维度]：[方案A] vs [方案B]，建议 [选择建议]
实验代码：（如有）
参考：（URL 列表）

## 内容比例约束
开篇 10-15%：从 {qualifier} 痛点切入
主体 70-80%：通用工程原理
收尾 10-15%：回到 {qualifier} 给落地方案

### Step 4: 保存文件
写入 {workDir}/.meta/briefings/{seq}-{short_name}.md

## 验证清单
- [ ] Briefing 包含所有涉及能力的摘要
- [ ] 每个能力包含 mechanism_summary
- [ ] 参考资料已去重并按 Tier 排序
```

### 4. 等待全部完成

所有 Briefing agent 完成后，进入 ⓓ 检查点。

## 输出

- `{workDir}/.meta/briefings/{seq}-{short_name}.md` × M
