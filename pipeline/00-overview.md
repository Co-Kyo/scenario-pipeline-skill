# 管道总览

> ⚠️ **架构观测文档** — 不是 skill 执行配置
> 执行真相：`references/pre-process.md`、`references/post-process.md`

> 本文档是 Scenario Pipeline 的全局视图，定义数据流和阶段边界。
> 各阶段的详细输入/输出/涉及文件见对应的阶段文件。

---

## 管线结构

```
用户输入                                             最终产出
────────                                           ──────────

"扫描：前端性能面试题"     ┌─────────────────────┐    命题研究（面试深度答案）
  ─────────────────────→  │   前 处 理（串行）    │    能力知识库（跨命题复用）
                          │                     │    学习路径（修炼地图）
"研究：P1、P2、P4"        │  6 步严格顺序执行    │    学习阶梯（渐进式引导）
  ─────────────────────→  │  单 agent 贯穿       │
                          └────────┬────────────┘
                                   │
                                   ▼
                          ┌─────────────────────┐
                          │   后 处 理            │
                          │                     │
                          │  阶段一：            │
                          │    步骤1：能力研究   │  ← 滑动窗口并行
                          │      ⛔ barrier      │
                          │    步骤2：Briefing   │  ← 单线程
                          │      ⛔ barrier      │
                          │  阶段二：命题组装    │  ← 滑动窗口并行
                          │    ⛔ barrier        │
                          │  阶段三：学习阶梯    │  ← 单线程
                          └─────────────────────┘
```

---

## 完整数据流图

```
用户输入
  │
  ▼
┌─────────────────────── 前处理 ───────────────────────┐
│                                                       │
│  scan ──→ decompose ──→ capability-extract ──→        │
│    │         │              │                         │
│    │         │              ├─ 去重/依赖/扇出度       │
│    │         │              └─ 信源URL预查找           │
│    │         │                   │                    │
│    │         │                   ▼                    │
│    │         │         .meta/capability-graph.json    │
│    │         │              │                         │
│    │         │              ▼                         │
│    │         ├────→ highground-identify ──→           │
│    │         │         (追加 highgrounds              │
│    │         │          + learning_path)              │
│    │         │              │                         │
│    │         │              ▼                         │
│    └─────────┴────→ evaluate ──→ pool                │
│                        │         │                    │
│                        │         ├── README.md        │
│                        │         └── .meta/           │
│                        │             candidates.md    │
└───────────────────────────────────────────────────────┘
                         │
                         ▼ (capability-graph.json 是前后处理的核心交接点)

┌─────────────────────── 后处理 ───────────────────────┐
│                                                       │
│  ┌── 阶段一：能力研究 + Briefing 组装 ───────────┐    │
│  │                                               │    │
│  │  步骤1：能力研究                               │    │
│  │    capability-graph.json                        │    │
│  │         │                                       │    │
│  │         ├── 筛选待研究能力                       │    │
│  │         ├── 增量检查（已有→跳过）                │    │
│  │         └── 为每个能力预查找T1/T2 URL            │    │
│  │                │                                 │    │
│  │                ▼  滑动窗口并行（窗口=4）          │    │
│  │     ┌─────────────────────────────────┐         │    │
│  │     │ agent-A1 │ agent-A2 │ agent-A8 │  ...    │    │
│  │     │ 双写:    │ 双写:    │ 双写:    │         │    │
│  │     │  md+json │  md+json │  md+json │         │    │
│  │     └─────────────────────────────────┘         │    │
│  │          │            │           │              │    │
│  │          ▼            ▼           ▼              │    │
│  │    capabilities/    .meta/summaries/             │    │
│  │                                               │    │
│  │  步骤2：Briefing 组装（单线程）                 │    │
│  │    summaries × capability-graph → briefings    │    │
│  │                                               │    │
│  └───────────────────────────────────────────────┘    │
│                       │                               │
│                  ⛔ BARRIER                           │
│                       │                               │
│  ┌── 阶段二：命题组装 ──────────────────────────┐    │
│  │  briefings → overview/edge/trade/exp/ref      │    │
│  └───────────────────────────────────────────────┘    │
│                       │                               │
│                  ⛔ BARRIER                           │
│                       │                               │
│  ┌── 阶段三：学习阶梯 ──────────────────────────┐    │
│  │  capability-graph + summaries + 命题产出       │    │
│  │  → learning-ladder.md                         │    │
│  └───────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────┘
```

---

## 阶段文件索引

| 文件 | 阶段 | 触发方式 |
|------|------|---------|
| [01-pre-process.md](01-pre-process.md) | 前处理（6 步串行） | `扫描：<描述>` / `deep scan：<描述>` |
| [02-capability-research.md](02-capability-research.md) | 后处理·阶段一步骤1：能力研究 | `研究：<描述>` / `deep research：<描述>` |
| [03-briefing-assemble.md](03-briefing-assemble.md) | 后处理·阶段一步骤2：Briefing 组装 | 阶段一步骤1完成后自动触发 |
| [04-proposition-assembly.md](04-proposition-assembly.md) | 后处理·阶段二：命题组装 | 阶段一完成后自动触发 |
| [05-learning-ladder.md](05-learning-ladder.md) | 后处理·阶段三：学习阶梯 | 阶段二完成后自动触发 |
| [99-shared.md](99-shared.md) | 跨阶段共享参考 | 数据实体、插件关系、故障模式 |

---

## ⛔ 阶段间 Barrier 规则

| Barrier | 条件 | 原因 |
|---------|------|------|
| 前处理 → 后处理 | 前处理产出 capability-graph.json | 后处理全部依赖此文件 |
| 阶段一步骤1 → 阶段一步骤2 | 全部 summary.json 就绪 | Briefing 从 summary 提取 |
| 阶段一 → 阶段二 | 全部 briefing 就绪 | 组装 agent 的 task 内联 briefing |
| 阶段二 → 阶段三 | 全部命题文件就绪 | 阶梯引用 overview/experiment/trade-offs |

---

## 产出结构总览

```
workflow/research/
│
├── README.md                          ← 总览导航
│
├── 01-长列表渲染/                      ← 命题目录
│   ├── overview.md                    # Q1: 链路编排
│   ├── edge-cases.md                  # Q2: 坑点提取
│   ├── trade-offs.md                  # Q3: 方案对比
│   ├── experiment/                    # Q4: 实验组装
│   ├── references.md                  # 参考资料
│   └── learning-ladder.md             # 学习阶梯（渐进式引导）
│
├── capabilities/                      ← 原子能力知识库
│   ├── README.md
│   ├── A1-浏览器渲染管线.md
│   └── ...
│
└── .meta/                             ← 内部数据
    ├── capability-graph.json
    ├── candidates.md
    ├── summaries/
    └── briefings/
```
