"""
Layer 2 属性验证测试 — level_weight 分布

验证 requirement-web.json 中 core/premise/outlook 角色分布是否合理。
"""

import pytest


class TestLevelWeightDistribution:
    """验证命题角色分布"""

    def test_core_ratio_in_range(self, sample_requirement_web):
        roles = [p["level_weight"]["role"] for p in sample_requirement_web["propositions"]]
        core_ratio = roles.count("core") / len(roles)
        assert 0.6 <= core_ratio <= 0.9, (
            f"core 占比 {core_ratio:.1%}，不在 60%-90% 范围内"
        )

    def test_all_propositions_have_level_weight(self, sample_requirement_web):
        for p in sample_requirement_web["propositions"]:
            assert "level_weight" in p, f"命题 {p['id']} 缺少 level_weight"
            assert "role" in p["level_weight"], f"命题 {p['id']} 的 level_weight 缺少 role"

    def test_roles_are_valid(self, sample_requirement_web):
        valid_roles = {"core", "premise", "outlook"}
        for p in sample_requirement_web["propositions"]:
            role = p["level_weight"]["role"]
            assert role in valid_roles, f"无效角色: {role}"
