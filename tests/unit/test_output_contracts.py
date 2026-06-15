"""
meta/output-contracts.md - 输出契约验证测试
"""

import os
import re
import pytest


SKILL_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
META_DIR = os.path.join(SKILL_DIR, "meta")


class TestOutputContractsStructure:
    """验证 output-contracts.md 文件结构"""

    @pytest.fixture
    def content(self):
        path = os.path.join(META_DIR, "output-contracts.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_file_exists(self):
        path = os.path.join(META_DIR, "output-contracts.md")
        assert os.path.exists(path)

    def test_has_title(self, content):
        assert "# 输出契约" in content


class TestOutputContractsSections:
    """验证输出契约的章节定义"""

    @pytest.fixture
    def content(self):
        path = os.path.join(META_DIR, "output-contracts.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_has_section_0(self, content):
        """必须有 §0（requirement-web.json）"""
        assert "§0" in content or "requirement-web" in content

    def test_has_section_1(self, content):
        """必须有 §1（scan 输出）"""
        assert "§1" in content or "scan" in content.lower()

    def test_has_json_examples(self, content):
        """必须包含 JSON 示例"""
        assert "```json" in content

    def test_defines_output_paths(self, content):
        """必须定义输出路径"""
        assert "workDir" in content or "路径" in content
