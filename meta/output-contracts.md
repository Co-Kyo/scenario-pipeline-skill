# 输出契约

> 每个步骤的输出结构定义 + 完整示例。所有步骤产出的 JSON 必须按以下示例格式。

---

## §1 raw-materials.json（扫描产出）

路径：`{workDir}/.meta/raw-materials.json`

```json
{
  "scan_time": "2026-05-20T10:00:00Z",
  "source_desc": "前端性能优化合集",
  "topic": "前端性能优化",
  "total_sources": 5,
  "tier_distribution": { "T0": 2, "T1": 1, "T2": 1, "T3": 1 },
  "materials": [
    {
      "id": "M1",
      "title": "Rendering Performance — web.dev",
      "url": "https://web.dev/articles/rendering-performance",
      "domain": "web.dev",
      "source_tier": "T0",
      "summary": "浏览器渲染管线的关键路径、重排重绘的触发条件与优化策略",
      "relevance": "直接覆盖渲染管线和重排优化",
      "fetch_status": "ok"
    },
    {
      "id": "M2",
      "title": "微信小程序 setData 性能优化",
      "url": "https://cloud.tencent.com/developer/article/123456",
      "domain": "cloud.tencent.com",
      "source_tier": "T2",
      "source_tier_trace": "cloud.tencent.com 不在 T0 表中。web_fetch 验证内容：setData 性能优化文章含通信机制和批量更新策略详解，有代码示例。Tier 评估：内容来源=腾讯云官方技术社区(T1达标)、内容深度=原理+实践(达标)、引用规范=有外部链接(达标)，5维度中3个达标 → T2。",
      "summary": "小程序 setData 的通信机制、批量更新策略、差量更新实现",
      "relevance": "小程序场景的渲染性能优化",
      "fetch_status": "ok"
    }
  ],
  "discarded": [
    {
      "url": "https://example.com/spam-article",
      "domain": "example.com",
      "discard_reason": "内容不达标：正文仅150字，为目录页无实质内容"
    }
  ],
  "dynamic_registrations": [
    {
      "domain": "cloud.tencent.com",
      "tier": "T2",
      "reason": "腾讯云官方技术社区，setData 性能优化文章质量高"
    }
  ]
}
```

---

## §2 decompositions.json（分词产出）

路径：`{workDir}/.meta/decompositions.json`

```json
{
  "decompositions": [
    {
      "proposition_id": "P1",
      "proposition": "长列表渲染：如何在万级数据量下保持流畅滚动",
      "identification_trace": "从素材 M1（Rendering Performance）、M3（Canvas最佳实践）中提取。判定为独立命题：能用一句话描述（万级数据量下保持流畅滚动）、有明确技术关键词（虚拟滚动、DOM回收）、可独立研究（涉及浏览器层+工程层完整链路）。",
      "qualifier": "",
      "tech_keyword": "长列表渲染、虚拟滚动、DOM 回收",
      "generic_core": [
        {
          "layer": "浏览器层",
          "capabilities": ["A1-浏览器渲染管线", "A2-DOM节点生命周期"]
        },
        {
          "layer": "工程层",
          "capabilities": ["A8-DevTools性能分析"]
        }
      ],
      "specialization": [],
      "content_weight": "100%",
      "weight_reasoning": "纯通用场景，无框架限定"
    },
    {
      "proposition_id": "P2",
      "proposition": "React 首屏白屏：SSR 与 Suspense 的工程取舍",
      "qualifier": "React",
      "tech_keyword": "首屏白屏、SSR、Suspense、hydration",
      "generic_core": [
        {
          "layer": "浏览器层",
          "capabilities": ["A1-浏览器渲染管线"]
        },
        {
          "layer": "网络层",
          "capabilities": ["A3-网络加载策略"]
        }
      ],
      "specialization": [
        {
          "layer": "框架层",
          "capabilities": ["R1-React渲染架构"]
        }
      ],
      "content_weight": "70%",
      "weight_reasoning": "React 限定词注入特化层，通用内容占 70%"
    }
  ]
}
```

---

## §3 capability-graph.json（能力提取产出）

路径：`{workDir}/.meta/capability-graph.json`

