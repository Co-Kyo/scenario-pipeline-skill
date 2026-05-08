# Process: 广域扫描 (scan)

> 从互联网信息源中识别与目标主题相关的原始素材。

## 输入

- `source_desc`：信息源描述（如"掘金近一周前端热门文章"）
- `topic`：目标主题（如"前端性能"）
- `constraints`：约束条件（可选：年限、平台、时间范围）

## 执行步骤

### Step 1：信源定位

根据 `source_desc` 确定要爬取的信息源，按 Tier 分级：

| Tier | 来源 | 可信度 | 用途 |
|------|------|--------|------|
| T1 | W3C/WHATWG 规范、Chromium 官方博客、框架官方文档 | 1.0 | 事实来源 |
| T2 | 大厂技术博客（Cloudflare/Vercel/字节/美团/阿里）、InfoQ | 0.7 | 补充验证 |
| T3 | 掘金、SegmentFault、知乎、StackOverflow、V2EX、牛客 | 0.3 | 热点风向标 |

### Step 2：内容爬取

- 使用 `web_fetch` 或 `web_search` 获取信源内容
- 每个信源提取：标题、URL、摘要、发布日期
- 标注来源 Tier

### Step 3：主题过滤

从爬取内容中筛选与 `topic` 相关的条目：
- 关键词匹配（标题 + 摘要）
- 时间过滤（如有时间约束）
- 去重（同一话题多个来源只保留最高 Tier 的）

## 异常与 Fallback

| 异常场景 | 触发条件 | 处理动作 |
|---------|---------|---------|
| 网络不通 | web_fetch 超时 (>10s) 或返回非 200 | 重试 1 次（换 User-Agent）→ 仍失败则跳过该源，记录到 `raw_materials[].fetch_status: "failed"` |
| 信源反爬 | 返回 403/429/验证码页面 | 标记 `source_blocked: true`，跳过该源，不重试（避免 IP 封禁） |
| 全部信源失败 | raw_materials 为空 | 输出空结果 + 建议：`"所有信源不可达，请检查网络或使用 --source=<url> 指定单个可用源"` |
| 内容过短 | 抓取内容 < 200 字 | 标记 `content_thin: true`，保留但降级为 T3（即使原来源是 T1/T2） |
| 日期解析失败 | 无法从页面提取发布日期 | 使用当前日期，标记 `date_inferred: true` |
| 重复内容 | 同一话题多源覆盖 | 保留最高 Tier 的条目，低 Tier 条目标记 `dedup_of: <高Tier条目ID>` |

## 输出

```yaml
raw_materials:
  - title: "文章标题"
    url: "https://..."
    source_tier: T3
    summary: "摘要"
    date: "2026-05-01"
    relevance_tags: ["性能", "长列表"]
    fetch_status: "ok"          # ok | failed
    source_blocked: false       # 是否被反爬
    content_thin: false         # 内容是否过短
    date_inferred: false        # 日期是否为推断
```

## 依赖

- 无（可独立执行）

## 参考

- core/scenario-matrix.md §信息源分级
