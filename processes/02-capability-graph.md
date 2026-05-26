# Step ②: 能力图谱构建

## 目的

从头脑风暴的能力图谱雏形出发，结合扫描产出的信源，跨命题去重合并原子能力，计算扇出度与战略价值，预查找参考 URL，产出 `capability-graph.json`（含战略高地与学习路径）。

## 前置条件

⛔ 加载：
- `core/capability-graph.md`（能力图谱方法论）
- `core/strategic-highground.md`（战略高地方法论）
- `meta/output-contracts.md`§2（本步输出格式）
- `meta/sources.md`（T0 域名表，用于信源预查找）
- `{workDir}/.meta/requirement-web.json`（⓪ 产出，含 capability_web 和 decompositions）
- `{workDir}/.meta/raw-materials.json`（① 产出，含 URL）

> **🔒 上下文隔离**
> - ✅ 允许读取：`core/shared-conventions.md`、`core/capability-graph.md`、`core/strategic-highground.md`、`meta/output-contracts.md`§2、`meta/sources.md`、`{workDir}/.meta/requirement-web.json`、`{workDir}/.meta/raw-materials.json`
> - ❌ 禁止读取：`processes/01.md`、`processes/03~07.md`、`core/scenario-matrix.md`、`plugins/*.md`
> - 📌 `output-contracts.md` 只读 §2 节；`sources.md` 只读 T0 域名表

## 输入

- `requirement-web.json`（⓪ 产出，含 capability_web + decompositions）
- `raw-materials.json`（① 产出，含信源 URL）

## 执行步骤

### 1. 从 requirement-web 提取能力雏形

从 `requirement-web.json` 的 `capability_web` 字段读取头脑风暴阶段产出的能力列表。每个能力已有：id、name、layer、type、depends_on、fanout、covers。

同时从 `decompositions`（嵌在各 proposition 中）读取分词结构（qualifier、generic_core、specialization、content_weight）。

### 2. 跨命题去重与合并

对所有命题的能力列表进行去重：
- 相同能力（同名同层）合并为一条，保留最高 Tier 来源
- 用 `covers` 字段记录该能力覆盖哪些命题
- 重新计算 fanout（合并后 covers 集合变大）

**合并/拆分决策记录**：
- 合并：当多个命题中的相似能力被合并为一个时，记录 `merge_trace`
- 拆分：当一个粗粒度能力被拆分为多个细粒度能力时，记录 `split_trace`

### 3. 标注依赖关系与 trace

确认每个能力的前置依赖。非空 `dependencies` 必须附带 `dependencies_trace`。

### 4. 限定词注入分析

分析不同限定词向命题注入的特化能力集，记录为 `qualifier_injection`。

### 5. 信源 URL 预查找（双轨）

**对每个原子能力，必须预查找参考 URL。**

**轨道 A — T0 定向**：
读取 `meta/sources.md` 的 T0 域名表，逐个搜索：
```
web_search "<能力名称> site:<域名>"
```
- 取第一个结果
- web_fetch 验证：HTTP 200？内容 > 200 字？与能力相关？
- 通过 → 记录 URL + title，标记 `tier: "T0"`，`verified: true`
- 所有 T0 域名均无结果 → 标记 `t0_missing: true`，进入轨道 B

**轨道 B — 自由搜索 + 分级**：
- web_search "<能力名称>"（不限域名）
- 提取域名，与 `meta/sources.md` T0 表比对分级
- unknown 域名 web_fetch 评估 → 达标则按 Tier 定义归类
- 达标的 unknown 域名写入 dynamic-sources.json

**质量校验**：
- 每个写入 JSON 的 URL 都必须 web_fetch 验证过
- `verified: true` 的写入条件：已爬取 + 内容与该能力相关
- 403/404/429 → 跳过；正文 < 200 字 → 跳过；内容不相关 → 跳过

### 6. 战略高地识别

从能力图谱中识别战略高地——覆盖最多命题、对学习路径影响最大的核心能力。

**识别规则**：
- 计算战略价值：`strategic_value = fanout.count × (1 / coupling)`
- 一级高地：战略价值 ≥ 4.0
- 二级高地：战略价值 2.0 - 3.9
- 三级营地：战略价值 1.0 - 1.9

**高地依赖累积**：如果高地 A 依赖高地 B，则 B 的实际战略价值 += A 的战略价值。

**学习路径生成**：
1. 战略高地优先（一级 → 二级）
2. 同级别内按依赖拓扑排序（基础能力在前）
3. 非高地能力按战略价值降序

### 7. 写入

按 `meta/output-contracts.md` §2 的示例格式，构造 `capability-graph.json`。

写入时将 `requirement-web.json` 的命题数据注入 `propositions` 字段（减少后处理对 requirement-web 的依赖）。同时为每个命题注入 `capability_ids`（从 `generic_core` + `specialization` 中扁平提取）。

顶层必须包含 `highgrounds` 和 `learning_path` 字段。

写入 `{workDir}/.meta/capability-graph.json`。

## 输出

- 文件：`{workDir}/.meta/capability-graph.json`（含 highgrounds + learning_path）
- 摘要（stdout）：能力数量、扇出度 Top 3、战略高地数量、学习路径前 5、T0 缺失情况

## 校验清单

- [ ] 每个能力包含：id, name, layer, description, fanout(对象), coupling, covers, dependencies, tags, references
- [ ] fanout 是对象 `{count, total, ratio, level}`，不是数字
- [ ] dependencies 存在（空数组表示无前置依赖）
- [ ] 非空 dependencies 附带 `dependencies_trace`
- [ ] 合并过的能力附带 `merge_trace`
- [ ] 拆分过的能力附带 `split_trace`
- [ ] references.t0 中每个 URL 都 verified: true
- [ ] t0_missing 字段存在
- [ ] propositions 字段已注入（含 capability_ids）
- [ ] highgrounds 字段已注入（含 strategic_value）
- [ ] learning_path 字段已注入（拓扑排序）
- [ ] dependency_graph 和 qualifier_injection 为顶层字段
- [ ] JSON 格式符合 output-contracts.md §2 示例

## 异常处理

| 场景 | 处理 |
|------|------|
| T0 信源全部不可达 | 标记 t0_missing，用 T1/T2 补充 |
| 能力数量过多（>30） | 提示用户用 --filter 缩小范围，标记 overload: true |
| 同一能力多命题定义冲突 | 保留最详细描述，其他合并到 covers |
| 所有能力扇出度相同 | 按 coupling 升序（耦合度低的优先） |
| 依赖图有环 | 打断循环依赖，标记 warning |

## 检查点

🚨 **🛑 必须停顿，进入 ⓐ 检查点**。展示能力图谱摘要（能力数量、扇出度 Top 3、战略高地、学习路径），使用 `clarify` 等待用户确认后才进入 Step ③。
