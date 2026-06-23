# Step ⑨: 导向学习看板生成

## 目的

将流水线全部产出（命题文档 + 学习阶梯 + 能力图谱 + 评估数据 + 分区分析）整合为一个可双击打开的 HTML 看板，提供 7 个分析视图。

> **v2 升级说明**：本步骤已升级为使用新的增量构建系统（`build-dashboard.js` + React 预构建 shell）。新系统支持长链路渐进呈现——从 Step ⓪ 开始，每步执行后看板自动刷新，最终在 Step ⑨ 长成完整看板。旧脚本 `build-dashboard-v2.js` 保留作为回退。

## 前置条件

Step ⑧ 全部命题学习阶梯完成，barrier-7.md 用户已确认。

无需加载额外方法论文件。构建脚本读取：
- `{workDir}/.meta/requirement-web.json`（Step ⓪ 产出）
- `{workDir}/.meta/partition-analysis.json`（Step ① 产出）
- `{workDir}/.meta/.raw-materials/index.json`（Step ② 产出）
- `{workDir}/.meta/capability-graph.json`（Step ③ 产出）
- `{workDir}/.meta/evaluations.json`（Step ④ 产出）
- `{workDir}/.meta/research-grouping.json`（Step ⑤ 产出）
- `{workDir}/capabilities/*.md`（Step ⑤ 产出）
- `{workDir}/{seq}-{short_name}/*.md`（Step ⑦/⑧ 产出，6 个 tab × 15 命题）

> **🔒 上下文隔离**
> - ✅ 构建脚本可读取：以上列出的所有 JSON 和 markdown 文件（构建脚本不受 Context Isolation 约束）
> - ❌ 构建脚本不读取：`processes/*.md`、`core/*.md`（方法论文件）
> - 📌 本步骤不读取 `meta/output-contracts.md`（看板格式由构建脚本自行定义）

## 输入

- 所有前序步骤的产出文件（JSON 数据 + Markdown 内容）
- 构建脚本 `{skillDir}/scripts/build-dashboard.js`
- 预构建 shell `{skillDir}/scripts/dashboard-dist/dashboard-shell.html`

## 执行步骤

### 1. 校验输入文件存在性

确认以下文件全部存在：

| 文件 | 用途 |
|------|------|
| `{workDir}/.meta/requirement-web.json` | 命题列表 + 能力雏形 |
| `{workDir}/.meta/partition-analysis.json` | 分区 DAG + 深度层 |
| `{workDir}/.meta/capability-graph.json` | 能力图谱 + 能力↔命题映射 |
| `{workDir}/.meta/evaluations.json` | 命题评估数据 |
| `{workDir}/.meta/research-grouping.json` | 能力分组（技术层） |
| `{workDir}/capabilities/*.md` | 能力研究文档 |
| `{workDir}/{seq}-{short_name}/overview.md` × 15 | 命题概述 |
| `{workDir}/{seq}-{short_name}/edge-cases.md` × 15 | 边界 case |
| `{workDir}/{seq}-{short_name}/trade-offs.md` × 15 | 权衡 |
| `{workDir}/{seq}-{short_name}/experiment.md` × 15 | 实验 |
| `{workDir}/{seq}-{short_name}/references.md` × 15 | 参考 |
| `{workDir}/{seq}-{short_name}/learning-ladder.md` × 15 | 学习阶梯 |

任一缺失 → 报告缺失文件清单，**不执行构建**。

### 2. 运行构建脚本（新系统）

```bash
node {skillDir}/scripts/build-dashboard.js {workDir} --step=9 --verbose
```

新构建脚本自动：
- 加载所有 .meta/*.json 数据文件（通过 `fs.existsSync` 检查存在性）
- 读取 capabilities/*.md 和命题目录下的 markdown 内容
- 构建 PipelineData（含 analytics：热力图、技术层、学习路径、矩阵、评估、批次）
- 构建 9 检查点进度时间线（全部 completed）
- 用 JSON.stringify 注入数据到预构建 React shell
- 对 `</script>` 做 HTML parser 防护转义
- 写出 `{workDir}/dashboard.html`（自包含，React + marked.js 全部内联）

构建预计耗时 < 5 秒（纯文件读写 + JSON 注入）。

### 2.1 回退方案（旧脚本）

如新脚本执行失败，可回退到旧脚本：

```bash
node {skillDir}/scripts/build-dashboard.js {workDir} --step=9 --legacy
```

或直接使用旧脚本：

```bash
node {skillDir}/scripts/build-dashboard-v2.js {workDir}
```

旧脚本产出 `{workDir}/dashboard-v2.html`（依赖 CDN 加载 marked.js，非离线可用）。

### 3. 验证产物

确认 `{workDir}/dashboard.html` 存在且大小 > 50KB（含 React 运行时）。

### 4. 检查点 ⓗ

展示看板构建摘要，等待用户确认。

## 输出

- `{workDir}/dashboard.html`：自包含 HTML 看板（React + marked.js 全部内联，file:// 离线可用），双击浏览器打开即可使用

## 看板视图

| 视图 | 内容 |
|------|------|
| 📊 总览 | 命题全表 + 洞察卡片 |
| 🗺️ 学习路径 | DAG 拓扑排序深度阶梯 |
| 🔥 能力热力图 | 22 高频能力 × 15 命题覆盖矩阵 |
| 🏗️ 技术层分布 | 6 层能力分类统计 |
| 📐 难度矩阵 | 4 象限（优先攻克→长期投入） |
| 📈 评估分析 | 跨栈耦合/文档真空/经验壁垒/热度 |
| ⚡ 执行批次 | 并行化最小批次序列 |

## 长链路渐进呈现

新看板系统支持从 Step ⓪ 开始的渐进呈现：

| Step | 看板可见内容 |
|------|-------------|
| ⓪ | 进度时间线 ⓩ + 前置视图：命题清单 + capability_web 雏形 |
| ① | 进度时间线 ⓩ✓ⓧ + 前置视图：增加 DAG + 分区摘要 |
| ② | 进度时间线 ⓐ + 前处理视图：信源统计 |
| ③ | 前处理视图：增加能力图谱可视化 |
| ④ | 进度时间线 ⓑ + 前处理视图：增加评估矩阵 + 命题池 |
| ⑤-⑧ | 后处理视图逐步"长出"：能力研究 → 命题详情 → 学习路径 |
| ⑨ | 完整看板：7 视图全量可用，进度时间线 ⓗ✓ |

每个 step 末尾的"看板刷新"步骤自动执行 `build-dashboard.js --step=N`，更新 `{workDir}/dashboard.html`。

## 注意事项

- 新构建脚本使用 `JSON.stringify` 注入内容，**不做 JS template literal 拼接**（历史踩坑：template literal 遇到 markdown 中的反引号、`${}`、`</script>` 会崩溃）
- 新看板**完全离线可用**：React 运行时 + marked.js 全部通过 vite-plugin-singlefile 内联到 HTML 中，无 CDN 依赖
- 旧看板（dashboard-v2.html）依赖 jsDelivr CDN 加载 marked.js，**不内嵌**（仅作为回退方案保留）
- 构建失败不阻塞流水线——前序 8 步产出均已就位，看板是锦上添花
- 新脚本零第三方依赖（仅 Node.js 内置 fs/path/process），skill 运行时无需 npm install
