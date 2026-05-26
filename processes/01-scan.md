# Step ①: 广域扫描

## 目的

从信息源中识别相关素材，按信源质量分级，产出 `raw-materials.json`。

## 前置条件

读取 `meta/sources.md`（T0 域名表 + 信源分级规则）+ `meta/output-contracts.md`§1（本步输出格式）。本步骤不需要读取任何 core/*.md。

如果 `requirement-web.json` 存在（头脑风暴已执行），额外读取该文件作为精准输入。

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

### 1. 信源采集（双轨 or 定向）

**如果 `requirement-web.json` 存在（定向模式）**：

从需求网的 `propositions` 列表中，按 `search_priority` 顺序，为每个命题执行定向搜索：

- **轨道 A — T0 定向搜索**：用命题的 `search_keywords.principles` + `search_keywords.practices` 拼接 `site:<domain>` 搜索
- **轨道 B — 自由搜索**：用命题的 `search_keywords` 直接搜索，不限域名
- **过滤**：用 `scope.excluded_keywords` 过滤搜索结果，排除不相关内容
- **域偏好**：优先保留 `search_guidance.preferred_domains` 中的结果

每个命题独立搜索，结果按命题 ID 标记来源（`from_proposition: "RW-P1"`）。

**如果 `requirement-web.json` 不存在（原始模式）**：

按原始逻辑执行：

**轨道 A — T0 定向搜索**：
读取 `meta/sources.md` 的 T0 域名表，逐个搜索：
```
web_search "<topic> site:<domain>"
```
每个域名取前 2 条结果。

**轨道 B — 自由搜索**：
不限域名，多路搜索覆盖不同维度：
- 原理类关键词（"xxx 原理"、"xxx 机制"）
- 实践类关键词（"xxx 最佳实践"、"xxx 优化"）
- 面试类关键词（"xxx 面试题"、"xxx 常考"）
每路取 5-10 条结果。

### 2. 提取域名

从所有搜索结果中提取域名，去重。

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

### 7. 写入

按 `meta/output-contracts.md` §1 的示例格式，构造 `raw-materials.json`，写入 `{workDir}/.meta/raw-materials.json`。

**必须包含**：
- `materials` 数组：每条含 `source_tier` + `source_tier_trace`（unknown 域名）或无 trace（T0 域名）
- `discarded` 数组：被丢弃的素材列表，每条含 `url`、`domain`、`discard_reason`

## 输出

- 文件：`{workDir}/.meta/raw-materials.json`
- 摘要（stdout，≤200 字）：信源数量、Tier 分布、Top 3 素材

## 校验清单

- [ ] 每条 material 包含 id、title、url、domain、source_tier、summary、relevance、fetch_status
- [ ] source_tier 来自 T0 表或内容评估，非凭空填写
- [ ] unknown 域名的 material 包含 `source_tier_trace`
- [ ] `fetch_status: "failed"` 的 material 包含 `fetch_status_trace`
- [ ] 被丢弃的素材记录在 `discarded` 数组中（含 `discard_reason`）
- [ ] 动态注册的域名已写入 dynamic-sources.json
- [ ] JSON 格式符合 output-contracts.md §1 示例

## 异常处理

| 场景 | 处理 |
|------|------|
| web_search 全部无结果 | 换关键词重试，或提示用户补充 `--source=<url>` |
| web_fetch 超时/403 | 标记 `fetch_status: "failed"` + `fetch_status_trace: "超时/403/429/内容不相关"`，跳过该条 |
| 所有域名都是 unknown | 全部 web_fetch 评估，不依赖 T0 表 |

## 检查点

🚨 **🛑 必须停顿，进入 ⓐ 检查点**。展示信源质量摘要（Tier 分布、素材数、丢弃数），使用 `clarify` 等待用户确认后才进入 Step ②。
