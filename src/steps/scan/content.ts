// 内容域:广域扫描。密度表、URL 策略映射、抓取分流、提取字段、超时恢复规则为唯一数据源。
// 「输出 Schema」为整块搬移单元(含转义反引号),禁止拆分。
import { CONCURRENCY_LIMIT } from '../../skill-decl.js';

/** 扫描密度查表(正本为 assets/common/strategy-level.md 的 L2 列;此处为散文渲染源) */
export const SCAN_DENSITY = [
    { role: 'core', kw: 2, r: 8, note: '（L2 默认）' },
    { role: 'premise', kw: 1, r: 3, note: '' },
    { role: 'outlook', kw: 1, r: 2, note: '' },
] as const;

/** URL 盘点策略规则 */
export const URL_STRATEGIES = [
    'T0/T1 官方或已知可达域名：direct。',
    '反爬特征明确（login-wall、JS-render、403 历史）：playwright。',
    '境外网络不可达或代理需求（Google/medium/web.dev 等）：virtual_gateway。',
    '已知 404/无价值/SPA 空壳：skip 并记录 skip_reason。',
] as const;

/** 提取字段四件套 */
export const EXTRACT_FIELDS = ['key_concepts', 'capability_points', 'depth_level', 'quality_signals'] as const;

export function detail(): string {
    const density = SCAN_DENSITY.map((d) => `- ${d.role}: kw=${d.kw}, r=${d.r}${d.note}`).join('\n');
    return `执行前必须完成 Playwright 环境检查。

1. 使用 npx playwright --version 检查全局安装状态。
2. 若未安装，使用 clarify 请用户选择全局安装或跳过。
3. Playwright 安装命令：npm install -g playwright --registry=https://registry.npmmirror.com && npx playwright install chromium。
4. 安装失败时标记 playwright_available=false，反爬域名直接 failed（与 anti-crawl-fetch 插件联动：此后反爬域名的 fetch_status 统一记为 failed，fetch_status_trace 记录原因）。

搜索密度按 strategy-level 查表：

${density}

每个命题按 role 计算原理轨道和实践轨道的 search_plan。`;
}

export function urlPreflightSection(): string {
    const rules = URL_STRATEGIES.map((s) => `- ${s}`).join('\n');
    return `Phase A 完成后、Phase B 前，必须先生成 url-preflight.json，禁止未盘点直接批量抓取。

策略规则：

${rules}

virtual_gateway 表示先经过网络策略层判断，不直接反复访问。`;
}

/** URL 分批每批条数（值随引用处内联，防悬空 token） */
export const URL_BATCH_SIZE = '30-50';

export function phaseASection(): string {
    return `按命题批次 spawn search-{batch_id} agent。

批次大小 = ceil(命题数 / W)，W = min(本 skill 并发上限 ${CONCURRENCY_LIMIT}，命题数)。

每个搜索 agent 输出 search-batch.{batch_id}.json，主线程 merge 后：

1. 按 URL 去重，保留 snippet 最长的一条。
2. 合并 from_proposition。
3. 按 T0 / anti-crawl / unknown 分级。
4. 按每批 ${URL_BATCH_SIZE} 条 URL 分批并写入 url-batches.json。`;
}

export function phaseBSection(): string {
    const fields = EXTRACT_FIELDS.map((f) => `- ${f}`).join('\n');
    return `按 URL 批次 spawn extract-{batch_id} agent。

抓取策略：

- T0 直接抓取。
- anti-crawl 且 Playwright 可用时加载 anti-crawl-fetch 插件。
- anti-crawl 且 Playwright 不可用时标记 failed。
- unknown 先直接抓取，失败再降级 Playwright。

提取内容：

${fields}

每完成一个 URL 立即写入 partial.{batch_id}.json 和 B{batch_id}-M{N}-{slug}.md，不等整批结束。

超时恢复规则：

- 子 agent 超时时，主线程读取已落盘 partial，不丢弃已完成部分。
- 未完成 URL 按 url-preflight.json 重新分配策略，禁止重复访问已知失败域名。
- 写入 task_timeout 与 degrade 事件，记录真实时间。`;
}

export function phaseCSection(): string {
    return `主线程合并所有 partial 文件：

1. 合并 materials 与 discarded。
2. 对 unknown 域名按 ref-sources 标准分级。
3. 对多源能力点做 cross-comparison。
4. 动态注册达标域名到 dynamic-sources.json。
5. 生成最终 index.json。`;
}

export function checkpointSection(): string {
    return `展示素材 Tier 分布、丢弃数和 role 覆盖统计，使用 clarify 等待用户确认后再进入 {{step:capability-graph}}。`;
}

// 输出 Schema 以 src/steps/scan/assets/schemas.md 为正本,此处为镜像渲染源(漂移锁见 scan/content.test);
// 漂移锁见 scan.test.ts(三方 JSON 块逐字节比对)。
export function outputSchema(): string {
    return `search-batch.{batch_id}.json:

\`\`\`json
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
\`\`\`

url-batches.json:

\`\`\`json
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
\`\`\`

partial.{batch_id}.json:

\`\`\`json
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
\`\`\`

文件名规则：

- 搜索批次文件：\`search-batch.{batch_id}.json\`
- URL 批次文件：\`url-batch.{batch_id}.json\`
- 内容提取文件：\`partial.{batch_id}.json\`
- Markdown 文件：\`B{batch_id}-M{N}-{slug}.md\`（如 \`B1-M3-rendering-performance.md\`）`;
}

export function searchTask(): string {
    return `你是搜索发现专家。
读取命题搜索计划，逐条执行搜索，取 max_results 条结果。
记录 url/title/snippet/domain，按 T0/反爬/unknown 分级。
过滤 excluded_keywords 命中项。
写入 search-batch.{batch_id}.json。

判据：条数按档取（精确 5／窄滤 10／宽发现 15，上限 25）；字段以可打开可定位为准（命题先行，粒度跟搜索计划走）。`;
}

export function extractTask(): string {
    return `你是内容提取专家。
读取 url-batch.{batch_id}.json。
按 T0/Playwright/unknown 分流抓取。
抓取成功时提取 ${EXTRACT_FIELDS.join('、')}。
写入 partial.{batch_id}.json 和素材 Markdown。`;
}
