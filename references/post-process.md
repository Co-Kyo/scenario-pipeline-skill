# 后处理编排

> 纯编排文件：定义后处理的两阶段管线和调用关系。
> 每个步骤的实现在 `processes/` 目录下。

---

## 触发方式

```
研究：<场景描述>
```

或：

```
deep research：<场景描述>
```

**可选参数：**

| 参数 | 用法 | 说明 |
|------|------|------|
| 深度 | `--depth=deep` | shallow / normal（默认）/ deep |
| 平台 | `--platform=miniapp` | web / miniapp / rn / all |
| 跳过实验 | `--no-experiment` | 跳过 Q4 实验生成 |
| 追加 | `--append` | 在已有目录补充 |
| 批量 | `--batch=pending` | 候选池所有 pending 依次处理 |
| 条件筛选 | `--filter="优先级=high"` | 按条件筛选后批量 |

---

## 两阶段管线

```
阶段一：能力研究（滑动窗口并行）    阶段二：命题组装（滑动窗口并行）

  ┌─────────────────┐            ┌─────────────────┐
  │ capability-      │            │ assemble        │
  │ research × 1     │──双写──→│ × 1 命题×1象限   │
  │ (每 agent 1 文件) │            │ (每 agent 1 文件) │
  └─────────────────┘            └─────────────────┘
        ↑                              ↑
        │                              │
  .meta/capability-graph.json    从 summaries 组装
  (来自前处理)                  briefing 内联到 task
```

**双写**：每个能力研究 agent 产出两个文件：
1. `capabilities/<id>-<name>.md` — 人类阅读的完整知识库
2. `.meta/summaries/<id>-<name>.json` — 机器消费的结构化摘要

**中间步骤：Briefing 组装**：阶段一与阶段二之间，读 summary.json 组装 briefing，内联到组装 agent 的 task 中。组装 agent **只写不读**。

---

## 执行协议

> 本节定义后处理的执行协议。**必须严格遵循两阶段顺序，禁止合并。**
> **spawn 机制依赖运行时平台**，具体 API 参见 §运行时适配层。

### 运行时适配层

spawn 子 agent 的 API 因平台而异，通过 **环境探测 + 动态适配** 实现跨平台兼容：

| 层 | 文件 | 职责 |
|----|------|------|
| 探测 + 适配 | [environment/probe-protocol.md](../environment/probe-protocol.md) | 自然语言诱导实验 → 7 维能力档案 → 执行策略适配 |

**执行流程前必须**：
1. 加载 `environment/probe-protocol.md`，执行/读取环境档案
2. 按档案中 C1-C7 能力指标选择执行策略（probe-protocol §六）

> ⚠️ 下文中的 `spawn(task)` 是平台无关的伪代码。
> 用自然语言描述"创建独立助手完成 X"，环境自行选择执行方式。

### 执行流程

