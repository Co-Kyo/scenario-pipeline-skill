---
name: scenario-pipeline-patch
description: "Skill 修复入口。触发模式：'修复测试失败' / 'patch skill' / '根据测试修复' / '修复 skill'。"
---

# Scenario Pipeline Patch

## 修复全景图

```
                    用户输入："修复测试失败"
                                  │
                    ┌─────────────┴─────────────┐
                    │         运行测试           │
                    │                           │
                    │  pytest tests/ -v         │
                    │       │                   │
                    │       ▼                   │
                    │  失败列表                 │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │         分析失败           │
                    │                           │
                    │  1. 读取测试 docstring     │
                    │  2. 定位关联 Skill 文件    │
                    │  3. 理解预期行为           │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │         修复 Skill         │
                    │                           │
                    │  1. 修改 processes/*.md    │
                    │  2. 重跑失败测试           │
                    │  3. 全量回归验证           │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │         提交变更           │
                    │                           │
                    │  git add + commit         │
                    └───────────────────────────┘
```

## 触发方式

| 触发词 | 说明 |
|--------|------|
| `修复测试失败` | 运行测试，分析失败，修复 Skill |
| `patch skill` | 同上 |
| `根据测试修复` | 同上 |
| `修复 skill` | 同上 |

## 执行入口

### 前置检查

```bash
# 1. 确认测试框架可用
pytest --version

# 2. 确认有失败测试
pytest tests/ -v --tb=no -q | grep FAILED
```

### 修复流程

```
Step 1: 读取 PATCH.md（本文件）
Step 2: 运行测试，获取失败列表
Step 3: 对每个失败测试：
  3.1 读取测试 docstring（= 需求说明）
  3.2 定位关联的 Skill 文件
  3.3 读取 Skill 文件
  3.4 修改 Skill 文件
  3.5 重跑该测试验证
Step 4: 全量回归 pytest tests/ -v
Step 5: 提交变更
```

## 文件关联规则

| 测试文件 | 关联 Skill 文件 |
|----------|-----------------|
| `test_00_brainstorm.py` | `processes/00-brainstorm.md` |
| `test_01_partition.py` | `processes/01-partition.md` |
| `test_02_scan.py` | `processes/02-scan.md` |
| `test_03_capability_graph.py` | `processes/03-capability-graph.md` |
| `test_04_evaluate_pool.py` | `processes/04-evaluate-pool.md` |
| `test_05_capability_research.py` | `processes/05-capability-research.md` |
| `test_06_briefing_assemble.py` | `processes/06-briefing-assemble.md` |
| `test_07_assemble.py` | `processes/07-assemble.md` |
| `test_08_learning_ladder.py` | `processes/08-learning-ladder.md` |
| `test_09_build_dashboard.py` | `processes/09-build-dashboard.md` |
| `test_shared_conventions.py` | `core/shared-conventions.md` |
| `test_meta_paths.py` | `meta/paths.md` |
| `test_core_files.py` | `core/*.md` |
| `test_output_contracts.py` | `meta/output-contracts.md` |

## 修复策略

### 测试写错了

```bash
# 修正测试
git add tests/
git commit -m "test: 修正 xxx 测试的预期结果"
# 然后重跑测试
```

### Skill 设计缺失

```bash
# 修改 Skill 文件
git add processes/
git commit -m "fix: 新增 xxx 功能定义"
# 然后重跑测试
```

### Skill 设计错误

```bash
# 修改 Skill 文件
git add processes/
git commit -m "fix: 修正 xxx 逻辑"
# 然后重跑测试
```

### 无法修复

```bash
# 标记 blocked，报告给控制人
# 不自动修复，等待人工介入
```

## 提交规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 修复 Skill | `fix: <描述>` | `fix: 跳过逻辑增加 platform 校验` |
| 修正测试 | `test: <描述>` | `test: 修正年限推断预期结果` |

## 输出格式

### 修复成功

```
✅ 修复完成

修复内容：
  - processes/00-brainstorm.md: 新增 platform 条件

测试结果：
  - 修复的测试：PASSED
  - 全量回归：150 passed

已提交：fix: 新增 platform 条件
```

### 修复失败

```
❌ 修复失败

失败测试：
  - tests/unit/test_00_brainstorm.py::TestSkipLogic::test_skip

失败原因：
  - AssertionError: 跳过条件未包含 platform 校验

建议：
  - 阅读测试 docstring 了解需求
  - 检查 processes/00-brainstorm.md 的跳过逻辑
  - 或报告给控制人
```

## 控制人职责

| 职责 | 触发条件 |
|------|----------|
| 审批修复方案 | 复杂修复或跨文件修改 |
| 确认修复结果 | 修复后人工审查 |
| 处理 blocked | 无法自动修复时 |
