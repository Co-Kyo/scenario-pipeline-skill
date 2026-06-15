"""
pytest fixtures for scenario-pipeline tests.

这些 fixtures 提供测试所需的基础设施：
- workDir: 临时工作目录（每个测试独立）
- sample_data: 标准测试数据
- skill_dir: skill 仓库根目录
"""

import os
import pytest
import tempfile
import shutil


@pytest.fixture
def skill_dir():
    """Skill 仓库根目录（tests/ 的上两级）"""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture
def workDir():
    """临时工作目录，测试结束后自动清理"""
    temp_dir = tempfile.mkdtemp(prefix="sp-test-")
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def sample_raw_input():
    """标准用户输入样本"""
    return "3-5年前端web开发经验的候选人应该掌握的webpack&vite知识点"


@pytest.fixture
def sample_context():
    """标准上下文样本（头脑风暴后）"""
    return {
        "domain": "前端构建工具",
        "domain_up": "前端工程化",
        "target_level": "L2",
        "year": "L2",
        "year_source": "inferred: 用户原文含'3-5年'，显式匹配 → L2",
        "platform": "web",
        "tech_stack": ["webpack", "vite"],
    }


@pytest.fixture
def sample_propositions():
    """标准命题列表样本"""
    return [
        {
            "id": "RW-P1",
            "name": "Webpack 模块解析与打包原理",
            "description": "从入口文件到产物的完整打包链路",
            "depth": "原理",
            "search_priority": "high",
            "level_weight": {"level": "L2", "role": "core"},
        },
        {
            "id": "RW-P2",
            "name": "Vite 开发服务器与 HMR 机制",
            "description": "基于 ESM 的开发服务器和热更新",
            "depth": "原理",
            "search_priority": "high",
            "level_weight": {"level": "L2", "role": "core"},
        },
    ]


@pytest.fixture
def sample_requirement_web(sample_context, sample_propositions):
    """标准 requirement-web.json 样本"""
    return {
        "generated_at": "2026-06-15T12:00:00Z",
        "raw_input": "3-5年前端web开发经验的候选人应该掌握的webpack&vite知识点",
        "context": sample_context,
        "strategy": {
            "core_label": "方案攻克",
            "premise_label": "概念确认",
            "outlook_label": "决策方向",
            "ratios": {"premise": "10-15%", "core": "70-80%", "outlook": "5-10%"},
        },
        "propositions": sample_propositions,
        "dependencies": {"RW-P1": [], "RW-P2": ["RW-P1"]},
        "capability_web": {},
    }
