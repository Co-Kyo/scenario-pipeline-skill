"""
Step ② 定向扫描 - Skill 设计验证测试
"""

import os
import re
import pytest


SKILL_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSES_DIR = os.path.join(SKILL_DIR, "processes")


class TestScanFileStructure:
    """验证 02-scan.md 文件结构"""

    @pytest.fixture
    def content(self):
        path = os.path.join(PROCESSES_DIR, "02-scan.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_file_exists(self):
        path = os.path.join(PROCESSES_DIR, "02-scan.md")
        assert os.path.exists(path)

    def test_has_title(self, content):
        assert re.search(r"^# Step", content, re.MULTILINE)

    def test_has_prerequisites(self, content):
        assert "## 前置条件" in content

    def test_references_previous_step_output(self, content):
        """必须引用前序步骤的输出"""
        assert "requirement-web" in content or "partition-analysis" in content

    def test_has_context_isolation(self, content):
        assert "上下文隔离" in content


class TestScanThreePhasePipeline:
    """验证三阶段管道设计"""

    @pytest.fixture
    def content(self):
        path = os.path.join(PROCESSES_DIR, "02-scan.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_phase_a_mentioned(self, content):
        """必须提到 Phase A"""
        assert "Phase A" in content or "阶段 A" in content

    def test_phase_b_mentioned(self, content):
        """必须提到 Phase B"""
        assert "Phase B" in content or "阶段 B" in content

    def test_phase_c_mentioned(self, content):
        """必须提到 Phase C"""
        assert "Phase C" in content or "阶段 C" in content

    def test_parallel_execution(self, content):
        """必须提到并行执行"""
        assert "并行" in content

    def test_raw_materials_output(self, content):
        """必须定义 .raw-materials 输出"""
        assert "raw-materials" in content or "raw_materials" in content
