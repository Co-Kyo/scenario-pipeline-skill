# 00-intent-anchor JSON 格式定义

> 本文件定义意图锚定阶段的 JSON 输出格式。

---

## §anchors - 骨架格式

**写入路径**：`{workDir}/.meta/brainstorm/anchors.json`

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| generated_at | string | ✅ | ISO 时间戳 |
| source | string | ✅ | 固定 "lightweight_extraction" |
| topic | string | ✅ | 用户输入的主题关键词 |
| target_level | string | ✅ | 推断的经验年限 (L1/L2/L3/L4) |
| year_inference_trace | string | ✅ | 年限推断依据 |
| strategy | object | ✅ | 策略元数据（从 strategy-level.md 策略表提取） |
| anchors | array | ✅ | 锚点列表（8-15 个） |
| l{N}_core_ids | array | ✅ | 核心锚点 ID 列表 |
| l{N}_premise_ids | array | ✅ | 基础锚点 ID 列表 |
| l{N}_outlook_ids | array | ✅ | 展望锚点 ID 列表 |

### anchor 对象结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 唯一标识 (T1, T2, ...) |
| name | string | ✅ | 锚点名称 |
| provisional_level | string | ✅ | 初步归属层 (L1/L2/L3/L4) |
| provisional_role | string | ✅ | 角色 (core/premise/outlook) |
| reasoning | string | ✅ | 为什么这个锚点属于该区域 |
| description | string | ✅ | 一句话描述 |
| type | string | ✅ | generic 或 specialized |
| tags | array | ✅ | 标签列表 |

### 完整示例

```json
{
  "generated_at": "2026-05-27T13:00:00+08:00",
  "source": "lightweight_extraction",
  "topic": "webpack & vite",
  "target_level": "L2",
  "year_inference_trace": "用户原文含'3-5年',显式匹配 → L2",
  "strategy": {
    "core_label": "方案攻克",
    "premise_label": "概念确认",
    "outlook_label": "决策方向",
    "ratios": { "premise": "10-15%", "core": "70-80%", "outlook": "5-10%" }
  },
  "anchors": [
    {
      "id": "T1",
      "name": "模块解析与依赖图",
      "provisional_level": "L2",
      "provisional_role": "core",
      "reasoning": "webpack/vite 核心机制,3-5 年必须理解依赖图构建",
      "description": "ESM/CJS 模块规范差异、依赖图构建、resolve 配置",
      "type": "generic",
      "tags": ["webpack", "vite", "esm", "cjs"]
    }
  ],
  "l2_core_ids": ["T1"],
  "l1_premise_ids": [],
  "l3_outlook_ids": []
}
```

### 约束

- 锚点数量：8-15 个（太少覆盖不足，太多失去锚定意义）
- 每个锚点必须有 `provisional_level` 和 `provisional_role`
- 核心锚点的 `reasoning` 必须说明"为什么属于核心区域"
- 锚点是草案，维度 Agent 可以补充，但核心锚点不可忽略
