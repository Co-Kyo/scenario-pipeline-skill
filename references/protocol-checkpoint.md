# 检查点协议

🚨 每个检查点**强制停顿**，依次执行五步，**严禁跳过或自动推进**：

1. **生成决策摘要**：按 `assets/decision-summary.schema.json` 的 shape 写入 `{workDir}/.meta/checkpoints/{stage_id}-decision-summary.json`（此时 `decision` 留空）
2. **展示摘要**：从该 JSON 按 `display.pattern` 选择渲染方式，展示当前阶段的关键产物统计、质量指标、选择摘要和下一步
3. **写入检查点记录**：将决策摘要镜像写入 `{workDir}/.meta/checkpoints/{stage_id}-barrier.md`
4. **🛑 停住等待**：使用 `clarify` 工具向用户提问，**必须等待用户回复后才能继续**。不得在用户未回复时自动进入下一步
5. **收到确认后**：将用户决策补写到 `{stage_id}-decision-summary.json` 的 `decision` 字段，并同步 `{stage_id}-barrier.md`，按用户指令进入下一步或回溯修改

同步写入 `barrier_confirmed` 事件，`ref` 必须使用 `{workDir}/.meta/checkpoints/{stage_id}-barrier.md`。

---

## 检查点记录

每个检查点写两个文件：

机器可读决策摘要（展示前生成并冻结）：
```json
{
  "schema_version": "0.1.0",
  "stage_id": "{stage_id}",
  "gate_type": "human_gate",
  "display": {
    "pattern": "generic",
    "primary_unit": "{primary_unit}",
    "max_visible": 7,
    "legend": false,
    "selection": "confirm"
  },
  "context": {
    "current": "{当前阶段}",
    "question": "{本次确认什么}",
    "next": "{下一步}"
  },
  "metrics": [],
  "selection": {},
  "secondary": {
    "sections": [],
    "evidence": []
  },
  "risks": [],
  "actions": [],
  "barrier_summary": ""
}
```

人类可读检查点记录（分两阶段写入）：

初始写入（展示摘要后立即写入）：
```markdown
# {stage_id}-barrier: {检查点名称}

- 时间：{ISO 时间戳}
- 产物：{关键统计}
- 决策：（待补）
```

用户确认后补写决策：
```markdown
- 决策：{用户回复原文}
```

同步回写 `{stage_id}-decision-summary.json`：
```json
{
  "decision": {
    "status": "confirmed",
    "decision_at": "{ISO 时间戳}",
    "note": "{用户备注}",
    "evidence_hash": "{sha256}"
  }
}
```

## 检查点总览

| 阶段 | 文件 | 位置 | 核心产物 | 介入价值 |
|------|------|------|---------|---------|
| initialize | initialize-barrier.md | 初始化完成后 | init.json + run.json | 确认 workDir、运行信封 |
| intent-anchor | intent-anchor-barrier.md | 意图锚定完成后 | anchors.json | 确认年限推断、锚点、跳过判断 |
| brainstorm | brainstorm-barrier.md | 头脑风暴完成后 | requirement-web.json | 确认需求网、命题/能力/依赖/排除项 |
| partition | partition-barrier.md | 依赖分区完成后 | partition-analysis.json + execution-plan.md | 确认分区方案、执行计划 |
| scan | scan-barrier.md | 扫描完成后 | index.json + scan_summary | 确认素材质量、信源覆盖、失败归因 |
| capability-graph | capability-graph-barrier.md | 能力图谱完成后 | capability-graph.json + dependency-graph.json | 确认能力图谱、依赖图、高地 |
| evaluate-pool | evaluate-pool-barrier.md | 评估入池完成后 | evaluations.json | 确认评估结果、优先级、后处理范围 |
| capability-research | capability-research-barrier.md | 能力研究完成后 | capabilities/*.md + summaries/*.json | 审查能力主文件与摘要质量 |
| briefing-assemble | briefing-assemble-barrier.md | Briefing 组装完成后 | .meta/briefings/*.md | 审查 Briefing 素材提取完整性 |
| assemble | assemble-barrier.md | 命题组装完成后 | 命题目录文件 | 审查组装质量 |
| learning-ladder | learning-ladder-barrier.md | 学习阶梯完成后 | learning-ladder.md | 确认最终学习阶梯与交付 |

## 跳过条件

- 用户输入"全部确认"：跳过后续所有检查点
