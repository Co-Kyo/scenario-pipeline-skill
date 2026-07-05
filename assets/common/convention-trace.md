# 决策凭据规范（_trace 字段）

管线中的关键决策（影响后续产出、可能导致内容丢失的决策）必须保留原始决策凭据。

---

## 规则

1. **命名**：在决策字段旁添加同名 `_trace` 后缀字段
2. **内容**：记录做出该决策时的原始依据（不是事后总结），包含：
   - 输入数据是什么
   - 判定标准是什么
   - 为什么选了这个值而不是其他值
3. **粒度**：只给关键决策字段加 `_trace`，客观事实字段和可重算字段不加
4. **不影响消费方**：`_trace` 字段是可选的，下游步骤不依赖它

## 需要加 _trace 的字段清单

| 步骤 | 字段 | trace 内容 |
|------|------|-----------|
| ⓪ brainstorm | `year_inference_trace` | 年限推断依据（显式匹配/隐式信号/默认值） |
| ③ scan | `source_tier` | unknown 域名的评估依据（哪几个维度达标/不达标） |
| ③ scan | `fetch_status: "failed"` | 失败原因（超时/403/内容不相关） |
| ③ scan | 被丢弃的素材 | 丢弃原因（不达标/重复/无关），记录在 `discarded` 字段 |
| ④ capability-graph | `dependencies_trace` | 为什么 A 依赖 B |
| ④ capability-graph | `merge_trace` | 为什么合并为一个（多个命题的相似能力合并） |
| ④ capability-graph | `split_trace` | 为什么拆分为多个（一个粗粒度能力拆分为细粒度能力） |
| ⑤ evaluate | `priority_trace` | 总分与阈值的对比判定过程 |
| ⑧ assemble | `筛选_trace` | 候选来源、排除原因、保留理由 |