```json
{
  "generated_at": "2026-05-20T10:00:00Z",
  "total_capabilities": 3,
  "total_propositions": 2,
  "dependency_graph": {
    "A1": [],
    "A2": ["A1"],
    "A8": ["A1", "A2"]
  },
  "qualifier_injection": {
    "React": {
      "injects": ["R1-React渲染架构"],
      "replaces": []
    }
  },
  "capabilities": [
    {
      "id": "A1",
      "name": "浏览器渲染管线",
      "layer": "浏览器层",
      "description": "从 HTML/CSS/JS 到像素上屏的完整渲染流程，包含关键渲染路径、重排重绘、合成层",
      "source_domain": "browser_api",
      "fanout": { "count": 2, "total": 2, "ratio": "2/2", "level": "100%" },
      "coupling": 0,
      "covers": ["P1", "P2"],
      "dependencies": [],
      "tags": ["渲染", "重排", "重绘", "合成层", "关键渲染路径"],
      "references": {
        "t0": [
          {
            "url": "https://web.dev/articles/rendering-performance",
            "title": "web.dev: Rendering Performance",
            "verified": true
          }
        ],
        "t1": [],
        "t2": [],
        "t3": [],
        "t0_missing": false
      }
    },
    {
      "id": "A2",
      "name": "DOM 节点生命周期",
      "layer": "浏览器层",
      "description": "DOM 节点的创建、布局、绘制、销毁全过程，含 GC 机制和内存泄漏模式",
      "source_domain": "browser_api",
      "fanout": { "count": 1, "total": 2, "ratio": "1/2", "level": "50%" },
      "coupling": 1,
      "covers": ["P1"],
      "dependencies": ["A1"],
      "dependencies_trace": "A2 依赖 A1，因为：DOM 节点的布局和绘制发生在浏览器渲染管线的 Layout/Paint 阶段，不理解 A1 就无法理解 DOM 节点为何在特定时机被创建/销毁",
      "tags": ["DOM", "GC", "内存泄漏", "节点回收"],
      "references": {
        "t0": [
          {
            "url": "https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model",
            "title": "MDN: Document Object Model",
            "verified": true
          }
        ],
        "t1": [],
        "t2": [],
        "t3": [],
        "t0_missing": false
      }
    }
  ],
  "propositions": [
    {
      "proposition_id": "P1",
      "proposition": "长列表渲染：如何在万级数据量下保持流畅滚动",
      "qualifier": "",
      "tech_keyword": "长列表渲染、虚拟滚动、DOM 回收",
      "generic_core": [
        { "layer": "浏览器层", "capabilities": ["A1", "A2"] }
      ],
      "specialization": [],
      "capability_ids": ["A1", "A2"],
      "content_weight": "100%",
      "weight_reasoning": "纯通用场景"
    }
  ]
}
```

**注意**：`propositions` 字段在 capability-extract 步骤自动从 decompositions.json 注入，后处理阶段直接读取此文件即可获取命题元数据，无需再读 decompositions.json。`capability_ids` 从 `generic_core` + `specialization` 中扁平提取，供后处理 task 模板直接引用。

---

## §4 highgrounds.json（战略高地产出）

路径：`{workDir}/.meta/highgrounds.json`

```json
{
  "generated_at": "2026-05-20T10:00:00Z",
  "highgrounds": [
    {
      "capability_id": "A1",
      "capability_name": "浏览器渲染管线",
      "fanout_ratio": "2/2",
      "strategic_value": 2.0,
      "reasoning": "覆盖全部命题，是渲染性能的底层基础",
      "tier": "一级"
    }
  ],
  "learning_path": ["A1", "A2", "A8"]
}
```

---

## §5 evaluations.json（四维评估产出）

路径：`{workDir}/.meta/evaluations.json`

```json
{
  "generated_at": "2026-05-20T10:00:00Z",
  "evaluations": [
    {
      "proposition_id": "P1",
      "proposition": "长列表渲染：如何在万级数据量下保持流畅滚动",
      "scores": {
        "cross_stack_coupling": 3,
        "doc_vacuum": 2,
        "experience_barrier": 3,
        "topical_heat": 2
      },
      "total_score": 10,
      "priority": "high",
      "priority_trace": "总分10（跨栈耦合3+文档真空2+经验壁垒3+时事热度2），阈值判定：10≥8 → high",
      "reasoning": "跨栈耦合高（涉及浏览器+工程层），文档真空中等（MDN 有但不够深入），经验壁垒高（需要实战积累），热度中等",
      "difficulty": "medium",
      "difficulty_reason": "涉及能力依赖链深度2层（A5→A3→A1），需理解渲染管线和DOM生命周期两个技术层",
      "recommended_order": 2,
      "prerequisite_of": []
    }
  ],
  "summary": { "high": 1, "medium": 0, "rejected": 0 }
}
```

说明：
- `difficulty`（low/medium/high）：基于能力依赖链深度、知识跨度、概念抽象度的综合评估
- `difficulty_reason`：一句话说明主要难度来源
- `recommended_order`：推荐学习序号（low→medium→high，同级内按依赖关系排序）
- `prerequisite_of`：该命题是哪些其他命题的前置（可选，由 Agent 基于能力 covers 关系推断）

---

## §6 pool 产出（入池归档）

### README.md：`{workDir}/README.md`

命题总览导航，供人类阅读。模板：

