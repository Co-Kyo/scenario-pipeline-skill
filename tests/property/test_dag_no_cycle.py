"""
Layer 2 属性验证测试 — DAG 无环

验证 capability-graph.json 中的依赖关系无环。
"""

import pytest


class TestDAGNoCycle:
    """验证依赖关系 DAG 无环"""

    def test_dependency_dag_no_cycle(self, sample_requirement_web):
        deps = sample_requirement_web["dependencies"]
        remaining = set(deps.keys())
        while remaining:
            no_deps = {n for n in remaining if not (set(deps[n]) & remaining)}
            if not no_deps:
                pytest.fail("依赖关系存在环")
            remaining -= no_deps

    def test_all_dependency_nodes_exist(self, sample_requirement_web):
        deps = sample_requirement_web["dependencies"]
        for node, dep_list in deps.items():
            for dep in dep_list:
                assert dep in deps, f"依赖节点 {dep} 不存在于依赖图中"

    def test_no_self_dependency(self, sample_requirement_web):
        deps = sample_requirement_web["dependencies"]
        for node, dep_list in deps.items():
            assert node not in dep_list, f"节点 {node} 存在自依赖"
