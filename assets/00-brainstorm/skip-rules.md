# 跳过判断规则

## 跳过条件（必须同时满足全部 3 项）

### 1. topic 明确度判定（确定性规则，非 LLM 推理）

- ✅ 明确：tech_stack 中的每个词都是具体工具/框架名（如"webpack"、"vite"、"React"），且 raw_input 中不包含以下抽象词：原理、实践、场景、分析、架构、设计、治理、演进
- ❌ 不明确：topic 包含抽象维度词（如"底层原理与工程实践"），或 tech_stack 为空

### 2. year 已推断

通过正则匹配或隐式信号推断出 L1-L4，且置信度为高（有显式数字匹配或多个一致的隐式信号）

### 3. platform 已指定

从 raw_input 或 tech_stack 中可以确定 platform（web/miniapp/rn）

## 场景复杂度检查（额外拦截条件）

即使上述 3 项均满足，如果 raw_input 中包含以下场景化关键词，强制走完整路径：

- "面试"、"场景"、"分析"、"考察"、"问"（暗示需要场景化拆分）
- "中大型"、"复杂"、"多团队"（暗示需要约束维度的精细边界）

## 操作（轻量提取 → 层次骨架）

1. 从用户指令中提取核心技术关键词
2. 为每个关键词分配临时能力 ID（T1, T2, ...），附一句话描述
3. 区分 generic / specialized 属性
4. **按 target_level 给每个锚点标注 provisional_level 和 provisional_role**：
   - 核心锚点（命中目标年限）→ provisional_level = target_level, provisional_role = "core"
   - 基础锚点（低于目标年限）→ provisional_level = target_level - 1, provisional_role = "premise"
   - 展望锚点（高于目标年限）→ provisional_level = target_level + 1, provisional_role = "outlook"
   - **level 与 role 的强制约束**：core → level=target_level; premise → level=target_level-1; outlook → level=target_level+1
5. **按 role 分组**，生成 l{N}_core_ids / l{N}_premise_ids / l{N}_outlook_ids
6. **注入策略元数据**：从 assets/common/conventions.md 的策略表中提取对应级别的标签和比例
7. 写入 `{workDir}/.meta/brainstorm/anchors.json`

**anchors.json 格式**：详见 `assets/00-brainstorm/schemas.md`§anchors