```markdown
# <研究主题> — 命题研究

> 目标人群：<年限>
> 扫描时间：<日期>

## 命题索引

| # | 命题 | 四维评分 | 优先级 | 难度 | 研究目录 |
|---|------|---------|--------|------|---------|
| P1 | 长列表渲染：... | 10 | high | 🟢 low | [01-长列表渲染](01-长列表渲染/) |
| P2 | 首屏白屏：... | 8 | high | 🟡 medium | [02-首屏白屏](02-首屏白屏/) |

## 推荐学习顺序

按掌握难度从低到高排列（基于原子能力依赖链深度评估）：

1. 🟢 P1 — ...（无前置依赖，建立基础认知）
2. 🟡 P2 — ...（前置：P1，需理解渲染管线）
3. 🔴 P3 — ...（前置：P1+P2，需全新知识体系）

## 学习路径（战略高地）

1. 🏔️ **A8-DevTools 性能分析**（覆盖 7/7 命题）
2. 🏔️ **A1-浏览器渲染管线**（覆盖 5/7 命题）

完整能力图谱：[capabilities/README.md](capabilities/README.md)

## 能力知识库

按原子能力组织的跨命题参考手册：[capabilities/](capabilities/)
```

填充数据来源：
- 命题索引 ← `evaluations.json`（命题名、评分、优先级、难度）
- 推荐学习顺序 ← `highgrounds.json` 的 `learning_path` + `capability-graph.json` 的能力依赖链
- 学习路径 ← `highgrounds.json` 的 `highgrounds`（战略高地列表）

### candidates.md：`{workDir}/.meta/candidates.md`

Pipeline 内部存档（非结构化），记录前处理阶段筛选出的候选命题原始数据。仅供调试追溯，不进入后处理消费链。

---

## §7 capability-research 产出

### 主文件：`{workDir}/capabilities/{id}-{name}.md`

```markdown
# 浏览器渲染管线

> 从 HTML/CSS/JS 到像素上屏的完整渲染流程，包含关键渲染路径、重排重绘、合成层。

## 核心机制
（详细描述该能力的技术原理，≥500 字）

## 工程瓶颈
### 瓶颈 1：强制同步布局（Layout Thrashing）
- **触发条件**：在 JS 中交替读写布局属性（offsetTop → style.left → offsetTop）
- **表现症状**：帧率骤降至 10-20fps，DevTools Performance 面板可见大量紫色 Layout 块
- **解决方案**：读写分离、requestAnimationFrame 批量处理、FastDOM 库

### 瓶颈 2：...
（每个瓶颈包含：触发条件、表现症状、解决方案）

## 调试工具
- Chrome DevTools Performance 面板：录制 → 查看 Main 线程火焰图
- Lighthouse：渲染性能评分 + 优化建议
- ...

## 典型权衡
| 维度 | 方案 A | 方案 B | 建议 |
|------|--------|--------|------|
| 重排范围 | 全量重排 | 局部重排 + 合成层 | 合成层适合动画，不适合所有场景 |
| ... | ... | ... | ... |

## 最小验证实验
（可运行的 HTML/JS 代码，演示重排重绘的性能差异）

## 参考资料
- [T0] web.dev: Rendering Performance — https://web.dev/articles/rendering-performance
- [T1] ...
```

### 摘要：`{workDir}/.meta/summaries/{id}-{name}.json`

```json
{
  "id": "A1",
  "name": "浏览器渲染管线",
  "tech_layer": "浏览器层",
  "mechanism_summary": "浏览器将 HTML/CSS/JS 转化为像素的完整流水线：解析→样式→布局→绘制→合成。关键渲染路径决定了首屏性能。",
  "bottlenecks": [
    {
      "name": "强制同步布局",
      "trigger": "JS 中交替读写布局属性",
      "symptom": "帧率骤降，Layout 块密集",
      "category": "时序竞争"
    }
  ],
  "tradeoffs": [
    {
      "dimension": "重排范围",
      "option_a": "全量重排",
      "option_b": "局部重排 + 合成层",
      "recommendation": "动画场景用合成层，结构性变更用局部重排"
    }
  ],
  "experiment_code": "<div id='box' style='width:100px;height:100px;background:red'></div>\n<script>...</script>",
  "references": [
    { "tier": "T0", "url": "https://web.dev/articles/rendering-performance", "title": "Rendering Performance" }
  ]
}
```

---

## §8 briefing 产出

路径：`{workDir}/.meta/briefings/{seq}-{short_name}.md`

