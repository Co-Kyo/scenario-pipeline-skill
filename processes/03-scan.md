# Step 03: 广域扫描（两阶段管道）

**目的**：为每个命题按其 level_weight 差异化搜索信源，抓取内容并结构化提取

**核心流程**：
- Phase A：并行搜索（命题分批 → 搜索 agent → merge URL 列表）
- Phase B：并行提取（URL 分批 → 内容抓取 + 结构化提取）
- Phase C：主线程 merge（合并 partial index + 域名分级 + cross-comparison）

**关键产出**：`.raw-materials/` 目录（index.json + markdown 文件）

---

## 前置条件

读取：
- `assets/03-scan/schemas.md`（本步输出格式）
- `assets/common/ref-sources.md`（T0 域名表 + 反爬域名表 + 信源分级规则）

如果 `requirement-web.json` 存在（头脑风暴已执行），读取该文件作为精准输入——**必须消费其中的 level_weight、search_keywords、search_guidance、scope 字段**。

如果 `partition-analysis.json` 存在（02 分区已执行），**只处理 `current_session.proposition_ids` 中的命题**，按 `current_session.scan_batches` 分批执行。排期到 `deferred_sessions` 的命题不进入本轮 scan。

## 输入

- 用户指令中的信息源描述（source_desc）
- 目标主题（topic）
- 可选约束：`--year`、`--source=<url>`
- **可选**：`requirement-web.json`（头脑风暴产出，如存在则作为精准输入）

---

## Phase A：并行搜索（搜索发现）

> Phase A 对命题做搜索发现 URL。搜索本身按命题分批并行，主线程只做环境检查 + 分发 + merge。

### A0. 环境检查 + Playwright 前置确认

> **🔴 Playwright 安装决策必须在 Phase A 完成，不得延迟到 Phase B。**
> **🔴 Playwright 使用全局安装，不在产物目录安装。**

#### A0.1 检查 Playwright 是否已全局安装

```bash
# 全局检查（不依赖当前目录）
npx playwright --version 2>/dev/null && echo "OK" || echo "MISSING"
```

> **注意**：此检查应在全局环境执行，不要 `cd` 到产物目录后检查。
> Playwright 通过 npx 调用，不要用 `require('playwright')`（全局安装后 require 路径可能找不到）。

#### A0.2 用户确认

🚨 **🛑 停住等待**。使用 `clarify` 向用户展示环境状态并确认：

```
环境检查结果：
- Playwright: [已全局安装 / 未安装]
- 反爬域名预估：掘金、知乎、CSDN 等可能被命中

选项：
1. 全局安装 Playwright（推荐，约 2-5 分钟）
2. 跳过 Playwright（反爬域名将标记为 failed）
```

- 用户选择安装 → 前台执行全局安装，完成后继续
- 用户选择跳过 → 标记 `playwright_available = false`

安装命令（用户确认后，全局安装）：
```bash
npm install -g playwright --registry=https://registry.npmmirror.com && npx playwright install chromium
```

回退：npmmirror 超时则 `npm install -g playwright && npx playwright install chromium`

### A1. 读取密度参数 + 命题分批

#### A0.3 创建输出目录

```bash
mkdir -p {workDir}/.meta/.raw-materials
mkdir -p {workDir}/.meta/sources
```

**必须在 spawn 任何 agent 之前完成**，否则 agent 写入时目录不存在会失败。

#### A1.1 读取密度参数

从 requirement-web.json 提取：
- `strategy`：core/premise/outlook 标签和比例
- `propositions[].level_weight`：每个命题的 role
- `propositions[].search_keywords`：每个命题的关键词组（principles + practices）
- `search_guidance`：全局搜索策略
- `scope.exclusions`：排除项

**如果 partition-analysis.json 存在**：只处理 `current_session.proposition_ids` 中的命题。从 requirement-web.json 中筛选这些命题的 level_weight 和 search_keywords，跳过不在列表中的命题。

从 `assets/common/strategy-level.md` 策略表查表：
```
core:   kw={N}, r={M}
premise: kw={N}, r={M}
outlook: kw={N}, r={M}
```

#### A1.1.1 为每个命题计算具体搜索参数

对 requirement-web.json 中的每个命题，查表计算：

```
输入：proposition.level_weight.role = "core"
查表：core → kw=2, r=8
命题的 search_keywords.principles = ["webpack 打包原理", "webpack dependency graph"]
命题的 search_keywords.practices = ["webpack 打包流程分析", "webpack 构建产物解读"]
计算：
  原理轨道 = search_keywords.principles 的每个关键词 → 搜索工具，每条取 min(r, 3) = 3 条
  实践轨道 = search_keywords.practices 的每个关键词 → 搜索工具，每条取 min(r, 3) = 3 条
  excluded_keywords = scope.exclusions 中与该命题相关的排除词（如 "gulp", "grunt"）
```

