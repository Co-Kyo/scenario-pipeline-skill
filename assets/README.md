# assets/ 使用说明

## 目录结构

```
assets/
├── common/                     ← 公共资源
│   ├── conventions.md              共享约定（调度/检查点/隔离/增量复用/凭据/比例）
│   ├── sources.md                  T0 域名表 + 信源分级规则
│   └── paths.md                    路径约定表
├── 00-brainstorm/
│   ├── schemas.md              ← JSON 格式定义（anchors + 4 维度 Agent）
│   ├── year-rules.md           ← 年限推断规则
│   ├── level-weight.md         ← level/role 约束规则
│   ├── skip-rules.md           ← 跳过规则
│   ├── task-templates.md       ← 任务模板
│   ├── scenario-agent.md       ← 场景维度 Agent 定义
│   ├── technical-agent.md      ← 技术维度 Agent 定义
│   ├── learning-agent.md       ← 学习维度 Agent 定义
│   └── constraint-agent.md     ← 约束维度 Agent 定义
├── 01-partition/
│   └── schemas.md              ← partition-analysis.json 格式
├── 02-scan/
│   └── schemas.md              ← search-batch / url-batches / partial 格式
├── 03-capability-graph/
│   ├── method.md               ← 能力图谱方法论 + 战略高地识别
│   └── schemas.md              ← capability-graph.json 格式
├── 04-evaluate-pool/
│   ├── method.md               ← 四维评估矩阵方法论
│   └── schemas.md              ← evaluations.json 格式
├── 05-capability-research/
│   └── schemas.md              ← capability 主文件 + 摘要格式
├── 06-briefing-assemble/
│   └── schemas.md              ← briefing 格式
├── 07-assemble/
│   └── schemas.md              ← overview/edge-cases/trade-offs/references 格式
└── 08-learning-ladder/
    └── schemas.md              ← learning-ladder 格式
```

## 引用方式

在 processes 文件中引用资源文件：

```markdown
# 引用 schemas
详见 `assets/00-brainstorm/schemas.md`

# 引用方法论
详见 `assets/03-capability-graph/method.md`

# 引用公共资源
详见 `assets/common/conventions.md`
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