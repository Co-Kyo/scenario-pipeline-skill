# Testing Strategy: 测试即需求文档

> 状态：草案
> 创建：2026-06-15

## 核心理念

**测试不是验证代码，而是定义 Skill 的功能需求。**

- 读测试 = 读需求规格
- 测试通过 = 需求满足
- 测试失败 = 需求未定义或未实现

## 设计目标

| 目标 | 描述 |
|------|------|
| 可读性 | 测试文件是人类可读的功能说明 |
| 可执行 | 测试可以自动运行，验证 Skill 行为 |
| 可演进 | 测试随 Skill 一起迭代，保持同步 |
| 可讨论 | 测试是产品需求讨论的基础 |

## 测试分层

```
┌─────────────────────────────────────────┐
│  E2E 测试（完整管道）                     │
│  输入：用户指令 → 输出：最终产物          │
├─────────────────────────────────────────┤
│  集成测试（步骤间衔接）                   │
│  输入：Step N 产物 → 输出：Step N+1 产物 │
├─────────────────────────────────────────┤
│  单元测试（单步骤行为）                   │
│  输入：步骤输入 → 输出：步骤输出          │
└─────────────────────────────────────────┘
```

## 目录结构

```
tests/
├── README.md                    # 测试框架使用说明
├── conftest.py                  # pytest fixtures（workDir、sample data）
│
├── unit/                        # 单元测试（单步骤）
│   ├── test_00_brainstorm.py    # 头脑风暴
│   ├── test_01_partition.py     # 分区
│   ├── test_02_scan.py          # 扫描
│   └── ...
│
├── integration/                 # 集成测试（步骤间）
│   ├── test_brainstorm_to_partition.py
│   ├── test_scan_to_capability.py
│   └── ...
│
├── e2e/                         # 端到端测试
│   ├── test_webpack_vite.py     # webpack&vite 场景
│   ├── test_performance.py      # 性能优化场景
│   └── ...
│
├── fixtures/                    # 测试数据
│   ├── inputs/                  # 标准输入
│   │   ├── webpack-vite/
│   │   │   ├── raw_input.txt
│   │   │   └── expected_context.json
│   │   └── performance/
│   ├── expected/                # 预期输出
│   │   ├── requirement-web.json
│   │   ├── partition-analysis.json
│   │   └── ...
│   └── schemas/                 # JSON Schema（可选）
│
└── reports/                     # 测试报告输出
```

## 测试文件格式

### 风格：Given-When-Then（BDD）

```python
class TestBrainstormSkipLogic:
    """头脑风暴跳过逻辑测试
    
    需求：当 topic 明确 + year 已推断 + platform 已指定 时，
    可以跳过完整头脑风暴，直接生成轻量骨架。
    """

    def test_skip_when_all_conditions_met(self):
        """场景：用户输入 'webpack vite 3年经验 web平台'
        
        Given: topic 包含具体工具名（webpack, vite）
        When:  系统解析输入
        Then:  判断为可跳过，生成轻量骨架
        """
        # ...

    def test_no_skip_when_abstract_topic(self):
        """场景：用户输入 '前端性能优化原理与实践'
        
        Given: topic 包含抽象词（原理、实践）
        When:  系统解析输入
        Then:  判断为不可跳过，执行完整头脑风暴
        """
        # ...
```

### 格式要点

1. **类名 = 功能模块**（如 `TestBrainstormSkipLogic`）
2. **文档字符串 = 需求说明**（谁都能读懂）
3. **方法名 = 场景描述**（如 `test_skip_when_all_conditions_met`）
4. **Given-When-Then = 测试逻辑**（清晰的输入→处理→输出）

## 测试执行

```bash
# 运行所有测试
pytest tests/

# 运行特定步骤测试
pytest tests/unit/test_00_brainstorm.py

# 运行特定场景测试
pytest tests/e2e/test_webpack_vite.py

# 只运行失败的测试
pytest --lf

# 生成测试报告
pytest tests/ --html=tests/reports/report.html
```

## 与 Skill 设计的关系

```
测试需求（tests/）          Skill 设计（processes/）
     │                            │
     │  定义「做什么」              │  定义「怎么做」
     │                            │
     ▼                            ▼
  测试文件  ──────────────────>  Markdown 指令
     │                            │
     │  验证「做对没」              │
     │                            │
     ▼                            ▼
  测试结果  <──────────────────  Agent 执行
```

## 工作流（Agent 执行版）

> 本节供 Agent 直接读取执行。每一步都有明确的命令和判定条件。

### 触发条件

当用户说以下任一，执行本工作流：
- "优化 xxx 功能"
- "修改 xxx 行为"
- "修复 xxx bug"
- "调整 xxx 逻辑"

### 前置检查

```bash
# 1. 确认当前在 main 分支
git branch --show-current
# 期望输出：main
# 如果不是 main → 先切换：git checkout main

# 2. 确认工作区干净
git status --short
# 期望输出：无输出（空）
# 如果有输出 → 先提交或 stash

# 3. 确认测试框架可用
pytest --version
# 期望输出：pytest 版本号
# 如果报错 → 安装：pip install pytest
```

### 主流程

#### Step 1: 创建分支

```bash
# 输入：<简述>（从用户指令提取，如 "adjust-skip-logic"）
git checkout -b test/<简述>
```

**验证**：`git branch --show-current` 输出 `test/<简述>`

#### Step 2: 修改测试

```bash
# 读取相关测试文件
cat tests/unit/test_<步骤号>_<步骤名>.py

# 根据用户需求修改测试
# - 新增测试用例 = 新增需求
# - 修改测试用例 = 修改需求
# - 删除测试用例 = 删除需求（谨慎）
```

