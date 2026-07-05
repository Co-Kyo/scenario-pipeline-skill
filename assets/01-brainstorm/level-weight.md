# level 与 role 约束规则

> 本文件定义 level 和 role 的强制约束关系。

---

## 强制约束关系

| role | level 必须是 | 含义 | 示例 (target_level=L2) |
|------|------------|------|----------------------|
| `core` | = target_level | 概念本身属于目标层 | level=L2, role=core |
| `premise` | = target_level - 1 | 概念本身低于目标层 | level=L1, role=premise |
| `outlook` | = target_level + 1 | 概念本身高于目标层 | level=L3, role=outlook |

---

## 禁止项

- ❌ level=L1, role=outlook（L1 是最低层，不存在比 L1 更低的 outlook）
- ❌ level=L2, role=premise 且 target_level=L2（premise 必须低于目标层）
- ❌ level 与 role 不匹配（如 level=L2, role=outlook 且 target_level=L2）

---

## 正确示例

**target_level=L2**：
```json
{ "level": "L2", "role": "core" }
{ "level": "L1", "role": "premise" }
{ "level": "L3", "role": "outlook" }
```

**target_level=L1**：
```json
{ "level": "L1", "role": "core" }
{ "level": "L2", "role": "outlook" }
```

---

## 各维度 Agent 使用方式

- **源头打标**：每个条目自标 level_weight
- **收敛者校验**：跨维度一致性检查，不一致时按优先级对齐（约束 > 技术 > 场景 > 学习）
- **后续步骤传导**：level_weight 驱动密度分级（core 深扫、premise 浅扫、outlook 确认存在）
