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
| T2 | 大厂技术博客（Cloudflare/Vercel/字节/美团/阿里）、InfoQ | 0.8 | 补充验证 |
| T3 | 掘金、SegmentFault、知乎、StackOverflow、V2EX、牛客 | 0.3 | 热点风向标 |

### Step 2：内容爬取

- 使用 `web_fetch` 或 `mimo_web_search` 获取信源内容
- 每个信源提取：标题、URL、摘要、发布日期
- 标注来源 Tier

### Step 3：主题过滤

从爬取内容中筛选与 `topic` 相关的条目：
- 关键词匹配（标题 + 摘要）
- 时间过滤（如有时间约束）
- 去重（同一话题多个来源只保留最高 Tier 的）

## 输出

```yaml
raw_materials:
  - title: "文章标题"
    url: "https://..."
    source_tier: T3
    summary: "摘要"
    date: "2026-05-01"
    relevance_tags: ["性能", "长列表"]
```

## 依赖

- 无（可独立执行）

## 参考

- core/scenario-matrix.md §信息源分级
