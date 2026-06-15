"""
Step ③ 能力图谱构建 - Skill 设计验证测试
"""

import os
import re
import pytest


SKILL_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSES_DIR = os.path.join(SKILL_DIR, "processes")


class TestCapabilityGraphFileStructure:
    """验证 03-capability-graph.md 文件结构"""

    @pytest.fixture
    def content(self):
        path = os.path.join(PROCESSES_DIR, "03-capability-graph.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_file_exists(self):
        path = os.path.join(PROCESSES_DIR, "03-capability-graph.md")
        assert os.path.exists(path)

    def test_has_title(self, content):
        assert re.search(r"^# Step", content, re.MULTILINE)

    def test_has_prerequisites(self, content):
        assert "## 前置条件" in content

    def test_has_context_isolation(self, content):
        assert "上下文隔离" in content


class TestCapabilityGraphFunctionality:
    """验证能力图谱功能设计"""

    @pytest.fixture
    def content(self):
        path = os.path.join(PROCESSES_DIR, "03-capability-graph.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_capability_merge_mentioned(self, content):
        """必须提到能力合并"""
        assert "合并" in content or "merge" in content.lower()

    def test_dependency_tracking(self, content):
        """必须提到依赖追踪"""
        assert "依赖" in content or "depend" in content.lower()

    def test_strategic_highground(self, content):
        """必须提到战略高地"""
        assert "高地" in content or "highground" in content.lower()

    def test_output_file_defined(self, content):
        """必须定义输出文件"""
        assert "capability-graph" in content

    def test_checkpoint_defined(self, content):
        """必须定义检查点"""
        assert "检查点" in content or "checkpoint" in content.lower()
