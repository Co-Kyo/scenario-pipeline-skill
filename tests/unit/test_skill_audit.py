"""
Skill 审计规则验证测试

验证 processes/*.md 是否符合 what&how 纯净度和 _trace 规范。
"""

import os
import re
import pytest


SKILL_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSES_DIR = os.path.join(SKILL_DIR, "processes")
CORE_DIR = os.path.join(SKILL_DIR, "core")


class TestWhatHowPurity:
    """验证执行文件只含 what & how，不含 why"""

    # why 的特征词
    WHY_PATTERNS = [
        r"设计理念",
        r"设计理由",
        r"选择.*是因为",
        r"原方案是.*改为",
        r"性能.*对比",
        r"旧方案.*新方案",
        r"该.*是否真的",
        r"本.*定义的是",
        r"之所以",
    ]

    @pytest.fixture
    def process_files(self):
        files = []
        for f in os.listdir(PROCESSES_DIR):
            if f.endswith(".md"):
                files.append(os.path.join(PROCESSES_DIR, f))
        return files

    def test_no_design_philosophy(self, process_files):
        """执行文件不应包含设计哲学"""
        violations = []
        for filepath in process_files:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            for pattern in self.WHY_PATTERNS:
                matches = re.finditer(pattern, content)
                for match in matches:
                    violations.append(f"{os.path.basename(filepath)}: {match.group()}")
        
        assert not violations, f"发现 why 泄漏:\n" + "\n".join(violations[:5])

    def test_has_trace_fields_in_shared_conventions(self):
        """shared-conventions.md 必须定义 _trace 字段清单"""
        path = os.path.join(CORE_DIR, "shared-conventions.md")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        assert "_trace" in content


class TestTraceField规范:
    """验证 _trace 字段规范"""

    @pytest.fixture
    def shared_conventions_content(self):
        path = os.path.join(CORE_DIR, "shared-conventions.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_trace清单存在(self, shared_conventions_content):
        """必须有 _trace 字段清单"""
        assert "需要加 _trace 的字段清单" in shared_conventions_content

    def test_trace三要素定义(self, shared_conventions_content):
        """必须定义 _trace 三要素"""
        assert "输入数据" in shared_conventions_content or "输入" in shared_conventions_content
        assert "判定标准" in shared_conventions_content or "标准" in shared_conventions_content
        assert "选择理由" in shared_conventions_content or "理由" in shared_conventions_content

    def test_trace步骤覆盖(self, shared_conventions_content):
        """必须指定哪些步骤需要 _trace"""
        assert "brainstorm" in shared_conventions_content.lower() or "scan" in shared_conventions_content.lower()
