# Step ⑥: 入池归档

## 目的

合并前处理产出，写入总览导航，完成前处理阶段。

## 前置条件

无需加载额外方法论文件。读取前序步骤的产出 JSON 即可。

> **🔒 上下文隔离**
> - ✅ 允许读取：`meta/output-contracts.md`§6、`{workDir}/.meta/capability-graph.json`、`{workDir}/.meta/highgrounds.json`、`{workDir}/.meta/evaluations.json`（前序产出）
> - ❌ 禁止读取：`processes/01~05.md`、`processes/07~10.md`、`core/*.md`、`plugins/*.md`
> - 📌 `output-contracts.md` 只读 §6 节；本步骤不加载任何方法论

## 输入

- `capability-graph.json`（Step ③ 产出）
- `highgrounds.json`（Step ④ 产出）
- `evaluations.json`（Step ⑤ 产出）

## 执行步骤

### 1. 合并战略高地

将 `highgrounds.json` 的 `highgrounds` 和 `learning_path` 字段合并入 `capability-graph.json`（追加为顶层字段）。

### 2. 写入总览导航

按下方模板，写入 `{workDir}/README.md`：

```markdown
# <研究主题> — 命题研究

> 目标人群：<年限>
> 扫描时间：<日期>

## 命题索引

| # | 命题 | 四维评分 | 优先级 | 难度 | 研究目录 |
|---|------|---------|--------|------|---------|
| P1 | 长列表渲染：... | 10 | high | 🟢 low | [01-长列表渲染](01-长列表渲染/) |
| P2 | 首屏白屏：... | 8 | high | 🟡 medium | [02-首屏白屏](02-首屏白屏/) |

## 推荐学习顺序

按掌握难度从低到高排列（基于原子能力依赖链深度评估）：

1. 🟢 P1 — ...（无前置依赖，建立基础认知）
2. 🟡 P2 — ...（前置：P1，需理解渲染管线）
3. 🔴 P3 — ...（前置：P1+P2，需全新知识体系）

## 学习路径（战略高地）

1. 🏔️ **A8-DevTools 性能分析**（覆盖 7/7 命题）
2. 🏔️ **A1-浏览器渲染管线**（覆盖 5/7 命题）

完整能力图谱：[capabilities/README.md](capabilities/README.md)

## 能力知识库

按原子能力组织的跨命题参考手册：[capabilities/](capabilities/)
```

### 3. 写入候选池

将原始候选数据写入 `{workDir}/.meta/candidates.md`（pipeline 内部存档）。

## 输出

- `{workDir}/README.md`
- `{workDir}/.meta/candidates.md`
- 更新后的 `capability-graph.json`（合并了 highgrounds）

## 检查点

入池完成后，依次进入：
1. **ⓐ 检查点**：展示信源质量统计（Tier 分布、丢弃数），等待用户确认
2. **ⓑ 检查点**：展示命题评估表（优先级分布、难度分级），等待用户确认
3. **ⓒ 检查点**：展示后处理执行计划（待研究能力数、待组装命题数、预计 agent 数），等待用户确认后进入 Step ⑦

## 校验清单

- [ ] README.md 的命题索引与 evaluations.json 一致
- [ ] 学习路径与 highgrounds.json 的 learning_path 一致
- [ ] capability-graph.json 包含 highgrounds 和 learning_path 字段
