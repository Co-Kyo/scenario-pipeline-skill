# Process: 能力研究 (capability-research)

> 对单个原子能力进行深度研究，产出能力知识库条目。
> **一个 agent 只负责一个能力文件，禁止合并。**

## 输入

- `capability_id`：能力 ID（如 "A1"）
- `capability_name`：能力名称（如 "浏览器渲染管线"）
- `capability_desc`：能力描述（依赖的技术层、关键概念）
- `depth`：研究深度（shallow / normal / deep）
- `references`：该能力的预查找信源（来自 capability-graph.json 的 `references` 字段）
  - `t1`：T1 官方来源列表 [{url, title, verified}]
  - `t2`：T2 高质量来源列表 [{url, title, verified}]
  - `t1_missing`：T1 是否全部无结果

## 加载条件

- **必须加载**：plugins/source-registry.md（信源白名单，用于 fallback 搜索）

## 执行步骤

### Step 1：信源获取（强制）

**必须先获取并阅读官方文档内容，禁止凭记忆生成。**

#### 数据源优先级（严格按顺序）

```
优先级 ①：JSON 中有 verified=true 的 T1 来源
  → 直接 web_fetch 这些 URL
  → 这些 URL 已经在前处理阶段经过内容验证，可以直接使用
  → 提取：核心机制、API 说明、性能描述、已知限制、官方示例

优先级 ②：JSON 中有 verified=true 的 T2 来源
  → web_fetch 这些 URL
  → 补充：工程实践、踩坑经验、性能数据

优先级 ③：JSON 中 t1_missing=true，或 T1/T2 URL 全部 web_fetch 失败
  → 进入 Fallback 搜索流程（见下方）
  → 加载 plugins/source-registry.md 获取域名白名单
  → 按白名单逐个域名搜索 + 验证
  → 禁止 CSDN 等低质源（参见 source-registry 黑名单）

优先级 ④：Fallback 搜索也无结果
  → 标记该能力信源不足
  → 在文件末尾注明"⚠️ 该能力缺乏 T1 来源，内容基于通用知识"
  → 不编造引用来源
```

#### 详细执行流程

```
1. 读取输入中的 references 字段

2. 如果 references.t1 非空且存在 verified=true 的条目：
   a. 对每个 verified=true 的 t1 URL：
      - web_fetch 获取页面内容
      - 提取与该能力相关的机制描述、API、限制、示例
   b. 如果 references.t2 非空且存在 verified=true 的条目：
      - web_fetch 获取页面内容
      - 补充工程实践和案例
   c. → 进入 Step 2

3. 如果 references.t1 为空 或 所有 t1 URL 的 web_fetch 均失败：
   a. 加载 plugins/source-registry.md
   b. 从 §三「能力 → 技术域自动映射规则」确定该能力的技术域
   c. 从 §二「技术域 → T1 域名映射」获取 T1 域名列表
   d. 对每个 T1 域名：
      - mimo_web_search "<能力名称> site:<域名>"
      - web_fetch 第一个结果
      - 验证：HTTP 200？内容 > 200 字？与能力相关？
      - 通过 → 使用该内容，跳出搜索
      - 不通过 → 尝试下一个域名
   e. 所有 T1 无结果 → 尝试 T2 域名列表（同上流程）
   f. T2 也无结果 → 标记信源不足，使用通用知识撰写
   g. → 进入 Step 2

4. 在产出文件的参考资料中标注每个来源的实际获取方式：
   - [T1][前处理验证] URL — 前处理阶段已验证
   - [T1][实时搜索] URL — 本 agent 实时搜索获取
   - [T2][前处理验证] URL — 前处理阶段已验证
   - [T2][实时搜索] URL — 本 agent 实时搜索获取
   - ⚠️ 无 T1 来源 — 基于通用知识
```

### Step 2：机制阐述

基于 Step 1 获取的官方文档，阐述该能力的核心机制：
- 从底层原理到表层行为的完整链路
- **必须引用实际文档内容**，而非通用描述
- 包含关键 API、配置项、浏览器兼容性

