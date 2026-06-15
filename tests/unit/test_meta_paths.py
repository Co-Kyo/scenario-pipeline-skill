"""
meta/paths.md - 路径约定验证测试

验证 Skill 的路径约定是否完整、一致。
"""

import os
import re
import pytest


SKILL_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
META_DIR = os.path.join(SKILL_DIR, "meta")


class TestPathsFileStructure:
    """验证 paths.md 文件结构"""

    @pytest.fixture
    def content(self):
        path = os.path.join(META_DIR, "paths.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_file_exists(self):
        path = os.path.join(META_DIR, "paths.md")
        assert os.path.exists(path)

    def test_has_title(self, content):
        assert "# 路径约定" in content

    def test_has_root_definitions(self, content):
        """必须定义根目录占位符"""
        assert "{skillDir}" in content or "skillDir" in content
        assert "{workDir}" in content or "workDir" in content


class TestSkillDirDefinition:
    """验证 {skillDir} 定义"""

    @pytest.fixture
    def content(self):
        path = os.path.join(META_DIR, "paths.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_skill_dir_defined(self, content):
        """必须定义 {skillDir}"""
        assert "skillDir" in content

    def test_skill_dir_meaning(self, content):
        """必须说明 {skillDir} 含义"""
        assert "SKILL.md" in content


class TestWorkDirDefinition:
    """验证 {workDir} 定义"""

    @pytest.fixture
    def content(self):
        path = os.path.join(META_DIR, "paths.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_work_dir_defined(self, content):
        """必须定义 {workDir}"""
        assert "workDir" in content

    def test_work_dir_confirmation(self, content):
        """必须说明 {workDir} 需要用户确认"""
        assert "确认" in content or "用户" in content


class TestCorePaths:
    """验证核心路径定义"""

    @pytest.fixture
    def content(self):
        path = os.path.join(META_DIR, "paths.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_capabilities_path(self, content):
        """必须定义能力路径"""
        assert "capabilities" in content

    def test_proposition_path(self, content):
        """必须定义命题路径"""
        assert "seq" in content or "命题" in content

    def test_meta_paths(self, content):
        """必须定义 .meta 内部路径"""
        assert ".meta" in content

    def test_checkpoint_path(self, content):
        """必须定义检查点路径"""
        assert "checkpoint" in content or "barrier" in content


class TestNamingRules:
    """验证命名规则"""

    @pytest.fixture
    def content(self):
        path = os.path.join(META_DIR, "paths.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_proposition_numbering(self, content):
        """必须定义命题序号规则"""
        assert "序号" in content or "编号" in content

    def test_capability_id_format(self, content):
        """必须定义能力 ID 格式"""
        assert "能力 ID" in content or "A1" in content

    def test_two_digit_format(self, content):
        """命题序号必须是两位数字"""
        assert "01" in content or "两位" in content
