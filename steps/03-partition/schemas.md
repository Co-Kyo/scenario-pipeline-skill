# partition-analysis.json 结构设计

## 设计原则

- 三层机制映射到 JSON 的三个层级
- scan 直接消费 `current_session` 字段，不需要自己做图分析
- 原始 DAG 数据保留在 `dag` 字段，供后续步骤或下次 session 复用

## JSON Schema

```json
{
  "generated_at": "2026-06-02T09:50:00+08:00",
  "total_propositions": 18,
  "topic": "前端性能优化",

  "dag": {
    "nodes": [
      {
        "id": "P01",
        "name": "万级列表虚拟滚动",
        "depth": 0,
        "role": "core",
        "fanout": 3,
        "component_id": "C1"
      }
    ],
    "edges": [
      {
        "from": "P09",
        "to": "P01",
        "type": "enables",
        "reason": "渲染管线理解是虚拟滚动的前提",
        "weight": 0.8
      }
    ]
  },

  "components": [
    {
      "component_id": "C1",
      "label": "渲染优化",
      "node_ids": ["P01", "P02", "P03", "P07", "P09", "P11", "P14"],
      "session_id": "S1",
      "depth_layers": [
        {
          "depth": 0,
          "node_ids": ["P09"],
          "parallelizable": true
        },
        {
          "depth": 1,
          "node_ids": ["P01", "P02", "P03"],
          "parallelizable": true
        },
        {
          "depth": 2,
          "node_ids": ["P07", "P11"],
          "parallelizable": true
        },
        {
          "depth": 3,
          "node_ids": ["P14"],
          "parallelizable": false
        }
      ],
      "communities": [
        {
          "community_id": "C1-L1-A",
          "label": "DOM操作与重排重绘",
          "node_ids": ["P01", "P03"],
          "depth_range": [1, 1]
        },
        {
          "community_id": "C1-L1-B",
          "label": "首屏加载",
          "node_ids": ["P02"],
          "depth_range": [1, 1]
        }
      ]
    },
    {
      "component_id": "C2",
      "label": "网络与资源",
      "node_ids": ["P05", "P06", "P13", "P15"],
      "session_id": "S2",
      "depth_layers": [
        {
          "depth": 0,
          "node_ids": ["P05"],
          "parallelizable": true
        },
        {
          "depth": 1,
          "node_ids": ["P06", "P13", "P15"],
          "parallelizable": true
        }
      ],
      "communities": []
    }
  ],

  "current_session": {
    "session_id": "S1",
    "component_ids": ["C1"],
    "proposition_ids": ["P09", "P01", "P02", "P03", "P07", "P11", "P14"],
    "execution_order": [
      {"depth": 0, "proposition_ids": ["P09"]},
      {"depth": 1, "proposition_ids": ["P01", "P02", "P03"]},
      {"depth": 2, "proposition_ids": ["P07", "P11"]},
      {"depth": 3, "proposition_ids": ["P14"]}
    ],
    "scan_batches": [
      {
        "batch_id": "S1-B1",
        "proposition_ids": ["P09"],
        "parallelizable": false
      },
      {
        "batch_id": "S1-B2",
        "proposition_ids": ["P01", "P02", "P03"],
        "parallelizable": true
      },
      {
        "batch_id": "S1-B3",
        "proposition_ids": ["P07", "P11"],
        "parallelizable": true
      },
      {
        "batch_id": "S1-B4",
        "proposition_ids": ["P14"],
        "parallelizable": false
      }
    ]
  },

  "deferred_sessions": [
    {
      "session_id": "S2",
      "component_ids": ["C2"],
      "proposition_ids": ["P05", "P06", "P13", "P15"],
      "reason": "网络与资源优化与主链路无依赖，可独立执行",
      "restore_command": "研究：网络优化、资源加载、Service Worker"
    }
  ],

  "partition_stats": {
    "method": "connected_components + topological_depth + leiden_community",
    "num_components": 2,
    "max_depth_in_current": 4,
    "modularity_score": 0.42,
    "cut_edges": 2,
    "rationale": "渲染优化链（7个命题）与网络资源链（4个命题）之间仅有2条弱依赖（P05→P02缓存影响首屏，P09→P02渲染管线是首屏基础），自然断开为两个独立session"
  }
}
```

## scan 消费方式

scan 读取 `current_session.scan_batches`：

```
for batch in current_session.scan_batches:
    propositions = batch.proposition_ids
    # 按 batch 并行搜索
    if batch.parallelizable:
        spawn agents in parallel
    else:
        execute sequentially
```

scan 只处理 `current_session.proposition_ids` 中的命题，
从 `requirement-web.json` 提取这些命题的 search_keywords 和 level_weight。

## execution-plan.md 格式

```markdown
# 执行计划

## Session 1：渲染优化（本次执行）

| 序号 | 命题 | 角色 | 依赖 | 搜索密度 |
|------|------|------|------|---------|
| P09 | 渲染管线全链路 | core | 无 | kw=2, r=8 |
| P01 | 虚拟滚动方案选型 | core | 依赖 P09 | kw=2, r=8 |
| P02 | 首屏白屏优化 | core | 依赖 P09 | kw=2, r=8 |
| ... | ... | ... | ... | ... |

## Session 2：网络与资源（排期到下次）

| 命题 | 排期原因 | 恢复指令 |
|------|---------|---------|
| P05 网络缓存策略 | 与渲染链路无直接依赖 | "研究：网络优化" |
| P06 Bundle体积优化 | 可独立执行 | "研究：构建优化" |
| P13 Service Worker | 可独立执行 | "研究：Service Worker" |
| P15 图片性能优化 | 可独立执行 | "研究：图片优化" |
```
