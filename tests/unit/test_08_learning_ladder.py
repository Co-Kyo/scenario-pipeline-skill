"""
Step ⑧ 学习阶梯 - Skill 设计验证测试
"""

import os
import re
import pytest


SKILL_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSES_DIR = os.path.join(SKILL_DIR, "processes")


class TestLearningLadderFileStructure:
    """验证 08-learning-ladder.md 文件结构"""

    @pytest.fixture
    def content(self):
        path = os.path.join(PROCESSES_DIR, "08-learning-ladder.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_file_exists(self):
        path = os.path.join(PROCESSES_DIR, "08-learning-ladder.md")
        assert os.path.exists(path)

    def test_has_title(self, content):
        assert re.search(r"^# Step", content, re.MULTILINE)

    def test_has_prerequisites(self, content):
        assert "## 前置条件" in content

    def test_has_context_isolation(self, content):
        assert "上下文隔离" in content


class TestLearningLadderFunctionality:
    """验证学习阶梯功能设计"""

    @pytest.fixture
    def content(self):
        path = os.path.join(PROCESSES_DIR, "08-learning-ladder.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_parallel_execution(self, content):
        """必须提到并行执行"""
        assert "并行" in content

    def test_topology_sorting(self, content):
        """必须提到拓扑排序"""
        assert "拓扑" in content or "排序" in content

    def test_ladder_output(self, content):
        """必须定义阶梯输出"""
        assert "learning-ladder" in content

    def test_checkpoint_defined(self, content):
        """必须定义检查点"""
        assert "检查点" in content or "checkpoint" in content.lower()
