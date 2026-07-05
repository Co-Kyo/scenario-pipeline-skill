# Step ⓪: 意图锚定

**目的**：接收用户指令，解析意图、推断年限，生成基础骨架（anchors.json），决定是否需要头脑风暴

**核心流程**：
1. 解析用户指令（raw_input → topic + constraints）
2. 年限自动推断（显式参数 > 显式数字 > 隐式信号 > 默认 L2）
3. 跳过判断（3 条件 + 场景复杂度拦截）
4. 轻量提取 → 生成共享骨架（anchors.json，8-15 个锚点）

**关键产出**：`{workDir}/.meta/brainstorm/anchors.json`

---

## 前置条件

加载：
- `assets/00-intent-anchor/schemas.md`§anchors（anchors.json 格式定义）
- `assets/00-intent-anchor/year-rules.md`（年限推断规则）
- `assets/00-intent-anchor/skip-rules.md`（跳过判断规则）

## 输入

- 用户指令原文(raw_input)
- 解析出的约束参数:`--year`、`--platform`、`--depth`

## 执行步骤

### 1. 解析用户指令

从用户指令中提取:
- `raw_input`:用户原文
- `topic`:主题关键词(如"webpack & vite")
- `constraints`:已解析的约束(year、platform、depth 等)

### 2. 年限推断

详见 `assets/00-intent-anchor/year-rules.md`

**推断结果写入**：`inferred_year` 字段，附带 `year_inference_trace`（推断依据）

### 3. 跳过判断

详见 `assets/00-intent-anchor/skip-rules.md`

**跳过条件（必须同时满足全部 3 项）**：
1. topic 明确（tech_stack 中每个词都是具体工具/框架名，不含抽象维度词）
2. year 已推断（置信度高）
3. platform 已指定

**额外拦截**：即使 3 项均满足，如果 raw_input 包含场景化关键词（"面试"、"场景"、"复杂"等），强制走完整路径。

**跳过 YES** → 跳过 Step ①，直接进入 Step ②（轻量提取已在本步骤完成）
**跳过 NO** → 进入 Step ①（头脑风暴）

### 4. 轻量提取 → 生成共享骨架

1. 从用户指令中提取核心技术关键词
2. 为每个关键词分配临时能力 ID（T1, T2, ...），附一句话描述
3. 区分 generic / specialized 属性
4. **按 target_level 给每个锚点标注 provisional_level 和 provisional_role**：
   - 核心锚点（命中目标年限）→ provisional_level = target_level, provisional_role = "core"
   - 基础锚点（低于目标年限）→ provisional_level = target_level - 1, provisional_role = "premise"
   - 展望锚点（高于目标年限）→ provisional_level = target_level + 1, provisional_role = "outlook"
5. **按 role 分组**，生成 l{N}_core_ids / l{N}_premise_ids / l{N}_outlook_ids
6. **注入策略元数据**：从 assets/common/strategy-level.md 的策略表中提取对应级别的标签和比例
7. 写入 `{workDir}/.meta/brainstorm/anchors.json`

**anchors.json 格式**：详见 `assets/00-intent-anchor/schemas.md`§anchors

---

## 输出

- 文件：`{workDir}/.meta/brainstorm/anchors.json`
- 摘要(stdout,≤150 字)：域上下文、年限推断结果及依据、锚点数量、跳过判断结果

## 校验清单

- [ ] anchors.json 包含 topic、target_level、year_inference_trace、strategy、anchors 字段
- [ ] 每个锚点包含 id、name、provisional_level、provisional_role、reasoning、description、type、tags
- [ ] 锚点数量 8-15 个
- [ ] 核心锚点的 reasoning 说明了"为什么属于核心区域"
- [ ] strategy 元数据从 strategy-level.md 策略表提取，与 target_level 一致
- [ ] 年限推断有明确依据（显式匹配或隐式信号记录）

## 异常处理

| 场景 | 处理 |
|------|------|
| 年限推断置信度低(无显式信号,隐式信号冲突) | 默认 L2,在 ⓩ 检查点展示推断依据请用户确认 |
| 用户指令已足够明确(topic+year+platform 齐全) | 跳过头脑风暴,直接进入 Step ② |
| 锚点数量不足(<8) | 提示用户补充信息，或降低核心锚点门槛 |

## 检查点

🚨 **🛑 必须停顿,进入 ⓩ 检查点**。展示骨架摘要(域上下文、年限推断结果及依据、策略元数据、锚点列表、跳过判断结果),使用 `clarify` 等待用户确认后才决定下一步。

用户可在此检查点:
- **修正年限推断**(如推断为 L2 但实际是 L3)
- 补充遗漏的锚点
- 删除不需要的锚点
- 调整跳过判断结果（强制走/不走头脑风暴）
