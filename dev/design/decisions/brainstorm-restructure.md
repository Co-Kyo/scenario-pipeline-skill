# 头脑风暴重构设计档案

> 2026-05-27 ~ 2026-05-28，基于多轮测试验证的头脑风暴步骤重构。
> 原因：原架构因果关系反向（用户一句话直接 scan → 命题完整性依赖运气），重构后先展开用户意图再定向扫描。

---

## 一、核心设计决策

### 1.1 角色重命名
- "裁判 Agent" → **「收敛者 Integrator」**
- 该角色的工作是收束 + 加权 + 去重 + 补位，不是裁决胜负

### 1.2 动态标准策略
- 不硬编码 L2，而是根据 `target_level`（L1/L2/L3/L4）动态调整：
  - 骨架结构（核心/基础/展望的比例）
  - 各阶段行为参数（搜索密度、研究深度、组装完整度）
  - 子 agent 模板参数

### 1.3 层次骨架（替代扁平锚点）
- 锚点从"扁平的共享词汇表"升级为"有层次结构的共享骨架"
- 主 agent 在生成锚点时就按 target_level 预组织：核心区域 + 基础回顾 + 展望
- 每个锚点带 `provisional_level` + `provisional_role` + `reasoning`
- 子 agent 的工作流：先检阅核心 → 完善核心 → 向下扩展 → 向上扩展 → 自检比例

### 1.4 level_weight 打标前置
- 维度 Agent 在产出条目时自行打标 `level_weight`（不是收敛者事后打标）
- 收敛者只做校验和对齐（跨维度一致性检查）
- 这降低了收敛者的上下文压力
- **level 与 role 的强制约束关系**：
  - core → level = target_level
  - premise → level = target_level - 1
  - outlook → level = target_level + 1

### 1.5 收敛者执行去重
- 因为维度 Agent 都基于同一套锚点 ID 工作，去重变成机械操作
- 同一维度内：两个条目引用相同锚点且描述重叠 → 合并
- 不同维度：引用相同锚点但命名不同 → 不合并，标注为"同一锚点的不同视角"

### 1.6 密度搜索策略
- 后续所有步骤的搜索强度和研究深度由 level_weight 的 role 字段驱动：
  - `core` → 深度搜索、完整研究
  - `prerequisite` → 浅扫、摘要
  - `outlook` → 确认存在、标注方向

---

## 二、概率放大与概率缩小

### 2.1 概率放大（引导 LLM 做更多好结果）
通过在 Agent prompt 中显式要求特定输出字段，将复现率从 33% 提升到 100%：

| 特性 | 放大前 | 放大后 | 手段 |
|---|---|---|---|
| scenario depth_distribution | 33% | 100% | prompt 追加 insights 生成指令 |
| technical critical_path/layer/bottleneck | 33% | 100% | prompt 追加 insights + supplemented 逐层清点 |
| learning strategic_reason/core_insight/pitfalls/branch | 33% | 100% | prompt 追加 insights + 分支路径要求 |
| supplemented 能力补充 | 33% | 100% | 从"如果发现"改为"逐层清点清单" |

### 2.2 概率缩小（压缩 LLM 做坏结果的空间）
通过 schema 约束和格式硬编码，让 agent 无法自由发挥：

| 特性 | 缩小前 | 缩小后 | 手段 |
|---|---|---|---|
| constraint 排除理由 | 自由文本 | 100% 结构化 | exclusions 从字符串改为 {content, reason_type} 枚举对象 |
| skip condition 判定 | LLM 推理 | 确定性规则 | topic 明确度改为关键词匹配规则 |

### 2.3 关键认知
- LLM 注意力机制是**语义优先于位置**——动作描述的强度比列表排序更能决定 agent 是否执行
- "做了但没记录"的根因是两个动作被压缩在同一句话里，后半句被感知为附加说明
- 修法：把两个动作拆成同等权重的两步，每步独立明确
- agent 内化约束后会**合理地拒绝**不合适的强制指令（如 L1+build tools 不补充安全层），这是 feature 不是 bug

---

## 三、数据结构规范

### 3.1 维度 Agent 输出的统一接口层

```json
{
  "dimension": "scenario|technical|learning|constraint",
  "target_level": "L1|L2|L3|L4",
  "anchor_coverage": {
    "covered": ["T1", "T3"],
    "supplemented": ["T99"],
    "skipped": ["T7"],
    "skip_reason": "与本维度无关"
  },
  "<entries>": [],       // 各自命名：scenarios / capabilities / learning_path / constraints
  "excluded_<entries>": [],
  "insights": {}
}
```

### 3.2 每个 entry 的必填字段

```json
{
  "id": "S1",
  "name": "一句话命名",
  "anchor_ref": ["T1", "T3"],
  "level_weight": {
    "level": "L2",
    "role": "prerequisite|core|outlook",
    "reason": "判断理由"
  },
  "confidence": "high|medium|low"
}
```

### 3.3 策略表

| 参数 | L1 | L2 | L3 | L4 |
|---|---|---|---|---|
| core_label | 核心概念 | 方案攻克 | 决策训练 | 体系设计 |
| premise_label | — | 概念确认 | 能力盘点 | 能力盘点 |
| outlook_label | 方案预览 | 决策方向 | 体系展望 | — |
| core 占比 | 85-90% | 70-80% | 65-70% | 75-80% |
| premise 占比 | — | 10-15% | 15-20% | 20-25% |
| outlook 占比 | 10-15% | 5-10% | 10-15% | — |

---

## 四、验证结果

- 5 个不同输入 × 14 个特性 = 70 项检查
- 总通过率：**97%（68/70）**
- 唯一"未通过"项（L1+build tools 的 supplemented）为合理判断——agent 内化了领域约束而非机械执行