每个命题最终产出一个结构化搜索计划：
```json
{
  "proposition_id": "RW-P1",
  "name": "首屏加载慢——CRP关键渲染路径优化",
  "role": "core",
  "search_plan": [
    {"query": "webpack 打包原理 site:web.dev", "max_results": 3, "轨道": "原理-T0"},
    {"query": "webpack 打包原理", "max_results": 3, "轨道": "原理-自由"},
    {"query": "webpack dependency graph site:developer.mozilla.org", "max_results": 3, "轨道": "原理-T0"},
    {"query": "webpack dependency graph", "max_results": 3, "轨道": "原理-自由"},
    {"query": "webpack 打包流程分析", "max_results": 3, "轨道": "实践-自由"},
    {"query": "webpack 构建产物解读", "max_results": 3, "轨道": "实践-自由"}
  ],
  "excluded_keywords": ["gulp", "grunt", "rollup 内部"]
}
```

#### A1.2 命题分批

将命题按数量均匀分批：

```
批次大小 = ceil(命题数 / W)    ← W = min(5, 命题数)
```

每批附带该批命题的搜索参数（role、search_keywords、density）。确保同一命题的所有关键词在同一 batch 中（不拆分命题）。

### A2. 并行 spawn 搜索 agent（简单窗口）

> ⚠️ 严格遵循 `assets/common/protocol-scheduling.md` §简单窗口执行流程。
> 调度规则详见 `assets/common/protocol-scheduling.md` §子 agent 调度。

#### A2.1 agent task 模板

main thread 在 A1 分批时，为每个 batch 组装 task，**必须内联以下信息**（不依赖 agent 读外部文件）：

```
你是搜索发现专家。对以下命题批次执行搜索，收集 URL。

## 信源参考
T0 域名（直接信任）：{t0_domains 列表}
反爬域名（标记 need_playwright=true，后续由 Playwright 抓取）：{anti_crawl_domains 列表}

## 执行规则
对本批次命题清单中的每个命题，按其 search_plan 逐条执行：
1. 对 search_plan 中的每条 query 执行搜索，取 max_results 条结果
2. 记录每条结果的：url、title（搜索结果标题）、snippet（搜索结果摘要）、domain
3. 对搜索结果中的 URL，提取域名，与上方 T0/反爬列表比对分级
4. 过滤：命中本命题 excluded_keywords 的结果跳过

## 本批次命题清单
每个命题的结构化搜索计划（由 A1.1.1 计算产出），直接内联到 task：
```
{propositions 搜索计划列表，每条含：
  proposition_id, name, role,
  search_plan: [{query, max_results, 轨道}],
  excluded_keywords: [...]
}
```
agent 对 search_plan 中的每条 query 执行搜索，取 max_results 条结果。

## 输出格式
用 write 工具写入 {workDir}/.meta/.raw-materials/search-batch.{batch_id}.json

```json
{
  "batch_id": "{batch_id}",
  "propositions_searched": ["RW-P1", "RW-P2"],
  "results": [
    {
      "url": "https://web.dev/articles/...",
      "title": "搜索结果标题",
      "snippet": "搜索结果摘要（100-200字）",
      "domain": "web.dev",
      "tier": "T0|anti-crawl|unknown",
      "from_proposition": "RW-P1",
      "keyword_group": "principles"
    }
  ],
  "excluded": [
    {"url": "...", "reason": "命中 excluded_keywords"}
  ]
}
```

## 完成后
输出：`Search batch {batch_id} 完成：{total} 条结果 / {excluded} 条排除`
```

#### A2.2 调度参数

| 参数 | 值 |
|------|---|
| W | min(5, 批次数) |
| 超时 | 5 分钟 |
| 槽位替换 | ✅ 简单窗口 |
| label | `search-{batch_id}`（如 `search-B1`） |
| expected_files | `{workDir}/.meta/.raw-materials/search-batch.{batch_id}.json` |
| 需要能力 | 搜索 + 文件写入 |

#### A2.3 完成判定

- **completed**：agent status=completed 且 search-batch.{batch_id}.json 存在且可解析
- **failed**：agent status=failed 或文件不存在
- **timeout**：>5 分钟 → kill → 重试一次

### A3. merge URL 列表

读取所有 `search-batch.{batch_id}.json`，合并：

