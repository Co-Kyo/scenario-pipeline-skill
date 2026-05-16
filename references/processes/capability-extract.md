# Process: 原子能力提取 (capability-extract)

> 从多个命题的分词结果中提取原子能力，计算扇出度，预查找每个能力的 T1/T2 信源 URL，输出结构化 {{paths.meta_capability_graph}}。

## 输入

- `decompositions`：所有命题的分词结果列表（来自 processes/decompose.md 的输出）
- `raw_materials`：扫描阶段的原始素材（来自 processes/scan.md 的输出，含 URL）

## 加载清单

> ⛔ **L3 执行前置条件**

```
必须加载：core/capability-graph.md（能力图谱方法论）
理由：原子能力的提取规则、依赖拓扑、扇出度计算、JSON schema 定义在此文件中
必须加载：core/architecture-decomposition.md（分词方法论）
理由：能力提取依赖分词结果的结构（通用内核/特化层），需理解分词输出格式
```

## 加载条件

- **必须调用**：MCP `get_sources` 工具（获取信源域名白名单 + 黑名单 + 搜索策略）

## 执行步骤

> **路径获取**：在执行任何步骤前，必须先调用 MCP `resolve_paths` 获取当前任务的所有路径：
> ```bash
> mcporter call scenario-pipeline.resolve_paths --args '{"task_type":"capability-extract","workDir":"<产出目录>","caller":"pre/cap-extract"}'
> ```

### Step 1：逐命题提取原子能力

对每个命题的 [通用内核] + [特化层] 进行逐层拆解：
- 每个独立可学习的技术能力 → 一个原子能力
- 命名规范：`<技术域>-<能力描述>`

### Step 2：去重与合并

跨命题去重：相同能力合并为一条，保留最高 Tier 来源

### Step 3：标注依赖关系

每个原子能力的前置依赖（A 依赖 B = 理解 A 之前必须先理解 B）

> ⛔ **校验点**：完成后立即检查——每个能力是否都有 `dependencies` 字段？
> - 空数组 `[]` 表示"无前置依赖"，但字段**必须存在**
> - 基础能力（如渲染管线）的 dependencies 为 `[]`
> - 下游能力（如 DOM 生命周期）的 dependencies 必须引用上游能力 ID
>
> **缺失修复（不重做 Step 3，直接定点回填）**：
> - 从当前上下文中已提取的能力集，按前置依赖定义判断该能力的前置能力
> - 基础能力（不依赖其他能力）→ 填 `[]`
> - 下游能力 → 从该能力所属命题的分词结果中，找到与其在同一分词层级的先决能力，填入对应 ID

### Step 4：计算扇出度

```
扇出度 = 该能力出现在多少个命题的能力集合中 / 总命题数
```

### Step 5：限定词注入分析

分析不同限定词向命题注入的特化能力集

> ⛔ **校验点**：完成后立即检查——
> - `qualifier_injection` 对象是否包含所有出现过的限定词？（如 React、Vue、Webpack、Vite 等）
> - 每个限定词必须有 `injects`（注入的特化能力列表）和 `replaces`（替换的通用能力列表）两个 key
> - 如果命题没有限定词（纯通用），该限定词分析结果为空对象 `{}`
>
> **缺失修复（不重做 Step 5，直接定点回填）**：
> - `injects` 缺失：从当前上下文的 decompositions 中找到该限定词对应的特化层能力列表，直接填入
> - `replaces` 缺失：从当前上下文的 decompositions 中找到该限定词替代的通用能力列表，直接填入
> - 缺整个限定词条目：从当前上下文的 decompositions 中提取所有命题的限定词，补齐该条目的 injects + replaces

### Step 6：信源 URL 预查找（强制）

**对每个原子能力，必须预查找其 T1/T2 参考 URL，写入 JSON。**

#### 6.1 确定技术域

调用 MCP `get_sources` 工具（参数：capability_name="[能力名称]"）获取该能力匹配的技术域和 T1/T2 域名列表。

#### 6.2 按白名单查找

使用 MCP `get_sources` 返回的 T1/T2 域名列表，按以下流程执行：

```
1. 从 source_domain_map 获取该技术域的 T1 域名列表
2. 对每个 T1 域名：
   a. web_search "<能力名称> site:<域名>"
   b. 取第一个结果
   c. web_fetch 验证：HTTP 200？内容 > 200 字？与能力相关？
   d. 通过 → 记录 URL + title，标记 verified: true
   e. 不通过 → 尝试下一个 T1 域名
3. 所有 T1 无结果：
   a. 获取 T2 域名列表
   b. 重复上述流程
4. T2 也无结果：
   a. web_search "<能力名称> official documentation"
   b. 从结果中选取最权威来源
   c. 标记 t1_missing: true
```

#### 6.3 黑名单检查

调用 MCP `get_sources` 工具获取黑名单数据，搜索结果 URL 必须与黑名单比对：
- 命中黑名单的 URL 直接跳过，不写入 JSON

#### 6.4 写入格式

在 {{paths.meta_capability_graph}} 的每个能力对象中增加 `references` 字段：

```json
{
  "id": "A1",
  "name": "浏览器渲染管线",
  "source_domain": "browser_api",
  "references": {
    "t1": [
      {
        "url": "https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path",
        "title": "MDN: Critical Rendering Path",
        "verified": true
      }
    ],
    "t2": [
      {
        "url": "https://web.dev/articles/rendering-performance",
        "title": "web.dev: Rendering Performance",
        "verified": true
      }
    ],
    "t1_missing": false
  }
}
```

