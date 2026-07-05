# Step 04: 能力图谱构建

**目的**：跨命题去重合并原子能力，计算扇出度与战略价值，预查找参考 URL

**核心流程**：
1. 从 requirement-web 提取能力雏形
2. 跨命题去重与合并（名称+层级匹配 → 内容语义比对）
3. 标注依赖关系（技术层级 → 内容引用 → covers 交集）
4. 信源 URL 预查找（复用 scan → 补搜）
5. 战略高地识别 + 学习路径生成

**关键产出**：`capability-graph.json`（含 highgrounds + learning_path）

---

## 前置条件

加载：
- `assets/04-capability-graph/method.md`（能力图谱方法论）
- `assets/04-capability-graph/method.md`（战略高地方法论）
- `assets/04-capability-graph/schemas.md`（本步输出格式）
- `assets/common/ref-sources.md`（T0 域名表，用于信源预查找）
- `{workDir}/.meta/requirement-web.json`（01 产出，含 capability_web 和 decompositions）
- `{workDir}/.meta/.raw-materials/index.json`（02 产出索引，含 URL + 元数据）
- `{workDir}/.meta/.raw-materials/*.md`（02 产出内容文件，按需读取）

## 输入

- `requirement-web.json`（01 产出，含 capability_web + decompositions）
- `.raw-materials/index.json`（02 产出索引）+ 对应 markdown 内容文件

## 执行步骤

### 1. 从 requirement-web 提取能力雏形

从 `requirement-web.json` 的 `capability_web` 字段读取头脑风暴阶段产出的能力列表。每个能力已有：id、name、layer、type、depends_on、fanout、covers。

同时从 `decompositions`（嵌在各 proposition 中）读取分词结构（qualifier、generic_core、specialization、content_weight）。

### 2. 跨命题去重与合并

对所有命题的能力列表进行去重，分两轮：

**第一轮：名称+层级匹配**
- 相同能力（同名同层）→ 候选合并

**第二轮：内容语义比对**（利用 02 产出的 markdown 内容）
- 对候选合并的能力对，读取各自在 `.raw-materials/` 中匹配到的 markdown 文件
- 比对 `## 内容提取 > ### 能力点` 中的 `description` 和 `key_insight`
- **合并**：描述内容一致或高度重叠 → 合并为一条，保留最高 Tier 来源
- **不合并**：名字相同但描述指向不同方面 → 拆分为两条独立能力，各自保留 covers
- **标注**：合并的记录 `merge_trace`，拆分的记录 `split_trace`

**合并后处理**：
- 用 `covers` 字段记录该能力覆盖哪些命题
- 重新计算 fanout（合并后 covers 集合变大）

**合并/拆分决策记录**：
- 合并：当多个命题中的相似能力被合并为一个时，记录 `merge_trace`
- 拆分：当一个粗粒度能力被拆分为多个细粒度能力时，记录 `split_trace`

### 3. 标注依赖关系与 trace

基于 02 产出的 markdown 内容，辅助推断能力间的依赖关系：

**推断依据**（按优先级）：
1. **技术层级关系**：从 markdown 的 capability_points 中读取 `layer` 字段。不同层之间存在自然依赖——框架层能力通常依赖浏览器层能力，工程层能力通常依赖框架层能力
2. **内容中的前置引用**：从 markdown 的 `description` 和 `key_insight` 中，检查当前能力的描述是否引用了其他能力的概念。如「模块解析依赖 npm 包管理提供的依赖树」→ 模块解析依赖 npm 包管理
3. **covers 交集**：同一命题下的多个能力，如果 covers 集合高度重叠，可能存在依赖

**推断结果处理**：
- 高置信度（多条依据一致）→ 直接写入 dependencies
- 中置信度（单条依据）→ 写入 dependencies，附带 `dependencies_trace` 说明推断来源
- 低置信度或无依据 → 不写入依赖，留空数组

非空 `dependencies` 必须附带 `dependencies_trace`。

### 4. 限定词注入分析

分析不同限定词向命题注入的特化能力集，记录为 `qualifier_injection`。

### 5. 信源 URL 预查找（先复用 02，再补搜）

**对每个原子能力，必须有参考 URL。** 优先从 02 scan 的产物中取，取不到的才补搜。

