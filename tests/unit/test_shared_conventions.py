"""
core/shared-conventions.md - 共享约定验证测试

验证 Skill 的核心约定是否完整、一致。
"""

import os
import re
import pytest


SKILL_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CORE_DIR = os.path.join(SKILL_DIR, "core")


class TestSharedConventionsStructure:
    """验证 shared-conventions.md 文件结构"""

    @pytest.fixture
    def content(self):
        path = os.path.join(CORE_DIR, "shared-conventions.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_file_exists(self):
        path = os.path.join(CORE_DIR, "shared-conventions.md")
        assert os.path.exists(path)

    def test_has_title(self, content):
        assert "# 共享约定" in content

    def test_has_context_isolation_section(self, content):
        """必须有上下文隔离规范"""
        assert "上下文隔离" in content

    def test_has_subagent_scheduling_section(self, content):
        """必须有子 agent 调度规范"""
        assert "子 agent 调度" in content or "子agent" in content

    def test_has_checkpoint_section(self, content):
        """必须有检查点协议"""
        assert "检查点" in content

    def test_has_incremental_reuse_section(self, content):
        """必须有增量复用规范"""
        assert "增量复用" in content


class TestContextIsolation:
    """验证上下文隔离规范"""

    @pytest.fixture
    def content(self):
        path = os.path.join(CORE_DIR, "shared-conventions.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_isolation_rule_defined(self, content):
        """必须定义隔离规则"""
        assert "每一步只加载" in content or "严禁预加载" in content

    def test_file_type_classification(self, content):
        """必须定义文件类型分类"""
        assert "meta" in content.lower()
        assert "core" in content.lower()
        assert "processes" in content.lower()

    def test_violation_checklist(self, content):
        """必须有违规检查清单"""
        assert "违规" in content or "禁止" in content


class TestSubagentScheduling:
    """验证子 agent 调度规范"""

    @pytest.fixture
    def content(self):
        path = os.path.join(CORE_DIR, "shared-conventions.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_concurrency_limit(self, content):
        """必须定义并发上限"""
        assert "W" in content or "并发" in content

    def test_scheduling_modes(self, content):
        """必须定义调度模式"""
        assert "批量并行" in content or "滚动窗口" in content

    def test_label_naming_convention(self, content):
        """必须定义 Label 命名规范"""
        assert "Label" in content or "命名" in content

    def test_completion_validation(self, content):
        """必须定义完成判定"""
        assert "完成" in content and "判定" in content


class TestCheckpointProtocol:
    """验证检查点协议"""

    @pytest.fixture
    def content(self):
        path = os.path.join(CORE_DIR, "shared-conventions.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_checkpoint_count(self, content):
        """必须定义检查点数量"""
        assert "9" in content or "九" in content

    def test_checkpoint_symbols(self, content):
        """必须定义检查点符号"""
        symbols = ["ⓩ", "ⓧ", "ⓐ", "ⓑ", "ⓒ", "ⓓ", "ⓕ", "ⓖ", "ⓗ"]
        found = sum(1 for s in symbols if s in content)
        assert found >= 5, f"只找到 {found}/9 个检查点符号"

    def test_checkpoint_mandatory(self, content):
        """必须强调检查点是强制的"""
        assert "强制" in content or "停顿" in content

    def test_checkpoint_record_file(self, content):
        """必须定义检查点记录文件"""
        assert "barrier" in content


class TestLevelRoleSystem:
    """验证 level/role 体系"""

    @pytest.fixture
    def content(self):
        path = os.path.join(CORE_DIR, "shared-conventions.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_levels_defined(self, content):
        """必须定义 L1-L4"""
        assert "L1" in content
        assert "L2" in content
        assert "L3" in content
        assert "L4" in content

    def test_roles_defined(self, content):
        """必须定义 core/premise/outlook"""
        assert "core" in content
        assert "premise" in content
        assert "outlook" in content

    def test_role_level_constraint(self, content):
        """必须定义 role 与 level 的约束关系"""
        assert "约束" in content
