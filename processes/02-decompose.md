# Step ②: 架构分词

## 目的

将复合场景拆解为命题，每个命题分解为「通用内核 + 特化层」的分词结构。

## 前置条件
⛔ 加载：
- `core/architecture-decomposition.md`（分词方法论）
- `meta/output-contracts.md`§2（本步输出格式）
- `{workDir}/.meta/raw-materials.json`（Step 01 产出）

> **🔒 上下文隔离**
> - ✅ 允许读取：`core/shared-conventions.md`、`core/architecture-decomposition.md`、`meta/output-contracts.md`§2、`{workDir}/.meta/raw-materials.json`（Step 01 产出）
> - ❌ 禁止读取：`processes/01.md`、`processes/03~06.md`、`processes/07~10.md`、`core/capability-graph.md`、`core/strategic-highground.md`、`core/scenario-matrix.md`、`plugins/*.md`
> - 📌 `output-contracts.md` 只读 §2 节

## 输入

- `raw-materials.json`（Step ① 产出）
- 用户指令中的主题描述

## 执行步骤

### 1. 识别命题

从扫描素材中识别独立的研究命题。每个命题是一个可独立研究的工程场景。

**命题识别标准**：
- 能用一句话描述一个具体的工程问题或场景
- 有明确的技术关键词
- 可以独立进行深度研究

**识别依据记录**：每个命题必须记录 `identification_trace`，说明：
- 该命题从哪些素材中提取（素材 ID 列表）
- 为什么判定为独立命题（满足哪几条识别标准）
- 如果原始素材中有类似场景被合并或排除，说明原因

### 2. 逐命题分词

对每个命题，拆解为：

- **通用内核**（generic_core）：框架无关的技术能力，按技术层分组
  - 浏览器层、网络层、工程层、工具层等
- **特化层**（specialization）：框架/平台特有的技术能力
  - 仅当命题有限定词（如 React、Vue、Webpack）时才有此层

### 3. 标注内容权重

- 纯通用命题 → `content_weight: "100%"`
- 有限定词 → 通用占比 + 特化占比（如 `"70%"` + `"30%"`）

### 4. 写入

按 `meta/output-contracts.md` §2 的示例格式，构造 `decompositions.json`，写入 `{workDir}/.meta/decompositions.json`。

## 输出

- 文件：`{workDir}/.meta/decompositions.json`
- 摘要（stdout）：命题数量、每个命题的通用/特化能力数

## 校验清单

- [ ] 每个命题包含 proposition_id、proposition、generic_core、specialization、content_weight
- [ ] generic_core 按技术层分组
- [ ] specialization 仅在有限定词时存在
- [ ] content_weight 与 specialization 对应（有 specialization → content_weight < 100%）
- [ ] 每个命题包含 identification_trace（含素材来源、判定理由、合并/排除说明）

## 异常处理

| 场景 | 处理 |
|------|------|
| 素材太少无法识别命题 | 提示用户补充信源 |
| 命题过多（>10） | 提示用户用 `--filter` 缩小范围 |
| 同一素材可归入多个命题 | 允许重叠，后续 capability-extract 会去重 |