#### 5.1 从 02 结果复用

读取 `.raw-materials/index.json`，按以下逻辑匹配：

1. 该能力的 `covers` 字段 → 找到关联的命题 ID
2. 用命题 ID 匹配 `index.json` 中 `materials[].from_proposition` → 获取该命题下的所有材料
3. 对匹配到的材料，读取其 `file_path` 指向的 markdown 文件
4. 从 markdown 的 `## 内容提取 > ### 能力点` 中，按能力点 name 与当前能力做语义匹配
5. 匹配成功 → 取该材料的 URL 作为参考 URL，继承 `source_tier`，并将 markdown 中的 `## 内容提取` 整段复制为该能力的 content_extract

**复用的参考 URL 格式**：
```json
{
  "url": "https://...",
  "title": "...",
  "tier": "T0",
  "verified": true,
  "source": "scan_reuse",
  "from_material": "M1"
}
```

#### 5.2 补搜（仅对 02 未覆盖的能力）

如果某个能力在 02 的 `.raw-materials/index.json` 中没有匹配到任何材料，执行补搜：

**轨道 A — T0 定向**：
```
web_search "<能力名称> site:<域名>"
```
取第一个结果，web_fetch 验证（HTTP 200 + 内容 > 200 字 + 与能力相关）。

**轨道 B — 自由搜索 + 分级**：
```
web_search "<能力名称>"
```
提取域名，与 `assets/common/ref-sources.md` T0 表比对分级。unknown 域名 web_fetch 评估。

**质量校验**：
- 每个写入 JSON 的 URL 都必须 web_fetch 验证过
- `verified: true` 的写入条件：已爬取 + 内容与该能力相关
- 403/404/429 → 跳过；正文 < 200 字 → 跳过；内容不相关 → 跳过

**补搜的参考 URL 格式**：
```json
{
  "url": "https://...",
  "title": "...",
  "tier": "T1",
  "verified": true,
  "source": "supplementary_search"
}
```

#### 5.3 复用 scan 的内容提取

对于从 02 复用的 URL，**直接从对应 markdown 文件中复制 `## 内容提取` 整段**，不再重复抓取和提取。补搜的 URL 需要自行提取 content_extract 并写入新的 markdown 文件。

**复用的 content_extract 来源**：
- 从 `.raw-materials/{file_path}` 的 markdown 中读取 `## 内容提取` 段落
- 如果同一条 material 被多个能力匹配，每个能力都继承完整的 `## 内容提取`

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

按 `assets/04-capability-graph/schemas.md` 的示例格式，构造 `capability-graph.json`。

顶层必须包含 `highgrounds` 和 `learning_path` 字段。

命题数据由 05 evaluate-pool 直接读取 requirement-web.json，04 不注入 propositions 字段。

写入 `{workDir}/.meta/capability-graph.json`。

## 输出

- 文件：`{workDir}/.meta/capability-graph.json`（含 highgrounds + learning_path）
- 摘要（stdout）：能力数量、扇出度 Top 3、战略高地数量、学习路径前 5、T0 缺失情况

## 校验清单

- [ ] 每个能力包含：id, name, layer, description, fanout(对象), coupling, covers, dependencies, tags, references, content_extract
- [ ] fanout 是对象 `{count, total, ratio, level}`，不是数字
- [ ] dependencies 存在（空数组表示无前置依赖）
- [ ] 非空 dependencies 附带 `dependencies_trace`
- [ ] dependencies_trace 说明推断来源（层级关系/内容引用/covers交集）
- [ ] 合并过的能力附带 `merge_trace`
- [ ] 拆分过的能力附带 `split_trace`
- [ ] 同名但描述不同的能力已拆分为独立条目（非强制合并）
- [ ] references.t0 中每个 URL 都 verified: true
- [ ] references 中每条 URL 包含 source 字段（"scan_reuse" 或 "supplementary_search"）
- [ ] scan_reuse 的 URL 从对应 markdown 文件中复制了 `## 内容提取` 段落
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

🚨 **🛑 必须停顿，进入 Barrier 3 检查点**。展示能力图谱摘要（能力数量、扇出度 Top 3、战略高地、学习路径），使用 `clarify` 等待用户确认后才进入 Step 05。
