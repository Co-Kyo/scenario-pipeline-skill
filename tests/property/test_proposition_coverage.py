"""
Layer 2 属性验证测试 — 命题覆盖度

验证 requirement-web.json 中的命题是否覆盖主题关键词。
"""

import pytest


class TestPropositionCoverage:
    """验证命题对主题关键词的覆盖度"""

    @pytest.fixture
    def topic(self):
        return ["webpack", "vite"]

    def test_propositions_cover_topic(self, sample_requirement_web, topic):
        all_text = " ".join(
            p["name"] + " " + p["description"]
            for p in sample_requirement_web["propositions"]
        )
        for keyword in topic:
            assert keyword.lower() in all_text.lower(), (
                f"命题未覆盖主题关键词: {keyword}"
            )

    def test_propositions_not_empty(self, sample_requirement_web):
        assert len(sample_requirement_web["propositions"]) > 0

    def test_propositions_have_names(self, sample_requirement_web):
        for p in sample_requirement_web["propositions"]:
            assert "name" in p and p["name"]
