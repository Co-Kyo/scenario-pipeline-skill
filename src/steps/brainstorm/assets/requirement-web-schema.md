# requirement-web 输出格式

**写入路径**：`{workDir}/.meta/requirement-web.json`

## 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| generated_at | string | ✅ | ISO 时间戳 |
| context | object | ✅ | 场景上下文、平台、年限 |
| strategy | object | ✅ | 策略元数据 |
| propositions | array | ✅ | 命题列表 |
| capability_web | object | ✅ | 能力图谱（按能力 ID 组织） |
| dependencies | array | ✅ | 命题级依赖 |
| scope | object | ✅ | 排除项与排除关键词 |
| search_guidance | object | ✅ | 搜索关键词与密度参数 |
| qualifier_injection | object | ✅ | 限定词注入 |
| convergence_trace | object | ✅ | 收敛过程与降级 trace |

## context 结构

```json
{
  "topic": "前端性能场景分析题（面试场景，3-5年候选人）",
  "platform": "web",
  "target_level": "L2",
  "year_source": "explicit: 用户原文含'3-5年'",
  "year_inference_trace": "显式匹配 → 取中间值4年 → L2",
  "scenario": "面试场景分析题",
  "tech_stack": []
}
```

## proposition 对象

```json
{
  "id": "RW-P1",
  "name": "首屏白屏定位与优化方案组合",
  "depth": "进阶",
  "frequency": "高频",
  "level_weight": {
    "level": "L2",
    "role": "core",
    "reason": "方案级场景"
  },
  "search_keywords": [
    "首屏白屏优化",
    "TTFB 优化"
  ],
  "capability_ids": ["T1-1", "T3-1"],
  "anchor_ref": ["T3", "T4"]
}
```

## capability_web 值对象

```json
{
  "id": "T1-1",
  "name": "渲染管线全链路机制",
  "type": "generic",
  "fanout": 3,
  "covers": ["RW-P1"],
  "dependencies": [],
  "layer": "浏览器层"
}
```

## dependencies 元素

```json
{
  "from": "RW-P10",
  "to": "RW-P1",
  "type": "enables",
  "reason": "CRP 阻塞点分析是首屏定位的前提"
}
```

`type` 枚举：`prerequisite` / `enables` / `related` / `extends`。

## scope 结构

```json
{
  "exclusions": [
    {
      "content": "RUM 监控体系搭建",
      "reason_type": "out_of_scope"
    }
  ],
  "excluded_keywords": ["mpvue", "wepy"]
}
```

`reason_type` 枚举：`out_of_scope` / `below_target` / `deprecated` / `not_frontend`。

## search_guidance 结构

```json
{
  "global_keywords": ["前端性能优化", "面试"],
  "role_density": {
    "core": { "kw": 2, "r": 8 },
    "premise": { "kw": 1, "r": 3 },
    "outlook": { "kw": 1, "r": 2 }
  },
  "principle_track": "原理轨道",
  "practice_track": "实践轨道"
}
```

## convergence_trace 结构

```json
{
  "degraded": false,
  "integrator": "completed",
  "missing_dimensions": [],
  "output_validation": {
    "all_dependency_refs_exist": true,
    "all_capability_refs_exist": true
  }
}
```

降级时必须填写：

- `degraded: true`
- `integrator`: 降级原因
- `missing_dimensions`: 缺失维度
- `degrade_reason`: 具体根因

## 校验要求

- 每个 proposition 有 `id`、`name`、`depth`、`search_keywords`、`capability_ids`、`level_weight`
- `capability_web` 与所有 `capability_ids` 双向一致
- `dependencies` 中引用的 `from` / `to` 均存在
- `scope.exclusions` 非空
- `convergence_trace` 必须存在
