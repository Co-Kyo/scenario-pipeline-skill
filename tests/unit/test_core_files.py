"""
core/ 目录下的其他方法论文件验证测试
"""

import os
import re
import pytest


SKILL_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CORE_DIR = os.path.join(SKILL_DIR, "core")


class TestCapabilityGraphMethodology:
    """验证 capability-graph.md 方法论"""

    @pytest.fixture
    def content(self):
        path = os.path.join(CORE_DIR, "capability-graph.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_file_exists(self):
        path = os.path.join(CORE_DIR, "capability-graph.md")
        assert os.path.exists(path)

    def test_has_title(self, content):
        assert "#" in content

    def test_defines_capability(self, content):
        """必须定义能力概念"""
        assert "能力" in content or "capability" in content.lower()


class TestStrategicHighground:
    """验证 strategic-highground.md 方法论"""

    @pytest.fixture
    def content(self):
        path = os.path.join(CORE_DIR, "strategic-highground.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_file_exists(self):
        path = os.path.join(CORE_DIR, "strategic-highground.md")
        assert os.path.exists(path)

    def test_has_title(self, content):
        assert "#" in content

    def test_defines_highground(self, content):
        """必须定义高地概念"""
        assert "高地" in content or "highground" in content.lower()


class TestScenarioMatrix:
    """验证 scenario-matrix.md 方法论"""

    @pytest.fixture
    def content(self):
        path = os.path.join(CORE_DIR, "scenario-matrix.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_file_exists(self):
        path = os.path.join(CORE_DIR, "scenario-matrix.md")
        assert os.path.exists(path)

    def test_has_title(self, content):
        assert "#" in content

    def test_defines_scenario(self, content):
        """必须定义场景概念"""
        assert "场景" in content or "scenario" in content.lower()
