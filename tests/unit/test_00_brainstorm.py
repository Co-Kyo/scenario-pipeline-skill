"""
Step ⓪ 头脑风暴 - Skill 设计验证测试

本测试验证 Skill 的 Markdown 设计是否完整、一致。
不是验证 AI 执行结果，而是验证「说明书」本身的质量。
"""

import os
import re
import pytest


SKILL_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSES_DIR = os.path.join(SKILL_DIR, "processes")


class TestBrainstormFileStructure:
    """验证 00-brainstorm.md 文件结构完整性"""

    @pytest.fixture
    def brainstorm_content(self):
        path = os.path.join(PROCESSES_DIR, "00-brainstorm.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_file_exists(self):
        """Skill 必须包含头脑风暴步骤定义"""
        path = os.path.join(PROCESSES_DIR, "00-brainstorm.md")
        assert os.path.exists(path), f"文件不存在: {path}"

    def test_has_title(self, brainstorm_content):
        """必须有步骤标题"""
        assert re.search(r"^# Step", brainstorm_content, re.MULTILINE)

    def test_has_purpose_section(self, brainstorm_content):
        """必须有「目的」章节"""
        assert "## 目的" in brainstorm_content

    def test_has_prerequisites_section(self, brainstorm_content):
        """必须有「前置条件」章节"""
        assert "## 前置条件" in brainstorm_content

    def test_has_io_section(self, brainstorm_content):
        """必须有「输入」和「输出」章节"""
        assert "## 输入" in brainstorm_content
        assert "## 输出" in brainstorm_content

    def test_prerequisites_list_files(self, brainstorm_content):
        """前置条件必须列出需要加载的文件"""
        assert re.search(r"(⛔|加载)", brainstorm_content)

    def test_context_isolation_declaration(self, brainstorm_content):
        """前置条件必须声明上下文隔离规则"""
        assert "上下文隔离" in brainstorm_content
        assert "允许读取" in brainstorm_content
        assert "禁止读取" in brainstorm_content

    def test_has_execution_steps(self, brainstorm_content):
        """必须有执行步骤"""
        assert "## 执行步骤" in brainstorm_content

    def test_references_shared_conventions(self, brainstorm_content):
        """必须引用 shared-conventions.md"""
        assert "shared-conventions" in brainstorm_content


class TestYearInferenceDesign:
    """验证年限推断功能在 Skill 中有定义"""

    @pytest.fixture
    def brainstorm_content(self):
        path = os.path.join(PROCESSES_DIR, "00-brainstorm.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_year_inference_mentioned(self, brainstorm_content):
        """必须提到年限推断"""
        assert "年限" in brainstorm_content or "year" in brainstorm_content.lower()

    def test_year_levels_defined(self, brainstorm_content):
        """必须定义 L1-L4 等级"""
        assert "L1" in brainstorm_content
        assert "L2" in brainstorm_content
        assert "L3" in brainstorm_content
        assert "L4" in brainstorm_content

    def test_inference_priority_defined(self, brainstorm_content):
        """必须定义推断优先级"""
        assert "优先级" in brainstorm_content

    def test_default_level_defined(self, brainstorm_content):
        """必须定义默认等级"""
        assert "默认" in brainstorm_content


class TestSkipLogicDesign:
    """验证跳过逻辑在 Skill 中有定义"""

    @pytest.fixture
    def brainstorm_content(self):
        path = os.path.join(PROCESSES_DIR, "00-brainstorm.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_skip_conditions_mentioned(self, brainstorm_content):
        """必须提到跳过条件"""
        assert "跳过" in brainstorm_content

    def test_topic_clarity_defined(self, brainstorm_content):
        """必须定义 topic 明确度判定"""
        assert "topic" in brainstorm_content.lower() or "主题" in brainstorm_content

    def test_year_condition_defined(self, brainstorm_content):
        """必须定义 year 条件"""
        assert "year" in brainstorm_content.lower() or "年限" in brainstorm_content

    def test_platform_condition_defined(self, brainstorm_content):
        """必须定义 platform 条件"""
        assert "platform" in brainstorm_content.lower() or "平台" in brainstorm_content


class TestDimensionAgentsDesign:
    """验证 4 维度 Agent 设计"""

    @pytest.fixture
    def brainstorm_content(self):
        path = os.path.join(PROCESSES_DIR, "00-brainstorm.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_four_dimensions_mentioned(self, brainstorm_content):
        """必须提到 4 个维度"""
        dimensions = ["场景", "技术", "学习", "约束"]
        found = sum(1 for d in dimensions if d in brainstorm_content)
        assert found >= 3, f"只找到 {found}/4 个维度"

    def test_parallel_execution_mentioned(self, brainstorm_content):
        """必须提到并行执行"""
        assert "并行" in brainstorm_content

    def test_agent_convergence_mentioned(self, brainstorm_content):
        """必须提到收敛/整合"""
        assert "收敛" in brainstorm_content or "整合" in brainstorm_content


class TestOutputFormatDesign:
    """验证输出格式在 Skill 中有定义"""

    @pytest.fixture
    def brainstorm_content(self):
        path = os.path.join(PROCESSES_DIR, "00-brainstorm.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_output_file_mentioned(self, brainstorm_content):
        """必须提到输出文件"""
        assert "requirement-web.json" in brainstorm_content

    def test_json_format_mentioned(self, brainstorm_content):
        """必须提到 JSON 格式"""
        assert "json" in brainstorm_content.lower()

    def test_json_example_provided(self, brainstorm_content):
        """必须提供 JSON 示例"""
        assert "```json" in brainstorm_content

    def test_key_fields_documented(self, brainstorm_content):
        """必须记录关键字段"""
        key_fields = ["propositions", "dependencies", "context"]
        found = sum(1 for f in key_fields if f in brainstorm_content)
        assert found >= 2, f"只找到 {found}/3 个关键字段"
