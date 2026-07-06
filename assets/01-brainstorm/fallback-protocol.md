# 头脑风暴降级协议

> 收敛者 Agent 失败时的降级协议。维度报告格式（`{dimension, scenarios[]}`）与 requirement-web.json 格式（`{context, propositions[], dependencies, capability_web, scope, search_guidance}`）完全不兼容。禁止直接用维度报告替代 requirement-web.json，必须执行格式转换。

---

## 触发条件

- 收敛者 Agent 超时（>5 分钟），且 `{workDir}/.meta/requirement-web.json` 未写入磁盘或不完整
- 收敛者 Agent 重试仍失败
- 收敛者输出 JSON 解析失败

---

## 转换步骤

主 agent 执行以下转换：

### 1. 读取存活的维度报告

逐个检查 scenario/technical/learning/constraint.json 是否存在，读取有效内容。

### 2. 读取骨架

读取 `{{anchors}}` 获取 target_level、strategy 等元数据。

### 3. 重建 requirement-web.json

| 字段 | 数据来源 |
|------|---------|
| `context` | 从 `{{anchors}}` 提取 target_level、year_inference_trace，填充默认值 |
| `propositions` | 将 scenario 维度的 scenarios[] 转换为 propositions[] 格式 |
| `capability_web` | 将 technical 维度的 capabilities[] 转换为 capability_web 格式 |
| `scope.exclusions` | 从 constraint 维度的 exclusions[] 提取 |
| `search_guidance.global_keywords` | 从 `{{anchors}}` 的 tags[] 提取 |
| `convergence_trace` | 标注 `degraded=true` 和 `missing_dimensions` |

### 4. 写入

将重建的 requirement-web.json 写入 `{workDir}/.meta/`。

### 5. 校验

验证写入的 JSON 包含 propositions（非空）、context、scope 字段。

---

## 降级后行为

标注 `"degraded": true` + `"missing_dimensions": [...]` 在 `convergence_trace` 中，后续步骤读取时可据此调整深度（如跳过深度研究，仅做基础扫描）。