```markdown
# 长列表渲染 — 组装 Briefing

## 命题信息
命题：长列表渲染：如何在万级数据量下保持流畅滚动
限定词：（无）

## 涉及能力摘要

### A1-浏览器渲染管线 [用于: overview/edge-cases/trade-offs/experiment]
机制：浏览器将 HTML/CSS/JS 转化为像素的完整流水线
瓶颈：
  - 强制同步布局：JS 中交替读写布局属性 → 帧率骤降
  - 重排风暴：批量 DOM 操作触发级联重排 → 卡顿
权衡：
  - 重排范围：全量重排 vs 局部重排+合成层，建议动画场景用合成层
实验代码：（包含完整 HTML）
参考：[T0] https://web.dev/articles/rendering-performance

### A2-DOM节点生命周期 [用于: overview/edge-cases/experiment]
机制：...

## 内容比例约束
开篇 10-15%：无限定词，直接切入场景
主体 70-80%：通用工程原理
收尾 10-15%：通用方案总结
```

---

## §9 assemble 产出

### overview.md

```markdown
# 长列表渲染：链路编排

## 问题链
Q1: 万级数据量下，渲染管线的瓶颈在哪？
Q2: 虚拟滚动的实现涉及哪些原子能力？
Q3: 不同方案的取舍是什么？
Q4: 如何验证方案有效性？

## 链路解构
1. 数据层：数据量 → 分页/虚拟化决策点
2. 浏览器层：DOM 节点数 → 布局/绘制耗时 → [A1-浏览器渲染管线]
3. 工程层：虚拟滚动实现 → [A2-DOM节点生命周期] + [A8-DevTools性能分析]
...

## 能力引用
- A1：关键渲染路径决定了单帧可处理的 DOM 节点上限
- A2：DOM 回收策略直接影响 GC 压力
...
```

### edge-cases.md

```markdown
# 长列表渲染：坑点提取

## P0：滚动白屏
- **触发条件**：快速滚动时，新 DOM 节点未及时渲染
- **根因**：rAF 回调被长任务阻塞，新节点的 paint 延迟
- **关联能力**：A1-浏览器渲染管线
- **解法**：预留缓冲区（overscan）+ 预渲染机制
- **筛选_trace**：候选来源：A1 bottlenecks[0]（强制同步布局）、A2 bottlenecks[1]（DOM 回收延迟）。排除 A1 bottlenecks[2]（重排风暴，与滚动场景不直接相关）。保留为 P0：快速滚动场景下必现，帧率骤降至 10fps 以下。

## P1：内存持续增长
- **触发条件**：滚动 10 分钟后内存从 50MB 涨到 200MB
- **筛选_trace**：候选来源：A2 bottlenecks[0]（Detached DOM 泄漏）。保留为 P1：长时运行场景高频出现，需项目级踩坑才能发现。
...
```

### trade-offs.md

```markdown
# 长列表渲染：方案对比

| 维度 | 方案 A：全量渲染 | 方案 B：虚拟滚动 | 方案 C：分页加载 |
|------|-----------------|-----------------|-----------------|
| 首屏性能 | ❌ O(n) | ✅ O(1) | ✅ O(1) |
| 滚动体验 | ✅ 原生 | ⚠️ 需实现 | ❌ 需翻页 |
| 实现复杂度 | 低 | 高 | 低 |
| 内存占用 | ❌ O(n) | ✅ O(1) | ✅ O(1) |
| 涉及能力 | A1 | A1, A2, A8 | A1 |
| 牺牲点 | 性能 | 实现复杂度 | 连续性 |
```

---

## §10 learning-ladder 产出

路径：`{workDir}/{seq}-{short_name}/learning-ladder.md`

```markdown
# 长列表渲染 — 学习阶梯

## 阶段一：理解渲染瓶颈（基础）

### Step 1.1：认识渲染管线
- **做什么**：打开 Chrome DevTools → Performance → 录制一段长列表滚动
- **你会看到**：火焰图中大量的 Layout 和 Paint 块
- **这说明了**：每滚动一次，浏览器都要重新布局和绘制所有 DOM 节点
- **做到才算过**：能准确指出火焰图中 Layout 块对应的代码行
- **接下来去哪**：[A1-浏览器渲染管线](../capabilities/A1-浏览器渲染管线.md) §核心机制

### Step 1.2：测量 DOM 节点数
- **做什么**：在 Console 执行 `document.querySelectorAll('*').length`
- **你会看到**：长列表页面的 DOM 节点数可能超过 10000
- **这说明了**：DOM 节点数和渲染耗时近似线性关系
- **做到才算过**：能说出当前页面的 DOM 节点数和对应的渲染耗时
- **接下来去哪**：[A2-DOM节点生命周期](../capabilities/A2-DOM节点生命周期.md)

## 阶段二：实现虚拟滚动（技能）
...

## 阶段三：性能调优与工程化（综合）
...

## 失败回退
- 阶段一卡住 → 回到 [A1](../capabilities/A1-浏览器渲染管线.md) 重新阅读 §核心机制
- 阶段二卡住 → 先完成 [experiment/](./experiment/) 中的最小实验
```
