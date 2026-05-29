# dev/ — Skill 开发与观测

> 本目录存放 skill 的设计原理、架构观测和开发工具。
> **Agent 执行 skill 时不需要读本目录。** 本目录供人类阅读和开发调试使用。

## 目录结构

```
dev/
│
├── design/                     ← 设计原理（why）
│   ├── decisions/                  已落地的设计决策
│   │   ├── core-rationale.md       核心方法论的概念定义与设计决策
│   │   ├── context-isolation.md    上下文隔离协议的设计理由
│   │   └── brainstorm-restructure.md  头脑风暴重构设计档案
│   ├── issues/                     挂起的优化设计（待验证/待实施）
│   │   └── dynamic-concurrency-w.md  动态并发调整 W
│   └── CHANGELOG.md               架构变更记录
│
├── pipeline-view/              ← 管道观测（怎么看）
│   ├── 00-overview.md              管道全景 + 数据流图 + 产出结构
│   ├── 01-data-flow.md             数据实体生命周期 + 交接关系
│   └── 02-failure-modes.md         故障模式与恢复策略
│
└── tools/                      ← 开发工具（怎么审）
    ├── skill-audit-rules.md        Skill 文件审查规则（what&how / _trace）
    └── decision-replay.md          决策回放 prompt（_trace 埋点 → 决策链路报告）
```

## 各目录职责

| 目录 | 内容 | 读者 | 何时使用 |
|------|------|------|---------|
| `design/` | 设计决策的背景、理由、替代方案比较 | 人类开发者 | 理解"为什么这样设计"、修改设计时参考 |
| `pipeline-view/` | 管道数据流、实体关系、故障模式的观测视角 | 人类开发者 | 理解管道全貌、排查数据流问题时参考 |
| `tools/` | 可复用的 agent prompt（审查规则 + 决策回放） | Agent | 对 skill 进行审查或质量回放时加载 |

## 与执行层的关系

```
执行层（SKILL.md、processes/、meta/、core/、plugins/）
  → 只包含 what & how
  → Agent 执行时读取

观测层（dev/）
  → 包含 why + 观测视角 + 审查工具
  → 人类阅读 + Agent 审查时按需加载
```
