# 输出契约

> 每个步骤的输出结构定义 + 完整示例。所有步骤产出的 JSON 必须符合此处定义。
> 示例即标准——模型应模仿示例的结构、字段名和嵌套关系。

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
      "summary": "小程序 setData 的通信机制、批量更新策略、差量更新实现",
      "relevance": "小程序场景的渲染性能优化",
      "fetch_status": "ok"
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
      "content_weight": "100%",
      "weight_reasoning": "纯通用场景"
    }
  ]
}
```

**注意**：`propositions` 字段在 capability-extract 步骤自动从 decompositions.json 注入，后处理阶段直接读取此文件即可获取命题元数据，无需再读 decompositions.json。

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
      "reasoning": "跨栈耦合高（涉及浏览器+工程层），文档真空中等（MDN 有但不够深入），经验壁垒高（需要实战积累），热度中等"
    }
  ],
  "summary": { "high": 1, "medium": 0, "rejected": 0 }
}
```

---

## §6 pipeline-state.json（管线状态）

路径：`{workDir}/.meta/pipeline-state.json`

```json
{
  "pipeline_version": "1.0",
  "started_at": "2026-05-20T10:00:00Z",
  "last_update": "2026-05-20T11:30:00Z",
  "status": "paused",
  "current_phase": "phase1",
  "current_step": "capability-research",
  "stages": {
    "pre-process": {
      "status": "completed",
      "completed_at": "2026-05-20T10:30:00Z"
    },
    "capability-research": {
      "total": 3,
      "completed": ["A1"],
      "running": ["A2"],
      "pending": ["A8"],
      "failed": []
    },
    "briefing-assemble": {
      "completed": [],
      "pending": ["P1", "P2"]
    },
    "assembly": {
      "completed": [],
      "pending": ["P1", "P2"]
    },
    "learning-ladder": {
      "completed": [],
      "pending": ["P1", "P2"]
    }
  },
  "checkpoints_passed": ["ⓐ", "ⓑ", "ⓒ"],
  "last_checkpoint": "ⓒ",
  "interrupt_type": "checkpoint",
  "cleanup_log": [
    {
      "checkpoint": "ⓔ",
      "timestamp": "2026-05-20T10:30:00Z",
      "actions": [
        { "type": "cron_remove", "target": "agent-tracker-mini-program", "status": "ok" },
        { "type": "tracker_archive", "target": "agent-tracker.json", "status": "ok" },
        { "type": "agent_kill", "target": "agent-a-render", "status": "skip", "reason": "already exited" }
      ],
      "warnings": []
    }
  ]
}
```

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

## P1：内存持续增长
- **触发条件**：滚动 10 分钟后内存从 50MB 涨到 200MB
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
