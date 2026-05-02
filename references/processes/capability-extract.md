# Process: 原子能力提取 (capability-extract)

> 从多个命题的分词结果中提取原子能力，计算扇出度，输出结构化 capability-graph.json。

## 输入

- `decompositions`：所有命题的分词结果列表（来自 processes/decompose.md 的输出）

## 执行步骤

### Step 1：逐命题提取原子能力

对每个命题的 [通用内核] + [特化层] 进行逐层拆解：
- 每个独立可学习的技术能力 → 一个原子能力
- 命名规范：`<技术域>-<能力描述>`

### Step 2：去重与合并

跨命题去重：相同能力合并为一条，保留最高 Tier 来源

### Step 3：标注依赖关系

每个原子能力的前置依赖（A 依赖 B = 理解 A 之前必须先理解 B）

### Step 4：计算扇出度

```
扇出度 = 该能力出现在多少个命题的能力集合中 / 总命题数
```

### Step 5：限定词注入分析

分析不同限定词向命题注入的特化能力集

### Step 6：生成 capability-graph.json

将全部结果写入 `.meta/capability-graph.json`，格式见下方。

---

## 输出：capability-graph.json

```jsonc
{
  "$schema": "capability-graph-v1",
  "meta": {
    "scan_date": "2026-05-02",
    "target_years": "L2",
    "total_propositions": 7,
    "scan_scope": "前端性能优化面试场景分析题"
  },

  // 原子能力清单
  "capabilities": [
    {
      "id": "A1",
      "name": "浏览器渲染管线",
      "layer": "浏览器层",
      "description": "CRP→Layout→Paint→Composite",
      "fanout": {
        "count": 5,
        "total": 7,
        "ratio": "5/7",
        "level": "core"           // core | high |专项 | low
      },
      "coupling": 1,              // 1=框架无关 2=部分相关 3=高度绑定
      "covers": ["P1", "P2", "P3", "P5", "P6"],
      "dependencies": [],         // 前置依赖的能力 ID 列表
      "tags": ["渲染", "浏览器", "CRP"]
    }
    // ... 更多能力
  ],

  // 能力依赖图（从 dependencies 字段派生，冗余存储便于查询）
  "dependency_graph": {
    "A1": [],
    "A2": ["A1"],
    "A3": [],
    "A4": ["A1"],
    "A5": ["A2"],
    "A6": [],
    "A7": [],
    "A8": []
  },

  // 限定词注入映射
  "qualifier_injection": {
    "Vue 3": {
      "injects": ["V1-Proxy响应式", "V2-Composition API", "V3-Patch Flag"],
      "affects_priority": ["A4"]
    },
    "React 18": {
      "injects": ["R1-Fiber调度", "R2-Hooks", "R3-Concurrent Mode"],
      "affects_priority": ["A4"]
    },
    "Webpack 5": {
      "injects": ["W1-Module Federation", "W2-持久化缓存", "W3-Chunk分割"],
      "affects_priority": ["A7"]
    },
    "Vite": {
      "injects": ["VI1-ESM原生加载", "VI2-预构建", "VI3-Rollup产物优化"],
      "affects_priority": ["A7"]
    }
  },

  // 战略高地（由 highground-identify 追加）
  "highgrounds": [],

  // 修炼路径（由 highground-identify 追加）
  "learning_path": []
}
```

### 能力 ID 命名规范

| 前缀 | 含义 | 示例 |
|------|------|------|
| A | 通用原子能力（Generic） | A1, A2, A8 |
| V | Vue 特化能力 | V1, V2 |
| R | React 特化能力 | R1, R2 |
| W | Webpack 特化能力 | W1, W2 |
| VI | Vite 特化能力 | VI1, VI2 |

### fanout.level 枚举

| level | 条件 | 含义 |
|-------|------|------|
| `core` | ≥ 50% 命题覆盖 | 战略高地，必须掌握 |
| `high` | 30-50% | 重要能力，优先学习 |
| `专项` | 10-30% | 特定场景需要 |
| `low` | < 10% | 按需学习 |

---

## 依赖

- 无（可独立执行）

## 参考

- core/capability-graph.md（原子能力图谱方法论）
