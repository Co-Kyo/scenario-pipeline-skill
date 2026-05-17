# Process: 广域扫描 (scan)

> 自由搜索 + 信源 filter 分级：agent 不受域名限制地搜索，结果由 MCP 信源系统统一分级。

## 核心原则

- **搜索自由**：agent 使用 web_search 自由搜索，不限制域名
- **分级统一**：所有搜索结果的域名必须经过 MCP `classify_sources` 分级
- **动态扩展**：未知域名经内容评估后，可通过 `register_source` 加入动态池

## 输入

- `source_desc`：信息源描述（如"掘金近一周前端热门文章"）
- `topic`：目标主题（如"微信小程序底层原理"）
- `constraints`：约束条件（可选：年限、平台、时间范围）

## 执行步骤

> ⛔ **Schema 强制**：在执行以下任何步骤前，必须先调用 MCP `get_output_schema(step="scan")`，
> 拿到 template + field_rules + strict_notes。按 schema 标准构造输出数据。

### Step 1：信源采集（双轨）

根据 `topic` 和 `source_desc`，按两条轨道并行收集结果：

**轨道 A — T0 定向搜索**：调用 MCP `get_t0_sources` 获取 T0 内置信源域名列表，在每个域名内搜索与 `topic` 相关的文章。

```bash
MCP get_t0_sources() → [{domain, name}, ...]
→ web_search "<topic> site:<domain>" 逐个搜索
```

**轨道 B — 自由搜索**：不限域名，多路搜索论坛、技术博客、个人站点等。

搜索策略：
- 关键词多样化（同义词、英文、缩写）
- 覆盖不同维度（原理、实践、面试、优化）
- 每路搜索取 5-10 条结果

### Step 2：提取域名

从所有搜索结果中提取域名列表（去重）。

### Step 3：信源分级（MCP filter）

调用 MCP `classify_sources`，传入域名列表：

```bash
# 通过 MCP SDK 调用
classify_sources(domains: ["developer.mozilla.org", "juejin.cn", "xxx.com"])
```

返回结果分三类：
- **T0**：内置高可信信源（官方文档、规范）→ 直接采用，标记 `source_tier: "T0"`
- **T1-T3**：动态池中的历史信源 → 复用历史评级
- **unknown**：未识别域名 → 进入 Step 4 评估

### Step 4：内容评估（unknown 域名）

对 unknown 域名的搜索结果，使用 `web_fetch` 抓取内容，**按 MCP `get_source_standard` 返回的评估标准**进行质量判定：

\`\`\`bash
# 获取标准
MCP get_source_standard() → 拿到 unknown_evaluation.dimensions
\`\`\`

**判定**：
- 达标 → 标记对应 Tier（T1=大厂博客/T2=优质社区/T3=一般社区）
- 不达标 → 丢弃或标记最低 Tier

### Step 5：动态注册

Step 4 中达标的 unknown 域名，调用 MCP `register_source` 注册到动态池：

```bash
register_source(domain: "cloud.tencent.com", tier: "T2", reason: "腾讯云开发者社区，setData性能优化文章质量高", discovered_by: "scan/2026-05-16")
```

### Step 6：合并排序

将所有搜索结果按 Tier 排序：
1. T0/T1 优先（权威来源）
2. T2 次之（补充验证）
3. T3 最后（热点参考）

去重：同话题多源覆盖时，保留最高 Tier 的条目。

### Step 7：写入

按 schema 标准构造 `raw-materials.json`，调用 MCP `submit_output(step="scan", data=..., workDir=...)` 校验并写入。

## 异常与 Fallback

| 异常场景 | 处理动作 |
|---------|---------|
| web_search 全部无结果 | 换关键词重试，或提示用户补充 `--source=<url>` |
| web_fetch 超时/403 | 标记 `fetch_status: "failed"`，跳过该条 |
| classify_sources MCP 调用失败 | 降级为人工分级（按域名常识判断） |
| 所有域名都是 unknown | 全部 web_fetch 评估，不依赖 filter |

## 输出

### 文件输出

写入 `{workDir}/.meta/raw-materials.json`。

### 摘要输出（stdout，≤200 字）

```
扫描完成：识别 {N} 个信源，成功抓取 {M} 个
信源分布：T0={a}, T1={b}, T2={c}, T3={d}, unknown评估={e}
动态注册：新增 {K} 个信源到动态池
Top 3：{标题1}、{标题2}、{标题3}
```

## 依赖

- MCP `get_source_standard`（信源分级标准）
- MCP `get_t0_sources`（T0 内置信源列表）
- MCP `classify_sources`（信源分级）
- MCP `register_source`（动态注册）
- MCP `get_output_schema` + `submit_output`（schema 驱动）
