# Step ②: 架构分词

## 目的

将复合场景拆解为命题，每个命题分解为「通用内核 + 特化层」的分词结构。

## 前置条件

⛔ 加载 `core/architecture-decomposition.md`（分词方法论）。未加载而执行 = 降级为裸跑。

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

## 异常处理

| 场景 | 处理 |
|------|------|
| 素材太少无法识别命题 | 提示用户补充信源 |
| 命题过多（>10） | 提示用户用 `--filter` 缩小范围 |
| 同一素材可归入多个命题 | 允许重叠，后续 capability-extract 会去重 |
