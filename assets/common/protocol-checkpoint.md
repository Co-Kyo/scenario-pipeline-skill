# 检查点协议

🚨 每个检查点**强制停顿**，依次执行四步，**严禁跳过或自动推进**：

1. **展示摘要**：当前阶段的关键产物统计和质量指标
2. **写入检查点记录**：将产物摘要写入 `{workDir}/.meta/checkpoints/barrier-{N}.md`（此时决策字段留空）
3. **🛑 停住等待**：使用 `clarify` 工具向用户提问，**必须等待用户回复后才能继续**。不得在用户未回复时自动进入下一步
4. **收到确认后**：将用户决策补写到记录文件中，按用户指令进入下一步或回溯修改

---

## 检查点记录

每个检查点写一个独立文件，分两阶段写入：

初始写入（展示摘要后立即写入）：
```markdown
# barrier-{N}: {检查点名称}

- 时间：{ISO 时间戳}
- 产物：{关键统计}
- 决策：（待补）
```

用户确认后补写决策：
```markdown
- 决策：{用户回复原文}
```

## 检查点总览

| 编号 | 文件 | 位置 | 核心产物 | 介入价值 |
|------|------|------|---------|---------| 
| ⓩ | barrier-0.md | Step ⓪ 完成后 | anchors.json | 确认锚点、年限推断、跳过判断 |
| ⓩ | barrier-1.md | Step ① 完成后 | requirement-web.json | 确认需求网、命题拆分 |
| ⓧ | barrier-2.md | Step ② 完成后 | partition-analysis.json + execution-plan.md | 确认分区方案、执行计划 |
| ⓐ | barrier-3.md | Step ④ 完成后 | capability-graph.json | 确认能力图谱质量 |
| ⓑ | barrier-4.md | Step ⑤ 完成后（后处理启动前） | evaluations.json + 执行计划 | 确认命题优先级、范围、调整参数 |
| ⓒ | barrier-5.md | Step ⑥ 完成后 | capability 文件 + summary | 审查研究质量 |
| ⓓ | barrier-6.md | Step ⑦ 完成后 | briefing 文件 | 审查素材提取完整性 |
| ⓕ | barrier-7.md | Step ⑧ 完成后 | 命题目录文件 | 审查组装质量 |
| ⓖ | barrier-8.md | Step ⑨ 完成后 | learning-ladder.md | 确认最终产出 |
| ⓗ | barrier-9.md | Step ⑩ 完成后 | dashboard-v2.html | 确认看板交付 |

## 跳过条件

- `--batch=pending` 模式：自动跳过所有检查点
- 用户输入"全部确认"：跳过后续所有检查点
