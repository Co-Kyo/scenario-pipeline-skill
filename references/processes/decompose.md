# Process: 架构分词 (decompose)

> 对技术命题执行架构分词，识别通用内核与特化层。

## 输入

- `raw_materials`：扫描阶段的原始素材（来自 processes/scan.md 的输出，含 title/url/summary）
- `proposition`：命题文本（从 raw_materials 中提取/构造，如"Vue3 虚拟列表：万级数据渲染"）
- `qualifier_context`：限定词上下文（可选，如框架/平台/架构模式）

> 注：编排层（pre-process.md）负责从 raw_materials 中提取命题文本传入本步骤。如果直接调用本步骤，需自行提供 proposition。

## 加载清单

> ⛔ **L3 执行前置条件**

```
必须加载：core/architecture-decomposition.md（分词方法论）
理由：分词的核心原则（标注不是拆分、通用内核vs特化层、内容权重判定）定义在此文件中
```

## 执行步骤

> ⛔ **Schema 强制**：在执行以下任何步骤前，必须先调用 MCP `get_output_schema(step="decompose")`，
> 拿到 template + field_rules + strict_notes。按 schema 标准构造输出数据，
> 完成后调用 `submit_output(step="decompose", data=..., workDir=...)` 校验并写入。
> 不调 get_output_schema 直接执行 = 格式不匹配必然返工。

### Step 1：识别限定词与技术栈关键词

从命题中区分：
- **限定词**：指定框架/平台/工具的词（Vue、React、小程序、Webpack...）
- **技术栈关键词**：指向底层工程机制的词（虚拟列表、缓存、沙箱、diff...）

### Step 2：向上展开依赖链

问：技术栈关键词**依赖**什么底层能力？

### Step 3：向下展开被依赖链

问：技术栈关键词**被**哪些上层场景使用？

### Step 4：分层标注

标注 [通用内核] 和 [特化层]，**不拆分命题**。

### Step 5：确定内容权重

| 通用内核占比 | 条件 |
|------------|------|
| ≥ 80% | 通用层跨 3+ 技术栈层级，深度远超框架层 |
| 60-80% | 通用层跨 2-3 层，框架层有一定深度 |
| 40-60% | 通用层和框架层深度相当 |
| < 40% | 框架层深度为主 |

## 输出

输出格式由 MCP `get_output_schema(step="decompose")` 定义，包含 template + field_rules + strict_notes。
写入前调用 MCP `submit_output(step="decompose", data=..., workDir=...)` 自动校验。

## 异常与 Fallback

| 异常场景 | 触发条件 | 处理动作 |
|---------|---------|---------|
| 命题过粗 | 分词后通用内核跨 5+ 技术层 | 建议用户拆分为多个独立命题，或按最高扇出度的 3 层聚焦研究 |
| 命题过细 | 分词后仅 1 个技术点 | 标记为"原子命题"，跳过深度研究，仅做基础评估 |
| 限定词无法识别 | 命题中包含未知框架/工具名 | 标记 `qualifier_unknown: true`，按通用内核处理，收尾不回归限定词 |
| 分词词库未覆盖 | 技术栈关键词不在词库中 | Agent 自行判断层级归属，在分词词库中追加该关键词，标记 `dictionary_extended: true` |
| 通用内核为空 | 分词后无通用层 | 按纯框架特化命题处理，通用占比 < 40%，产出以框架 API 讲解为主 |

## 依赖

- 无（可独立执行）

## 参考

- [必须加载] core/architecture-decomposition.md（分词方法论）— 已在加载清单中标注
- [条件加载] plugins/year-granularity.md（年限过滤，按需加载）
