# AI Skill 测试范式：非确定性环境下的测试策略

> 状态：草案
> 创建：2026-06-15
> 关联：testing-strategy.md

## 核心矛盾

| 传统测试 | AI Skill 测试 |
|----------|---------------|
| 确定性：相同输入 → 相同输出 | 非确定性：相同输入 → 多种合理输出 |
| 测试代码 | 测试指令解释行为 |
| 断言精确值 | 断言合理范围 |
| 白盒测试 | 黑盒测试（LLM 是黑盒） |

## 问题一：如何保证测试结果？

### 分析：什么可以测试？

```
┌─────────────────────────────────────────────────────────┐
│  可测试（确定性）                                        │
│  ├── JSON Schema 合法性                                 │
│  ├── 必需字段存在                                       │
│  ├── 文件是否生成                                       │
│  └── 命题数量范围                                       │
├─────────────────────────────────────────────────────────┤
│  可测试（统计性）                                        │
│  ├── 命题是否覆盖主题关键词                              │
│  ├── level_weight 分布是否合理                           │
│  └── 依赖关系是否形成 DAG                               │
├─────────────────────────────────────────────────────────┤
│  不可测试（非确定性）                                    │
│  ├── 具体命题内容                                       │
│  ├── 具体能力描述                                       │
│  └── 具体排序结果                                       │
└─────────────────────────────────────────────────────────┘
```

### 解决方案：三层验证模型

```
Layer 1: 结构验证（100% 确定性）
  ↓ 通过
Layer 2: 属性验证（统计性，可重复运行）
  ↓ 通过
Layer 3: 语义验证（LLM-as-Judge，可选）
  ↓ 通过
= 测试通过
```

#### Layer 1: 结构验证

```python
def test_requirement_web_structure(output):
    """验证 requirement-web.json 结构合法性"""
    # JSON Schema 验证
    validate(output, REQUIREMENT_WEB_SCHEMA)
    
    # 必需字段检查
    assert "context" in output
    assert "propositions" in output
    assert "dependencies" in output
    assert len(output["propositions"]) >= 3  # 至少 3 个命题
```

**特点**：100% 确定性，每次都一样。

#### Layer 2: 属性验证

```python
def test_propositions_cover_topic(output, topic):
    """验证命题覆盖主题关键词"""
    all_names = " ".join(p["name"] for p in output["propositions"])
    all_descs = " ".join(p["description"] for p in output["propositions"])
    combined = all_names + " " + all_descs
    
    # 每个关键词至少出现一次（允许不同表述）
    for keyword in topic:
        assert keyword.lower() in combined.lower(), \
            f"关键词 '{keyword}' 未被任何命题覆盖"

def test_dependency_is_dag(output):
    """验证依赖关系形成 DAG（无环）"""
    deps = output["dependencies"]
    # 拓扑排序验证...
```

**特点**：统计性，可能偶尔失败（flaky），但大部分情况通过。

#### Layer 3: 语义验证（LLM-as-Judge）

```python
def test_propositions_quality(output, context):
    """用 LLM 评估命题质量（可选）"""
    prompt = f"""
    评估以下命题列表的质量：
    目标：{context['target_level']} 年经验候选人
    命题：{output['propositions']}
    
    评估维度：
    1. 命题是否适合目标经验水平？
    2. 命题是否覆盖核心知识点？
    3. 命题难度分布是否合理？
    
    返回 JSON：{{"pass": true/false, "reason": "..."}}
    """
    result = call_llm(prompt)
    assert result["pass"], result["reason"]
```

**特点**：非确定性，需要多次运行或设置宽松阈值。

### 测试执行策略

```bash
# 结构验证（每次必跑）
pytest tests/ -m "structure"

# 属性验证（CI 必跑，本地可选）
pytest tests/ -m "property"

# 语义验证（仅手动触发）
pytest tests/ -m "semantic" --count=3  # 运行 3 次，2/3 通过即可
```

### Flaky 测试处理

```python
@pytest.mark.flaky(reruns=2, reruns_delay=1)
def test_something_nondeterministic():
    """非确定性测试，自动重试"""
    pass
```

或使用统计方式：

```python
def test_statistical_pass_rate():
    """多次运行，通过率 > 80% 即可"""
    results = [run_test() for _ in range(10)]
    pass_rate = sum(results) / len(results)
    assert pass_rate >= 0.8
```

---

## 问题二：测试变更如何快速触发实现更新？

### 分析：当前流程

```
当前：测试变更 → 人工阅读 → 手动修改 processes/*.md → 慢
目标：测试变更 → 自动生成 patch 提示 → LLM 修改 → 快
```

