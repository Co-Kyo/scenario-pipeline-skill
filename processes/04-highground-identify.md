# Step ④: 战略高地识别

## 目的

从能力图谱中识别战略高地——覆盖最多命题、对学习路径影响最大的核心能力。

## 前置条件

⛔ 加载 `core/strategic-highground.md`（战略高地方法论）。

## 输入

- `capability-graph.json`（Step ③ 产出）

## 执行步骤

### 1. 按扇出度排序

从 capability-graph.json 中按 `fanout.count` 降序排列能力。

### 2. 识别战略高地

扇出度 ≥ 50% 的能力标记为战略高地：
- 一级高地：扇出度 ≥ 80%
- 二级高地：扇出度 ≥ 50% 且 < 80%

### 3. 生成学习路径

按以下规则排序：
1. 战略高地优先（一级 → 二级）
2. 同级别内按依赖拓扑排序（基础能力在前）
3. 非高地能力按扇出度降序

### 4. 写入

按 `meta/output-contracts.md` §4 的示例格式，写入 `{workDir}/.meta/highgrounds.json`。

## 输出

- 文件：`{workDir}/.meta/highgrounds.json`
- 摘要（stdout）：战略高地数量、Top 3 能力、学习路径前 5

## 校验清单

- [ ] highgrounds 数组中的每个能力在 capability-graph.json 中存在
- [ ] strategic_value = fanout.count
- [ ] learning_path 包含所有能力
- [ ] learning_path 顺序符合拓扑排序

## 异常处理

| 场景 | 处理 |
|------|------|
| 所有能力扇出度相同 | 按 coupling 升序（耦合度低的优先） |
| 依赖图有环 | 打断循环依赖，标记 warning |
