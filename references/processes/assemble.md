# Process: 命题组装 (assemble)

> 将预提取的 briefing 组装为命题的四象限研究输出。
> **组装 agent 只写不读**——所有素材在 spawn 前内联到 task 中，agent 不需要读取任何能力文件。

## 输入

- `proposition`：命题文本
- `decomposition`：分词结果（来自 processes/decompose.md）
- `briefing`：从 summary.json 预提取的定向素材（已内联到 task）
- `target_file`：本次 agent 负责写的目标文件类型（overview / edge-cases / trade-offs / experiment / references）
- `depth`：组装深度（shallow / normal / deep）
- `platform`：平台约束（web / miniapp / rn / all）

## ⛔ 核心约束：只写不读

```
❌ 旧模式：agent 读 7-11 个能力文件（30-100KB）→ 筛选 → 写
✅ 新模式：从 summary.json 提取 briefing → 内联到 task → agent 只写

agent 不读取 capabilities/ 下的任何文件。
所有需要的素材已经在 briefing 中提供。
```

## Briefing 格式

briefing 结构如下（已内联到 agent 的 task 中）：

```markdown
# <命题名称> — 组装 Briefing

## 命题信息
命题：<完整命题文本>
通用占比：<百分比>
限定词：<框架/平台（如有）>

## 涉及能力摘要

### <能力ID>-<能力名称> [用于: <适用的文件类型>]
机制：<1-3 句核心机制摘要>
瓶颈：
  - B1 <瓶颈名>：<触发条件> → <表现症状>
  - B2 <瓶颈名>：<触发条件> → <表现症状>
权衡：
  - <维度>：<方案A> vs <方案B>，建议 <选择建议>
实验代码：<如有，提取可运行的代码片段>
参考：<URL 列表>

### <下一个能力>
（同上格式）

## 内容比例约束
开篇 10-15%：从 <限定词> 痛点切入
主体 70-80%：通用工程原理
收尾 10-15%：回到 <限定词> 给落地方案

## 参考资料（已去重，按 Tier 排序）
- [T1] <标题>: <URL>
- [T2] <标题>: <URL>
```

## 执行步骤

### Step 1：链路编排（→ Q1 overview.md）

**仅当 target_file = overview 时执行。**

按数据流顺序排列 briefing 中的能力，形成从输入到输出的完整链路：

```
数据层 [A5] → 计算层 [A5] → DOM层 [A2] → 渲染层 [A1] → 交互层 [A6]
```

每个链路节点：
- 引用 briefing 中对应能力的 mechanism_summary
- 补充命题特有的上下文（限定词注入的特化内容）
- 标注原子能力 ID

### Step 2：坑点提取（→ Q2 edge-cases.md）

**仅当 target_file = edge-cases 时执行。**

从 briefing 中各能力的 bottlenecks 提取与该命题相关的坑点：
- 过滤：只保留与命题场景相关的瓶颈
- 补充：命题特有的极端场景（如 AI 聊天的流式追加）
- 组合：多个能力的瓶颈可能组合形成新的极端场景

### Step 3：方案对比（→ Q3 trade-offs.md）

**仅当 target_file = trade-offs 时执行。**

从 briefing 中各能力的 tradeoffs 构建对比表：
- 选取 2-3 种技术路线
- 每种路线标注涉及的能力及其 tradeoff 选择
- 表格形式，标注牺牲点

### Step 4：实验组装（→ Q4 experiment/）

**仅当 target_file = experiment 时执行。**

从 briefing 中各能力的 experiment_code 组装完整验证环境：
- 选取战略价值最高的能力的实验代码
- 合并为一个可运行的 HTML/JS 文件
- 验证检查点标注对应的原子能力 ID
- 遵循 plugins/capability-research-mode.md 的实验模板

### Step 5：内容比例校验

**所有文件类型均须校验。**

- 通用高地内容（框架无关）≥ 70%
- 特化内容（框架相关）≤ 30%
- 开篇（10-15%）从限定词切入
- 主体（70-80%）讲通用原理
- 收尾（10-15%）回到限定词

### Step 6：参考资料汇总（→ references.md）

