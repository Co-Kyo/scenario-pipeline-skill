---
name: skill-design-test
description: "为 Skill 的 Markdown 文件创建验证测试。自动分析文件结构，生成 pytest 测试用例。"
---

# Skill Design Test

## 用途

为 `processes/*.md`、`core/*.md`、`meta/*.md` 等 Skill 文件创建验证测试。

## 触发条件

- 新增 Skill 文件后
- 修改 Skill 文件结构后
- 需要验证 Skill 设计完整性时

## 执行步骤

### 1. 分析目标文件

```bash
# 读取文件内容
cat <target_file>

# 识别关键元素
- 标题格式（# Step XX）
- 章节结构（## 目的、## 前置条件、## 输入、## 输出）
- 关键内容（JSON 示例、路径引用、术语定义）
```

### 2. 生成测试文件

**文件命名**：`tests/unit/test_<目录>_<文件名>.py`

**测试结构**：

```python
"""
<文件名> - Skill 设计验证测试

验证 <文件名> 的 Markdown 设计是否完整、一致。
"""

import os
import re
import pytest


SKILL_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET_DIR = os.path.join(SKILL_DIR, "<目录>")


class TestFileStructure:
    """验证文件结构"""

    @pytest.fixture
    def content(self):
        path = os.path.join(TARGET_DIR, "<文件名>.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_file_exists(self):
        path = os.path.join(TARGET_DIR, "<文件名>.md")
        assert os.path.exists(path)

    def test_has_title(self, content):
        assert re.search(r"^# Step", content, re.MULTILINE)

    def test_has_prerequisites(self, content):
        assert "## 前置条件" in content

    def test_has_io(self, content):
        assert "## 输入" in content
        assert "## 输出" in content


class TestKeyContent:
    """验证关键内容"""

    @pytest.fixture
    def content(self):
        path = os.path.join(TARGET_DIR, "<文件名>.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_references_shared_conventions(self, content):
        assert "shared-conventions" in content

    def test_has_context_isolation(self, content):
        assert "上下文隔离" in content
```

### 3. 运行验证

```bash
pytest tests/unit/test_<测试文件>.py -v
```

## 输出

- `tests/unit/test_<测试文件>.py`
- 测试通过/失败报告

## 注意事项

- 测试验证的是 Skill 设计，不是代码行为
- 每个测试必须有 docstring（= 需求说明）
- 遵循 Given-When-Then 风格
