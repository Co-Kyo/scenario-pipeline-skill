# Step ⑥: 入池归档

## 目的

合并前处理产出，写入总览导航，完成前处理阶段。

## 前置条件

无需加载额外方法论文件。读取：
- `meta/output-contracts.md`§6（本步输出格式，README.md 模板）
- `{workDir}/.meta/capability-graph.json`（Step 03 产出）
- `{workDir}/.meta/highgrounds.json`（Step 04 产出）
- `{workDir}/.meta/evaluations.json`（Step 05 产出）

> **🔒 上下文隔离**
> - ✅ 允许读取：`processes/00-shared.md`、`meta/output-contracts.md`§6、`{workDir}/.meta/capability-graph.json`、`{workDir}/.meta/highgrounds.json`、`{workDir}/.meta/evaluations.json`（前序产出）
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

⚠️ 读 `meta/output-contracts.md`§6 获取完整模板。按模板写入 `{workDir}/README.md`。

### 3. 写入候选池

将原始候选数据写入 `{workDir}/.meta/candidates.md`（pipeline 内部存档）。

## 输出

⚠️ 本步骤产出 3 个文件，必须全部写入磁盘：

- `{workDir}/README.md` — 命题总览导航（格式见 `meta/output-contracts.md`§6）
- `{workDir}/.meta/candidates.md` — 候选命题原始数据存档（Pipeline 内部，不进入后处理消费链；仅供调试追溯）
- `{workDir}/.meta/capability-graph.json` — 更新后的能力图谱（合并了 highgrounds 和 learning_path 字段）

## 检查点

🚨 入池完成后**必须停顿**，进入 ⓒ 检查点。展示后处理执行计划（待研究能力数、待组装命题数、预计 agent 数），使用 `clarify` 等待用户确认后才进入 Step ⑦。

## 校验清单

- [ ] README.md 的命题索引与 evaluations.json 一致
- [ ] 学习路径与 highgrounds.json 的 learning_path 一致
- [ ] capability-graph.json 包含 highgrounds 和 learning_path 字段
