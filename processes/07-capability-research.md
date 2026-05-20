# Step ⑦: 能力研究

## 目的

对每个需要研究的原子能力进行深度研究，产出能力知识库主文件 + 结构化摘要。后处理阶段一的第一步。

## 前置条件

⛔ 加载 `plugins/capability-research-mode.md`（材料块格式 + 深度分级）。

## 输入

- `capability-graph.json`（前处理产出）
- `README.md` / `candidates.md`（命题列表，用于筛选哪些能力需要研究）

## 执行步骤

### 1. 筛选待研究能力

从 capability-graph.json 中筛选：
- 覆盖待处理命题的能力
- 或扇出度 ≥ 30% 的能力

### 2. 增量检查

对每个待研究能力：
- `capabilities/{id}-{name}.md` 已存在 → 跳过
- `.meta/summaries/{id}-{name}.json` 已存在 → 跳过
- 均不存在 → 需要研究

### 3. 信源预查找

为每个待研究能力准备 T1/T2 URL：
- 根据能力名称确定 T0 来源（从 capability-graph.json 的 references.t0 读取）
- 补充 T1/T2 来源（大厂博客、优质社区）

### 4. 并行 spawn

按 `processes/00-shared.md` §子 agent 调度规则，为每个能力 spawn 独立 agent。

**task 模板**（替换变量后传入）：

```
你是「{capability_name}」的深度研究员。

⚠️ 你必须用 write 工具将文件写入磁盘，不要只输出到对话中。

## 任务
研究原子能力「{capability_name}」（ID: {capability_id}），产出两个文件：
1. 能力知识库主文件 → {workDir}/capabilities/{capability_id}-{capability_name}.md
2. 结构化摘要 JSON → {workDir}/.meta/summaries/{capability_id}-{capability_name}.json

## 能力信息
- 技术层: {layer}
- 描述: {description}
- 依赖能力: {dependencies}
- 扇出度: {fanout_ratio}（{fanout_level}）
- 标签: {tags}

## 信源
{urls_from_capability_graph}

T0 缺失: {t0_missing}

## 执行步骤

### Step 1: 信源获取
1. 优先使用上述预查找信源，按 Tier 优先级：T0 → T1 → T2 → T3
2. 如全部不可达，读取 meta/sources.md 的 T0 域名列表逐个搜索补充
3. 禁止凭记忆生成，必须 web_fetch 验证内容

### Step 2: 内容研究
按以下结构产出能力主文件：

# {capability_name}
> {description}

## 核心机制
（详细描述技术原理，≥500 字）

## 工程瓶颈
（每个瓶颈包含：触发条件、表现症状、解决方案）

## 调试工具
（推荐的调试工具和方法）

## 典型权衡
（2-3 种技术路线的对比表格）

## 最小验证实验
（可运行的 HTML/JS 代码）

## 参考资料
（按 Tier 排序）

### Step 3: 结构化摘要
产出 JSON：
{
  "id": "{capability_id}",
  "name": "{capability_name}",
  "tech_layer": "{layer}",
  "mechanism_summary": "1-3 句核心机制摘要",
  "bottlenecks": [
    {
      "name": "瓶颈名称",
      "trigger": "触发条件",
      "symptom": "表现症状",
      "category": "输入变异|状态跃迁|资源边界|规模拐点|时序竞争"
    }
  ],
  "tradeoffs": [
    {
      "dimension": "维度",
      "option_a": "方案A",
      "option_b": "方案B",
      "recommendation": "建议"
    }
  ],
  "experiment_code": "最小验证实验代码或 null",
  "references": [
    { "tier": "T0|T1|T2|T3", "url": "...", "title": "..." }
  ]
}

### Step 4: 保存文件
用 write 工具写入上述两个路径。

## 验证清单
- [ ] 主文件包含所有必需章节
- [ ] 主文件内容 ≥ 2000 字
- [ ] 摘要 JSON 格式正确
- [ ] 摘要包含 mechanism_summary
- [ ] 摘要包含至少 2 个 bottlenecks
- [ ] 参考资料按 Tier 排序
```

### 5. 等待全部完成

所有能力 agent 完成后，进入 ⓔ 检查点。

## 输出

- `{workDir}/capabilities/{id}-{name}.md` × N
- `{workDir}/.meta/summaries/{id}-{name}.json` × N

## 校验清单

- [ ] 每个已研究的能力有两个文件（主文件 + 摘要）
- [ ] 主文件内容 ≥ 2000 字
- [ ] 摘要 JSON 可解析
- [ ] 参考资料中的 URL 经过 web_fetch 验证