**约束**：
- 每个测试必须有 docstring（= 需求说明）
- 测试必须遵循 Given-When-Then 格式
- 测试方法名必须描述场景

#### Step 3: 提交测试

```bash
git add tests/
git commit -m "test: <描述测试变更>"
```

**提交信息格式**：`test: <动词> <内容>`
- 示例：`test: 新增跳过逻辑的 platform 校验需求`
- 示例：`test: 修改年限推断的默认值从 L2 改为 L1`

#### Step 4: 运行测试，确认失败

```bash
# 运行修改的测试
pytest tests/unit/test_<步骤号>_<步骤名>.py -v

# 期望：修改的测试 FAILED，其他测试 PASSED
```

**判定**：
- ✅ 新修改的测试 FAILED → 继续 Step 5
- ❌ 新修改的测试 PASSED → 测试没有正确反映需求，回到 Step 2 修正测试
- ❌ 其他测试 FAILED → 测试修改影响了其他功能，回到 Step 2 检查

#### Step 5: 修复 Skill

```bash
# 读取相关 Skill 文件
cat processes/<步骤号>-<步骤名>.md

# 根据测试需求修改 Skill
# - 测试 docstring 描述的就是需求
# - 修改 Markdown 指令使测试通过
```

**约束**：
- 只修改必要的部分
- 保持 Markdown 格式
- 不要破坏其他功能
- 修改后必须能解释"为什么这样改"

#### Step 6: 提交实现

```bash
git add processes/
git commit -m "<类型>: <描述实现变更>"
```

**提交信息格式**：`<类型>: <内容>`
- 类型：`fix`（修复）、`feat`（新增）、`refactor`（重构）
- 示例：`fix: 跳过逻辑增加 platform 必填校验`
- 示例：`feat: 新增看板生成步骤`

#### Step 7: 运行测试，确认通过

```bash
# 运行修改的测试
pytest tests/unit/test_<步骤号>_<步骤名>.py -v

# 期望：所有测试 PASSED
```

**判定**：
- ✅ 所有测试 PASSED → 继续 Step 8
- ❌ 仍有测试 FAILED → 回到 Step 5 继续修复

#### Step 8: 全量回归

```bash
# 运行所有测试
pytest tests/ -v

# 期望：所有测试 PASSED
```

**判定**：
- ✅ 所有测试 PASSED → 继续 Step 9
- ❌ 有测试 FAILED → 分析失败原因，决定是修复还是回滚

#### Step 9: 合并前检查

```bash
# 检查是否与 main 有冲突
git fetch origin
git merge --no-commit --no-ff origin/main

# 如果有冲突：
# git merge --abort
# 先解决冲突，重新执行 Step 8

# 无冲突：
git merge --abort  # 取消测试合并（只是检查）
```

#### Step 10: 合并

```bash
git checkout main
git merge test/<简述> --no-ff -m "merge: <描述合并内容>"
git branch -d test/<简述>
```

#### Step 11: 合并后验证

```bash
# 切换到 main
git checkout main

# 运行全量测试
pytest tests/ -v

# 期望：所有测试 PASSED
```

**判定**：
- ✅ 所有测试 PASSED → 完成
- ❌ 有测试 FAILED → 立即回滚：`git reset --hard HEAD~1`

### 异常处理

#### 测试写错了

```bash
# 在分支内修正测试
git add tests/
git commit -m "test: 修正 xxx 测试的预期结果"
# 然后继续 Step 4
```

#### 实现无法通过测试

```bash
# 回滚实现变更
git reset --hard HEAD~1

# 重新分析测试需求
# 可能需要与用户确认需求是否合理
```

#### 合并后测试失败

```bash
# 立即回滚
git reset --hard HEAD~1

# 分析失败原因
# 可能需要重新走一遍流程
```

### 分支命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 测试驱动演进 | `test/<简述>` | `test/adjust-skip-logic` |
| 新功能测试 | `test/feat-<功能名>` | `test/feat-dashboard-validation` |
| Bug 修复测试 | `test/fix-<bug名>` | `test/fix-year-inference-edge-case` |

### 提交规范

| 提交 | 格式 | 示例 |
|------|------|------|
| 测试变更 | `test: <动词> <内容>` | `test: 新增跳过逻辑的 platform 校验需求` |
| 实现变更 | `<类型>: <内容>` | `fix: 跳过逻辑增加 platform 必填校验` |
| 合并 | `merge: <描述>` | `merge: 跳过逻辑 platform 校验` |

## 依赖

```
# requirements-test.txt
pytest>=7.0
pytest-html>=3.0      # HTML 报告
jsonschema>=4.0       # JSON Schema 验证（可选）
```

## AI 测试特殊考量

### 非确定性处理

AI agent 执行结果具有非确定性，测试需要分层：

| 层 | 验证内容 | 确定性 | 策略 |
|----|----------|--------|------|
| Layer 1 | JSON Schema / 必需字段 | 100% | 精确断言 |
| Layer 2 | 属性覆盖 / DAG 无环 | 统计性 | 多次运行 |
| Layer 3 | 语义质量评估 | 非确定性 | LLM-as-Judge |

### Test-to-Patch 流程

测试失败时，自动触发 Skill 更新：

```
pytest 失败 → 失败分析 → Patch Prompt → LLM 修改 → 验证
```

详见 `ai-testing-paradigm.md`。

## 下一步

1. 创建 tests/ 目录结构
2. 编写 conftest.py（fixtures）
3. 为 Step ⓪ 头脑风暴编写第一批测试
4. 验证框架可用
5. 逐步补充其他步骤的测试
6. 实现 Test-to-Patch 自动化脚本
