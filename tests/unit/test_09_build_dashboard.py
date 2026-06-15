"""
Step ⑨ 看板生成 - Skill 设计验证测试
"""

import os
import re
import pytest


SKILL_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSES_DIR = os.path.join(SKILL_DIR, "processes")


class TestBuildDashboardFileStructure:
    """验证 09-build-dashboard.md 文件结构"""

    @pytest.fixture
    def content(self):
        path = os.path.join(PROCESSES_DIR, "09-build-dashboard.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_file_exists(self):
        path = os.path.join(PROCESSES_DIR, "09-build-dashboard.md")
        assert os.path.exists(path)

    def test_has_title(self, content):
        assert re.search(r"^# Step", content, re.MULTILINE)

    def test_has_prerequisites(self, content):
        assert "## 前置条件" in content

    def test_has_context_isolation(self, content):
        assert "上下文隔离" in content


class TestBuildDashboardFunctionality:
    """验证看板生成功能设计"""

    @pytest.fixture
    def content(self):
        path = os.path.join(PROCESSES_DIR, "09-build-dashboard.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_has_script_reference(self, content):
        """必须引用构建脚本"""
        assert "build-dashboard" in content or "scripts/" in content

    def test_dashboard_output(self, content):
        """必须定义看板输出"""
        assert "dashboard" in content.lower()

    def test_checkpoint_defined(self, content):
        """必须定义检查点"""
        assert "检查点" in content or "checkpoint" in content.lower()

    def test_references_skill_dir(self, content):
        """必须使用 {skillDir} 引用脚本"""
        assert "{skillDir}" in content