1. 合并所有 `results[]` 数组
2. **按 URL 去重**：同一 URL 被多个 batch 搜索到 → 保留 snippet 最长的那条，`from_proposition` 合并为数组
3. 合并所有 `excluded[]`
4. 统计去重后的总 URL 数

### A4. URL 分级 + 分批

对去重后的 URL 列表：

1. **分级**（查 `assets/common/ref-sources.md`）：
   - 域名命中 T0 表 → `tier: "T0"`, `need_playwright: false`
   - 域名命中反爬表 → `tier: "anti-crawl"`, `need_playwright: true`
   - 都不命中 → `tier: "unknown"`, `need_playwright: false`
2. **分批**：按 URL 数量均匀分批，每批 30-50 条
3. **写入 url-batches.json + per-batch 文件**：

url-batches.json 是全局索引（供 Phase C merge 读取），同时为每个 batch 拆出独立文件（供 Phase B agent 读取，避免读大文件）：

```
.raw-materials/
├── url-batches.json      ← 全局索引（Phase C 读）
├── url-batch.B1.json     ← Phase B agent-1 读这个
├── url-batch.B2.json     ← Phase B agent-2 读这个
└── url-batch.B3.json     ← Phase B agent-3 读这个
```

每个 `url-batch.B{N}.json` 的格式与 url-batches.json 中对应 batch 的结构一致（含 urls 数组 + 元数据）。

url-batches.json 示例：
{
  "generated_at": "ISO时间",
  "total_urls": 150,
  "total_batches": 3,
  "playwright_available": true,
  "t0_domains": ["web.dev", ...],
  "anti_crawl_domains": ["juejin.cn", ...],
  "batches": [
    {
      "batch_id": "B1",
      "url_count": 50,
      "propositions_covered": ["RW-P1", "RW-P2"],
      "urls": [
        {
          "url": "https://web.dev/articles/...",
          "title": "搜索结果标题",
          "snippet": "搜索结果摘要",
          "domain": "web.dev",
          "tier": "T0",
          "need_playwright": false,
          "from_proposition": "RW-P1"
        }
      ]
    }
  ],
  "excluded": [...]
}
```

**关键**：每条 URL 携带 `title` + `snippet`（来自 Phase A 搜索结果），供 Phase B agent 判断 relevance。

### A5. 产出汇总

Phase A 完成后 stdout 输出：
```
Phase A 完成：
- 命题数：15
- 去重后 URL 总数：150
- T0 命中：30 | 反爬域名：20 | unknown：100
- 分批数：3
- Playwright：可用 / 不可用
```

---

## Phase B：并行提取（内容抓取 + 结构化提取）

> Phase B 对 URL 做内容抓取 + 结构化提取。每个 agent 处理一批 URL，互相独立。

### B1. 组装 agent task

从 `url-batches.json` 读取批次信息，为每个 batch 组装 agent task。

**task 模板**（注意：URL 列表从文件读取，不内联到 task）：

```
你是内容提取专家。对 URL 批次 {batch_id} 执行内容抓取 + 结构化提取。

## 输入文件
用 read 工具读取：{workDir}/.meta/.raw-materials/url-batch.{batch_id}.json
获取 URL 列表。

## 环境信息
- Playwright 可用：{playwright_available}
- T0 域名列表：{t0_domains}
- 反爬域名列表：{anti_crawl_domains}

## 执行规则

### 抓取策略（按域名分流）
对每个 URL：
1. tier == "T0" → 内容抓取工具直接抓取
2. need_playwright == true && playwright_available == true → 加载 plugins/anti-crawl-fetch.md，用 Playwright 抓取
3. need_playwright == true && playwright_available == false → 标记 fetch_status: "failed"
4. tier == "unknown" → 内容抓取工具，失败则 Playwright 降级（如可用）
5. 内容抓取失败（403/429/超时/内容<200字）→ 同上降级逻辑

### 内容提取（fetch_status="ok" 时）
用 url-batch.{batch_id}.json 中的 snippet 判断 relevance，再从抓取内容中提取：
- key_concepts（3-8 个核心技术概念）
- capability_points（原子能力点，含 name/layer/description/key_insight）
- depth_level（概念级|机制级|原理级|架构级）
- quality_signals（has_code/has_diagram/word_count）

### 产出文件
1. {workDir}/.meta/.raw-materials/partial.{batch_id}.json
2. {workDir}/.meta/.raw-materials/B{batch_id}-M{N}-{slug}.md（全局唯一文件名）

