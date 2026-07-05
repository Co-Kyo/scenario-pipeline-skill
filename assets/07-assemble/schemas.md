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
```

## trade-offs.md 模板

```markdown
# {proposition_name} — Trade-offs

## 方案对比

| 方案 | 优点 | 缺点 | 适用场景 | 涉及能力 |
|------|------|------|---------|---------|
| 方案 A | ... | ... | ... | ... |
| 方案 B | ... | ... | ... | ... |
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
