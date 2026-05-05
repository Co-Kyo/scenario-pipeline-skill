# 后处理编排

> 纯编排文件：定义后处理的三阶段管线和调用关系。
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

## 三阶段管线

```
阶段一：能力研究（滑动窗口并行）    阶段二：命题组装（滑动窗口并行）    阶段三：学习阶梯（单线程）

  ┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
  │ capability-      │            │ assemble        │            │ learning-       │
  │ research × 1     │──双写──→│ × 1 命题×1象限   │──────────→│ ladder × 1 命题  │
  │ (每 agent 1 文件) │            │ (每 agent 1 文件) │            │ (主 agent 直接生成)│
  └─────────────────┘            └─────────────────┘            └─────────────────┘
        ↑                              ↑                              ↑
        │                              │                              │
  .meta/capability-graph.json    从 summaries 组装              读取阶段二产出
  (来自前处理)                  briefing 内联到 task            + capability-graph.json
```

**双写**：每个能力研究 agent 产出两个文件：
1. `capabilities/<id>-<name>.md` — 人类阅读的完整知识库
2. `.meta/summaries/<id>-<name>.json` — 机器消费的结构化摘要

**中间步骤：Briefing 组装**：阶段一与阶段二之间，读 summary.json 组装 briefing，内联到组装 agent 的 task 中。组装 agent **只写不读**。

---

## 执行协议

> 本节定义后处理的执行协议。**必须严格遵循三阶段顺序，禁止合并。**
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

### ⚠️ 多线程主线程保全协议

> **平台已知 Bug**：在单例模式的 agent 窗口下，主线程 spawn 子 agent 后，
> 主窗口的上下文可能潜入子 agent 的调用链，导致主线程丢失（主 agent 的
> 后续指令被吞入子 agent 的执行上下文，主线程无法继续推进管线）。
>
> **保全策略**：此问题属于负行为（环境"做错了什么"），无法通过正向诱导实验直接探测。
> 因此不新增探测维度，而是从环境档案中已有的 `execution_mode` + `C7` 组合推断风险等级，
> 映射到分级保全策略。详见 [probe-protocol §6.5](../environment/probe-protocol.md)。
>
> **保全行为**（按环境档案 `efficiency.main_thread_preservation.preserve_level` 分级）：
>
> | 保全级别 | spawn 后立即输出 | 周期性轮询 | 收尾确认 |
> |---------|:---:|:---:|:---:|
> | mandatory（🔴 高风险） | ✅ 必须 | ✅ 必须 | ✅ 必须 |
> | enabled（🟡 中风险） | ✅ 必须 | ✅ 必须 | ✅ 必须 |
> | suggested（🟢 低风险） | ✅ 建议 | — | ✅ 建议 |
> | optional（⚪ 极低风险） | 可选 | — | — |
>
> **行为定义**：
> 1. **spawn 后立即输出**：spawn 后立即向用户输出一条状态确认消息
>    （如"已启动 N 个子任务，正在跟踪进度"），强制主线程保持自己的对话轮次
> 2. **周期性轮询**：在等待子 agent 完成期间，主动轮询检查产出文件
>    （而非静默等待），每次轮询都是一个主线程的活跃 turn
> 3. **收尾确认**：子 agent 完成后，主线程必须先输出一条收尾确认
>    （如"子任务 X 已完成，继续推进"），再进入下一步骤
>
> **核心原则**：主线程永远不能在 spawn 后"静默等待"——
> 静默 = 主线程交出对话轮次 = 单例窗口下上下文被劫持的高危时刻。
> 保全级别越低，此原则的强制力越弱，但防御性编程始终推荐。

### 执行流程

> ⚠️ **阶段边界声明**：Step 0（环境探测）是独立的诊断阶段，与后续的研究阶段完全隔离。
> 探测实验的目的是验证环境能力，而非执行用户的研究任务。
> 探测完成后，必须明确声明诊断结束，才能进入正式研究流程。