```
0. 【Step 0】Environment Probe（首次执行时）
   ├── 读取 .meta/environment-profile.json
   │   ├── 缓存命中 + version 匹配 + 无检查点 → 跳过探测
   │   ├── 缓存命中 + 有检查点 → 从断点恢复（见 probe-protocol §3.2.2）
   │   └── 缓存未命中 → 执行两阶段探测
   │       ├── Phase A：C0 元探测（分段式，可跨会话）
   │       │   ├── C0a：发现定义路径和格式
   │       │   ├── C0b：创建 probe-agent 定义文件
   │       │   ├── C0c：验证可调用（可能需跨会话 → 缓存检查点）
   │       │   └── C0=⚠️ 时当前会话用内置 agent 继续，不阻塞管线
   │       └── Phase B：C1-C7 诱导实验（用 Phase A 确定的最优 agent）
   │           ├── 发出诱导 prompt（读目录+搜索+写文件）
   │           ├── 验证产出 + 分析日志 → 判定 C1-C7
   │           └── C1=❌ → ❌ 终止，报告环境不支持多 Agent
   ├── 写入 .meta/environment-profile.json（C0-C7 + 执行模式 + 检查点如有）
   └── 按 probe-protocol §六 选择执行策略

1. 读取前处理产出
   ├── .meta/capability-graph.json → 获取原子能力列表 + 依赖关系 + 战略高地
   └── README.md / .meta/candidates.md → 获取待处理命题列表 + 分词结果

2. 【阶段一】能力研究
   ├── 筛选：覆盖待处理命题的能力（或扇出度 ≥ 30% 的能力）
   ├── 增量检查：capabilities/ 中已有 → 跳过，缺失 → 研究
   ├── 为每个能力预查找 T1/T2 URL
   ├── 按滑动窗口并行 spawn（每 agent 1 个能力文件）← 具体API见运行时适配层插件
   ├── 每个 agent 双写：主文件 + summary.json
   └── ⛔ 全部完成后才能进入 Briefing 组装

3. 【Briefing 组装】（单线程，不需要 spawn）
   ├── 读取 .meta/summaries/ 下所有相关能力的 summary.json
   ├── 对每个待处理命题：
   │   ├── 从 capability-graph.json 确定该命题涉及的能力 ID 列表
   │   ├── 读取这些能力的 summary.json
   │   ├── 按 5 种文件类型定向提取内容（见 §Briefing 组装规则）
   │   └── 生成完整 briefing，保存到 .meta/briefings/<命题简称>.md
   └── ⛔ 全部 briefing 生成后才能进入阶段二

4. 【阶段二】命题组装
   ├── 按滑动窗口并行 spawn（每 agent 1 个命题的 1 个象限文件）← 具体API见运行时适配层插件
   ├── 每个 agent 的 task 中内联对应 briefing section
   └── agent 只写文件，不读任何能力文件
```

### ⛔ 阶段间 Barrier（强制）

**阶段一必须全部完成，才能开始 Briefing 组装；Briefing 组装必须全部完成，才能开始阶段二。**

原因：
- 阶段二的 briefing 依赖阶段一产出的 summary.json
- 如果阶段一未完成就开始组装 briefing，会缺少能力摘要
- 如果 briefing 未完成就开始阶段二，组装 agent 会缺少素材

错误模式（禁止）：
```
❌ 给每个命题分配一个 agent，让它自己「研究+组装」→ 知识库不共享，重复工作
❌ 阶段一的 agent 还没完成就开始 spawn 阶段二的 agent
❌ 把阶段一和阶段二写在同一个 agent 的 task 里
❌ 组装 agent 自己去读 capabilities/ 下的完整文件
```

正确模式：
```
✅ 主 agent 用滑动窗口 spawn 阶段一 agent → 全部完成（API见运行时插件）
✅ 读 summary.json 组装 briefing → 保存到 .meta/briefings/
✅ 用滑动窗口 spawn 阶段二 agent，task 中内联 briefing（API见运行时插件）
✅ 每个 agent 只负责 1 个文件，任务边界清晰
✅ 失败的 agent 可精确重跑，不影响其他
```

---

## 滑动窗口并行调度

### 核心原则

- **每 agent 只负责 1 个文件**（1 个能力文件 或 1 个命题的 1 个象限文件）
- **滑动窗口**：维持 N 个并发 agent，谁完成谁补位，不等整批
- **窗口大小**：默认 4（可根据系统并发能力调整）

### 调度算法

```
窗口大小 W = 4
待处理队列 Q = [任务1, 任务2, ..., 任务N]
进行中集合 running = {}
完成集合 done = {}

循环：
  while |running| < W 且 Q 非空：
    task = Q.dequeue()
    agent = spawn(task)  ← 具体API见运行时适配层插件
    running.add(agent)

  等待任意一个 agent 完成
  running.remove(完成的 agent)
  done.add(完成的 agent)

  if 该 agent 失败：
    记录失败原因，可选择重入 Q

  重复直到 Q 为空且 running 为空
```

### 状态追踪

主 agent 维护以下状态表，在每个 agent 完成时更新：

```
| 能力ID | 状态 | agent session | 备注 |
|--------|------|--------------|------|
| A1     | ✅ done | xxx | 主文件+摘要均已写入 |
| A2     | ⏳ running | xxx | |
| A3     | ❌ failed | xxx | 超时，已重入队列 |
| A4     | ⬜ pending | — | |
```

---

## 阶段一：能力研究（滑动窗口并行）

### 输入来源

- 前处理产出的 `.meta/capability-graph.json`（原子能力图谱）
- 前处理产出的 `README.md`（命题列表，用于筛选哪些能力需要研究）