### 解决方案：Test-to-Patch Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│  1. 测试失败                                                 │
│     ↓                                                       │
│  2. 失败分析器（parse failure reason）                       │
│     ↓                                                       │
│  3. 上下文收集器（读取相关 processes/*.md + 测试文件）        │
│     ↓                                                       │
│  4. Patch Prompt 生成器                                     │
│     ↓                                                       │
│  5. LLM 生成 patch 建议                                     │
│     ↓                                                       │
│  6. 人工确认 / 自动应用                                     │
│     ↓                                                       │
│  7. 重新运行测试验证                                         │
└─────────────────────────────────────────────────────────────┘
```

### 实现细节

#### 1. 失败分析器

```python
# scripts/analyze-test-failures.py
def analyze_failure(test_result):
    """解析测试失败原因"""
    return {
        "test_name": test_result.nodeid,
        "failure_type": classify_failure(test_result),  # structure/property/semantic
        "expected": extract_expected(test_result),
        "actual": extract_actual(test_result),
        "related_process": map_test_to_process(test_result.nodeid),
    }
```

#### 2. Patch Prompt 模板

```markdown
# tests/PATCH_TEMPLATE.md

## 测试失败信息

- 测试：{test_name}
- 失败类型：{failure_type}
- 预期：{expected}
- 实际：{actual}

## 相关 Skill 文件

{processes_content}

## 任务

请修改上述 Skill 文件，使测试通过。

约束：
1. 只修改必要的部分
2. 保持 Markdown 格式
3. 不要破坏其他功能
4. 说明修改理由

## 输出格式

```diff
--- a/processes/00-brainstorm.md
+++ b/processes/00-brainstorm.md
@@ -XX, +XX @@
- 旧内容
+ 新内容
```
```

#### 3. 自动化脚本

```bash
# scripts/trigger-patch.sh
#!/bin/bash

# 1. 运行测试，收集失败
pytest tests/ --tb=json > test-results.json

# 2. 分析失败
python scripts/analyze-test-failures.py test-results.json > failures.md

# 3. 生成 patch prompt
python scripts/generate-patch-prompt.py failures.md > patch-prompt.md

# 4. 调用 LLM（交互式）
echo "请查看 patch-prompt.md，然后运行："
echo "  mimo '请根据 tests/PATCH_TEMPLATE.md 修改 Skill'"
```

#### 4. AGENTS.md 集成

```markdown
## 测试驱动开发流程

当测试失败时：

1. 运行 `pytest tests/ --tb=short` 查看失败详情
2. 阅读失败测试的文档字符串（= 需求说明）
3. 修改对应的 `processes/{step}-xxx.md`
4. 重新运行测试验证

快速修复命令：
```bash
pytest tests/ -x --tb=short  # 遇到第一个失败就停止
```
```

### 工作流示例

```
场景：调整"跳过逻辑"的行为

1. 修改测试：
   # tests/unit/test_00_brainstorm.py
   def test_skip_when_all_conditions_met(self):
       """场景：webpack vite 3年经验 web平台 → 可跳过
       Given: topic 包含具体工具名
       When:  系统解析输入
       Then:  判断为可跳过，生成轻量骨架
       """
       # 新增：必须同时指定 platform 才能跳过
       assert can_skip("webpack vite 3年", platform="web") == True
       assert can_skip("webpack vite 3年") == False  # 新增

2. 运行测试，确认失败：
   $ pytest tests/unit/test_00_brainstorm.py::TestSkipLogic -v
   FAILED: test_skip_when_all_conditions_met

3. 触发 patch：
   $ python scripts/trigger-patch.sh
   # 或直接告诉 agent：
   # "测试 test_skip_when_all_conditions_met 失败了，
   #  请修改 processes/00-brainstorm.md 使测试通过"

4. Agent 修改 Skill：
   # processes/00-brainstorm.md
   - **跳过条件（必须同时满足全部 3 项）**
   + **跳过条件（必须同时满足全部 4 项）**
     1. topic 明确
     2. year 已推断
     3. platform 已指定
   + 4. 无场景化关键词

5. 重新运行测试，确认通过
```

---

## 总结：两个问题的答案

### Q1: 如何保证测试结果？

**不保证确定性结果，而是保证「合理范围内的正确性」。**

- Layer 1（结构）：100% 确定性
- Layer 2（属性）：统计性，允许偶尔失败
- Layer 3（语义）：LLM-as-Judge，多次运行取多数

### Q2: 测试变更如何快速触发实现更新？

**Test-to-Patch Pipeline + Agent 协作。**

```
测试失败 → 失败分析 → Patch Prompt → LLM 修改 → 验证
```

关键：测试文件本身就是需求文档，LLM 可以直接理解测试意图并生成修复建议。