```
═══════════════════════════════════════════════════════════════════════════════
【检查点 C：后处理启动确认】— 用户确认后才进入研究流程
═══════════════════════════════════════════════════════════════════════════════

0a. 展示后处理执行计划：
    - 待处理命题列表（来自 README.md / .meta/candidates.md）
    - 涉及的原子能力数量
    - 预估 spawn agent 数量（能力数 × 1 + 命题数 × 5）
    - 预估执行时间

    用户操作：
    - "开始" → 进入 Step 0 环境探测
    - "只研究 <命题列表>" → 缩小范围后继续
    - "跳过实验" → 添加 --no-experiment，减少 agent 数量

    **跳过条件**：`--batch=pending` 模式下自动跳过检查点。

═══════════════════════════════════════════════════════════════════════════════
【阶段 0：环境探测】— 独立诊断阶段，非研究任务
═══════════════════════════════════════════════════════════════════════════════

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

   ✅ 环境探测完成，进入正式研究流程

═══════════════════════════════════════════════════════════════════════════════
【阶段 1-3：正式研究】— 用户研究任务执行阶段
═══════════════════════════════════════════════════════════════════════════════

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

   ┌─ ⓓ 检查点 D：Briefing 预审 ──────────────────────────────────┐
   │ 展示内容：                                                     │
   │   - 生成的 briefing 文件列表                                    │
   │   - 每个 briefing 的能力覆盖情况（哪些能力有摘要、哪些缺失）    │
   │   - 预估阶段二 spawn 数量（命题数 × 5 文件）                    │
   │                                                                 │
   │ 用户操作：                                                      │
   │   - "继续" → 进入阶段二                                         │
   │   - "查看 <命题> briefing" → 展示具体内容                       │
   │   - "跳过实验" → 减少 experiment 文件的 spawn                   │
   └────────────────────────────────────────────────────────────────┘

4. 【阶段二】命题组装
   ├── 按滑动窗口并行 spawn（每 agent 1 个命题的 1 个象限文件）← 具体API见运行时适配层插件
   ├── 每个 agent 的 task 中内联对应 briefing section
   └── agent 只写文件，不读任何能力文件

5. 【阶段三】学习阶梯生成
   ├── 单线程，不需要 spawn，主 agent 直接生成
   ├── 读取阶段二产出的命题文件 + capability-graph.json
   └── 每个命题产出一个 learning-ladder.md
```

### ⛔ 阶段间 Barrier（强制）

**阶段一必须全部完成，才能开始 Briefing 组装；Briefing 组装必须全部完成，才能开始阶段二；阶段二必须全部完成，才能开始阶段三。**

原因：
- 阶段二的 briefing 依赖阶段一产出的 summary.json
- 如果阶段一未完成就开始组装 briefing，会缺少能力摘要
- 如果 briefing 未完成就开始阶段二，组装 agent 会缺少素材
- 阶段三（学习阶梯）依赖阶段二产出的完整命题文件（overview / edge-cases / trade-offs / experiment / references）
- 如果阶段二未完成就开始生成阶梯，会缺少关键的内容来源

错误模式（禁止）：
```
❌ 给每个命题分配一个 agent，让它自己「研究+组装」→ 知识库不共享，重复工作
❌ 阶段一的 agent 还没完成就开始 spawn 阶段二的 agent
❌ 把阶段一和阶段二写在同一个 agent 的 task 里
❌ 组装 agent 自己去读 capabilities/ 下的完整文件
❌ 阶段二未完成就开始生成学习阶梯
```

正确模式：
```
✅ 主 agent 用滑动窗口 spawn 阶段一 agent → 全部完成（API见运行时插件）
✅ 读 summary.json 组装 briefing → 保存到 .meta/briefings/
✅ 用滑动窗口 spawn 阶段二 agent，task 中内联 briefing（API见运行时插件）
✅ 阶段二全部完成后，主 agent 直接生成学习阶梯（单线程，不需要 spawn）
✅ 每个 agent 只负责 1 个文件，任务边界清晰
✅ 失败的 agent 可精确重跑，不影响其他
```

---

## 滑动窗口并行调度

### 核心原则

