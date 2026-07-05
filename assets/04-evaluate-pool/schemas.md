# evaluations.json 结构定义

## 路径

`{workDir}/.meta/evaluations.json`

## JSON Schema

```json
{
  "generated_at": "2026-05-20T10:00:00Z",
  "evaluations": [
    {
      "proposition_id": "P1",
      "proposition": "长列表渲染：如何在万级数据量下保持流畅滚动",
      "scores": {
        "cross_stack_coupling": 3,
        "doc_vacuum": 2,
        "experience_barrier": 3,
        "topical_heat": 2
      },
      "total_score": 10,
      "priority": "high",
      "priority_trace": "总分10（跨栈耦合3+文档真空2+经验壁垒3+时事热度2），阈值判定（L2：≥6→high）：10≥6 → high",
      "reasoning": "跨栈耦合高（涉及浏览器+工程层），文档真空中等（MDN 有但不够深入），经验壁垒高（需要实战积累），热度中等",
      "difficulty": "medium",
      "difficulty_reason": "涉及能力依赖链深度2层（A5→A3→A1），需理解渲染管线和DOM生命周期两个技术层",
      "recommended_order": 2,
      "prerequisite_of": []
    }
  ],
  "summary": { "high": 1, "medium": 0, "rejected": 0 }
}
```

## 字段说明

| 字段 | 含义 |
|------|------|
| `scores` | 四维评分（跨栈耦合/文档真空/经验壁垒/时事热度，1-3 分） |
| `total_score` | 四维之和 |
| `priority` | 优先级（high/medium/rejected） |
| `priority_trace` | 优先级判定依据（含年限阈值适配） |
| `difficulty` | 学习难度（low/medium/high） |
| `difficulty_reason` | 难度来源说明 |
| `recommended_order` | 推荐学习序号 |

## 说明

- `difficulty`（low/medium/high）：基于能力依赖链深度、知识跨度、概念抽象度的综合评估
- `difficulty_reason`：一句话说明主要难度来源
- `recommended_order`：推荐学习序号（low→medium→high，同级内按依赖关系排序）
- `priority_trace`：必须包含年限阈值适配信息（如"L2：≥6→high"）
