# 测试框架

> **测试即需求文档**：读测试 = 读 Skill 功能规格

## 核心理念

| 原则 | 描述 |
|------|------|
| 可读性 | 测试文件是人类可读的功能说明 |
| 可执行 | 测试可以自动运行，验证 Skill 行为 |
| 可演进 | 测试随 Skill 一起迭代，保持同步 |
| 可讨论 | 测试是产品需求讨论的基础 |

## 目录结构

```
tests/
├── conftest.py              # pytest fixtures
├── unit/                    # 单元测试（单步骤）
│   ├── test_00_brainstorm.py
│   ├── test_01_partition.py
│   └── ...
├── integration/             # 集成测试（步骤间）
├── e2e/                     # 端到端测试
├── fixtures/                # 测试数据
│   ├── inputs/              # 标准输入
│   ├── expected/            # 预期输出
│   └── schemas/             # JSON Schema
└── reports/                 # 测试报告
```

## 测试风格：Given-When-Then（BDD）

```python
class TestFeature:
    """功能描述
    
    需求：说明这个功能做什么
    """
    
    def test_scenario_name(self):
        """场景：场景描述
        
        Given: 前置条件
        When:  执行操作
        Then:  预期结果
        """
        # 测试代码
```

## 运行测试

```bash
# 安装依赖
pip install pytest pytest-html

# 运行所有测试
pytest tests/

# 运行特定步骤测试
pytest tests/unit/test_00_brainstorm.py

# 运行失败的测试
pytest --lf

# 生成 HTML 报告
pytest tests/ --html=tests/reports/report.html
```

## 工作流

### 新功能开发

1. **写测试**：在 tests/ 中定义新功能的需求
2. **讨论测试**：团队评审测试是否完整覆盖需求
3. **设计 Skill**：编写 Markdown 指令满足测试
4. **运行测试**：验证 Skill 设计是否正确
5. **迭代**：根据测试结果调整设计

### Bug 修复

1. **写失败测试**：复现 bug 的场景
2. **确认测试失败**：验证 bug 存在
3. **修复 Skill**：调整 Markdown 指令
4. **确认测试通过**：验证 bug 修复

### 重构

1. **确保测试通过**：当前行为是正确的
2. **重构 Skill**：优化 Markdown 指令
3. **再次运行测试**：确保行为不变
