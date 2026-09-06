# 广域扫描

## 目标

生成可被能力图谱消费的素材索引和素材正文

## 输入

- source_desc
- topic
- --year / --source 可选约束
- {workDir}/.meta/requirement-web.json
- {workDir}/.meta/partition-analysis.json

## 输出

- {workDir}/.meta/.raw-materials/index.json
- {workDir}/.meta/.raw-materials/*.md

## 校验清单

- [ ] [file-exists] {workDir}/.meta/.raw-materials/index.json: index.json 已生成
- [ ] [json-parse] {workDir}/.meta/.raw-materials/index.json: index.json 可解析
- [ ] [field] file_path: 每条 material 有 file_path
- [ ] [field] fetch_status: 反爬抓取状态已记录

## 失败处理

| 触发 | 行为 | 处理 |
|------|------|------|
| 搜索 agent 超时 | retry | 检查 search-batch 文件是否完整，完整则保留，否则重试一次 |
| 提取 agent 超时 | retry | 检查 partial 文件是否完整，完整则保留，否则重试一次 |
| Playwright 不可用 | degrade | 反爬域名标记 failed |
| Phase C partial 缺失 | degrade | 跳过该 batch，标注 degraded |
| URL 盘点失败 | halt | 不进入 Phase B，先修复 preflight |
| 境外网络不可达 | degrade | 统一走 virtual_gateway 或 skip |
| 反爬识别失败 | degrade | 标记 fetch_status_trace，不反复重试 |
| 提取超时有 partial | retry | 读取已落盘 partial，只补未完成 URL |

## 下一步

capability-graph

## 详细说明

执行前必须完成 Playwright 环境检查。

1. 使用 npx playwright --version 检查全局安装状态。
2. 若未安装，使用 clarify 请用户选择全局安装或跳过。
3. Playwright 安装命令：npm install -g playwright --registry=https://registry.npmmirror.com && npx playwright install chromium。
4. 安装失败时标记 playwright_available=false，反爬域名直接 failed（与 anti-crawl-fetch 插件联动：此后反爬域名的 fetch_status 统一记为 failed，fetch_status_trace 记录原因）。

搜索密度按 strategy-level 查表：

- core: kw=2, r=8（L2 默认）
- premise: kw=1, r=3
- outlook: kw=1, r=2

每个命题按 role 计算原理轨道和实践轨道的 search_plan。

## URL 盘点与策略分配

Phase A 完成后、Phase B 前，必须先生成 url-preflight.json，禁止未盘点直接批量抓取。

策略规则：

- T0/T1 官方或已知可达域名：direct。
- 反爬特征明确（login-wall、JS-render、403 历史）：playwright。
- 境外网络不可达或代理需求（Google/medium/web.dev 等）：virtual_gateway。
- 已知 404/无价值/SPA 空壳：skip 并记录 skip_reason。

virtual_gateway 表示先经过网络策略层判断，不直接反复访问。

## Phase A 执行细节

按命题批次 spawn search-{batch_id} agent。

批次大小 = ceil(命题数 / W)，W = min(5, 命题数)。

每个搜索 agent 输出 search-batch.{batch_id}.json，主线程 merge 后：

1. 按 URL 去重，保留 snippet 最长的一条。
2. 合并 from_proposition。
3. 按 T0 / anti-crawl / unknown 分级。
4. 按 url-batch-size 分批并写入 url-batches.json。

## Phase B 执行细节

按 URL 批次 spawn extract-{batch_id} agent。

抓取策略：

- T0 直接抓取。
- anti-crawl 且 Playwright 可用时加载 anti-crawl-fetch 插件。
- anti-crawl 且 Playwright 不可用时标记 failed。
- unknown 先直接抓取，失败再降级 Playwright。

提取内容：

- key_concepts
- capability_points
- depth_level
- quality_signals

每完成一个 URL 立即写入 partial.{batch_id}.json 和 B{batch_id}-M{N}-{slug}.md，不等整批结束。

超时恢复规则：

- 子 agent 超时时，主线程读取已落盘 partial，不丢弃已完成部分。
- 未完成 URL 按 url-preflight.json 重新分配策略，禁止重复访问已知失败域名。
- 写入 task_timeout 与 degrade 事件，记录真实时间。

## Phase C 执行细节

主线程合并所有 partial 文件：

1. 合并 materials 与 discarded。
2. 对 unknown 域名按 ref-sources 标准分级。
3. 对多源能力点做 cross-comparison。
4. 动态注册达标域名到 dynamic-sources.json。
5. 生成最终 index.json。

## 检查点

展示素材 Tier 分布、丢弃数和 role 覆盖统计，使用 clarify 等待用户确认后再进入 Step 05。

## 输出 Schema

search-batch.{batch_id}.json:

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

url-batches.json:

```json
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

partial.{batch_id}.json:

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

文件名规则：

- 搜索批次文件：`search-batch.{batch_id}.json`
- URL 批次文件：`url-batch.{batch_id}.json`
- 内容提取文件：`partial.{batch_id}.json`
- Markdown 文件：`B{batch_id}-M{N}-{slug}.md`（如 `B1-M3-rendering-performance.md`）

## 任务模板

### 搜索 Agent

```text
你是搜索发现专家。
读取命题搜索计划，逐条执行搜索，取 max_results 条结果。
记录 url/title/snippet/domain，按 T0/反爬/unknown 分级。
过滤 excluded_keywords 命中项。
写入 search-batch.{batch_id}.json。
```
### 提取 Agent

```text
你是内容提取专家。
读取 url-batch.{batch_id}.json。
按 T0/Playwright/unknown 分流抓取。
抓取成功时提取 key_concepts、capability_points、depth_level、quality_signals。
写入 partial.{batch_id}.json 和素材 Markdown。
```


---

## 契约引用

- `assets/common/ref-sources.md`：T0 域名表 + 反爬域名表 + 信源分级规则
- `assets/common/strategy-level.md`：密度参数查表

## 文件引用

| 类型 | 文件 | 说明 |
|------|------|------|
| 读取 | `{workDir}/.meta/requirement-web.json` | 需求网 |
| 读取 | `{workDir}/.meta/partition-analysis.json` | 分区分析 |
| 读取 | `assets/03-scan/schemas.md` | 素材索引 格式契约 |
| 读取 | `plugins/anti-crawl-fetch.md` | Playwright 抓取 |
| 产出 | `{workDir}/.meta/.raw-materials/index.json` | 素材索引 |
| 产出 | `{workDir}/.meta/.raw-materials/*.md` | 素材正文 |

## 依赖

前置步骤：`partition`

## 调度策略

▸ 顺序执行：扫描三阶段（3 步）

  第 1 步：
    - Task：`Phase A 并行搜索` [agent]
      超时：5 min
      Body：
```
按命题批次并行搜索 URL，merge 后生成 url-batches.json。
```

  第 2 步：
    - Task：`Phase B 并行提取` [agent]
      超时：10 min
      Body：
```
按 URL 批次抓取并结构化提取，生成 partial 文件和素材 Markdown。
```

  第 3 步：
    - Task：`Phase C 主线程合并` [agent]
      超时：5 min
      Body：
```
合并 partial、域名分级、交叉比较并生成 index.json。
```



## Barrier scan

**检查项：**
- 素材 Tier 分布
- 丢弃数
- role 覆盖统计

**`clarify` 提示：**
> 请确认扫描素材质量和信源覆盖。

| 决策 | 行为 |
|------|------|
| 确认 | continue |
| 拒绝 | rollback |

## 插件加载

- `anti-crawl-fetch`：条件性加载
- `year-granularity`：条件性加载

## 运行记录

进入本步骤后的第一件事：

1. 用 date -u +%Y-%m-%dT%H:%M:%SZ 获取真实时间，追加 {workDir}/.meta/run/events.jsonl 的 step_start。
2. 创建 {workDir}/.meta/run/stages/scan/usage.json、timeline.json、stage-budget.json，写入当前真实时间。
禁止阶段结束后统一回填时间；禁止使用合成或猜测时间戳。

先读取 {workDir}/.meta/run/run.json 获取 run_id；若不存在，由 initialize 创建。

事件类型：

- `step_start`
- `step_end`
- `file_written`
- `validation_failed`
- `validation_passed`
- `retry`
- `degrade`
- `fallback`
- `self_corrected`
- `reuse_skipped`
- `barrier_rejected`
- `barrier_confirmed`
- `user_modified`
- `task_timeout`
- `task_failed`
- `judgment_passed`
- `judgment_failed`
- `judgment_stuck`

事件格式：

```json
{ "ts": "...", "run_id": "...", "step_id": "scan", "event": "event-type", "ref": "...", "detail": "...", "before_hash": "...", "after_hash": "..." }
```

每次 subagent spawn 后，向 {workDir}/.meta/run/subagent-window.jsonl 追加窗口记录，包含 batch_id、window_count、input_tokens_estimate、read_paths。

barrier 相关事件（barrier_confirmed / barrier_rejected）的 ref 必须使用 {workDir}/.meta/checkpoints/scan-barrier.md。

### 阶段 Telemetry

本步骤开始和完成时分别更新：

- `{workDir}/.meta/run/stages/scan/usage.json`：本阶段 token / cost / cacheRead 汇总
- `{workDir}/.meta/run/stages/scan/timeline.json`：本阶段 step_start / step_end / barrier / retry / timeout 事件时间线
- `{workDir}/.meta/run/stages/scan/stage-budget.json`：本阶段 wall time、子 agent 等待、重试次数、预算占用

完成本步骤时追加 step_end，并更新根级 `{workDir}/.meta/run/usage.json`、`{workDir}/.meta/run/timeline.json`、`{workDir}/.meta/run/stage-budget.json`。

事件必须实时追加，不能阶段结束后后补；时间戳必须使用真实执行时间。