### partial index 格式
```json
{
  "batch_id": "{batch_id}",
  "materials": [
    {
      "id": "B{batch_id}-M{N}",
      "title": "标题",
      "url": "https://...",
      "domain": "domain.com",
      "source_tier": "T0|T1|T2|T3",
      "from_proposition": ["RW-P1"],
      "relevance": "与命题的关联说明",
      "fetch_status": "ok|failed",
      "fetch_method": "direct|playwright",
      "fetch_status_trace": "失败原因",
      "depth_level": "原理级",
      "file_path": "B{batch_id}-M{N}-{slug}.md"
    }
  ],
  "discarded": []
}
```

**文件名规则**：`B{batch_id}-M{N}-{slug}.md`（如 `B1-M3-rendering-performance.md`），确保全局唯一，不与其他 batch 碰撞。

## 完成后
输出：`Batch {batch_id} 完成：{ok} 成功 / {failed} 失败 / {total} 总计`
```

### B2. 并行 spawn（简单窗口）

| 参数 | 值 |
|------|---|
| W | min(5, 批次数) |
| 超时 | 10 分钟 |
| 槽位替换 | ✅ 简单窗口 |
| label | `extract-{batch_id}`（如 `extract-B1`） |
| expected_files | `{workDir}/.meta/.raw-materials/partial.{batch_id}.json` |
| 需要能力 | 内容抓取 + 文件读写 |

轮询、完成判定、重试逻辑同 A2。

---

## Phase C：合并产出（主线程）

> Phase C 是轻量的 merge 阶段。主线程串行执行。

### C1. 合并 partial index

读取所有 `partial.{batch_id}.json`，合并为最终 `index.json`：

1. 合并所有 `materials[]` 数组（ID 已全局唯一，无需重编号）
2. 合并所有 `discarded[]`
3. 填充 `scan_summary`

### C2. 域名分级汇总

统计 `source_tier` 分布。对 `tier == "unknown"` 的域名按 `assets/common/ref-sources.md` §Unknown 域名评估标准分级：
- 达标 → 标记 Tier + `source_tier_trace`
- 不达标 → 移入 `discarded`

### C3. 多源交叉比较

按 `capability_points.name` 分组，对被 ≥2 个来源覆盖的能力点做交叉比较（一致性、互补性、矛盾性、深度差异、synthesis）。

写入 `{workDir}/.meta/.raw-materials/cross-comparison.md`

### C4. 动态信源注册

unknown 域名评估达标后写入 `{workDir}/.meta/sources/dynamic-sources.json`

### C5. 写入最终 index.json

按 `assets/03-scan/schemas.md` 格式写入。

### C6. 校验清单

- [ ] index.json 每条 material 有 `file_path` 指向对应 markdown
- [ ] material markdown 文件名全局唯一（B{batch}-M{N}-{slug}.md）
- [ ] `fetch_status="ok"` 的 material 包含 content_extract
- [ ] `fetch_status="failed"` 的 material 包含 fetch_status_trace
- [ ] cross-comparison.md 包含所有被 ≥2 来源覆盖的能力点
- [ ] 定向模式下每条 material 包含 from_proposition
- [ ] search_guidance.excluded_keywords 和 scope.exclusions 已用于过滤
- [ ] Playwright 抓取的 material 包含 fetch_method: "playwright"
- [ ] 被丢弃的素材记录在 discarded 中
- [ ] 动态注册域名已写入 dynamic-sources.json
- [ ] index.json 包含 scan_summary

---

## 异常处理

| 场景 | 处理 |
|------|------|
| Phase A 搜索 agent 超时 | 检查 search-batch 文件是否已写入：完整则保留，不完整则重试 |
| Phase A 搜索结果过多（>200 URL/批） | 按 Tier 优先级截断：保留 T0+T1，T2/T3 取前 50 |
| Phase B agent 超时 | 检查 partial 文件：完整则保留，不完整则重试 |
| Phase B agent 全部失败 | 降级为仅 URL 列表（无内容提取） |
| Playwright 安装失败 | playwright_available=false，反爬域名直接 failed |
| Playwright 抓取也失败 | fetch_status: "failed" + 两级 trace |
| premise 命题 T0 无结果 | global_keywords 兜底一次 |
| outlook 命题搜索无结果 | 标记 search_status: "not_found"，不阻塞 |
| core 命题素材数低于 r 值 | scan_summary 标注缺口，不阻塞 |
| Phase C merge 时 partial 缺失 | 跳过该 batch，标注 degraded |

---

## 检查点

🚨 **🛑 必须停顿，进入 Barrier 3 检查点**。展示信源质量摘要（Tier 分布、素材数、丢弃数、按 role 的搜索覆盖统计），使用 `clarify` 等待用户确认后才进入 Step 04。
