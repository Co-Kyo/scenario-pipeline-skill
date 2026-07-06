# Step 04 输出格式

## §0: capabilities.md — 能力知识库主文件

> 见 `assets/06-capability-research/schemas.md`

## §1: capability-graph.json

**路径**：`{workDir}/.meta/capability-graph.json`

**内容**：能力列表 + 限定词注入分析。`dependency_graph`、`highgrounds`、`learning_path` 已拆分到独立文件。

```json
{
  "generated_at": "2026-05-20T10:00:00Z",
  "total_capabilities": 3,
  "total_propositions": 2,
  "overload": false,
  "qualifier_injection": {
    "React": {
      "injects": ["R1-React渲染架构"],
      "replaces": []
    }
  },
  "capabilities": [
    {
      "id": "A1",
      "name": "浏览器渲染管线",
      "layer": "浏览器层",
      "description": "从 HTML/CSS/JS 到像素上屏的完整渲染流程",
      "source_domain": "browser_api",
      "fanout": { "count": 2, "total": 2, "ratio": "2/2", "level": "100%" },
      "coupling": 0,
      "covers": ["P1", "P2"],
      "dependencies": [],
      "tags": ["渲染", "重排", "重绘"],
      "references": {
        "t0": [{ "url": "https://web.dev/articles/rendering-performance", "title": "web.dev: Rendering Performance", "verified": true }],
        "t1": [], "t2": [], "t3": [],
        "t0_missing": false
      }
    }
  ]
}
```

## §2: dependency-graph.json

**路径**：`{workDir}/.meta/dependency-graph.json`

**内容**：能力依赖关系图（节点 → 依赖节点列表）。

```json
{
  "generated_at": "2026-05-20T10:00:00Z",
  "dependency_graph": {
    "A1": [],
    "A2": ["A1"],
    "A8": ["A1", "A2"]
  }
}
```

## §3: highgrounds.json

**路径**：`{workDir}/.meta/highgrounds.json`

**内容**：战略高地列表（按战略价值排序）。

```json
{
  "generated_at": "2026-05-20T10:00:00Z",
  "highgrounds": [
    {
      "capability_id": "A1",
      "capability_name": "浏览器渲染管线",
      "fanout_ratio": "2/2",
      "strategic_value": 2.0,
      "reasoning": "覆盖全部命题，是渲染性能的底层基础",
      "tier": "一级"
    }
  ]
}
```

## §4: learning-path.json

**路径**：`{workDir}/.meta/learning-path.json`

**内容**：学习路径（按战略价值和依赖拓扑排序）。

```json
{
  "generated_at": "2026-05-20T10:00:00Z",
  "learning_path": ["A1", "A2", "A8"]
}
```

## 字段说明

| 文件 | 字段 | 含义 |
|------|------|------|
| capability-graph.json | `capabilities` | 能力列表（含 fanout、coupling、references 等） |
| capability-graph.json | `qualifier_injection` | 限定词向命题注入的特化能力 |
| dependency-graph.json | `dependency_graph` | 能力依赖关系图 |
| highgrounds.json | `highgrounds` | 战略高地列表 |
| learning-path.json | `learning_path` | 学习路径 |

## 注意

- `highgrounds`、`learning_path`、`dependency_graph` 已从 capability-graph.json 拆分到独立文件
- 命题数据由下游步骤直接读取 requirement-web.json
