# 管道总览

> ⚠️ **观测文档**，不是执行配置。
> 执行文档 → `processes/` ｜ 本文件属于 `design/pipeline/`

## 管线结构

```
用户输入                                             最终产出
────────                                           ──────────

"扫描：前端性能面试题"     ┌─────────────────────┐    命题研究（面试深度答案）
  ─────────────────────→  │   前 处 理（串行）    │    能力知识库（跨命题复用）
                          │                     │    学习路径（修炼地图）
"研究：P1、P2、P4"        │  ①~⑥ 严格顺序执行   │    学习阶梯（渐进式引导）
  ─────────────────────→  │  单 agent 贯穿       │
                          └────────┬────────────┘
                                   │
                                   ▼
                          ┌─────────────────────┐
                          │   后 处 理            │
                          │                     │
                          │  阶段一：            │
                          │    ⑦ 能力研究 × N   │  ← 并发池并行（W=5）
                          │      ⓔ barrier      │
                          │    ⑧ Briefing × M   │  ← 并行
                          │      ⓓ barrier      │
                          │  阶段二：            │
                          │    ⑨ 命题组装 × M   │  ← 并发池并行（W=5 命题，每命题 2 agent）
                          │      ⓕ barrier      │
                          │  阶段三：            │
                          │    ⑩ 学习阶梯 × M   │  ← 并行
                          └─────────────────────┘
```

## 完整数据流图

```
用户输入
  │
  ▼
┌─────────────────────── 前处理（串行）─────────────────────────┐
│                                                               │
│  ① scan ──→ ② decompose ──→ ③ capability-extract ──→        │
│    │            │                  │                          │
│    │            │                  ├─ 去重/依赖/扇出度        │
│    │            │                  └─ 信源URL预查找（双轨）    │
│    │            │                       │                     │
│    │            │                       ▼                     │
│    │            │            .meta/capability-graph.json      │
│    │            │                  │                          │
│    │            │                  ▼                          │
│    │            ├────→ ④ highground-identify ──→              │
│    │            │            (追加 highgrounds                │
│    │            │             + learning_path)                │
│    │            │                  │                          │
│    │            │                  ▼                          │
│    └────────────┴────→ ⑤ evaluate ──→ ⑥ pool                │
│                          │              │                     │
│                          │              ├── README.md         │
│                          │              └── .meta/candidates  │
└───────────────────────────────────────────────────────────────┘
                         │
                         ▼ capability-graph.json 是前后处理的核心交接点

┌─────────────────────── 后处理（并行 + 检查点）─────────────────┐
│                                                               │
│  ┌── 阶段一：能力研究 + Briefing 组装 ─────────────────┐      │
│  │                                                     │      │
│  │  ⑦ 能力研究                                         │      │
│  │    capability-graph.json → 筛选 → 增量检查 → 预查找  │      │
│  │           │                                         │      │
│  │           ▼  并发池并行（W=5）                      │      │
│  │    ┌─────────────────────────────────┐              │      │
│  │    │ agent-A1 │ agent-A2 │ agent-A8 │  ...         │      │
│  │    │ 双写:    │ 双写:    │ 双写:    │              │      │
│  │    │  md+json │  md+json │  md+json │              │      │
│  │    └─────────────────────────────────┘              │      │
│  │         │            │           │                  │      │
│  │         ▼            ▼           ▼                  │      │
│  │   capabilities/   .meta/summaries/                  │      │
│  │                                                     │      │
│  │  ⓔ 检查点 E                                         │      │
│  │                                                     │      │
│  │  ⑧ Briefing 组装（并行）                            │      │
│  │    summaries × capability-graph → briefings         │      │
│  │                                                     │      │
│  └─────────────────────────────────────────────────────┘      │
│                         │                                     │
│                    ⓓ 检查点 D                                 │
│                         │                                     │
│  ┌── 阶段二：命题组装 ────────────────────────────────┐      │
│  │  ⑨ briefings → overview/edge/trade/exp/ref         │      │
│  │     每命题 2 个 agent（Markdown + 实验）            │      │
│  └─────────────────────────────────────────────────────┘      │
│                         │                                     │
│                    ⓕ 检查点 F                                 │
│                         │                                     │
│  ┌── 阶段三：学习阶梯 ────────────────────────────────┐      │
│  │  ⑩ capability-graph + summaries + 命题产出          │      │
│  │    → learning-ladder.md × M                        │      │
│  └─────────────────────────────────────────────────────┘      │
│                         │                                     │
│                    ⓖ 检查点 G                                 │
└───────────────────────────────────────────────────────────────┘
```

