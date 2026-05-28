# 输出契约

> 每个步骤的输出结构定义 + 完整示例。所有步骤产出的 JSON 必须按以下示例格式。

---

## §0 requirement-web.json（头脑风暴产出）

路径：`{workDir}/.meta/requirement-web.json`

```json
{
  "generated_at": "2026-05-26T12:00:00Z",
  "raw_input": "3-5年前端web开发经验的候选人应该掌握的webpack&vite知识点",
  "context": {
    "domain": "前端构建工具",
    "domain_up": "前端工程化",
    "target_level": "L2",
    "year": "L2",
    "year_source": "inferred: 用户原文含'3-5年'，显式匹配 → L2",
    "year_inference_trace": "正则匹配 '3-5年' → 取中间值4年 → 查阶梯映射：3-5年=L2",
    "platform": "web",
    "tech_stack": ["webpack", "vite"]
  },
  "strategy": {
    "core_label": "方案攻克",
    "premise_label": "概念确认",
    "outlook_label": "决策方向",
    "ratios": { "premise": "10-15%", "core": "70-80%", "outlook": "5-10%" }
  },
  "propositions": [
    {
      "id": "RW-P1",
      "name": "Webpack 模块解析与打包原理",
      "description": "从入口文件到产物的完整打包链路：依赖图构建、模块解析、chunk 拆分、runtime 注入",
      "depth": "原理",
      "search_priority": "high",
      "search_keywords": {
        "principles": ["webpack 模块打包原理", "webpack dependency graph"],
        "practices": ["webpack 打包流程分析", "webpack 构建产物解读"]
      },
      "covered_by_scenarios": ["S1", "S3", "S5"],
      "capability_ids": ["T1", "T3", "T5"],
      "level_weight": {
        "level": "L2",
        "role": "core",
        "reason": "方案级命题，涉及 2-3 技术层组合"
      }
    }
  ],
  "dependencies": {
    "RW-P1": [],
    "RW-P2": ["RW-P1"],
    "RW-P3": [],
    "RW-P4": ["RW-P3"],
    "RW-P5": ["RW-P1", "RW-P3"]
  },
  "capability_web": {
    "T1": {
      "name": "模块解析策略",
      "layer": "工具层",
      "type": "generic",
      "provisional_level": "L2",
      "provisional_role": "core",
      "depends_on": [],
      "fanout": { "count": 3, "total": 5, "ratio": "3/5", "level": "60%" },
      "covers": ["RW-P1", "RW-P2", "RW-P5"]
    }
  },
  "qualifier_injection": {},
  "scope": {
    "inclusions": [
      "Webpack 5 的核心机制（不追溯 1-4 版本）",
      "Vite 5 的核心机制",
      "构建性能优化的通用策略"
    ],
    "exclusions": [
      "Rollup 内部实现细节（Vite 的依赖，非直接考察点）",
      "Webpack 1.x/2.x 版本差异（过时）",
      "Gulp/Grunt 等旧工具链（不在范围内）",
      "npm/yarn 基础用法（低于目标经验水平）"
    ]
  },
  "search_guidance": {
    "global_keywords": ["webpack", "vite", "前端构建"],
    "excluded_keywords": ["gulp", "grunt", "rollup 内部", "webpack 1", "webpack 2"],
    "preferred_domains": ["webpack.js.org", "vitejs.dev", "web.dev", "developer.mozilla.org"],
    "depth_filter": "跳过入门教程，优先原理分析和实战优化"
  },
  "convergence_trace": {
    "agents_completed": ["scenario", "technical", "learning", "constraint"],
    "conflicts_resolved": [],
    "gaps_filled": []
  }
}
```

### 中间产物：维度报告文件

路径：`{workDir}/.meta/brainstorm/{dimension}.json`（dimension = scenario | technical | learning | constraint）

每个维度 Agent 的产出独立持久化为 JSON 文件，供收敛者 Agent 读取合并。文件格式与各维度 Agent 的输出格式一致（见 `processes/00-brainstorm.md` §2.1-2.4）。

**维度报告结构**：
- 顶层字段：`dimension`、`target_level`、`anchor_coverage`（含 covered/supplemented/skipped/skip_reason）
- entries 命名各自不同：`scenarios`（场景）、`capabilities`（技术）、`learning_path`（学习）、`constraints`（约束）
- 每个 entry 必含 `level_weight`（level + role + reason）

这些中间产物：
- **必须保留**：供回溯审查和调试
- **收敛者 Agent 通过 read 工具读取**：不再内联到 task 中
- **校验方式**：`cat {file} | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'dimension' in d"`

---

**字段说明**：

