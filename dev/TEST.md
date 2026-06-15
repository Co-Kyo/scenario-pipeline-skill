---
name: scenario-pipeline-test
description: "Skill 测试入口。触发模式：'测试这个skill' / '运行测试' / '检查skill质量'。"
---

# Scenario Pipeline Test

## 测试全景图

```
                    用户输入："测试这个skill"
                                  │
                    ┌─────────────┴─────────────┐
                    │         测试执行           │
                    │                           │
                    │  pytest tests/ -v         │
                    │       │                   │
                    │       ▼                   │
                    │  测试报告                 │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │         结果判定           │
                    │                           │
                    │  全部通过 → 输出报告       │
                    │  有失败   → 进入修复       │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │         修复流程           │
                    │                           │
                    │  1. 分析失败原因           │
                    │  2. 读取关联 Skill 文件    │
                    │  3. 修改 processes/*.md    │
                    │  4. 重跑失败测试           │
                    │  5. 全量回归验证           │
                    │  6. 提交变更               │
                    └───────────────────────────┘
```

## 触发方式

| 触发词 | 模式 | 说明 |
|--------|------|------|
| `测试这个skill` | 纯测试 | 运行测试，输出报告 |
| `运行测试` | 纯测试 | 同上 |
| `检查skill质量` | 纯测试 | 同上 |
| `修复测试失败` | 测试+修复 | 运行测试，失败则修复 |
| `patch skill` | 测试+修复 | 同上 |
| `根据测试修复` | 测试+修复 | 同上 |

## 执行入口

### 前置检查

```bash
# 1. 确认测试框架可用
pytest --version

# 2. 确认测试目录存在
ls tests/

# 3. 确认测试用例数量
pytest tests/ --collect-only -q
```

### 模式 A：纯测试

**触发词**：`测试这个skill` / `运行测试` / `检查skill质量`

```
Step 1: 读取 TEST.md（本文件）
Step 2: 读取 tests/README.md（测试约定）
Step 3: 确认测试目标
  - 全部测试：pytest tests/ -v
  - 特定步骤：pytest tests/unit/test_{step}.py -v
  - 特定场景：pytest tests/e2e/test_{scenario}.py -v
Step 4: 执行测试
Step 5: 输出测试报告
  - 通过数/失败数/总数
  - 失败用例列表
```

### 模式 B：测试 + 修复

**触发词**：`修复测试失败` / `patch skill` / `根据测试修复`

```
Step 1: 读取 TEST.md（本文件）
Step 2: 运行测试，获取失败列表
Step 3: 对每个失败测试：
  3.1 读取测试 docstring（= 需求说明）
  3.2 定位关联的 Skill 文件
      - test_00_* → processes/00-*.md
      - test_01_* → processes/01-*.md
      - test_shared_* → core/shared-conventions.md
      - test_meta_* → meta/*.md
  3.3 读取 Skill 文件
  3.4 修改 Skill 文件
  3.5 重跑该测试验证
Step 4: 全量回归 pytest tests/ -v
Step 5: 如果全量通过，提交变更
Step 6: 如果仍有失败，标记 blocked 并报告
```

## 测试分层

| 层 | 验证内容 | 确定性 | 命令 |
|----|----------|--------|------|
| Layer 1 | JSON Schema / 必需字段 | 100% | `pytest tests/unit/ -v` |
| Layer 2 | 属性覆盖 / DAG 无环 | 统计性 | `pytest tests/integration/ -v` |
| Layer 3 | 语义质量评估 | 非确定性 | `pytest tests/e2e/ -v` |

## 文件引用表

| 文件 | 内容 | 何时读取 |
|------|------|----------|
| `tests/README.md` | 测试约定、目录结构 | 初始化 |
| `tests/unit/test_*.py` | 单元测试 | 执行测试时 |
| `tests/conftest.py` | fixtures | 自动加载 |
| `scripts/check-test-failures.py` | 失败分析器 | 模式 B |

## 失败处理决策树

```
测试失败
    │
    ├─→ 失败原因：测试写错了
    │       → 修正测试，重新运行
    │
    ├─→ 失败原因：Skill 设计缺失
    │       → 修改 processes/*.md
    │       → 重跑测试
    │
    ├─→ 失败原因：Skill 设计错误
    │       → 修改 processes/*.md
    │       → 重跑测试
    │
    └─→ 无法修复
            → 标记 blocked
            → 报告给控制人
```

## 输出格式

### 测试通过

```
✅ 测试通过

总数: 69
通过: 69
失败: 0

所有测试通过。
```

### 测试失败

```
❌ 测试失败

总数: 69
通过: 68
失败: 1

失败用例:
  - tests/unit/test_00_brainstorm.py::TestSkipLogic::test_skip_when_all_conditions_met

失败原因:
  AssertionError: 跳过条件未包含 platform 校验

建议:
  修改 processes/00-brainstorm.md，新增 platform 条件
```

## 控制人职责

| 职责 | 触发条件 |
|------|----------|
| 观测 Skill 运行效果 | SKILL.md 执行后 |
| 提出测试改进讨论 | 测试覆盖不足时 |
| 审批关键决策 | 测试失败无法自动修复时 |
| 确认 Skill 质量 | TEST.md 报告后 |
