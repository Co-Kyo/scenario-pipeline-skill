# Process: 原子能力提取 (capability-extract)

> 从多个命题的分词结果中提取原子能力，计算扇出度，预查找每个能力的 T1/T2 信源 URL，输出结构化 capability-graph.json。

## 输入

- `decompositions`：所有命题的分词结果列表（来自 processes/decompose.md 的输出）
- `raw_materials`：扫描阶段的原始素材（来自 processes/scan.md 的输出，含 URL）

## 加载条件

- **必须加载**：plugins/source-registry.md（信源域名白名单 + 黑名单 + 搜索策略）

## 执行步骤

### Step 1：逐命题提取原子能力

对每个命题的 [通用内核] + [特化层] 进行逐层拆解：
- 每个独立可学习的技术能力 → 一个原子能力
- 命名规范：`<技术域>-<能力描述>`

### Step 2：去重与合并

跨命题去重：相同能力合并为一条，保留最高 Tier 来源

### Step 3：标注依赖关系

每个原子能力的前置依赖（A 依赖 B = 理解 A 之前必须先理解 B）

### Step 4：计算扇出度

```
扇出度 = 该能力出现在多少个命题的能力集合中 / 总命题数
```

### Step 5：限定词注入分析

分析不同限定词向命题注入的特化能力集

### Step 6：信源 URL 预查找（强制）

**对每个原子能力，必须预查找其 T1/T2 参考 URL，写入 JSON。**

#### 6.1 确定技术域

根据 plugins/source-registry.md 的 §三「能力 → 技术域自动映射规则」，为每个能力匹配技术域。

#### 6.2 按白名单查找

严格按 plugins/source-registry.md 的 §二「技术域 → T1 域名映射」和 §五「搜索策略模板」执行：

```
1. 从 source_domain_map 获取该技术域的 T1 域名列表
2. 对每个 T1 域名：
   a. mimo_web_search "<能力名称> site:<域名>"
   b. 取第一个结果
   c. web_fetch 验证：HTTP 200？内容 > 200 字？与能力相关？
   d. 通过 → 记录 URL + title，标记 verified: true
   e. 不通过 → 尝试下一个 T1 域名
3. 所有 T1 无结果：
   a. 获取 T2 域名列表
   b. 重复上述流程
4. T2 也无结果：
   a. mimo_web_search "<能力名称> official documentation"
   b. 从结果中选取最权威来源
   c. 标记 t1_missing: true
```

#### 6.3 黑名单检查

搜索结果 URL 必须与 plugins/source-registry.md 的 §四「反爬黑名单」比对：
- 命中黑名单的 URL 直接跳过，不写入 JSON

#### 6.4 写入格式

在 capability-graph.json 的每个能力对象中增加 `references` 字段：

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
- `source_domain`：该能力匹配的技术域（来自 plugins/source-registry.md）
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

### Step 7：生成 capability-graph.json

将全部结果写入 `.meta/capability-graph.json`。

---

## 输出：capability-graph.json

```jsonc
{
  "$schema": "capability-graph-v1",
  "meta": {
    "scan_date": "2026-05-02",
    "target_years": "L2",
    "total_propositions": 7,
    "scan_scope": "前端性能优化面试场景分析题"
  },

  "capabilities": [
    {
      "id": "A1",
      "name": "浏览器渲染管线",
      "layer": "浏览器层",
      "description": "CRP→Layout→Paint→Composite",
      "source_domain": "browser_api",
      "fanout": {
        "count": 5,
        "total": 7,
        "ratio": "5/7",
        "level": "core"
      },
      "coupling": 1,
      "covers": ["P1", "P2", "P3", "P5", "P6"],
      "dependencies": [],
      "tags": ["渲染", "浏览器", "CRP"],
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
  ],

  "dependency_graph": {},
  "qualifier_injection": {},
  "highgrounds": [],
  "learning_path": []
}
```

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
| source-registry.md 缺失 | 文件不存在或格式损坏 | 使用内置默认域名列表（MDN + Chrome DevTools + web.dev），标记 `registry_fallback: true` |
| 分词结果为空 | decompositions 列表为空 | 输出空 capability-graph.json + 告知用户"无有效命题，请检查扫描结果" |
| 能力数量过多 | 提取 > 30 个原子能力 | 提示用户"能力数量过多（{n}），建议用 --filter 缩小范围"，继续执行但标记 `overload: true` |
| JSON 写入失败 | .meta/ 目录不可写 | 自动创建目录 → 仍失败则输出到 stdout，由用户手动保存 |
| 搜索结果全部命中黑名单 | T1+T2 域名搜索结果均在 blacklist 中 | 标记 `all_blocked: true`，该能力不写入 references，后处理 agent 自行搜索 |
| 同一能力多个命题定义冲突 | 不同命题对同一能力的描述差异大 | 保留最详细的描述，其他命题的定义合并到 `covers` 字段 |

## 依赖

- 需要先执行 processes/decompose.md（提供分词结果）
- 需要先执行 processes/scan.md（提供 raw_materials 中的 URL）
- **必须加载 plugins/source-registry.md**（信源白名单）

## 参考

- core/capability-graph.md（原子能力图谱方法论）
- core/architecture-decomposition.md（分词方法论）
- plugins/source-registry.md（信源域名配置）
