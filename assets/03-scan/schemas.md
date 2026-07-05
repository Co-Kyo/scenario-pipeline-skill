# 02-scan 输出格式定义

## search-batch.{batch_id}.json

Phase A 搜索 agent 的输出格式：

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

## url-batches.json

URL 分级后的全局索引：

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

## partial.{batch_id}.json

Phase B 内容提取 agent 的输出格式：

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

## 文件名规则

- 搜索批次文件：`search-batch.{batch_id}.json`
- URL 批次文件：`url-batch.{batch_id}.json`
- 内容提取文件：`partial.{batch_id}.json`
- Markdown 文件：`B{batch_id}-M{N}-{slug}.md`（如 `B1-M3-rendering-performance.md`）
