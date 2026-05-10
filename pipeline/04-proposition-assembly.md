# 后处理·阶段二：命题组装

> ⚠️ **架构观测文档** — 不是 skill 执行配置
> 执行真相：`references/post-process.md §阶段二`、`references/processes/assemble.md`

> 触发：Briefing 组装全部完成后自动执行
> 执行者：滑动窗口并行 spawn（每 agent 1 个命题的 1 个象限文件，窗口大小默认4）

> ⛔ **禁止在 pipeline 观测文档中添加 MCP 相关内容。**
> MCP 是实现层加速方案，不属于管道定义。MCP 相关内容请参见 [`mcp-server/`](../mcp-server/)。

---

## 输入

| 输入 | 来源 | 路径 | 说明 |
|------|------|------|------|
| 组装 Briefing | 中间步骤 | `.meta/briefings/<命题简称>.md` | 内联到 agent task |
| 命题列表 + 分词结果 | 前处理 | `workflow/research/README.md` | 待处理命题 + 分词信息 |

## 输出

| 输出 | 路径 | 说明 |
|------|------|------|
| 命题概览 | `<序号>-<命题简称>/overview.md` | Q1: 链路编排 |
| 坑点提取 | `<序号>-<命题简称>/edge-cases.md` | Q2: 坑点 |
| 方案对比 | `<序号>-<命题简称>/trade-offs.md` | Q3: 权衡 |
| 实验组装 | `<序号>-<命题简称>/experiment/` | Q4: 可运行代码 |
| 参考资料 | `<序号>-<命题简称>/references.md` | 参考链接 |

## 涉及文件

### Skill 内部文件

| 文件 | 角色 |
|------|------|
| `references/post-process.md` | 编排 |
| `references/processes/assemble.md` | agent 执行指令模板 |
| `plugins/capability-research-mode.md` | 必须：组装格式参考 |
| `core/scenario-matrix.md` | 必须：四象限框架 |

### 产物文件（读取）

| 文件 | 用途 |
|------|------|
| `.meta/briefings/<命题简称>.md` | 内联到 agent task（agent 不直接读其他文件） |

### 产物文件（写入）

| 文件 | 说明 |
|------|------|
| `<序号>-<命题简称>/overview.md` | Q1 链路解构 |
| `<序号>-<命题简称>/edge-cases.md` | Q2 坑点提取 |
| `<序号>-<命题简称>/trade-offs.md` | Q3 方案对比 |
| `<序号>-<命题简称>/experiment/README.md` | Q4 实验说明 |
| `<序号>-<命题简称>/experiment/src/` | Q4 实验代码 |
| `<序号>-<命题简称>/references.md` | 参考资料 |

---

## 执行逻辑

### 执行逻辑

```
对每个待处理命题：
  spawn 两个独立 agent：
    1. Markdown组装 agent
       task = 命题组装模板
       输入：
         - proposition（命题文本）
         - decomposition（分词结果）
         - briefing（完整briefing，内联到task）
       输出：
         - <序号>-<命题简称>/overview.md
         - <序号>-<命题简称>/edge-cases.md
         - <序号>-<命题简称>/trade-offs.md
         - <序号>-<命题简称>/references.md
    2. 实验组装 agent
       task = 实验组装模板
       输入：
         - proposition（命题文本）
         - decomposition（分词结果）
         - briefing（完整briefing，内联到task）
       输出：
         - <序号>-<命题简称>/experiment/
```

## 核心约束

- **只写不读** —— agent 不读 capabilities/ 下的任何文件
- 每个 agent 只负责 1 个文件
- 同一命题的不同文件可并行
- 不同命题之间可并行

## 内容比例约束

- 通用高地内容（框架无关）≥ 70%
- 特化内容（框架相关）≤ 30%
- 开篇（10-15%）从限定词切入建立共鸣
- 主体（70-80%）讲通用原理
- 收尾（10-15%）回到限定词给落地方案

## 5 个象限文件职责

| 文件 | 象限 | 核心内容 |
|------|------|---------|
| overview.md | Q1 链路解构 | 按数据流排列能力，形成输入→输出完整链路 |
| edge-cases.md | Q2 坑点提取 | 从瓶颈中过滤命题相关的坑点 + 组合极端场景 |
| trade-offs.md | Q3 方案对比 | 2-3 种技术路线的权衡表 + 牺牲点 |
| experiment/ | Q4 最小实验 | 可运行的代码环境 + 验证检查点 |
| references.md | 参考资料 | 按 Tier 排序去重的 URL 列表 |

---

## 上下文加载

| 触发条件 | 必须加载 |
|---------|---------|
| 命题组装阶段 | plugins/capability-research-mode.md + processes/assemble.md |

---

## ⛔ Barrier

- **上游**：全部 briefing 生成后才能进入阶段二
- **下游**：阶段二全部完成后才能进入阶段三（学习阶梯）

---

## 命题目录命名规范

```
格式：<两位序号>-<命题中文简称>
示例：
  ✓ 01-长列表渲染
  ✓ 02-首屏白屏
  ✓ 03-网络优化
```

## 摘要回传

每个命题组装完成后，输出 ≤200 字摘要：
- 核心链路（一句话）
- 最大坑点（一个）
- 推荐首选技术路线（附理由）
- 覆盖的战略高地（列出能力 ID）
- 实验目录路径