### Step 3：瓶颈识别

列出该能力在实际工程中常见的 3-5 个瓶颈点：
- 优先从官方文档的 "Known Issues"、"Gotchas"、"Performance Considerations" 章节提取
- 补充技术博客中的真实踩坑案例
- 每个瓶颈必须标注：触发条件、表现症状、检测手段、缓解策略

### Step 4：工具链

列出验证和调试该能力所需的工具：
- Chrome DevTools 面板及具体操作（基于官方文档推荐）
- 性能分析 API（引用 MDN 或 Chrome DevTools 文档）
- 第三方工具（如有）

### Step 5：Trade-off 模式

列出该能力涉及的 2-3 个典型权衡：
- 从实际工程案例中提炼，而非凭空构造
- 每个权衡标注两个对立维度和不同场景下的选择建议

### Step 6：最小实验（deep 模式）

提供一个可直接运行的代码片段：
- 优先从官方文档示例改编
- 确保代码可直接复制到浏览器运行
- 包含 3-5 个可观测的验证检查点

### Step 7：参考资料（标注实际来源）

```markdown
## 参考资料

（按 Tier 排序，**只列出你实际 web-fetch 过的 URL**）
（每个来源标注：Tier、URL、提取的关键内容摘要）
```

### Step 8：结构化摘要双写（强制）

**在写完主文件后，必须额外产出一个结构化摘要 JSON，供 Briefing 组装阶段消费。**

> 设计理由：能力研究 agent 刚完成主文件，对全文结构最熟悉，此时提取摘要的认知成本最低（≈ 从刚写的草稿中"复制粘贴"）。
> 这一步将阶段二 agent 从"读 30-100KB 全文"降为"从 1-2KB 摘要组装 briefing"，压缩比约 5:1~7:1。

#### 摘要 JSON Schema

```json
{
  "id": "A1",
  "name": "浏览器渲染管线",
  "tech_layer": "浏览器层",
  "fanout": "6/7",
  "coupling": 1,
  "strategic_value": 5.0,

  "mechanism_summary": "关键渲染路径（CRP）：DOM + CSSOM → Style → Layout → Paint → Composite。浏览器将 HTML/CSS 解析为树结构，经样式计算、布局、绘制、合成四个阶段生成像素。",

  "bottlenecks": [
    {
      "name": "强制同步布局",
      "trigger": "读 offsetHeight 后立即写 style",
      "symptom": "帧率骤降到 15fps"
    },
    {
      "name": "布局抖动",
      "trigger": "循环中交替读写布局属性",
      "symptom": "单帧 Layout 次数暴增"
    }
  ],

  "tradeoffs": [
    {
      "dimension": "图层数 vs GPU 内存",
      "option_a": "will-change 提升独立图层 → Paint 隔离，GPU 内存增加",
      "option_b": "不提升 → Paint 整体重绘，GPU 内存节省",
      "suggestion": "对频繁重绘的独立元素（动画、fixed 定位）提升图层"
    }
  ],

  "experiment_code": "（仅 deep 模式：提取最小可运行的代码片段，非 deep 模式填 null）",

  "references": [
    {"tier": "T1", "url": "https://developer.chrome.com/...", "title": "Chrome DevTools Performance Analysis"},
    {"tier": "T1", "url": "https://developer.mozilla.org/...", "title": "MDN: Critical Rendering Path"}
  ]
}
```

#### 字段提取规则

| 字段 | 提取来源 | 约束 |
|------|---------|------|
| `mechanism_summary` | 主文件「核心机制」章节 | 1-3 句，≤200 字 |
| `bottlenecks` | 主文件「工程瓶颈」表格 | 每项只保留 name+trigger+symptom 三列 |
| `tradeoffs` | 主文件「典型权衡」表格 | 每项保留完整四列（dimension + option_a + option_b + suggestion） |
| `experiment_code` | 主文件「最小验证实验」 | deep 模式提取核心代码片段，非 deep 填 `null` |
| `references` | 主文件「参考资料」 | 提取 tier+url+title，按 Tier 排序 |