## ⛔ 阶段间 Barrier

| Barrier | 条件 | 原因 |
|---------|------|------|
| 前处理 → 后处理 | capability-graph.json 就绪 | 后处理全部依赖此文件 |
| 阶段一·⑦ → 阶段一·⑧ | 全部 summary.json 就绪 | Briefing 从 summary 提取 |
| 阶段一 → 阶段二 | 全部 briefing 就绪 | 组装 agent 的 task 读取 briefing 文件 |
| 阶段二 → 阶段三 | 全部命题文件就绪 | 阶梯读取 overview/experiment/trade-offs |

## 并发池架构

后处理四个并行步骤共享同一套并发调度模型，区别仅在 Task Group 定义和依赖约束。

### 并发池定义

固定 W=5 个并发槽位，任务完成释放槽位，新任务补位。计数单位是 Task Group（不是 agent 数）。

### 两种调度模式

| 模式 | 适用步骤 | 入队条件 |
|------|---------|---------|
| DAG 调度 | Step ⑦ | 前置子组全部 completed |
| 简单窗口 | Step ⑧⑨⑩ | 有空位就进 |

### 各步骤 Task Group 定义

| 步骤 | 1 Task Group = | 组内 agent 数 | 特殊处理 |
|------|---------------|--------------|---------|
| ⑦ | 1 个能力子组（≤4 能力） | 1 | 域分组 → 上限拆分 → 依赖拓扑编排 |
| ⑧ | 1 个命题 | 1 | 无依赖，先完成先补位 |
| ⑨ | 1 个命题 | 2（Markdown + Experiment） | 两 agent 无相互依赖可并行，W=5 命题 = 最多 10 agent |
| ⑩ | 1 个命题 | 1 | 无依赖，先完成先补位 |

### 跟踪方式

| 耗时 | 方案 | 主线程 | 完成延迟 |
|------|------|--------|---------|
| < 5min | ~~`sessions_yield`~~ → 轮询 `subagents list` | 活跃 | 即时（10-15s 轮询间隔） |
| ≥ 5min | Cron（isolated session） | 释放 | ≤ 2min |

### 完成判断

agent 的 expected_files 全部存在 = completed。

### 子 agent 数据获取策略

| 步骤 | 策略 | 原因 |
|------|------|------|
| ⑦ | task 全部内联，不读外部文件 | 能力信息在分组时已确定，一个 agent 研究一组 |
| ⑧⑨⑩ | task 指定具体文件路径，agent 用 `read` 工具读取 | 前置步骤产出量大，全部内联会导致 task 过长 |

文件不存在时的降级：Step ⑧ 标注"缺失"继续处理；Step ⑨⑩ 停止执行并报错。

## 产出结构

```
{workDir}/
│
├── README.md                          ← 总览导航
├── learning-ladder.md                 ← 全局学习阶梯（可选）
│
├── 01-长列表渲染/                      ← 命题目录
│   ├── overview.md                    # Q1: 链路编排
│   ├── edge-cases.md                  # Q2: 坑点提取
│   ├── trade-offs.md                  # Q3: 方案对比
│   ├── experiment/                    # Q4: 实验组装
│   │   ├── README.md
│   │   └── src/
│   ├── references.md                  # 参考资料
│   └── learning-ladder.md             # 学习阶梯
│
├── capabilities/                      ← 原子能力知识库
│   ├── README.md
│   ├── A1-浏览器渲染管线.md
│   └── ...
│
└── .meta/                             ← 内部数据
    ├── capability-graph.json
    ├── decompositions.json
    ├── evaluations.json
    ├── highgrounds.json
    ├── raw-materials.json
    ├── candidates.md
    ├── pipeline-state.json
    ├── summaries/
    │   ├── A1-浏览器渲染管线.json
    │   └── ...
    ├── briefings/
    │   ├── 01-长列表渲染.md
    │   └── ...
    └── sources/
        └── dynamic-sources.json
```

## 四层用户价值

| 层 | 目录 | 用户价值 | 使用场景 |
|----|------|---------|---------|
| 学习阶梯 | `{seq}/learning-ladder.md` | 渐进式引导，从不会到会 | 系统学习，跟着阶梯走 |
| 命题研究 | `{seq}/overview + edge + trade + experiment` | 面试场景的深度答案 | 面试前针对特定命题速查 |
| 能力知识库 | `capabilities/{id}-{name}.md` | 跨命题的原子能力参考 | 系统性学习某个技术点 |
| 学习路径 | `capabilities/README.md` | 战略性修炼地图 | 规划学习优先级 |
