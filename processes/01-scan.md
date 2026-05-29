# Step ①: 广域扫描

## 目的

基于头脑风暴产出的需求网，为每个命题按其 level_weight 差异化搜索信源，抓取内容并结构化提取，按信源质量分级，产出 `.raw-materials/` 目录（index.json + 多 markdown 文件）。

## 前置条件

读取 `meta/sources.md`（T0 域名表 + 信源分级规则）+ `meta/output-contracts.md`§1（本步输出格式）。本步骤不需要读取任何 core/*.md。

如果 `requirement-web.json` 存在（头脑风暴已执行），读取该文件作为精准输入——**必须消费其中的 level_weight、search_keywords、search_guidance、scope 字段**。

> **🔒 上下文隔离**
> - ✅ 允许读取：`core/shared-conventions.md`、`meta/sources.md`、`meta/output-contracts.md`§1、`{workDir}/.meta/requirement-web.json`（如存在）
> - ❌ 禁止读取：`processes/02~07.md`、`core/*.md`、`plugins/*.md`（`--year` 参数存在时，`plugins/year-granularity.md` 除外）
> - 📌 `output-contracts.md` 只读 §1 节，不要读其他章节

## 输入

- 用户指令中的信息源描述（source_desc）
- 目标主题（topic）
- 可选约束：`--year`、`--source=<url>`
- **可选**：`requirement-web.json`（头脑风暴产出，如存在则作为精准输入）

## 执行步骤

### 0. 读取密度参数（requirement-web.json 存在时）

从 requirement-web.json 中提取以下字段，用于驱动后续搜索行为：

- **`strategy`**：core/premise/outlook 的标签和比例
- **`propositions[].level_weight`**：每个命题的 role（core/premise/outlook）
- **`search_guidance`**：全局搜索策略（global_keywords、excluded_keywords、preferred_domains、depth_filter）
- **`scope.exclusions`**：排除项列表

**从 `core/shared-conventions.md` 策略表中查表**，获取当前 target_level 对应的 scan 密度参数：

```
读取 shared-conventions.md §策略表，定位当前 target_level 行，取：
  core:   kw={N}, r={M}     ← 关键词组数，每组取结果数
  premise: kw={N}, r={M}
  outlook: kw={N}, r={M}
```

### 1. 信源采集（按 role 差异化搜索）
对所有搜索结果（含 T0 命中和未命中的），执行 web_fetch 抓取完整页面内容。T0 域名不再跳过抓取——抓取是内容提取的前提。

**抓取失败处理**：403/404/429/超时 → 标记 `fetch_status: "failed"` + `fetch_status_trace`，跳过该条的后续提取步骤，但仍保留 URL 信息用于 scan_summary 统计。

### 1.5 内容提取（结构化）

对每条 fetch_status 为 "ok" 的 material，从抓取的完整页面内容中提取结构化信息：

**提取字段**：
```json
{
  "content_extract": {
    "key_concepts": ["核心概念1", "核心概念2"],
    "capability_points": [
      {
        "name": "能力点名称",
        "layer": "技术层级（如：浏览器层/工程层/框架层）",
        "description": "一句话描述",
        "key_insight": "该来源对此能力点的核心观点"
      }
    ],
    "code_examples": ["代码示例摘要（如有）"],
    "depth_level": "概念级|机制级|原理级|架构级",
    "quality_signals": {
      "has_code": true,
      "has_diagram": false,
      "has_benchmark": true,
      "word_count": 3500
    }
  }
}
```

**提取规则**：
- `key_concepts`：提取文中明确讨论的核心技术概念（3-8 个）
- `capability_points`：提取文中涉及的原子能力点，每个能力点标注技术层级和核心观点
- `depth_level`：根据内容深度判定——概念级（定义是什么）< 机制级（怎么工作的）< 原理级（为什么这样设计）< 架构级（如何选型/演进/治理）
- `quality_signals`：客观质量指标，不依赖主观判断

### 1.6 多源交叉比较

按 capability_points.name 分组，对**同一能力点被多个来源覆盖**的情况进行交叉比较：

**比较维度**：
- **一致性**：多个来源对该能力点的描述是否一致？
- **互补性**：不同来源是否提供了不同侧面的信息？（如：一个讲原理，一个讲实践）
- **矛盾性**：不同来源是否存在冲突观点？（如：关于某方案的优劣判断相反）
- **深度差异**：同一能力点在不同来源中的 depth_level 是否有差异？

**比较产出格式**：
```json
{
  "cross_source_comparison": [
    {
      "capability_point": "模块解析策略",
      "covered_by": ["M1", "M3", "M7"],
      "agreement": "多个来源一致认为 ESM 是现代模块解析的核心",
      "complement": "M1 侧重 webpack 配置，M3 侧重原理解析，M7 侧重性能对比",
      "contradiction": "",
      "depth_variance": "M1=机制级, M3=原理级, M7=架构级",
      "synthesis": "综合来看：模块解析应从 ESM 规范入手，理解 webpack 的 resolve 机制，再关注构建性能优化"
    }
  ]
}
```

**比较规则**：
- 仅对被 ≥2 个来源覆盖的能力点做比较
- 单源覆盖的能力点标记 `coverage: "single_source"`，不做比较
- `synthesis`（综合判断）是为下游 ②④⑥ 提供的高价值摘要


#### 模式 A：requirement-web.json 存在（定向模式）

对每个命题，**按其 `level_weight.role` 决定搜索策略**：

**core 命题（深度搜索）**：
- **轨道 1 — T0 定向**：用命题的 `search_keywords.principles` + `search_keywords.practices` 拼接 `site:<domain>` 搜索
  - 每个 T0 域名取 min(r, 2) 条结果（r 来自策略表）
  - 两类关键词（principles + practices）**都执行**
- **轨道 2 — 自由搜索**：用命题的 `search_keywords` 直接搜索，不限域名
  - 关键词组数 = 策略表 core 的 kw 值
  - 每组取 r 条结果
- **过滤**：用 `scope.excluded_keywords` + `search_guidance.excluded_keywords` 过滤搜索结果
- **域偏好**：优先保留 `search_guidance.preferred_domains` 中的结果

**premise 命题（浅扫）**：
- **仅轨道 1 — T0 定向**：只用 `search_keywords.principles` 拼接 `site:<domain>` 搜索
  - 每个 T0 域名取 min(r, 2) 条结果
  - **不执行 practices 搜索**
- **不执行轨道 2（自由搜索）**
- 如果 T0 无结果，用 global_keywords 做一次兜底搜索，取 1-2 条

**outlook 命题（确认存在）**：
- **单次搜索**：用 `search_keywords.principles` 的第一个关键词做一次搜索
- 取 min(r, 2) 条结果
- 目标是确认该方向有内容存在，标注方向即可

每个命题独立搜索，结果按命题 ID 标记来源（`from_proposition: "RW-P1"`）。

**search_guidance 的消费方式**：
- `global_keywords`：在自由搜索时作为补充关键词
- `excluded_keywords`：在所有搜索结果中过滤（排除不相关内容）
- `preferred_domains`：搜索结果中优先保留这些域名的内容
- `depth_filter`：在搜索关键词中体现（如"跳过入门教程"）

#### 模式 B：requirement-web.json 不存在（原始模式）

按原始逻辑执行，不做 role 差异化：

**轨道 A — T0 定向搜索**：读取 `meta/sources.md` 的 T0 域名表，逐个搜索：
```
web_search "<topic> site:<domain>"
```
每个域名取前 2 条结果。

**轨道 B — 自由搜索**：不限域名，多路搜索覆盖不同维度：
- 原理类关键词（"xxx 原理"、"xxx 机制"）
- 实践类关键词（"xxx 最佳实践"、"xxx 优化"）
- 面试类关键词（"xxx 面试题"、"xxx 常考"）
每路取 5-10 条结果。

### 2. 提取域名

从所有搜索结果中提取域名，去重。（此步在内容提取之后，域名信息已从 fetch 过程中获取）

### 3. 信源分级

将域名列表与 `meta/sources.md` 的 T0 表比对：
- 命中 T0 → 直接标记 `source_tier: "T0"`（无需 trace，T0 是硬编码规则）
- 未命中 → 进入 Step 4 评估

### 4. 内容评估（unknown 域名）

对 unknown 域名的搜索结果，web_fetch 抓取内容，按 `meta/sources.md` §Tier 定义的评估标准判定：
- 达标 → 标记对应 Tier（T1/T2/T3），**同时写入 `source_tier_trace`**
- 不达标 → 记录到 `discarded` 列表（含 url、domain、丢弃原因），**不直接丢弃**

**`source_tier_trace` 写入要求**：
```
"{域名} 不在 T0 表中。web_fetch 验证内容：{内容摘要1-2句}。Tier 评估：{哪几个维度达标/不达标}，判定为 {tier}。"
```

**`discarded` 条目格式**：
```json
{
  "url": "...",
  "domain": "...",
  "discard_reason": "内容不达标：正文<200字 / 内容与主题不相关 / 403/超时"
}
```

### 5. 动态注册

Step 4 中达标的 unknown 域名，直接写入 `{workDir}/.meta/sources/dynamic-sources.json`：

```json
{
  "cloud.tencent.com": {
    "tier": "T2",
    "reason": "腾讯云官方技术社区，setData 性能优化文章质量高",
    "discovered_by": "scan/2026-05-20",
    "discovered_at": "2026-05-20T10:00:00Z"
  }
}
```

### 6. 合并排序

按 Tier 排序：T0/T1 优先 → T2 → T3。同话题多源覆盖时保留最高 Tier。

**定向模式额外规则**：按命题的 `level_weight.role` 分组统计：
- 每个 core 命题的目标素材数 = 策略表 r 值
- 每个 premise 命题的目标素材数 = 策略表 r 值
- 每个 outlook 命题的目标素材数 = min(r, 2)

### 7. 写入

按 `meta/output-contracts.md` §1 的示例格式，写入 `{workDir}/.meta/.raw-materials/` 目录。

**输出结构**：
```
.raw-materials/
├── index.json                    ← 索引（元数据 + 关系 + 统计）
├── M1-rendering-performance.md   ← 每条 material 一个 markdown
├── M2-setdata-optimization.md
├── ...
└── cross-comparison.md           ← 多源交叉比较
```

**index.json 写入规则**：
- `materials[]` 数组：每条保留轻量元数据（id、title、url、domain、source_tier、from_proposition、relevance、fetch_status、depth_level）+ `file_path`（指向对应 markdown 文件的相对路径）
- 不在 index.json 中存储 content_extract 全文——内容在对应 markdown 文件中
- `discarded[]` 数组：被丢弃的素材列表
- `scan_summary` 对象：按 role 统计搜索覆盖情况

**每条 material 的 markdown 文件写入规则**：
- 文件名：`{id}-{slug}.md`（slug 从 title 提取，小写+连字符）
- 文件内容包含：
  - 标题（# title）
  - URL 和 source_tier 信息
  - source_tier_trace（如有）
  - `## 内容提取`：完整的 content_extract 结构化内容（key_concepts、capability_points、code_examples、quality_signals）
  - `## 原文摘要`：原文的关键段落摘录（2-5 段，保留技术细节）
- fetch_status="failed" 的 material：只写标题 + URL + 失败原因，不写内容提取

**cross-comparison.md 写入规则**：
- 从 cross_source_comparison 数组生成
- 每个被比较的能力点一个 `## {capability_point}` 章节
- 包含：covered_by、agreement、complement、contradiction、depth_variance、synthesis
- 仅包含被 ≥2 个来源覆盖的能力点

**必须写入**：
- `{workDir}/.meta/.raw-materials/index.json`：索引文件
- `{workDir}/.meta/.raw-materials/{id}-{slug}.md`：每条 material 的内容文件
- `{workDir}/.meta/.raw-materials/cross-comparison.md`：多源交叉比较文件

**`scan_summary` 格式**：
```json
{
  "scan_summary": {
    "total_propositions": 8,
    "by_role": {
      "core": { "count": 5, "avg_materials_per_proposition": 6.2, "target_avg": 8 },
      "premise": { "count": 2, "avg_materials_per_proposition": 2.5, "target_avg": 3 },
      "outlook": { "count": 1, "avg_materials_per_proposition": 1.0, "target_avg": 2 }
    },
    "density_compliance": "core 5/5 命题达到目标素材数",
    "search_guidance_consumed": true,
    "scope_exclusions_applied": 3
  }
}
```

## 输出

- 目录：`{workDir}/.meta/.raw-materials/`（index.json + {N} 个 markdown + cross-comparison.md）
- 摘要（stdout，≤300 字）：信源数量、Tier 分布、按 role 的搜索覆盖统计、Top 3 素材

## 校验清单
- [ ] .raw-materials/ 目录已创建，包含 index.json + 对应 markdown 文件 + cross-comparison.md
- [ ] index.json 中每条 material 有 file_path 指向对应 markdown
- [ ] index.json 中不包含 content_extract 全文（内容在 markdown 中）
- [ ] 每个 material markdown 包含：标题、URL、source_tier、内容提取、原文摘要
- [ ] fetch_status="failed" 的 material markdown 只写标题+URL+失败原因
- [ ] cross-comparison.md 包含所有被 ≥2 个来源覆盖的能力点比较
- [ ] 定向模式下 index.json 每条 material 包含 from_proposition 字段

- [ ] requirement-web.json 存在时，每个命题的 level_weight.role 已被读取
- [ ] core 命题执行了 principles + practices 双轨搜索
- [ ] premise 命题仅执行了 principles 搜索（未执行 practices 和自由搜索）
- [ ] outlook 命题仅执行了单次确认搜索
- [ ] 搜索密度参数（kw/r）与 shared-conventions.md 策略表一致
- [ ] search_guidance.excluded_keywords 和 scope.exclusions 已用于过滤
- [ ] 每条 material 包含 id、title、url、domain、source_tier、relevance、fetch_status
- [ ] fetch_status="ok" 的 material 包含 content_extract（含 key_concepts、capability_points、depth_level、quality_signals）
- [ ] fetch_status="failed" 的 material 不包含 content_extract，但包含 fetch_status_trace
- [ ] cross_source_comparison 仅包含被 ≥2 个来源覆盖的能力点
- [ ] cross_source_comparison 每条含 agreement/complement/contradiction/synthesis
- [ ] 定向模式下每条 material 包含 from_proposition 字段
- [ ] source_tier 来自 T0 表或内容评估，非凭空填写
- [ ] unknown 域名的 material 包含 `source_tier_trace`
- [ ] `fetch_status: "failed"` 的 material 包含 `fetch_status_trace`
- [ ] 被丢弃的素材记录在 `discarded` 数组中（含 `discard_reason`）
- [ ] 动态注册的域名已写入 dynamic-sources.json
- [ ] .raw-materials/index.json 包含 scan_summary 统计
- [ ] JSON 格式符合 output-contracts.md §1 示例

## 异常处理

| 场景 | 处理 |
|------|------|
| web_search 全部无结果 | 换关键词重试，或提示用户补充 `--source=<url>` |
| web_fetch 超时/403 | 标记 `fetch_status: "failed"` + `fetch_status_trace: "超时/403/429/内容不相关"`，跳过该条 |
| 所有域名都是 unknown | 全部 web_fetch 评估，不依赖 T0 表 |
| premise 命题 T0 无结果 | 用 global_keywords 兜底搜索一次，取 1-2 条 |
| outlook 命题搜索无结果 | 标记 `search_status: "not_found"`，不阻塞流程，该命题在后续步骤中标记为"方向待验证" |
| core 命题素材数低于策略表 r 值 | 在 scan_summary 中标注缺口，不阻塞流程，后续步骤可感知覆盖不足 |

## 检查点

🚨 **🛑 必须停顿，进入 ⓐ 检查点**。展示信源质量摘要（Tier 分布、素材数、丢弃数、按 role 的搜索覆盖统计），使用 `clarify` 等待用户确认后才进入 Step ②。
