# Step ③: 原子能力提取

## 目的

从所有命题的分词结果中提取原子能力，计算扇出度，预查找每个能力的参考 URL，产出 `capability-graph.json`。

## 前置条件

⛔ 加载：
- `core/capability-graph.md`（能力图谱方法论）
- `core/architecture-decomposition.md`（分词方法论，理解分词输出格式）
- `meta/output-contracts.md`§3（本步输出格式）
- `meta/sources.md`（T0 域名表，用于信源预查找）
- `{workDir}/.meta/decompositions.json`（Step 02 产出）
- `{workDir}/.meta/raw-materials.json`（Step 01 产出）

> **🔒 上下文隔离**
> - ✅ 允许读取：`processes/00-shared.md`、`core/capability-graph.md`、`core/architecture-decomposition.md`（分词方法论，理解分词输出格式）、`meta/output-contracts.md`§3、`meta/sources.md`（T0 域名表，用于信源预查找）、`{workDir}/.meta/decompositions.json`（Step 02 产出）、`{workDir}/.meta/raw-materials.json`（Step 01 产出）
> - ❌ 禁止读取：`processes/01~02.md`、`processes/04~06.md`、`processes/07~10.md`、`core/strategic-highground.md`、`core/scenario-matrix.md`、`plugins/*.md`
> - 📌 `output-contracts.md` 只读 §3 节；`sources.md` 只读 T0 域名表

## 输入

- `decompositions.json`（Step ② 产出）
- `raw-materials.json`（Step ① 产出，含 URL）

## 执行步骤

### 1. 逐命题提取原子能力

对每个命题的 `generic_core` + `specialization`，逐层拆解：
- 每个独立可学习的技术能力 → 一个原子能力
- 命名规范：`<技术域>-<能力描述>`
- ID 规范：`A1`=通用, `V1`=Vue, `R1`=React, `W1`=Webpack, `VI1`=Vite

### 2. 去重与合并

跨命题去重：相同能力合并为一条，保留最高 Tier 来源。用 `covers` 字段记录该能力覆盖哪些命题。

**合并/拆分决策记录**：
- 合并：当多个命题中的相似能力被合并为一个时，记录 `merge_trace`："{能力A}（来自命题X）与 {能力B}（来自命题Y）合并为 {合并后ID}，原因：{为什么是同一个能力}"
- 拆分：当一个粗粒度能力被拆分为多个细粒度能力时，记录在被拆分出的能力上：`split_trace`："从 {原能力} 中拆分，原因：{为什么需要拆分}"

### 3. 标注依赖关系

每个能力的前置依赖（A 依赖 B = 理解 A 之前必须先理解 B）。
- 基础能力：`dependencies: []`
- 下游能力：引用上游能力 ID

**依赖决策记录**：每个非空 `dependencies` 必须附带 `dependencies_trace`，说明为什么 A 依赖 B：
```
"{能力A} 依赖 {能力B}，因为：{具体的技术原因，如'A 的触发时机取决于 B 的调度机制'}"
```

### 4. 计算扇出度

```
扇出度 = 该能力出现在多少个命题 / 总命题数
```

记录为对象：`{ "count": 2, "total": 3, "ratio": "2/3", "level": "67%" }`

### 5. 限定词注入分析

分析不同限定词向命题注入的特化能力集，记录为：
```json
{
  "React": {
    "injects": ["R1-React渲染架构"],
    "replaces": []
  }
}
```

### 6. 信源 URL 预查找（双轨）

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

### 7. 写入

按 `meta/output-contracts.md` §3 的示例格式，构造 `capability-graph.json`。

写入前自动将 `decompositions.json` 的命题数据注入 `propositions` 字段（减少后处理对 decompositions.json 的依赖）。同时为每个命题注入 `capability_ids`（从 `generic_core` + `specialization` 中扁平提取），供后处理 task 模板直接引用。

写入 `{workDir}/.meta/capability-graph.json`。

## 输出

- 文件：`{workDir}/.meta/capability-graph.json`
- 摘要（stdout）：能力数量、扇出度 Top 3、T0 缺失情况

## 校验清单

- [ ] 每个能力包含：id, name, layer, description, fanout(对象), coupling, covers, dependencies, tags, references
- [ ] fanout 是对象 `{count, total, ratio, level}`，不是数字
- [ ] dependencies 存在（空数组表示无前置依赖）
- [ ] 非空 dependencies 附带 `dependencies_trace`
- [ ] 合并过的能力附带 `merge_trace`
- [ ] 拆分过的能力附带 `split_trace`
- [ ] references.t0 中每个 URL 都 verified: true
- [ ] t0_missing 字段存在
- [ ] propositions 字段已注入
- [ ] 每个 proposition 包含 capability_ids（从 generic_core + specialization 扁平提取）
- [ ] dependency_graph 和 qualifier_injection 为顶层字段
- [ ] JSON 格式符合 output-contracts.md §3 示例

## 异常处理

| 场景 | 处理 |
|------|------|
| T0 信源全部不可达 | 标记 t0_missing，用 T1/T2 补充 |
| 能力数量过多（>30） | 提示用户用 --filter 缩小范围，标记 overload: true |
| 同一能力多命题定义冲突 | 保留最详细描述，其他合并到 covers |