**字段说明：**
- `source_domain`：该能力匹配的技术域（来自 MCP `get_sources` 工具）
- `references.t1`：T1 官方来源列表
  - **每个条目都必须经过 web_fetch + 内容相关性验证**
  - verified: true 表示"已爬取、已验证内容相关"，而非"URL 能访问"
- `references.t2`：T2 高质量来源列表（同上，必须验证）
- `verified`：**是否经过完整的验证流程（web_fetch + 状态检查 + 内容相关性判断）**
  - true = 已爬取、内容与该能力直接相关
  - false = URL 存在但未验证或内容不相关
- `title`：页面标题（从 web_fetch 结果中获取）
- `t1_missing`：该能力的所有 T1 域名均未找到相关内容（true 时后处理 agent 需 fallback）

#### 6.5 质量校验规则

| 规则 | 说明 | 违反处理 |
|------|------|---------|
| T1 不为空 | 每个能力至少 1 个 T1 来源 | 无 T1 → `t1_missing: true`，后处理 agent 需自行补充 |
| URL 可访问 | web_fetch 返回 200 | 403/404/429 → 跳过该 URL，尝试下一个 |
| 内容充足 | 正文 > 200 字 | 空页面/登录墙 → 跳过该 URL |
| 内容相关 | 页面标题或正文包含该能力的关键术语 | 不相关 → 跳过该 URL |
| 域名合规 | T1 URL 必须来自 source_domain_map 中对应域的 T1 列表 | 域名不在白名单 → 降级为 T2 或丢弃 |
| 黑名单过滤 | 命中 blacklist 的 URL | 直接丢弃，不写入 JSON |
| 验证完整性 | **每个写入 JSON 的 URL 都必须经过上述全部校验** | 未验证 → 禁止写入，verified 字段不得为 true |

### Step 6.5：结构完整性校验

> 校验已由 MCP `submit_output` 工具统一管理。
> 调用 `submit_output(step="capability-extract", data=..., workDir=...)` 时自动执行校验。
> 校验规则定义在 `schemas/capability-graph.schema.ts` 中。

### Step 7：生成 {{paths.meta_capability_graph}}

将全部结果写入 `{{paths.meta_capability_graph}}`。

---

## 输出：{{paths.meta_capability_graph}}

> ⚠️ **反精简规则**：本文件是下游所有步骤（highground-identify、briefing-assemble、assemble、learning-ladder）的唯一数据源。禁止任何形式的字段省略或结构简化。
>
> - `decompositions.json` 是前处理的中间产物，**不替代**本文件的任何字段。本文件的 `propositions` 必须保留完整的 `generic_core`/`specialization`/`content_weight`/`weight_reasoning` 结构
> - `dependency_graph` 和 `qualifier_injection` 是**必填顶层字段**，不可省略
> - 每个 capability 的 `fanout` 必须是对象 `{count, total, ratio, level}`，**禁止简化为数字**
> - 每个 capability 必须包含 `dependencies`、`tags`、`source_domain`、`covers` 字段，**禁止省略**
> - 每个 capability 的 `references` 必须是对象 `{t1: [], t2: [], t1_missing}`，**禁止简化为 URL 字符串**

输出格式由 MCP `get_output_schema(step="capability-extract")` 定义，包含 template + field_rules + strict_notes。
写入前调用 MCP `submit_output(step="capability-extract", data=..., workDir=...)` 自动校验。

### 能力 ID 命名规范

| 前缀 | 含义 | 示例 |
|------|------|------|
| A | 通用原子能力（Generic） | A1, A2, A8 |
| V | Vue 特化能力 | V1, V2 |
| R | React 特化能力 | R1, R2 |
| W | Webpack 特化能力 | W1, W2 |
| VI | Vite 特化能力 | VI1, VI2 |

---

## 异常与 Fallback

| 异常场景 | 触发条件 | 处理动作 |
|---------|---------|---------|
| 信源预查找全部超时 | 单个能力的 T1+T2 域名 web_fetch 均超时 | 标记 `t1_missing: true` + `t2_missing: true`，后处理 agent 用 Fallback 搜索补充 |
| MCP get_sources 调用失败 | MCP 服务器未连接或返回错误 | 使用内置默认域名列表（MDN + Chrome DevTools + web.dev），标记 `registry_fallback: true` |
| 分词结果为空 | decompositions 列表为空 | 输出空 {{paths.meta_capability_graph}} + 告知用户"无有效命题，请检查扫描结果" |
| 能力数量过多 | 提取 > 30 个原子能力 | 提示用户"能力数量过多（{n}），建议用 --filter 缩小范围"，继续执行但标记 `overload: true` |
| JSON 写入失败 | .meta/ 目录不可写（路径：`{{paths.meta_capability_graph}}` 所在目录） | 自动创建目录 → 仍失败则输出到 stdout，由用户手动保存 |
| 搜索结果全部命中黑名单 | T1+T2 域名搜索结果均在 blacklist 中 | 标记 `all_blocked: true`，该能力不写入 references，后处理 agent 自行搜索 |
| 同一能力多个命题定义冲突 | 不同命题对同一能力的描述差异大 | 保留最详细的描述，其他命题的定义合并到 `covers` 字段 |

## 依赖

- 需要先执行 processes/decompose.md（提供分词结果）
- 需要先执行 processes/scan.md（提供 raw_materials 中的 URL）
- **必须调用 MCP `get_sources` 工具**（获取信源白名单）

## 参考

- [必须加载] core/capability-graph.md（原子能力图谱方法论）— 已在加载清单中标注
- [必须加载] core/architecture-decomposition.md（分词方法论）— 已在加载清单中标注