| 字段 | 含义 | 消费方 |
|------|------|--------|
| `context.year` | 推断或指定的经验年限（L1-L4） | Step ① 搜索深度、Step ③ 入池阈值 |
| `context.target_level` | 最终确认的经验年限级别（L1-L4） | 所有后续步骤的 level_weight 传导 |
| `context.year_source` | 年限推断依据 | 调试追溯 |
| `context.year_inference_trace` | 年限推断完整过程 | 调试追溯 |
| `strategy` | 动态标准策略元数据（标签+比例） | Step ①-⑦ 的行为参数 |
| `propositions` | 头脑风暴产出的命题列表 | Step ① 定向 scan 的目标清单 |
| `propositions[].capability_ids` | 命题涉及的能力 ID | Step ② 能力图谱构建 |
| `propositions[].level_weight` | 命题的层次权重（level+role+reason） | Step ① 密度搜索、Step ③ 评分、Step ⑥ 组装 |
| `capability_web` | 能力图谱雏形（按能力 ID 组织，含 type: generic\|specialized） | Step ② 能力图谱构建 |
| `capability_web[].provisional_level` | 能力的初步层次标注 | Step ④ 研究深度 |
| `scope.exclusions` | 排除项 | Step ① 过滤不相关内容 |
| `search_guidance` | 全局搜索策略 | Step ① 搜索参数 |
| `convergence_trace` | 收敛者合并决策的凭据 | 调试追溯，不进入消费链 |

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

## §2 capability-graph.json（能力图谱构建产出，含战略高地）

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
  "learning_path": ["A1", "A2", "A8"],
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

**注意**：
- `highgrounds` 和 `learning_path` 已合并到本文件中（原 highgrounds.json 不再单独存在）
- `propositions` 字段从 requirement-web.json 注入，后处理阶段直接读取此文件即可
- `capability_ids` 从 `generic_core` + `specialization` 中扁平提取

---

## §3 evaluations.json（评估与入池产出）

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
      "priority_trace": "总分10（跨栈耦合3+文档真空2+经验壁垒3+时事热度2），阈值判定（L2：≥6→high）：10≥6 → high",
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
- `priority_trace`：必须包含年限阈值适配信息（如"L2：≥6→high"）

### README.md：`{workDir}/README.md`

命题总览导航，供人类阅读。模板：

```markdown
# <研究主题> — 命题研究

> 目标人群：<年限>（<推断依据>）
> 扫描时间：<日期>

## 命题索引

| # | 命题 | 四维评分 | 优先级 | 难度 | 研究目录 |
|---|------|---------|--------|------|---------|
| P1 | 长列表渲染：... | 10 | high | 🟢 low | [01-长列表渲染](01-长列表渲染/) |

## 推荐学习顺序
（基于原子能力依赖链深度评估）

## 学习路径（战略高地）
（来自 capability-graph.json 的 highgrounds）

## 能力知识库
[capabilities/](capabilities/)
```

### candidates.md：`{workDir}/.meta/candidates.md`

Pipeline 内部存档，记录前处理阶段筛选出的候选命题原始数据。仅供调试追溯。

---

## §4 capability-research 产出

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

## 调试工具
## 典型权衡
## 最小验证实验
## 参考资料
```

### 摘要：`{workDir}/.meta/summaries/{id}-{name}.json`

```json
{
  "id": "A1",
  "name": "浏览器渲染管线",
  "tech_layer": "浏览器层",
  "mechanism_summary": "浏览器将 HTML/CSS/JS 转化为像素的完整流水线",
  "bottlenecks": [],
  "tradeoffs": [],
  "experiment_code": null,
  "references": []
}
```

---

## §5 briefing 产出

路径：`{workDir}/.meta/briefings/{seq}-{short_name}.md`

```markdown
# 长列表渲染 — 组装 Briefing

## 命题信息
命题：长列表渲染：如何在万级数据量下保持流畅滚动
限定词：（无）

## 涉及能力摘要
### A1-浏览器渲染管线 [用于: overview/edge-cases/trade-offs/experiment]
机制：...
瓶颈：...
权衡：...
参考：...

## 内容比例约束
开篇 10-15%：无限定词，直接切入场景
主体 70-80%：通用工程原理
收尾 10-15%：通用方案总结
```

---

## §6 assemble 产出

每命题产出：
- `{workDir}/{seq}-{short_name}/overview.md`
- `{workDir}/{seq}-{short_name}/edge-cases.md`
- `{workDir}/{seq}-{short_name}/trade-offs.md`
- `{workDir}/{seq}-{short_name}/references.md`
- `{workDir}/{seq}-{short_name}/experiment/README.md`
- `{workDir}/{seq}-{short_name}/experiment/src/`

---

## §7 learning-ladder 产出

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

## 阶段二：实现虚拟滚动（技能）
## 阶段三：性能调优与工程化（综合）

## 失败回退
- 阶段一卡住 → 回到 A1 重新阅读 §核心机制
- 阶段二卡住 → 先完成 experiment/ 中的最小实验
```