### 信源预查找：为每个能力准备 T1/T2 URL

在 spawn agent 之前，为每个原子能力准备 T1/T2 URL：

```
对每个待研究的能力：
  1. 根据能力名称和描述，确定 T1 来源（官方文档）：
     - MDN Web Docs（浏览器 API 类）
     - Chrome DevTools 官方文档（工具类）
     - W3C/WHATWG 规范（标准类）
     - 框架官方文档（特化能力类）
  2. 确定 T2 来源（技术博客）：
     - web.dev / developer.chrome.com（Google 技术博客）
     - 大厂技术博客（Vercel/Cloudflare/字节/美团等）
  3. 将 URL 列表传入 agent 的 task
```

### 执行逻辑

```
对每个需要研究的原子能力：
  spawn 一个独立 agent
  task = Agent 执行指令模板（见 processes/capability-research.md）
  输入：capability_id + capability_name + capability_desc + t1_urls + t2_urls + depth
  输出：
    - capabilities/<id>-<name>.md（主文件）
    - .meta/summaries/<id>-<name>.json（结构化摘要）
```

### 加载条件

- 始终加载：plugins/capability-research-mode.md（材料块格式规范）
- 始终加载：core/capability-graph.md（能力定义参考）

### 并行管理

- 每个能力分配一个独立 agent（**一个 agent 一个文件，禁止合并**）
- 能力之间无依赖，可完全并行
- 使用滑动窗口调度，维持稳定并发数
- **等待所有能力 agent 完成后才能进入 Briefing 组装**

### 输出

```
capabilities/                      ← 能力知识库（人类阅读）
├── README.md                      ← 能力索引 + 依赖图 + 学习路径（从 JSON 派生）
├── A1-浏览器渲染管线.md
├── A2-DOM节点生命周期.md
└── ...

.meta/summaries/                   ← 结构化摘要（机器消费）
├── A1-浏览器渲染管线.json
├── A2-DOM节点生命周期.json
└── ...
```

**capabilities/README.md 模板：**

```markdown
# 原子能力知识库

> 本目录是跨命题复用的原子能力参考手册。
> 每个能力条目包含：核心机制、工程瓶颈、调试工具、典型权衡、最小验证实验。

## 能力索引

| ID | 能力 | 技术层 | 扇出度 | 耦合度 | 战略价值 | 级别 |
|----|------|--------|--------|--------|---------|------|
| A8 | DevTools 性能分析 | 工具层 | 7/7 | 1 | 7.0 | 🏔️ 一级 |
| A1 | 浏览器渲染管线 | 浏览器层 | 5/7 | 1 | 5.0 | 🏔️ 一级 |
| ... | | | | | | |

## 依赖关系

（用文本树或 Mermaid 图展示能力之间的依赖）

## 学习路径

（从 capability-graph.json 的 learning_path 派生，带链接）
```

---

## Briefing 组装

> 阶段一全部完成后、阶段二开始前执行此步骤。
> **单线程，不需要 spawn，直接读取 summary.json 并生成 briefing。**

### 输入来源

- `.meta/summaries/*.json` — 阶段一双写的结构化摘要
- `.meta/capability-graph.json` — 能力与命题的映射关系
- `README.md` — 待处理命题列表 + 分词结果

### Briefing 组装规则

对每个待处理命题生成一个 briefing 文件：

```
对每个待处理命题 P：
  1. 从 capability-graph.json 获取 P 涉及的能力 ID 列表
  2. 读取这些能力的 summary.json
  3. 按 5 种目标文件类型定向提取内容：
```

| 目标文件 | 从 summary.json 提取 | 不提取 |
|---------|---------------------|--------|
| overview | `mechanism_summary` | bottlenecks、tradeoffs、experiment_code |
| edge-cases | `bottlenecks`（name+trigger+symptom） | mechanism_summary、experiment_code |
| trade-offs | `tradeoffs`（完整四列） | mechanism_summary、experiment_code |
| experiment | `experiment_code` | mechanism_summary、bottlenecks |
| references | `references`（tier+url+title） | 正文内容 |

### Briefing 模板

