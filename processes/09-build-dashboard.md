# Step ⑨: 导向学习看板生成

## 目的

将流水线全部产出（命题文档 + 学习阶梯 + 能力图谱 + 评估数据 + 分区分析）整合为一个可双击打开的 HTML 看板，提供 7 个分析视图。

## 前置条件

Step ⑧ 全部命题学习阶梯完成，barrier-7.md 用户已确认。

无需加载额外方法论文件。读取：
- `{workDir}/.meta/capability-graph.json`（Step ③ 产出）
- `{workDir}/.meta/evaluations.json`（Step ④ 产出）
- `{workDir}/.meta/research-grouping.json`（Step ⑤ 产出）
- `{workDir}/.meta/partition-analysis.json`（Step ① 产出）
- `{workDir}/{seq}-{short_name}/*.md`（Step ⑦/⑧ 产出，5 个 tab × 15 命题）

> **🔒 上下文隔离**
> - ✅ 允许读取：`core/shared-conventions.md`、以上列出的所有 JSON 和 markdown 文件
> - ❌ 禁止读取：`processes/01~08.md`、`core/*.md`（除 shared-conventions）、`plugins/*.md`
> - 📌 本步骤不读取 `meta/output-contracts.md`（无 §9 节，看板格式由构建脚本自行定义）

## 输入

- 所有前序步骤的产出文件（JSON 数据 + Markdown 内容）
- 构建脚本 `{skillDir}/scripts/build-dashboard-v2.js`
- 模板文件 `{skillDir}/scripts/dashboard-template.html`

## 执行步骤

### 1. 校验输入文件存在性

确认以下文件全部存在：

| 文件 | 用途 |
|------|------|
| `{workDir}/.meta/capability-graph.json` | 能力图谱 + 能力↔命题映射 |
| `{workDir}/.meta/evaluations.json` | 命题评估数据 |
| `{workDir}/.meta/research-grouping.json` | 能力分组（技术层） |
| `{workDir}/.meta/partition-analysis.json` | 分区 DAG + 深度层 |
| `{workDir}/{seq}-{short_name}/overview.md` × 15 | 命题概述 |
| `{workDir}/{seq}-{short_name}/edge-cases.md` × 15 | 边界 case |
| `{workDir}/{seq}-{short_name}/trade-offs.md` × 15 | 权衡 |
| `{workDir}/{seq}-{short_name}/references.md` × 15 | 参考 |
| `{workDir}/{seq}-{short_name}/learning-ladder.md` × 15 | 学习阶梯 |

任一缺失 → 报告缺失文件清单，**不执行构建**。

### 2. 运行构建脚本

```bash
node {skillDir}/scripts/build-dashboard-v2.js {workDir}
```

构建脚本自动：
- 加载 4 个 JSON 数据文件
- 读取 75 个 markdown 文件（15 命题 × 5 tab）
- 构建 ANALYTICS 数据（热力图、技术层、学习路径、矩阵、评估）
- 用 JSON.stringify 注入所有内容到 HTML 模板
- 对 `</script>` 做 HTML parser 防护转义
- 写出 `{workDir}/dashboard-v2.html`

构建预计耗时 < 5 秒（纯文件读写）。

### 3. 验证产物

确认 `{workDir}/dashboard-v2.html` 存在且大小 > 100KB。

### 4. 检查点 ⓗ

展示看板构建摘要，等待用户确认。

## 输出

- `{workDir}/dashboard-v2.html`：自包含 HTML 看板（marked.js CDN 加载，其余全内嵌），双击浏览器打开即可使用

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

## 注意事项

- 构建脚本使用 `JSON.stringify` 注入内容，**不做 JS template literal 拼接**（历史踩坑：template literal 遇到 markdown 中的反引号、`${}`、`</script>` 会崩溃）
- 看板依赖 jsDelivr CDN 加载 marked.js，**不内嵌**（用户在线使用 agent，离线场景不考虑）
- 构建失败不阻塞流水线——前序 8 步产出均已就位，看板是锦上添花
