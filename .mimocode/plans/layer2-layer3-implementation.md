# Layer 2 & Layer 3 测试实现规划

## 现状

- Layer 1（结构验证）：166 个测试，全部通过
- Layer 2（属性验证）：未实现
- Layer 3（语义验证）：未实现

## Layer 2：属性验证

### 目标

验证 Skill 产出的"属性"是否合理，不是精确匹配，而是统计性验证。

### 测试用例

| 测试 | 输入 | 验证属性 | 方法 |
|------|------|----------|------|
| 命题覆盖度 | requirement-web.json | 命题覆盖主题关键词 | grep 关键词 |
| DAG 无环 | capability-graph.json | 依赖关系无环 | 拓扑排序 |
| level_weight 分布 | requirement-web.json | core 占比 60-90% | 统计计数 |
| _trace 完整性 | 所有 JSON | 关键决策有 _trace | 字段检查 |

### 实现

```python
# tests/property/test_proposition_coverage.py
def test_propositions_cover_topic(requirement_web, topic):
    """命题必须覆盖主题关键词"""
    all_text = " ".join(p["name"] + p["description"] for p in requirement_web["propositions"])
    for keyword in topic:
        assert keyword in all_text
```

## Layer 3：语义验证（LLM-as-Judge）

### 目标

用 LLM 评估 Skill 产出的质量，不是精确匹配，而是语义判断。

### 测试用例

| 测试 | 输入 | 评估维度 | 方法 |
|------|------|----------|------|
| 命题质量 | requirement-web.json | 命题是否适合目标经验水平 | LLM prompt |
| 能力描述准确性 | capability-graph.json | 能力描述是否准确 | LLM prompt |
| 学习阶梯合理性 | learning-ladder.md | 学习路径是否合理 | LLM prompt |

### 实现

```python
# tests/semantic/test_proposition_quality.py
def test_proposition_quality(requirement_web, target_level):
    """命题质量评估"""
    prompt = f"""
    评估以下命题列表：
    目标：{target_level} 年经验
    命题：{requirement_web['propositions']}
    
    评估维度：
    1. 是否适合目标经验水平？
    2. 是否覆盖核心知识点？
    3. 难度分布是否合理？
    
    返回 JSON：{{"pass": true/false, "reason": "..."}}
    """
    result = call_llm(prompt)
    assert result["pass"]
```

## 实现顺序

1. **Layer 2 优先** — 确定性高，价值大
   - 命题覆盖度测试
   - DAG 无环测试
   - level_weight 分布测试

2. **Layer 3 后做** — 非确定性，需要 LLM 调用
   - 命题质量评估
   - 能力描述准确性
   - 学习阶梯合理性

## 依赖

- Layer 2：pytest + json 模块
- Layer 3：pytest + LLM API（可选）

## 验证方式

- Layer 2：运行 pytest，统计通过率
- Layer 3：运行 pytest，多次运行取多数
