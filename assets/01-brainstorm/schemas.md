# 01-brainstorm JSON 格式定义

> 本文件定义头脑风暴阶段 4 维度 Agent 输出的 JSON 格式。

---

## §scenario - 场景维度输出格式

**写入路径**：`{workDir}/.meta/brainstorm/scenario.json`

### 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dimension | string | ✅ | 固定 "scenario" |
| target_level | string | ✅ | 经验年限 |
| anchor_coverage | object | ✅ | 锚点覆盖情况 |
| year_filtered | boolean | ✅ | 是否经过年限过滤 |
| scenarios | array | ✅ | 场景列表 |
| excluded_scenarios | array | ✅ | 被过滤的场景 |
| insights | object | ✅ | 洞察信息 |

### scenario 对象结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 唯一标识 (S1, S2, ...) |
| name | string | ✅ | 场景名称 |
| anchor_ref | array | ✅ | 关联的锚点 ID |
| level_weight | object | ✅ | level + role + reason |
| confidence | string | ✅ | high/medium/low |
| description | string | ✅ | 场景描述 |
| depth | string | ✅ | 基础/进阶/深水区 |
| frequency | string | ✅ | 高频/中频/低频 |
| granularity_match | string | ✅ | 粒度匹配说明 |

### insights 结构

| 字段 | 类型 | 说明 |
|------|------|------|
| depth_distribution | object | 按深度分层：deep_water/advanced/basic |
| cross_anchor_clustering | array | 高频锚点组合分析 |

### 完整示例

```json
{
  "dimension": "scenario",
  "target_level": "L2",
  "anchor_coverage": {
    "covered": ["T1", "T3"],
    "supplemented": [],
    "skipped": ["T7"],
    "skip_reason": "与场景维度无关"
  },
  "year_filtered": true,
  "scenarios": [
    {
      "id": "S1",
      "name": "场景名称",
      "anchor_ref": ["T1"],
      "level_weight": {
        "level": "L2",
        "role": "core",
        "reason": "方案级场景,涉及 2-3 技术层组合"
      },
      "confidence": "high",
      "description": "场景描述",
      "depth": "进阶",
      "frequency": "高频",
      "granularity_match": "该场景符合 L2 的方案级粒度"
    }
  ],
  "excluded_scenarios": [],
  "insights": {
    "depth_distribution": {
      "deep_water": [],
      "advanced": ["S1"],
      "basic": []
    },
    "cross_anchor_clustering": [
      {
        "anchors": ["T1", "T3"],
        "reason": "模块解析与 Monorepo 组合覆盖进阶场景"
      }
    ]
  }
}
```

---

## §technical - 技术维度输出格式

**写入路径**：`{workDir}/.meta/brainstorm/technical.json`

### 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dimension | string | ✅ | 固定 "technical" |
| target_level | string | ✅ | 经验年限 |
| anchor_coverage | object | ✅ | 锚点覆盖情况 |
| capabilities | array | ✅ | 能力列表 |
| excluded_capabilities | array | ✅ | 被过滤的能力 |
| insights | object | ✅ | 洞察信息 |

### capability 对象结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 唯一标识 (T1, T2, ..., T_ADD1) |
| name | string | ✅ | 能力名称 |
| anchor_ref | array | ✅ | 关联的锚点 ID |
| level_weight | object | ✅ | level + role + reason |
| confidence | string | ✅ | high/medium/low |
| layer | string | ✅ | 技术层（浏览器层/网络层/工程层等） |
| description | string | ✅ | 一句话描述 |
| type | string | ✅ | generic 或 specialized |
| depends_on | array | ✅ | 前置依赖的能力 ID |
| covers | array | ✅ | 覆盖的命题 ID |

### insights 结构

| 字段 | 类型 | 说明 |
|------|------|------|
| critical_path | array | 最长依赖链 |
| layer_distribution | object | 按技术层分组 |
| bottleneck_capabilities | array | 瓶颈能力分析 |

### 完整示例

```json
{
  "dimension": "technical",
  "target_level": "L2",
  "anchor_coverage": {
    "covered": ["T1", "T2"],
    "supplemented": ["T_ADD1"],
    "skipped": [],
    "skip_reason": ""
  },
  "capabilities": [
    {
      "id": "T1",
      "name": "能力名称",
      "anchor_ref": ["T1"],
      "level_weight": {
        "level": "L2",
        "role": "core",
        "reason": "方案级能力,构建工具核心机制"
      },
      "confidence": "high",
      "layer": "工程层",
      "description": "一句话描述",
      "type": "generic",
      "depends_on": [],
      "covers": ["RW-P1"]
    }
  ],
  "excluded_capabilities": [],
  "insights": {
    "critical_path": [],
    "layer_distribution": {},
    "bottleneck_capabilities": []
  }
}
```

---

## §learning - 学习维度输出格式

**写入路径**：`{workDir}/.meta/brainstorm/learning.json`

### 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dimension | string | ✅ | 固定 "learning" |
| target_level | string | ✅ | 经验年限 |
| anchor_coverage | object | ✅ | 锚点覆盖情况 |
| learning_path | array | ✅ | 学习路径节点 |
| branches | object | ✅ | 分支路径 |
| excluded_learning_path | array | ✅ | 被过滤的节点 |
| insights | object | ✅ | 洞察信息 |

