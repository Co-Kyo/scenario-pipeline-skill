# capability-graph.json 结构定义

## 路径

`{workDir}/.meta/capability-graph.json`

## JSON Schema

```json
{
  "generated_at": "2026-05-20T10:00:00Z",
  "total_capabilities": 3,
  "total_propositions": 2,
  "dependency_graph": {
    "A1": [],
    "A2": ["A1"],
    "A8": ["A1", "A2"]
  },
  "qualifier_injection": {
    "React": {
      "injects": ["R1-React渲染架构"],
      "replaces": []
    }
  },
  "highgrounds": [
    {
      "capability_id": "A1",
      "capability_name": "浏览器渲染管线",
      "fanout_ratio": "2/2",
      "strategic_value": 2.0,
      "reasoning": "覆盖全部命题，是渲染性能的底层基础",
      "tier": "一级"
    }
  ],
  "learning_path": ["A1", "A2", "A8"],
  "capabilities": [
    {
      "id": "A1",
      "name": "浏览器渲染管线",
      "layer": "浏览器层",
      "description": "从 HTML/CSS/JS 到像素上屏的完整渲染流程，包含关键渲染路径、重排重绘、合成层",
      "source_domain": "browser_api",
      "fanout": { "count": 2, "total": 2, "ratio": "2/2", "level": "100%" },
      "coupling": 0,
      "covers": ["P1", "P2"],
      "dependencies": [],
      "tags": ["渲染", "重排", "重绘", "合成层", "关键渲染路径"],
      "references": {
        "t0": [
          {
            "url": "https://web.dev/articles/rendering-performance",
            "title": "web.dev: Rendering Performance",
            "verified": true
          }
        ],
        "t1": [],
        "t2": [],
        "t3": [],
        "t0_missing": false
      }
    },
    {
      "id": "A2",
      "name": "DOM 节点生命周期",
      "layer": "浏览器层",
      "description": "DOM 节点的创建、布局、绘制、销毁全过程，含 GC 机制和内存泄漏模式",
      "source_domain": "browser_api",
      "fanout": { "count": 1, "total": 2, "ratio": "1/2", "level": "50%" },
      "coupling": 1,
      "covers": ["P1"],
      "dependencies": ["A1"],
      "dependencies_trace": "A2 依赖 A1，因为：DOM 节点的布局和绘制发生在浏览器渲染管线的 Layout/Paint 阶段，不理解 A1 就无法理解 DOM 节点为何在特定时机被创建/销毁",
      "tags": ["DOM", "GC", "内存泄漏", "节点回收"],
      "references": {
        "t0": [
          {
            "url": "https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model",
            "title": "MDN: Document Object Model",
            "verified": true
          }
        ],
        "t1": [],
        "t2": [],
        "t3": [],
        "t0_missing": false
      }
    }
  ]
}
```

## 字段说明

| 字段 | 含义 |
|------|------|
| `dependency_graph` | 能力依赖关系图（节点 → 依赖节点列表） |
| `qualifier_injection` | 限定词向命题注入的特化能力 |
| `highgrounds` | 战略高地列表（按战略价值排序） |
| `learning_path` | 学习路径（按战略价值和依赖拓扑排序） |
| `capabilities` | 能力列表（含 fanout、coupling、references 等） |

## 注意

- `highgrounds` 和 `learning_path` 已合并到本文件中（原 highgrounds.json 不再单独存在）
- 命题数据由 evaluate-pool 直接从 requirement-web.json 读取，capability-graph.json 不注入 propositions 字段