```markdown
# <命题名称> — 组装 Briefing

## 命题信息
命题：<完整命题文本>
通用占比：<百分比>
限定词：<框架/平台（如有）>

## 涉及能力摘要

### <能力ID>-<能力名称>
机制：<mechanism_summary>
瓶颈：
  - B1 <瓶颈名>：<触发条件> → <表现症状>
  - B2 <瓶颈名>：<触发条件> → <表现症状>
权衡：
  - <维度>：<方案A> vs <方案B>，建议 <选择建议>
实验代码：<experiment_code 或 "无（非 deep 模式）">
参考：<references 列表>

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

### Briefing 保存与复用

```
.meta/briefings/
├── 01-长列表渲染.md
├── 02-首屏白屏.md
└── ...
```

**复用规则**：
- 如果同一能力被多个命题引用，其 summary.json 只读一次，内容复用到多个 briefing
- 如果已有部分 briefing（增量模式），只生成缺失命题的 briefing
- briefing 生成后可预审：每个能力的瓶颈是否 ≥ 2 个？权衡是否完整？不满足的标记提醒

### 上下文消耗估算

```
16 个能力 × ~2KB/summary = ~32KB（读取量）
3 个命题 × ~10KB/briefing = ~30KB（写入量）
总计：barrier 期间消耗 ~62KB（远低于方案 B 的 128KB 全文读取）
```

---

## 阶段二：命题组装（滑动窗口并行）

### 输入来源

- Briefing 组装产出的 `.meta/briefings/<命题简称>.md`（已内联到 agent task）
- 前处理产出的 `README.md`（命题列表 + 分词结果）

### 执行逻辑

```
对每个待处理命题的每个象限文件：
  spawn 一个独立 agent
  task = Agent 执行指令模板（见 processes/assemble.md）
  输入：
    - proposition（命题文本）
    - decomposition（分词结果）
    - briefing（从 .meta/briefings/<命题简称>.md 中提取对应 section，内联到 task）
    - target_file（overview / edge-cases / trade-offs / experiment / references）
  输出：workflow/research/<序号>-<命题简称>/<target_file>.md
```

### 加载条件

- 始终加载：plugins/capability-research-mode.md（组装格式参考）
- 始终加载：core/scenario-matrix.md（四象限框架）

### 内容比例约束

组装产出必须遵循：
- 通用高地内容（框架无关）≥ 70%
- 特化内容（框架相关）≤ 30%
- 开篇（10-15%）从限定词切入建立共鸣
- 主体（70-80%）讲通用原理
- 收尾（10-15%）回到限定词给落地方案

### 并行管理

- 每个文件分配一个独立 agent（**一个 agent 一个文件**）
- 同一命题的不同文件可并行
- 不同命题之间可并行
- 使用滑动窗口调度

### 输出

```
workflow/research/<序号>-<命题简称>/
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
示例：
  ✓ 01-长列表渲染
  ✓ 02-首屏白屏
  ✓ 03-网络优化
```

---

## 摘要回传

每个命题组装完成后，输出 ≤200 字摘要：
- 核心链路（一句话）
- 最大坑点（一个）
- 推荐首选技术路线（附理由）
- 覆盖的战略高地（列出能力 ID）
- 实验目录路径

---

## 增量复用

当已有部分能力知识库时：

```
检查 capabilities/ 目录中已有的能力条目
  → 已有：直接复用，跳过该能力的研究
  → 同时检查 .meta/summaries/ 中是否有对应摘要
    → 有摘要：复用，跳过
    → 无摘要：需要补生成（可从已有主文件中提取）
  → 缺失：调用 processes/capability-research.md 补充研究（双写）
```

### Briefing 增量

```
检查 .meta/briefings/ 中已有的 briefing
  → 已有该命题的 briefing：复用，跳过
  → 缺失：从 summary.json 重新生成
  → 命题涉及的能力有变更：重新生成该命题的 briefing
```

---

## 单命题快速路径

当只处理单个命题（非批量）时，可简化为：

```
1. 从 .meta/capability-graph.json 识别该命题依赖的原子能力
2. 增量检查 capabilities/ + .meta/summaries/，缺失的用滑动窗口并行研究（双写）
3. 从 summary.json 组装该命题的 briefing
4. 组装该命题（滑动窗口按文件拆分，task 内联 briefing）
```
