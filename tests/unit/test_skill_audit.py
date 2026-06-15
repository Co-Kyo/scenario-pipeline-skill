"""
Skill 审计规则验证测试

验证 processes/*.md 是否符合 what&how 纯净度和 _trace 规范。
覆盖 dev/tools/skill-audit-rules.md 和 dev/tools/decision-replay.md 的规则。
"""

import os
import re
import pytest


SKILL_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSES_DIR = os.path.join(SKILL_DIR, "processes")
CORE_DIR = os.path.join(SKILL_DIR, "core")
META_DIR = os.path.join(SKILL_DIR, "meta")


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


class TestDecisionReplayCoverage:
    """验证 decision-replay 所需的埋点覆盖"""

    @pytest.fixture
    def shared_conventions_content(self):
        path = os.path.join(CORE_DIR, "shared-conventions.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_year_inference_trace定义(self, shared_conventions_content):
        """必须定义 year_inference_trace"""
        assert "year_inference_trace" in shared_conventions_content

    def test_source_tier_trace定义(self, shared_conventions_content):
        """必须定义 source_tier 相关的 _trace"""
        assert "source_tier" in shared_conventions_content

    def test_dependencies_trace定义(self, shared_conventions_content):
        """必须定义 dependencies_trace"""
        assert "dependencies_trace" in shared_conventions_content

    def test_merge_trace定义(self, shared_conventions_content):
        """必须定义 merge_trace"""
        assert "merge_trace" in shared_conventions_content

    def test_priority_trace定义(self, shared_conventions_content):
        """必须定义 priority_trace"""
        assert "priority_trace" in shared_conventions_content


class TestTraceInProcessFiles:
    """验证 process 文件中 _trace 的实际使用"""

    @pytest.fixture
    def process_files_with_trace(self):
        """返回包含 _trace 的 process 文件"""
        result = []
        for f in os.listdir(PROCESSES_DIR):
            if f.endswith(".md"):
                path = os.path.join(PROCESSES_DIR, f)
                with open(path, "r", encoding="utf-8") as fh:
                    content = fh.read()
                if "_trace" in content:
                    result.append((f, content))
        return result

    def test_trace_has_examples(self, process_files_with_trace):
        """包含 _trace 的文件必须有示例"""
        missing = []
        for filename, content in process_files_with_trace:
            if "_trace" in content and "示例" not in content and "example" not in content.lower():
                missing.append(filename)
        
        assert not missing, f"以下文件有 _trace 但无示例: {missing}"


class TestOutputContractsCompleteness:
    """验证 output-contracts.md 覆盖所有步骤"""

    @pytest.fixture
    def content(self):
        path = os.path.join(META_DIR, "output-contracts.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_has_section_0(self, content):
        """必须有 §0（requirement-web）"""
        assert "§0" in content

    def test_has_section_1(self, content):
        """必须有 §1（scan）"""
        assert "§1" in content

    def test_has_section_2(self, content):
        """必须有 §2（capability-graph）"""
        assert "§2" in content

    def test_has_section_3(self, content):
        """必须有 §3（evaluate）"""
        assert "§3" in content

    def test_has_section_4(self, content):
        """必须有 §4（capability-research）"""
        assert "§4" in content
