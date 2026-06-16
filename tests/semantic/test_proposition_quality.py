"""
Layer 3: 命题质量语义验证

使用 agent 框架的子 agent 能力评估命题质量。
"""

import pytest


class TestPropositionQuality:
    """命题质量评估"""

    @pytest.fixture
    def evaluation_prompt(self):
        return """你是命题质量评审专家。请评估以下命题列表的质量。

评估维度：
1. 命题是否适合目标经验水平？
2. 命题是否覆盖核心知识点？
3. 命题难度分布是否合理？
4. 命题之间是否有重叠或遗漏？

返回 JSON 格式：
{
    "pass": true/false,
    "score": 1-10,
    "issues": ["问题1", "问题2"],
    "suggestions": ["建议1", "建议2"]
}"""

    def test_proposition_quality_L2(self, sample_requirement_web):
        """
        场景：L2 经验水平的命题质量评估

        Given: 一个 L2 级别的 requirement-web.json
        When:  评估命题质量
        Then:  命题应适合 3-5 年经验工程师，覆盖核心知识点

        注意：此测试需要 agent 框架支持，当前标记为跳过
        """
        pytest.skip("需要 agent 框架支持子 agent 调用")

    def test_no_duplicate_propositions(self, sample_requirement_web):
        """
        场景：命题无重复

        Given: 一个 requirement-web.json
        When:  检查命题名称
        Then:  无重复的命题名称
        """
        names = [p["name"] for p in sample_requirement_web["propositions"]]
        assert len(names) == len(set(names)), f"存在重复命题: {[n for n in names if names.count(n) > 1]}"

    def test_proposition_has_required_fields(self, sample_requirement_web):
        """
        场景：命题包含必需字段

        Given: 一个 requirement-web.json
        When:  检查每个命题
        Then:  每个命题都有 id、name、description、level_weight
        """
        required_fields = ["id", "name", "description", "level_weight"]
        for p in sample_requirement_web["propositions"]:
            for field in required_fields:
                assert field in p, f"命题 {p.get('id', '?')} 缺少字段: {field}"