- **每 agent 只负责 1 个文件**（1 个能力文件 或 1 个命题的 1 个象限文件）
- **阶段三例外**：学习阶梯生成是单线程，主 agent 直接生成，不需要 spawn
- **滑动窗口**：维持 N 个并发 agent，谁完成谁补位，不等整批
- **窗口大小**：默认 4（可根据系统并发能力调整）

### 调度算法

> ⚠️ **主线程保全**：每次 spawn 后，按环境档案 `preserve_level` 执行对应级别的保全行为。
> 详见 §执行协议「多线程主线程保全协议」。

```
窗口大小 W = 4
待处理队列 Q = [任务1, 任务2, ..., 任务N]
进行中集合 running = {}
完成集合 done = {}

读取 preserve_level = environment-profile.efficiency.main_thread_preservation.preserve_level

循环：
  while |running| < W 且 Q 非空：
    task = Q.dequeue()
    agent = spawn(task)  ← 具体API见运行时适配层插件
    running.add(agent)
    if preserve_level ∈ {"mandatory", "enabled", "suggested"}:
      ⚠️ 立即输出状态确认："已启动子任务 <task_id>，当前并发 N/W" ← 主线程保全

  if preserve_level ∈ {"mandatory", "enabled"}:
    ⚠️ 主动轮询检查产出文件（非静默等待）← 主线程保全
  else:
    等待任意一个 agent 完成
  running.remove(完成的 agent)
  done.add(完成的 agent)
  if preserve_level ∈ {"mandatory", "enabled", "suggested"}:
    ⚠️ 输出完成确认："子任务 <task_id> 完成，继续推进" ← 主线程保全

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
- ⚠️ **主线程保全**：按环境档案 `preserve_level` 执行对应级别的保全行为，
  详见 §执行协议「多线程主线程保全协议」

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
> 实现细节见 [processes/briefing-assemble.md](processes/briefing-assemble.md)。

### 执行逻辑

```
对每个待处理命题：
  1. 从 capability-graph.json 获取该命题涉及的能力 ID 列表
  2. 读取这些能力的 summary.json
  3. 按 5 种文件类型定向提取，组装为 briefing
  4. 保存到 .meta/briefings/<命题简称>.md
```

### 加载条件

- 始终加载：processes/briefing-assemble.md

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
- ⚠️ **主线程保全**：按环境档案 `preserve_level` 执行对应级别的保全行为，
  详见 §执行协议「多线程主线程保全协议」

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

## 摘要回传

每个命题组装完成后，输出 ≤200 字摘要：
- 核心链路（一句话）
- 最大坑点（一个）
- 推荐首选技术路线（附理由）
- 覆盖的战略高地（列出能力 ID）
- 实验目录路径

---

## ⛔ 阶段间 Barrier（阶段二 → 阶段三）

**阶段二必须全部完成，才能开始阶段三。**

原因：
- 阶段三（学习阶梯）依赖阶段二产出的完整命题文件（overview / edge-cases / trade-offs / experiment / references）
- 如果阶段二未完成就开始生成阶梯，会缺少关键的内容来源

---

## 阶段三：学习阶梯生成（单线程）

> 阶段二全部完成后执行此步骤。
> **单线程，不需要 spawn，主 agent 直接生成。**
> 每个命题产出一个 `learning-ladder.md`，面向学习者的渐进式引导内容。

### 输入

| 输入 | 来源 | 路径 |
|------|------|------|
| 能力依赖图 | 前处理 | `.meta/capability-graph.json` |
| 能力摘要 | 阶段一 | `.meta/summaries/<id>.json` |
| 命题产出 | 阶段二 | `<命题>/overview.md`、`edge-cases.md`、`trade-offs.md`、`experiment/`、`references.md` |

### 输出

```
<命题>/learning-ladder.md    ← 每个命题一个，唯一新增文件
```

### 执行逻辑

详见 [processes/learning-ladder.md](processes/learning-ladder.md)

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
5. 生成该命题的学习阶梯（单线程，主 agent 直接生成）
```
