# assets/ 使用说明

## 目录结构

```
assets/
├── common/                     ← 公共资源
│   ├── rule-isolation.md        上下文隔离（每步只读该步的文件）
│   ├── rule-reuse.md            增量复用（文件存在则跳过）
│   ├── protocol-checkpoint.md   检查点协议（强制停顿 + barrier 记录）
│   ├── protocol-scheduling.md   子 agent 调度（3 模式 + 校验 + 平台适配）
│   ├── strategy-level.md        动态策略（级别 × 参数表）
│   ├── convention-trace.md      决策凭据（_trace 字段）
│   ├── ref-sources.md           信源分级表
│   └── ref-paths.md             路径约定表
├── 00-intent-anchor/
│   ├── schemas.md              ← anchors.json 格式定义
│   ├── year-rules.md           ← 年限推断规则
│   └── skip-rules.md           ← 跳过规则
├── 01-brainstorm/
│   ├── schemas.md              ← JSON 格式定义（4 维度 Agent）
│   ├── level-weight.md         ← level/role 约束规则
│   ├── scenario-agent.md       ← 场景维度 Agent 定义
│   ├── technical-agent.md      ← 技术维度 Agent 定义
│   ├── learning-agent.md       ← 学习维度 Agent 定义
│   ├── constraint-agent.md     ← 约束维度 Agent 定义
│   ├── barrier-check.md        ← Barrier 检查项 + 决策矩阵
│   ├── scheduling-detail.md    ← 调度参数 + 超时 + 降级
│   ├── fallback-protocol.md    ← 收敛者失败降级协议
│   └── architecture.svg        ← 架构流程图
├── 02-partition/
│   └── schemas.md              ← partition-analysis.json 格式
├── 03-scan/
│   └── schemas.md              ← search-batch / url-batches / partial 格式
├── 04-capability-graph/
│   ├── method.md               ← 能力图谱方法论 + 战略高地识别
│   └── schemas.md              ← capability-graph.json 格式
├── 05-evaluate-pool/
│   ├── method.md               ← 四维评估矩阵方法论
│   └── schemas.md              ← evaluations.json 格式
├── 06-capability-research/
│   └── schemas.md              ← capability 主文件 + 摘要格式
├── 07-briefing-assemble/
│   └── schemas.md              ← briefing 格式
├── 08-assemble/
│   └── schemas.md              ← overview/edge-cases/trade-offs/references 格式
└── 09-learning-ladder/
    └── schemas.md              ← learning-ladder 格式
```

## 引用方式

在 processes 文件中引用资源文件：

```markdown
# 引用 schemas
详见 `assets/00-intent-anchor/schemas.md`

# 引用方法论
详见 `assets/04-capability-graph/method.md`

# 引用公共资源
详见 `assets/common/rule-isolation.md` / `assets/common/strategy-level.md` / `assets/common/protocol-scheduling.md`
```

## 文件类型说明

- **schemas.md**：定义该步骤的输出数据格式（JSON Schema）
- **method.md**：定义该步骤的核心方法论和算法
- **common/*.md**：跨步骤共享的公共资源（约定、域名表、路径）

## 设计原则

1. **职责分离**：流程文件（processes/*.md）定义流程，资源文件（assets/*.md）定义数据格式和方法论
2. **语义独立**：每个步骤的资源文件独立管理，避免跨步骤依赖
3. **便于维护**：修改数据格式或方法论只需更新对应的 assets 文件，无需修改流程文件
4. **版本控制**：资源文件的变更可以独立追踪