#### 写入路径

```
.meta/summaries/<id>-<name>.json
```

示例：`.meta/summaries/A1-浏览器渲染管线.json`

> ⚠️ 摘要与主文件必须保持一致。如果后续修改了主文件，摘要也应同步更新。

---

## 输出

### 输出 1：能力知识库主文件

写入 `workflow/research/capabilities/<id>-<name>.md`：

```markdown
# <能力名称>

> ID: <id> | 扇出: <fanout> | 耦合度: <coupling> | 战略价值: <value>

## 核心机制

（基于官方文档的完整机制阐述，引用具体 API 和配置）

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|---------|---------|---------|---------|
（优先从官方文档 Known Issues 提取，补充博客真实案例）

## 调试工具

| 工具 | 用法 |
|------|------|
（基于官方文档推荐的工具链）

## 典型权衡

| 维度 | 方案A | 方案B | 选择建议 |
|------|------|------|---------|
（从实际案例中提炼的权衡）

## 最小验证实验

（可直接运行的 HTML/JS 代码片段，优先从官方示例改编）

## 参考资料

（只列出实际读过的来源，标注 Tier 和提取摘要）
```

### 输出 2：结构化摘要

写入 `.meta/summaries/<id>-<name>.json`（格式见 Step 8）。

### 文件命名规范

```
主文件：capabilities/<id>-<中文名称>.md
摘要：  .meta/summaries/<id>-<中文名称>.json

示例：
  ✓ capabilities/A1-浏览器渲染管线.md
  ✓ .meta/summaries/A1-浏览器渲染管线.json
  ✗ A1.md（纯 ID 无语义）
  ✗ browser-rendering-pipeline.md（英文不直观）
```

---

## Agent 执行指令模板

spawn 能力研究 agent 时，task 按以下模板构造：

```
你是 [能力名称] 的深度研究员。

## 任务
研究原子能力 "[能力名称]"（ID: [id]），产出两个文件：
1. 能力知识库主文件
2. 结构化摘要 JSON

## 信源获取（第一步，必须先执行）

1. web-fetch 以下 T1 官方文档：
   [URL 列表]
   提取：核心机制、API 说明、性能描述、已知限制、官方示例

2. web-fetch 以下 T2 技术博客（如有）：
   [URL 列表]
   提取：工程实践、踩坑经验、性能数据

3. 如果 URL 失败或内容不足：
   - mimo_web_search "<能力名称> performance best practices"
   - mimo_web_search "<能力名称> pitfalls optimization"

## 产出

### 文件 1：能力知识库主文件
路径：workflow/research/capabilities/[id]-[name].md

格式要求：
- 核心机制（基于官方文档，引用具体 API）
- 工程瓶颈（3-5 个，优先从官方 Known Issues 提取）
- 调试工具（官方推荐的工具链）
- 典型权衡（2-3 个，从实际案例提炼）
- 最小验证实验（可运行的 HTML/JS）
- 参考资料（只列实际读过的 URL）

### 文件 2：结构化摘要
路径：workflow/research/.meta/summaries/[id]-[name].json

从主文件中提取以下字段（JSON 格式）：
- mechanism_summary：1-3 句核心机制摘要（≤200 字）
- bottlenecks：每项只保留 name + trigger + symptom
- tradeoffs：每项保留 dimension + option_a + option_b + suggestion
- experiment_code：deep 模式提取核心代码，非 deep 填 null
- references：提取 tier + url + title

约束：
- 中文撰写，技术术语保留英文
- 通用内容 ≥ 70%（框架特化能力除外）
- 摘要与主文件内容必须一致
- 直接写文件，不要输出到聊天
```

---

## 依赖

- 需要先执行 processes/capability-extract.md（提供能力 ID 和描述）
- 需要为每个能力预查找 T1/T2 URL

## 参考

- plugins/capability-research-mode.md（材料块格式规范）
- core/capability-graph.md（能力定义）
