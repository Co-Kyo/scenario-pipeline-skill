"""
Step ① 依赖整理与分区 - Skill 设计验证测试
"""

import os
import re
import pytest


SKILL_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSES_DIR = os.path.join(SKILL_DIR, "processes")


class TestPartitionFileStructure:
    """验证 01-partition.md 文件结构"""

    @pytest.fixture
    def content(self):
        path = os.path.join(PROCESSES_DIR, "01-partition.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_file_exists(self):
        path = os.path.join(PROCESSES_DIR, "01-partition.md")
        assert os.path.exists(path)

    def test_has_title(self, content):
        assert re.search(r"^# Step", content, re.MULTILINE)

    def test_has_prerequisites(self, content):
        assert "## 前置条件" in content

    def test_references_previous_step_output(self, content):
        """必须引用 Step 00 的输出"""
        assert "requirement-web" in content

    def test_has_context_isolation(self, content):
        assert "上下文隔离" in content


class TestPartitionDependencies:
    """验证依赖整理功能设计"""

    @pytest.fixture
    def content(self):
        path = os.path.join(PROCESSES_DIR, "01-partition.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_dag_mentioned(self, content):
        """必须提到 DAG"""
        assert "DAG" in content or "依赖图" in content

    def test_dependency_direction_defined(self, content):
        """必须定义依赖方向"""
        assert "依赖" in content

    def test_cycle_detection_mentioned(self, content):
        """必须提到环检测"""
        assert "环" in content or "循环" in content


class TestPartitionSchema:
    """验证分区 Schema 设计"""

    @pytest.fixture
    def content(self):
        path = os.path.join(PROCESSES_DIR, "01-partition.md")
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def test_partition_output_defined(self, content):
        """必须定义分区输出"""
        assert "partition-analysis" in content

    def test_three_layer_partition(self, content):
        """必须提到三层分区"""
        assert "连通分量" in content or "社区" in content

    def test_execution_plan_output(self, content):
        """必须定义执行计划输出"""
        assert "execution-plan" in content
