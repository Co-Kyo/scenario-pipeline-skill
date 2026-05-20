# Step ⑥: 入池归档

## 目的

合并前处理产出，写入总览导航，完成前处理阶段。

## 输入

- `capability-graph.json`（Step ③ 产出）
- `highgrounds.json`（Step ④ 产出）
- `evaluations.json`（Step ⑤ 产出）

## 执行步骤

### 1. 合并战略高地

将 `highgrounds.json` 的 `highgrounds` 和 `learning_path` 字段合并入 `capability-graph.json`（追加为顶层字段）。

### 2. 写入总览导航

按 `meta/output-contracts.md` §1（raw-materials.json 示例）中定义的结构，写入 `{workDir}/README.md`：

```markdown
# <研究主题> — 命题研究

> 目标人群：<年限>
> 扫描时间：<日期>

## 命题索引

| # | 命题 | 四维评分 | 优先级 | 研究目录 |
|---|------|---------|--------|---------|
| P1 | 长列表渲染：... | 10 | high | [01-长列表渲染](01-长列表渲染/) |
| P2 | 首屏白屏：... | 8 | medium | [02-首屏白屏](02-首屏白屏/) |

## 学习路径（战略高地）

1. 🏔️ **A8-DevTools 性能分析**（覆盖 7/7 命题）
2. 🏔️ **A1-浏览器渲染管线**（覆盖 5/7 命题）

完整能力图谱：[capabilities/README.md](capabilities/README.md)

## 能力知识库

按原子能力组织的跨命题参考手册：[capabilities/](capabilities/)
```

### 3. 写入候选池

将原始候选数据写入 `{workDir}/.meta/candidates.md`（pipeline 内部存档）。

### 4. 状态持久化

更新 `{workDir}/.meta/pipeline-state.json`：
- `last_checkpoint: "ⓑ"`
- `stages.pre-process.status: "completed"`

## 输出

- `{workDir}/README.md`
- `{workDir}/.meta/candidates.md`
- 更新后的 `capability-graph.json`（合并了 highgrounds）
- 更新后的 `pipeline-state.json`

## 校验清单

- [ ] README.md 的命题索引与 evaluations.json 一致
- [ ] 学习路径与 highgrounds.json 的 learning_path 一致
- [ ] capability-graph.json 包含 highgrounds 和 learning_path 字段
