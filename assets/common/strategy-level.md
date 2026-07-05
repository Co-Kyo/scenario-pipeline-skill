# 动态标准策略

> 根据 `target_level`（L1/L2/L3/L4）动态调整头脑风暴的骨架结构和各阶段行为参数。

---

## 策略表

| 参数 | L1（1-3年） | L2（3-5年） | L3（5-8年） | L4（8+年） |
|------|------------|------------|------------|------------|
| 核心标签 | 核心概念 | 方案攻克 | 决策训练 | 体系设计 |
| 基础标签 | — | 概念确认 | 能力盘点 | 能力盘点 |
| 展望标签 | 方案预览 | 决策方向 | 体系展望 | — |
| 核心占比 | 85-90% | 70-80% | 65-70% | 75-80% |
| 基础占比 | — | 10-15% | 15-20% | 20-25% |
| 展望占比 | 10-15% | 5-10% | 10-15% | — |
| 扫描密度（核心） | kw=2, r=5 | kw=2, r=8 | kw=3, r=10 | kw=3, r=10 |
| 扫描密度（基础） | — | kw=1, r=3 | kw=1, r=3 | kw=1, r=3 |
| 扫描密度（展望） | kw=1, r=2 | kw=1, r=2 | kw=1, r=3 | — |
| 能力研究（核心） | normal, 无实验 | normal | deep | deep |
| 能力研究（基础） | — | 摘要 | 摘要 | 摘要 |
| 能力研究（展望） | 跳过 | 名称+描述 | 摘要 | — |
| 组装（核心） | overview+edge+refs | 完整四象限 | 完整+架构分析 | 完整+治理分析 |
| 组装（基础） | — | overview+refs | overview+refs | overview+refs |
| 组装（展望） | overview only | overview+refs | overview+refs | — |
| 学习阶梯阶段 | 概念掌握→动手验证 | 基础确认→方案攻克→进阶展望 | 能力盘点→决策训练→体系认知 | 能力盘点→体系设计→治理实践 |

---

## level_weight 传导规则

`level_weight`（level + role）是贯穿管线的核心标记。

**level 与 role 的强制约束关系**：

| role | level 必须是 | 含义 |
|------|------------|------|
| `core` | = target_level | 概念本身属于目标层 |
| `premise` | = target_level - 1 | 概念本身低于目标层 |
| `outlook` | = target_level + 1 | 概念本身高于目标层 |

level 描述概念的客观归属层，role 描述概念相对于目标用户的主观定位。两者独立但存在上述约束。

以下步骤必须读取并按 role 调整行为：

| 步骤 | 如何使用 level_weight |
|------|----------------------|
| 01 头脑风暴·维度 Agent | 源头打标：每个条目自标 level_weight |
| 01 头脑风暴·收敛者 | 校验对齐：跨维度一致性检查，不一致时按优先级对齐 |
| 03 scan | 密度分级：core 深扫、premise 浅扫、outlook 确认存在 |
| 04 capability-graph | 预查找深度：core 双轨（T0+T1/T2）、premise 仅 T0、outlook 只记录名称 |
| 05 evaluate-pool | 评分范围：core 完整四维、premise/outlook 简化评分 |
| 06 capability-research | 研究深度：core 按 depth 参数、premise 摘要、outlook 名称+描述 |
| 08 assemble | 组装完整度：core 完整四象限、premise/outlook 仅 overview+refs |
| 09 learning-ladder | 阶段编排：premise→core→outlook 组织学习路径 |

---

## 收敛者（Integrator）

头脑风暴的收敛角色，替代原"裁判 Agent"。职责：

1. **校验**：读取 4 个维度 Agent 的输出，检查 level_weight 跨维度一致性
2. **对齐**：同一锚点在不同维度的 level_weight 不一致时，按优先级对齐（约束 > 技术 > 场景 > 学习）
3. **收束**：用 anchor_ref 编织跨维度关系图，建立场景↔能力映射
4. **去重**：同一维度内，两个条目引用相同锚点且描述重叠 → 合并；不同维度引用相同锚点 → 不合并，标注为"同一锚点的不同视角"
5. **补位**：检测 anchor_coverage 覆盖缺口，决定是否补充
6. **产出**：requirement-web.json（含 strategy 元数据 + level_weight 标注）

---

## 内容比例约束（命题组装通用）

- 通用高地内容（框架无关）≥ 70%
- 特化内容（框架相关）≤ 30%
- 开篇（10-15%）从限定词切入建立共鸣
- 主体（70-80%）讲通用原理
- 收尾（10-15%）回到限定词给落地方案