**仅当 target_file = references 时执行。**

从 briefing 的参考资料区域汇总，按 Tier 排序去重。

## 输出

写入 `workflow/research/<序号>-<命题简称>/`：

```
<序号>-<命题简称>/
├── overview.md      # Q1: 链路编排
├── edge-cases.md    # Q2: 坑点提取
├── trade-offs.md    # Q3: 方案对比
├── experiment/      # Q4: 实验组装
│   ├── README.md
│   └── src/
└── references.md    # 参考资料
```

### 命题目录命名规范

```
格式：<两位序号>-<命题中文简称>
序号按候选池中的排列顺序（P1=01, P2=02, ...）

示例：
  P1 "长列表渲染：万级数据的虚拟列表实现与滚动卡顿治理"
     → 01-长列表渲染/

  P2 "首屏白屏：SPA 首屏加载慢的全链路诊断与优化"
     → 02-首屏白屏/

  P4 "网络优化：HTTP 缓存 + CDN + 资源加载的三层协作"
     → 03-网络优化/（跳过未研究的 P3，序号不连续没关系，或重新编号）
```

> 注意：如果批量研究时跳过了某些命题（如只研究 high 优先级），序号可以不连续，
> 或者按实际研究顺序重新编号。目录名的核心语义是「人类可读 + 有序」。

---

## Agent 执行指令模板

spawn 组装 agent 时，task 按以下模板构造：

```
你是命题 "[命题名称]" 的组装员。

## 任务
写 [target_file] 文件，产出命题研究的一个象限。

## 命题信息
命题：[完整命题文本]
限定词：[框架/平台]
通用占比：[百分比]

## 素材（已为你准备好，不需要读取任何文件）

[briefing 完整内容，由 summary.json 预提取]

## 产出
写入文件：workflow/research/[序号]-[命题简称]/[target_file].md

格式要求：
[根据 target_file 类型给出对应格式]

约束：
- 中文撰写，技术术语保留英文
- 通用高地内容 ≥ 70%
- 开篇（10-15%）从 [限定词] 痛点切入
- 主体（70-80%）讲通用工程原理
- 收尾（10-15%）回到 [限定词] 给落地方案
- 禁止读取 capabilities/ 下的任何文件，所有素材已在上方提供
- 直接写文件，不要输出到聊天
```

---

## 异常与 Fallback

| 异常场景 | 触发条件 | 处理动作 |
|---------|---------|---------|
| Briefing 缺失能力条目 | .meta/briefings/ 中某能力的 summary 不完整 | 跳过该能力的素材，用其他能力的素材填充，文件顶部注明"⚠️ 部分能力素材缺失" |
| 子 agent 超时 | spawn 后 > 120s 无产出 | 主 agent 接管该文件，在主上下文中完成（降级为串行） |
| 子 agent 产出质量差 | 文件缺少核心章节或内容 < 300 字 | 主 agent 补充缺失章节（不重跑整个 agent） |
| 内容比例不达标 | 通用内容 < 70% | 主 agent 审查并调整：压缩特化内容、补充通用原理 |
| 文件已存在（--append 模式） | 目标文件已存在 | 追加内容到已有文件末尾，标记 `appended: true` |
| 目标目录不可写 | workflow/research/<序号>-<命题简称>/ 创建失败 | 自动创建目录链 → 仍失败则输出到 stdout |
| experiment 依赖安装失败 | npm install 超时或报错 | 跳过依赖安装，提供纯 HTML 版本的最小实验（无构建工具） |
| 全部子 agent 失败 | 所有 spawn 的 agent 均失败 | 主 agent 串行完成所有文件，告知用户"并行不可用，已降级为串行模式" |

## 依赖

- 需要先执行 processes/decompose.md
- 需要先执行 processes/capability-research.md（阶段一，产出 capabilities/ + .meta/summaries/）
- 需要先执行 processes/briefing-assemble.md（Briefing 组装，产出 .meta/briefings/）

## 参考

- plugins/capability-research-mode.md（材料块格式 + 实验模板）
- core/scenario-matrix.md（四象限框架）
