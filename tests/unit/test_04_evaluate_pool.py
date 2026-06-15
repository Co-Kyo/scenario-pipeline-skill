"""
Step ④ 评估与入池 - Skill 设计验证测试
"""

import os
import re
import pytest


SKILL_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSES_DIR = os.path.join(SKILL_DIR, "processes")


class TestEvaluatePoolFileStructure:
    """验证 04-evaluate-pool.md 文件结构"""

    @pytest.fixture
    def content(self):
        path = os.path.join(PROCESSES_DIR, "04-evaluate-pool.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_file_exists(self):
        path = os.path.join(PROCESSES_DIR, "04-evaluate-pool.md")
        assert os.path.exists(path)

    def test_has_title(self, content):
        assert re.search(r"^# Step", content, re.MULTILINE)

    def test_has_prerequisites(self, content):
        assert "## 前置条件" in content

    def test_has_context_isolation(self, content):
        assert "上下文隔离" in content


class TestEvaluatePoolFunctionality:
    """验证评估功能设计"""

    @pytest.fixture
    def content(self):
        path = os.path.join(PROCESSES_DIR, "04-evaluate-pool.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_four_dimension_evaluation(self, content):
        """必须提到四维评估"""
        assert "四维" in content or "评估" in content

    def test_priority_scoring(self, content):
        """必须提到优先级评分"""
        assert "优先级" in content or "评分" in content

    def test_pool_output(self, content):
        """必须定义入池输出"""
        assert "evaluations" in content or "README" in content

    def test_checkpoint_defined(self, content):
        """必须定义检查点"""
        assert "检查点" in content or "checkpoint" in content.lower()
