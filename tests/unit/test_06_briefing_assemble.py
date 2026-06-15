"""
Step ⑥ Briefing 组装 - Skill 设计验证测试
"""

import os
import re
import pytest


SKILL_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSES_DIR = os.path.join(SKILL_DIR, "processes")


class TestBriefingAssembleFileStructure:
    """验证 06-briefing-assemble.md 文件结构"""

    @pytest.fixture
    def content(self):
        path = os.path.join(PROCESSES_DIR, "06-briefing-assemble.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_file_exists(self):
        path = os.path.join(PROCESSES_DIR, "06-briefing-assemble.md")
        assert os.path.exists(path)

    def test_has_title(self, content):
        assert re.search(r"^# Step", content, re.MULTILINE)

    def test_has_prerequisites(self, content):
        assert "## 前置条件" in content

    def test_has_context_isolation(self, content):
        assert "上下文隔离" in content


class TestBriefingAssembleFunctionality:
    """验证 Briefing 组装功能设计"""

    @pytest.fixture
    def content(self):
        path = os.path.join(PROCESSES_DIR, "06-briefing-assemble.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_parallel_execution(self, content):
        """必须提到并行执行"""
        assert "并行" in content

    def test_briefing_output(self, content):
        """必须定义 Briefing 输出"""
        assert "briefing" in content.lower()

    def test_checkpoint_defined(self, content):
        """必须定义检查点"""
        assert "检查点" in content or "checkpoint" in content.lower()
