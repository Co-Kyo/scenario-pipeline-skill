---
name: agent-team
description: "多角色交叉讨论。并行 spawn 3 个专业 Agent（架构师/测试专家/实现者），从不同视角评审方案，综合得出最优解。适用于架构级决策。"
---

# Agent Team

## 用途

复杂决策需要多角色交叉讨论，而非单角色线性规划。

## 触发条件

| 场景 | 示例 |
|------|------|
| 新增入口文件 | TEST.md、PATCH.md |
| 模块边界调整 | processes/ 拆分、core/ 重构 |
| 跨层设计变更 | 测试策略、错误处理 |
| 多种方案对比 | 架构权衡 |

**跳过条件**：bug 修复、typo、单文件修改

## Agent 角色

| 角色 | 关注点 | 核心问题 |
|------|--------|----------|
| 架构师 | 整体结构、风险 | 抽象层级对吗？耦合风险？ |
| 测试专家 | 可测试性、验证 | 怎么验证？什么会静默失败？ |
| 实现者 | 可行性、细节 | 需要什么上下文？边界条件？ |

## 执行流程

### Step 1: 定义问题

```markdown
## 问题
<我们要解决什么？>

## 约束
<有什么限制？>

## 目标
<成功是什么样子？>

## 提议方案
<初步想法>
```

### Step 2: 并行 Spawn Agent

```python
# 架构师
spawn(
    subagent_type="general",
    description="Architect perspective",
    prompt="你是一个架构师 Agent，负责评审 {topic}。\n\n## 背景\n{context}\n\n## 当前问题\n{problem}\n\n## 提议方案\n{solution}\n\n## 你的任务\n从架构角度评审，提出：\n1. 方案优点和风险\n2. 替代方案\n3. 改进建议\n\n200字以内。"
)

# 测试专家
spawn(
    subagent_type="general",
    description="Tester perspective",
    prompt="你是一个测试专家 Agent，负责评审 {topic}。\n\n## 背景\n{context}\n\n## 当前问题\n{problem}\n\n## 提议方案\n{solution}\n\n## 你的任务\n从测试角度评审，提出：\n1. 可测试性\n2. 验证流程\n3. 边界条件\n\n200字以内。"
)

# 实现者
spawn(
    subagent_type="general",
    description="Implementer perspective",
    prompt="你是一个实现者 Agent，负责评审 {topic}。\n\n## 背景\n{context}\n\n## 当前问题\n{problem}\n\n## 提议方案\n{solution}\n\n## 你的任务\n从实现角度评审，提出：\n1. 实现细节\n2. 所需上下文\n3. 风险点\n\n200字以内。"
)
```

### Step 3: 收集反馈

等待所有 Agent 完成，综合为表格：

```markdown
| 角色 | 核心观点 | 风险 |
|------|----------|------|
| 架构师 | ... | ... |
| 测试专家 | ... | ... |
| 实现者 | ... | ... |
```

### Step 4: 综合分析

1. **识别共识点**：多个角色都认同的观点
2. **识别分歧点**：角色间有冲突的观点
3. **权衡取舍**：根据优先级做决定

### Step 5: 决策

- 如果共识明确 → 直接决策
- 如果分歧严重 → 请示用户

### Step 6: 记录

```markdown
## Agent Team 讨论报告

### 问题
{problem}

### 参与角色
- [x] 架构师
- [x] 测试专家
- [x] 实现者

### 讨论摘要
| 角色 | 核心观点 | 风险 |
|------|----------|------|
| ... | ... | ... |

### 共识点
- ...

### 分歧点
- ...

### 最终决策
{decision}

### 理由
{rationale}
```

## 输出

- Agent Team 讨论报告
- 最终决策及理由