### learning_node 对象结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 唯一标识 (L1, L2, ...) |
| name | string | ✅ | 节点名称 |
| anchor_ref | array | ✅ | 关联的锚点 ID |
| level_weight | object | ✅ | level + role + reason |
| confidence | string | ✅ | high/medium/low |
| prerequisites | array | ✅ | 前置节点 ID |
| estimated_time | string | ✅ | 预估学习时长 |
| verification | string | ✅ | 验证标准（做到/做不到） |
| is_strategic | boolean | ✅ | 是否是战略高地 |

### branches 结构

| 字段 | 类型 | 说明 |
|------|------|------|
| with_framework_experience | object | 有框架经验的路径 |
| without_framework_experience | object | 无框架经验的路径 |

### insights 结构

| 字段 | 类型 | 说明 |
|------|------|------|
| strategic_reason | object | 战略节点解锁分析 |
| core_insight | string | 核心矛盾总结 |
| common_pitfalls | array | 常见坑和应对 |
| path_endpoint_rationale | string | 路径终点定义 |

### 完整示例

```json
{
  "dimension": "learning",
  "target_level": "L2",
  "anchor_coverage": {
    "covered": ["T1", "T2"],
    "supplemented": [],
    "skipped": [],
    "skip_reason": ""
  },
  "learning_path": [
    {
      "id": "L1",
      "name": "节点名称",
      "anchor_ref": ["T2"],
      "level_weight": {
        "level": "L1",
        "role": "premise",
        "reason": "基础前置节点"
      },
      "confidence": "high",
      "prerequisites": [],
      "estimated_time": "2h",
      "verification": "做到才算过的标准",
      "is_strategic": false
    }
  ],
  "branches": {
    "with_framework_experience": {
      "skip_nodes": ["L1"],
      "estimated_saving": "1-2d",
      "description": "有框架经验可跳过基础操作"
    },
    "without_framework_experience": {
      "must_pass": ["L1"],
      "estimated_total_time": "5-7d",
      "description": "无框架经验需从零掌握"
    }
  },
  "excluded_learning_path": [],
  "insights": {
    "strategic_reason": {},
    "core_insight": "核心矛盾总结",
    "common_pitfalls": [],
    "path_endpoint_rationale": "路径终点定义"
  }
}
```

---

## §constraint - 约束维度输出格式

**写入路径**：`{workDir}/.meta/brainstorm/constraint.json`

### 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dimension | string | ✅ | 固定 "constraint" |
| target_level | string | ✅ | 经验年限 |
| anchor_coverage | object | ✅ | 锚点覆盖情况 |
| constraints | array | ✅ | 约束列表 |
| excluded_constraints | array | ✅ | 被过滤的约束 |
| explicit_constraints | object | ✅ | 显式约束 |
| inferred_constraints | array | ✅ | 推断的约束 |
| exclusions | array | ✅ | 排除项列表 |
| depth_adjustments | object | ✅ | 深度调整 |
| insights | object | ✅ | 洞察信息 |

### constraint 对象结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 唯一标识 (C1, C2, ...) |
| name | string | ✅ | 约束名称 |
| anchor_ref | array | ✅ | 关联的锚点 ID |
| level_weight | object | ✅ | level + role + reason |
| confidence | string | ✅ | high/medium/low |
| constraint_type | string | ✅ | exclusion 或 depth_adjustment |
| scope | string | ✅ | 适用范围 |
| impact | string | ✅ | 影响说明 |

### exclusions 对象结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | ✅ | 排除内容 |
| reason_type | string | ✅ | 原因类型枚举 |

**reason_type 枚举值**：
- `out_of_scope`：内容超出目标年限的考察范围
- `below_target`：内容低于目标年限应掌握的水平
- `deprecated`：技术方案已停止维护或被替代
- `not_frontend`：内容超出前端开发者的能力边界

### 完整示例

```json
{
  "dimension": "constraint",
  "target_level": "L2",
  "anchor_coverage": {
    "covered": ["T1", "T2", "T3"],
    "supplemented": [],
    "skipped": [],
    "skip_reason": ""
  },
  "constraints": [
    {
      "id": "C1",
      "name": "排除基础概念",
      "anchor_ref": [],
      "level_weight": {
        "level": "L2",
        "role": "core",
        "reason": "L2 方案级命题的核心约束"
      },
      "confidence": "high",
      "constraint_type": "exclusion",
      "scope": "所有低于 L2 的命题",
      "impact": "过滤掉概念级场景和基础用法能力"
    }
  ],
  "excluded_constraints": [],
  "explicit_constraints": {
    "year": "L2",
    "year_source": "inferred: 用户原文含'3-5年'",
    "platform": "web",
    "tech_stack": ["webpack", "vite"]
  },
  "inferred_constraints": [],
  "exclusions": [
    { "content": "Rollup 内部实现", "reason_type": "out_of_scope" },
    { "content": "npm/yarn 基础用法", "reason_type": "below_target" }
  ],
  "depth_adjustments": {
    "基础概念": "跳过或一笔带过",
    "原理机制": "重点展开"
  },
  "insights": {}
}
```
