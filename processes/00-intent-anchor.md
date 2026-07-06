# Step 00: 意图锚定

**目的**：接收用户指令，推断年限，生成基础骨架（anchors.json），决定是否需要头脑风暴

**核心流程**：
1. 轻量提取 → 从原文中获取 topic + tech_stack
2. 年限判定 → 按优先级链推断 target_level + 生成推断依据
3. 跳过判断 → 判断是否需要头脑风暴
4. 生成骨架 → 提取锚点，标注 role，注入策略，写入 anchors.json

**关键产出**：`{workDir}/.meta/brainstorm/anchors.json`

---

## 文件引用

| 变量 | 文件 | 说明 |
|------|------|------|
| `{{schemas-anchors}}` | `assets/00-intent-anchor/schemas.md`§anchors | anchors.json 格式定义 |
| `{{year-rules}}` | `assets/00-intent-anchor/year-rules.md` | 年限推断规则 |
| `{{skip-rules}}` | `assets/00-intent-anchor/skip-rules.md` | 跳过判断规则 |
| `{{strategy-level}}` | `assets/common/strategy-level.md` | 动态策略表 |

## 输入

- 用户指令原文（raw_input）

---

## 执行步骤

### 1. 轻量提取

从 `raw_input` 中提取：
- `topic`：主题关键词（如"webpack & vite"）
- `tech_stack`：具体工具/框架名列表
- `--year`：显式年限参数（如有）

此步骤为后续阶段准备数据，不产出文件。

### 2. 年限判定

按 `{{year-rules}}` 的优先级链推断 `target_level`：

1. 显式参数 `--year` → 直接采用（最高优先级）
2. 原文中的显式数字（如"3-5年"）→ 查阶梯映射
3. 隐式信号（职级词/岗位词/场景词/深度词）→ 取众数
4. 无信号 → 默认 L2

**产出**：
- `target_level`：L1/L2/L3/L4
- `year_inference_trace`：推断依据（必须记录匹配到的信号）

### 3. 跳过判断

按 `{{skip-rules}}` 判断是否跳过头脑风暴。**全部满足才跳过**：

1. **topic 明确**：tech_stack 每个词都是具体工具/框架名，且不含"原理"、"实践"、"架构"等抽象维度词
2. **year 有值**：阶段 2 推断出了 target_level，且置信度为高（有显式数字匹配或多个一致隐式信号）
3. **无场景化拦截**：raw_input 不含"面试"、"场景"、"分析"、"复杂"等场景化关键词

| 结果 | 行动 |
|------|------|
| 全部满足 | 跳过 Step 01，直接进入 Step 03 |
| 任一不满足 | 进入 Step 01（头脑风暴） |

### 4. 生成骨架

从 topic 中提取 8-15 个核心技术关键词，为每个标注 `provisional_level` + `provisional_role`，注入策略元数据，写入 `anchors.json`。

#### 4.1 提取锚点

1. 从 `raw_input` + tech_stack 中提取核心技术关键词
2. 为每个关键词分配临时 ID（T1, T2, ...），附一句话描述
3. 区分 generic / specialized 属性

#### 4.2 标注 role

按 `target_level` 和锚点的客观技术层级，标注 `provisional_role`：

| role | level 约束 | 含义 |
|------|-----------|------|
| `core` | = target_level | 目标年限必须掌握 |
| `premise` | = target_level - 1 | 低于目标年限的前置知识 |
| `outlook` | = target_level + 1 | 高于目标年限的展望 |

**level 与 role 的强制约束**：core → level=target_level; premise → level=target_level-1; outlook → level=target_level+1

#### 4.3 注入策略元数据

从 `{{strategy-level}}` 的策略表中，按 `target_level` 提取：
- `core_label` / `premise_label` / `outlook_label`
- `ratios`（各 role 占比）
- 扫描密度、研究深度等参数

#### 4.4 写入 anchors.json

按 `{{schemas-anchors}}` 格式写入 `{workDir}/.meta/brainstorm/anchors.json`。

---

## 输出

- 文件：`{workDir}/.meta/brainstorm/anchors.json`
- 摘要（stdout, ≤150 字）：域上下文、年限推断结果及依据、锚点数量、跳过判断结果

## 校验清单

- [ ] anchors.json 包含 topic、target_level、year_inference_trace、strategy、anchors 字段
- [ ] 每个锚点包含 id、name、provisional_level、provisional_role、reasoning、description、type、tags
- [ ] 锚点数量 8-15 个
- [ ] 核心锚点的 reasoning 说明了"为什么属于核心区域"
- [ ] strategy 元数据从 `{{strategy-level}}` 策略表提取，与 target_level 一致
- [ ] 年限推断有明确依据（显式匹配或隐式信号记录）

## 异常处理

| 场景 | 处理 |
|------|------|
| 年限推断置信度低（无显式信号，隐式信号冲突） | 默认 L2，在 Barrier 0 检查点展示推断依据请用户确认 |
| 用户指令已足够明确（topic+year 齐全） | 跳过头脑风暴，直接进入 Step 03 |
| 锚点数量不足（<8） | 提示用户补充信息，或降低核心锚点门槛 |

## 检查点

🚨 **🛑 必须停顿，进入 Barrier 0 检查点**。展示骨架摘要（域上下文、年限推断结果及依据、策略元数据、锚点列表、跳过判断结果），使用 `clarify` 等待用户确认后才决定下一步。

用户可在此检查点：
- **修正年限推断**（如推断为 L2 但实际是 L3）
- 补充遗漏的锚点
- 删除不需要的锚点
- 调整跳过判断结果（强制走/不走头脑风暴）
