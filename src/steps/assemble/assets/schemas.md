# assemble 产出格式

## 产出文件

每命题产出以下文件：

- `{workDir}/{seq}-{short_name}/overview.md`
- `{workDir}/{seq}-{short_name}/edge-cases.md`
- `{workDir}/{seq}-{short_name}/trade-offs.md`
- `{workDir}/{seq}-{short_name}/references.md`
- `{workDir}/{seq}-{short_name}/experiment/README.md`
- `{workDir}/{seq}-{short_name}/experiment/src/`

## overview.md 模板

```markdown
# {proposition_name} — Overview

## 链路编排
（按数据流顺序排列涉及的能力，形成完整链路）

## 核心机制
（引用各能力的 mechanism_summary，补充命题特有的上下文）

## 场景化输入
1. [具体场景输入]
2. [具体场景输入]
3. [具体场景输入]

## 验证点
1. [验证方法]
2. [验证方法]
3. [验证方法]
```

## edge-cases.md 模板

```markdown
# {proposition_name} — Edge Cases

## P0 坑点
- **[坑点名称]**：[触发条件] → [表现症状] → [解决方案]
  - 来源：{capability_id} - {bottleneck_name}
  - 筛选_trace：[候选来源] [排除项] [保留理由]

## P1 坑点
...

## 边界清单
1. [边界条件]
2. [边界条件]
3. [边界条件]
```

## trade-offs.md 模板

```markdown
# {proposition_name} — Trade-offs

## 方案对比

| 方案 | 优点 | 缺点 | 适用场景 | 涉及能力 |
|------|------|------|---------|---------|
| 方案 A | ... | ... | ... | ... |
| 方案 B | ... | ... | ... | ... |

## 场景化取舍
- [限定词/约束] → [方案选择] → [验证方式]
```

## references.md 模板

```markdown
# {proposition_name} — References

## T0（直接信任）
- [标题](URL)

## T1（大厂博客）
...

## T2（优质社区）
...

## T3（其他）
...
```

## 内容比例与 Trace

- 通用高地 ≤70%
- 场景化/特化内容 ≥30%
- 每个命题至少 3 个场景化输入、3 个边界、3 个验证点
- 每个命题目录写入 `_assembly_ratio_trace.json`：

```json
{
  "proposition_id": "RW-P1",
  "generic_pct": 65,
  "scenario_pct": 35,
  "scenario_inputs": 3,
  "boundaries": 3,
  "verifications": 3,
  "trace": {
    "overview_lines": 120,
    "edge_cases_lines": 80,
    "tradeoffs_lines": 60
  }
}
```

## experiment/README.md 必含

- **预期结果**：运行后应观察到什么（可观察、可对照）
- **成功判据**：判定实验通过的二值标准
- **失败含义**：实验失败说明哪个假设不成立，以及下一步回退到哪个能力的 §最小验证实验
