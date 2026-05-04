# Scenario Pipeline — 全景执行路径 Roadmap

> 版本：v2.0（2026-05-03，含双写+brieting 优化）
> 本文件是整个 Skill 的执行全景图，用于理解"从用户输入到最终产出"的完整数据流。

---

## 一、总览

```
用户输入                                             最终产出
────────                                           ──────────

"扫描：前端性能面试题"     ┌─────────────────────┐    命题研究（面试深度答案）
  ─────────────────────→  │   前 处 理（串行）    │    能力知识库（跨命题复用）
                          │                     │    学习路径（修炼地图）
"研究：P1、P2、P4"        │  6 步严格顺序执行    │
  ─────────────────────→  │  单 agent 贯穿       │
                          └────────┬────────────┘
                                   │
                                   ▼
                          ┌─────────────────────┐
                          │   后 处 理（并行）    │
                          │                     │
│  阶段一：能力研究     │  ← 滑动窗口并行
│    ⛔ barrier        │
│  Briefing 组装       │  ← 单线程
│    ⛔ barrier        │
                          │  阶段二：命题组装     │  ← 滑动窗口并行
                          └─────────────────────┘
```

---

## 二、前处理：6 步串行管线

> 触发：`扫描：<信息源描述>`
> 执行者：单 agent 顺序执行（不 spawn）
> 编排文件：[references/pre-process.md](references/pre-process.md)

```
Step 1          Step 2          Step 3               Step 4              Step 5          Step 6
scan     →     decompose  →   capability-extract → highground-identify → evaluate  →    pool
广域扫描        架构分词         原子能力提取          战略高地识别          四维评估         入池归档
```

### Step 1：广域扫描 (scan)

| 项 | 内容 |
|----|------|
| 文件 | `processes/scan.md` |
| 输入 | source_desc + topic + constraints |
| 核心 | 从互联网信源中识别相关素材，按 T1/T2/T3 分级 |
| 输出 | `raw_materials[]`（标题+URL+摘要+Tier+日期+标签） |

### Step 2：架构分词 (decompose)

| 项 | 内容 |
|----|------|
| 文件 | `processes/decompose.md` |
| 输入 | Step 1 的 raw_materials |
| 核心 | 对每个命题区分限定词 vs 技术栈关键词 → 向上展开依赖链 → 向下展开被依赖链 → 分层标注 [通用内核]+[特化层] → 确定内容权重 |
| 按需加载 | `--year` → `plugins/year-granularity.md` |
| 输出 | `decompositions[]`（命题+限定词+通用层+特化层+权重） |

### Step 3：原子能力提取 + 信源预查找 (capability-extract)

| 项 | 内容 |
|----|------|
| 文件 | `processes/capability-extract.md` |
| 输入 | Step 2 的 decompositions + Step 1 的 raw_materials |
| 必须加载 | `plugins/source-registry.md` |
| 核心 | 逐命题提取原子能力 → 跨命题去重合并 → 标注依赖 → 计算扇出度 → **信源 URL 预查找**（按白名单搜索+三步验证+黑名单过滤） |
| 输出 | `.meta/capability-graph.json`（含每个能力的 references.t1/t2/t1_missing） |

**信源预查找是前处理最重的步骤**：每个能力都要 web_fetch 验证，16 个能力 ≈ 16-32 次 web_fetch。

### Step 4：战略高地识别 (highground-identify)

| 项 | 内容 |
|----|------|
| 文件 | `processes/highground-identify.md` |
| 输入 | Step 3 的 capability-graph.json |
| 核心 | 计算战略价值(扇出度/耦合度) → 排序分级 → 验证依赖累积 → 生成修炼路径 → 限定词影响分析 |
| 输出 | 追加 JSON 的 `highgrounds[]` + `learning_path[]` |

### Step 5：四维评估 (evaluate)

| 项 | 内容 |
|----|------|
| 文件 | `processes/evaluate.md` |
| 输入 | decompositions + capability-graph.json + raw_materials |
| 核心 | 跨栈耦合 + 文档真空 + 经验壁垒 + 时事热度 → 总分 → 防虚高校准 → 入池判定 |
| 输出 | `evaluations[]`（评分+判定+高地命中+证据来源） |

### Step 6：入池归档 (pool)

| 项 | 内容 |
|----|------|
| 输入 | Step 5 的 evaluations |
| 核心 | 写入总览导航（人类可读）+ 原始记录（内部存档） |
| 输出 | `README.md` + `.meta/candidates.md` |

### 前处理产出结构

```
workflow/research/
├── README.md                    ← 总览导航
└── .meta/
    ├── capability-graph.json    ← 结构化图谱（核心数据，后处理消费）
    └── candidates.md            ← 原始记录
```

---

## 三、后处理：3 步管线（2 次并行 + 1 次 Briefing 组装）

> 触发：`研究：<场景描述>`
> 执行模式：主 agent 调度 + 多个 spawn agent 并行执行
> spawn 机制：两阶段探测（**probe-protocol** → [environment/probe-protocol.md](environment/probe-protocol.md)）→ C0 元探测（能否自建 agent）→ C1-C7 诱导实验 → 能力档案 → 动态适配
> 编排文件：[references/post-process.md](references/post-process.md)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        后处理全景                                     │
│                                                                     │
│  阶段一：能力研究（滑动窗口并行）                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ agent-A1 │ │ agent-A2 │ │ agent-A8 │ │ agent-A5 │  ← 窗口=4    │
│  │ 双写:    │ │ 双写:    │ │ 双写:    │ │ 双写:    │               │
│  │  主文件  │ │  主文件  │ │  主文件  │ │  主文件  │               │
│  │  摘要JSON│ │  摘要JSON│ │  摘要JSON│ │  摘要JSON│               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│       ↓            ↓            ↓            ↓                     │
│  ══════════════════════════════════════════════════                  │
│  ⛔ BARRIER: 全部完成后才进入下一步                                    │
│  ══════════════════════════════════════════════════                  │
│                                                                     │
│  Briefing 组装（单线程）                                 │
│  ┌─────────────────────────────────────────┐                        │
│  │ 读 .meta/summaries/*.json               │                        │
│  │ × capability-graph.json (能力→命题映射)  │                        │
│  │ → 按5种文件类型定向提取                   │                        │
│  │ → 生成 .meta/briefings/<命题>.md         │                        │
│  └─────────────────────────────────────────┘                        │
│       ↓                                                             │
│  ══════════════════════════════════════════════════                  │
│  ⛔ BARRIER: 全部 briefing 生成后才进入下一步                          │
│  ══════════════════════════════════════════════════                  │
│                                                                     │
│  阶段二：命题组装（滑动窗口并行）                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐   │
│  │ agent-P1-ov  │ │ agent-P1-ec  │ │ agent-P2-ov  │ │ agent-P4-tf│  │
│  │ task内联:    │ │ task内联:    │ │ task内联:    │ │ task内联:  │  │
│  │  briefing   │ │  briefing   │ │  briefing   │ │  briefing │  │
│  │  (overview) │ │  (edge)     │ │  (overview) │ │  (trade)  │  │
│  │  只写不读   │ │  只写不读   │ │  只写不读   │ │  只写不读 │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 阶段一：能力研究

| 项 | 内容 |
|----|------|
| process | `processes/capability-research.md` |
| 输入 | capability-graph.json（能力列表+T1/T2 URL） |
| 必须加载 | `plugins/source-registry.md`、`plugins/capability-research-mode.md` |
| 并行 | 滑动窗口（窗口=4，每 agent 1 个能力） |
| 核心流程 | 信源获取（四级优先级）→ 机制阐述 → 瓶颈识别 → 工具链 → Trade-off → 最小实验 → 参考资料 → **双写 summary.json** |
| 输出 | `capabilities/<id>-<name>.md` + `.meta/summaries/<id>-<name>.json` |

**信源获取四级优先级**：
```
① JSON 中 verified=true 的 T1 → 直接 web_fetch
② JSON 中 verified=true 的 T2 → 补充 web_fetch
③ t1_missing=true → fallback 到 source-registry 白名单搜索
④ 搜索无结果 → 标记信源不足，不编造
```

**双写 summary.json 字段**：
```json
{
  "id", "name", "tech_layer", "fanout", "coupling", "strategic_value",
  "mechanism_summary",   // ← overview 用
  "bottlenecks",         // ← edge-cases 用
  "tradeoffs",           // ← trade-offs 用
  "experiment_code",     // ← experiment 用
  "references"           // ← references 用
}
```

### Briefing 组装

| 项 | 内容 |
|----|------|
| 执行模式 | 主 agent 单线程执行，不 spawn |
| 输入 | `.meta/summaries/*.json` + `capability-graph.json` |
| 核心 | 对每个命题：从 JSON 获取涉及的能力 ID → 读对应 summary → 按5种文件类型定向提取 → 组装 briefing |

**定向提取规则**：

| 目标文件 | 从 summary 提取 | 不提取 |
|---------|----------------|--------|
| overview | mechanism_summary | bottlenecks, tradeoffs, experiment_code |
| edge-cases | bottlenecks(name+trigger+symptom) | mechanism_summary, experiment_code |
| trade-offs | tradeoffs(完整四列) | mechanism_summary, experiment_code |
| experiment | experiment_code | mechanism_summary, bottlenecks |
| references | references(tier+url+title) | 正文内容 |

**上下文消耗**：读 32KB summaries + 写 30KB briefings ≈ 62KB（主 agent 可承受）

**输出**：`.meta/briefings/<命题简称>.md`

### 阶段二：命题组装

| 项 | 内容 |
|----|------|
| process | `processes/assemble.md` |
| 输入 | briefing（内联到 task）+ target_file 类型 |
| 必须加载 | `plugins/capability-research-mode.md`、`core/scenario-matrix.md` |
| 并行 | 滑动窗口（窗口=4，每 agent 1 个命题的 1 个象限文件） |
| 核心约束 | **只写不读**——agent 不读 capabilities/ 下的任何文件 |
| 输出 | `<序号>-<命题简称>/{overview,edge-cases,trade-offs,experiment/,references}.md` |

**5 个象限文件的职责**：

| 文件 | 象限 | 核心内容 |
|------|------|---------|
| overview.md | Q1 链路解构 | 按数据流排列能力，形成输入→输出完整链路 |
| edge-cases.md | Q2 坑点提取 | 从瓶颈中过滤命题相关的坑点 + 组合极端场景 |
| trade-offs.md | Q3 方案对比 | 2-3 种技术路线的权衡表 + 牺牲点 |
| experiment/ | Q4 最小实验 | 可运行的代码环境 + 验证检查点 |
| references.md | 参考资料 | 按 Tier 排序去重的 URL 列表 |

---

## 四、完整数据流图

```
用户输入
  │
  ▼
┌─────────────────────── 前处理 ───────────────────────┐
│                                                       │
│  scan ──→ decompose ──→ capability-extract ──→        │
│    │         │              │                         │
│    │         │              ├─ 去重/依赖/扇出度       │
│    │         │              └─ 信源URL预查找           │
│    │         │                   │                    │
│    │         │                   ▼                    │
│    │         │         .meta/capability-graph.json    │
│    │         │              │                         │
│    │         │              ▼                         │
│    │         ├────→ highground-identify ──→           │
│    │         │         (追加 highgrounds              │
│    │         │          + learning_path)              │
│    │         │              │                         │
│    │         │              ▼                         │
│    └─────────┴────→ evaluate ──→ pool                │
│                        │         │                    │
│                        │         ├── README.md        │
│                        │         └── .meta/           │
│                        │             candidates.md    │
└───────────────────────────────────────────────────────┘
                         │
                         ▼ (capability-graph.json 是前后处理的核心交接点)
                         
┌─────────────────────── 后处理 ───────────────────────┐
│                                                       │
│  ┌── 阶段一：能力研究 ──────────────────────────┐    │
│  │                                               │    │
│  │  capability-graph.json                        │    │
│  │       │                                       │    │
│  │       ├── 筛选待研究能力                       │    │
│  │       ├── 增量检查（已有→跳过）                │    │
│  │       └── 为每个能力预查找T1/T2 URL            │    │
│  │              │                                 │    │
│  │              ▼  滑动窗口并行（窗口=4）          │    │
│  │   ┌─────────────────────────────────┐         │    │
│  │   │ agent-A1 │ agent-A2 │ agent-A8 │  ...    │    │
│  │   │ 双写:    │ 双写:    │ 双写:    │         │    │
│  │   │  md+json │  md+json │  md+json │         │    │
│  │   └─────────────────────────────────┘         │    │
│  │        │            │           │              │    │
│  │        ▼            ▼           ▼              │    │
│  │  capabilities/    .meta/summaries/             │    │
│  │   A1-xxx.md       A1-xxx.json                 │    │
│  │   A2-xxx.md       A2-xxx.json                 │    │
│  │   ...            ...                          │    │
│  └───────────────────────────────────────────────┘    │
│                       │                               │
│                  ⛔ BARRIER                           │
│                       │                               │
│  ┌── Briefing 组装 ────────────────────────────┐    │
│  │                                               │    │
│  │  .meta/summaries/*.json                       │    │
│  │       ×                                       │    │
│  │  capability-graph.json (能力→命题映射)         │    │
│  │       │                                       │    │
│  │       ├── 对每个命题：                         │    │
│  │       │   获取涉及的能力ID                     │    │
│  │       │   → 读对应 summary.json                │    │
│  │       │   → 按5种文件类型定向提取               │    │
│  │       │   → 组装 briefing                      │    │
│  │       │                                       │    │
│  │       ▼                                       │    │
│  │  .meta/briefings/                             │    │
│  │   01-长列表渲染.md                            │    │
│  │   02-首屏白屏.md                              │    │
│  └───────────────────────────────────────────────┘    │
│                       │                               │
│                  ⛔ BARRIER                           │
│                       │                               │
│  ┌── 阶段二：命题组装 ──────────────────────────┐    │
│  │                                               │    │
│  │  .meta/briefings/<命题>.md                    │    │
│  │       │                                       │    │
│  │       ▼  滑动窗口并行（窗口=4）                │    │
│  │   ┌───────────────────────────────────────┐   │    │
│  │   │ P1-overview │ P1-edge │ P2-overview │  ...  │    │
│  │   │ briefing内联 │ briefing │ briefing   │   │    │
│  │   │ 只写不读    │ 只写不读 │ 只写不读    │   │    │
│  │   └───────────────────────────────────────┘   │    │
│  │        │            │           │              │    │
│  │        ▼            ▼           ▼              │    │
│  │  01-长列表渲染/   02-首屏白屏/  ...            │    │
│  │   overview.md      overview.md                │    │
│  │   edge-cases.md    edge-cases.md              │    │
│  │   trade-offs.md    trade-offs.md              │    │
│  │   experiment/      experiment/                │    │
│  │   references.md    references.md              │    │
│  └───────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────┘
```

---

## 五、上下文加载地图

### 前处理

```
scan.md
  └── core/scenario-matrix.md（信源分级定义）

decompose.md
  ├── core/architecture-decomposition.md
  └── [--year] plugins/year-granularity.md

capability-extract.md
  ├── core/capability-graph.md
  ├── core/architecture-decomposition.md
  └── plugins/source-registry.md  ← 必须

highground-identify.md
  └── core/strategic-highground.md

evaluate.md
  └── core/scenario-matrix.md
```

### 后处理

```
阶段一：capability-research.md
  ├── plugins/source-registry.md  ← 必须（fallback 搜索）
  ├── plugins/capability-research-mode.md  ← 必须（材料块格式）
  ├── core/capability-graph.md
  ├── environment/probe-protocol.md  ← 必须（探测环境，Step 0）

Briefing 组装：
  ├── .meta/summaries/*.json
  ├── .meta/capability-graph.json
  └── README.md（命题列表）

阶段二：assemble.md
  ├── plugins/capability-research-mode.md  ← 必须（组装格式）
  ├── core/scenario-matrix.md  ← 必须（四象限框架）
  └── environment/probe-protocol.md  ← 已在阶段一加载，复用
```

---

## 六、核心数据实体生命周期

| 数据实体 | 诞生步骤 | 消费步骤 | 消费方式 |
|---------|---------|---------|---------|
| `raw_materials[]` | scan | decompose, evaluate | 内存传递 |
| `decompositions[]` | decompose | capability-extract, evaluate | 内存传递 |
| `capability-graph.json` | capability-extract → highground-identify 追加 | 后处理全流程 | 文件读写 |
| `evaluations[]` | evaluate | pool | 内存→文件 |
| `README.md` | pool | 用户 + 后处理 | 人类阅读+agent读取 |
| `capabilities/<id>.md` | capability-research | **人类阅读**（组装agent不再读） | 人类消费 |
| `summaries/<id>.json` | capability-research 双写 | Briefing 组装 | 机器消费 |
| `briefings/<命题>.md` | Briefing 组装 | assemble agent | 内联到task |
| `<命题>/overview.md` 等 | assemble | 用户 | 人类消费 |

**关键洞察**：`capabilities/*.md` 在新方案中只服务于**人类读者**，组装 agent 通过 `summaries → briefings` 链路获取素材，不再直接读能力文件。

---

## 七、插件引用关系

```
plugins/year-granularity.md
  └── 被 decompose.md 按需加载（--year 参数）

plugins/capability-research-mode.md
  ├── 被 capability-research.md 必须加载（材料块格式）
  └── 被 assemble.md 必须加载（组装格式+实验模板）

plugins/source-registry.md
  ├── 被 capability-extract.md 必须加载（信源URL预查找）
  └── 被 capability-research.md 必须加载（fallback搜索）

environment/probe-protocol.md            ← 环境探测（必须加载）
  ├── 被 post-process.md 必须加载（后处理启动时）
  └── 探测结果写入 .meta/environment-profile.json
```

---

## 八、文件清单与职责

| 文件 | 层 | 职责 | 稳定性 |
|------|---|------|--------|
| `SKILL.md` | 入口 | 触发方式+流程概览+导航 | ★★★ |
| `core/architecture-decomposition.md` | 元能力 | 定义"什么是架构分词" | ★★★ |
| `core/capability-graph.md` | 元能力 | 定义"什么是原子能力图谱" | ★★★ |
| `core/strategic-highground.md` | 元能力 | 定义"什么是战略高地" | ★★★ |
| `core/scenario-matrix.md` | 元能力 | 定义"四维评估+四象限框架" | ★★★ |
| `plugins/year-granularity.md` | 插件 | 年限→颗粒度映射 | ★★ |
| `plugins/capability-research-mode.md` | 插件 | 材料块格式+深度分级 | ★★ |
| `plugins/source-registry.md` | 插件 | 信源白名单+黑名单 | ★（热插拔） |
| `environment/probe-protocol.md` | 环境 | 自然语言诱导+7维能力探测+适配协议 | ★★ |
| `references/pre-process.md` | 编排 | 前处理6步编排 | ★★ |
| `references/post-process.md` | 编排 | 后处理3步编排+调度算法 | ★★ |
| `processes/scan.md` | 步骤 | 广域扫描 | ★ |
| `processes/decompose.md` | 步骤 | 架构分词 | ★ |
| `processes/capability-extract.md` | 步骤 | 原子能力提取+信源预查找 | ★ |
| `processes/highground-identify.md` | 步骤 | 战略高地识别 | ★ |
| `processes/evaluate.md` | 步骤 | 四维评估 | ★ |
| `processes/capability-research.md` | 步骤 | 能力研究+双写 | ★ |
| `processes/assemble.md` | 步骤 | 命题组装(只写不读) | ★ |

---

## 九、故障模式与恢复

| 故障点 | 表现 | 恢复策略 |
|--------|------|---------|
| 前处理 scan 网络不通 | raw_materials 为空 | 换镜像/指定 --source |
| capability-extract 信源验证全部失败 | t1_missing=true 普遍 | 后处理 fallback 搜索 |
| 阶段一 agent 超时 | summary.json 缺失 | 精确重跑该能力（1 agent 1 文件） |
| Briefing 组装超时 | .meta/briefings/ 不完整 | 按缺失命题增量生成 |
| 阶段二 agent 输出质量差 | 文件内容空洞 | 重跑：拿同样的 briefing 再写一次 |
| summary 与主文件不一致 | 摘要过时 | 从主文件重新提取（增量修复） |
| 运行时 spawn 失败 | agent 无法创建 | 检查 .meta/environment-profile.json 中 C1 是否为 true |
| 运行时 barrier 失败 | 结果未回传 | 检查 C7 状态，若 ⚠️ 则降级为轮询文件 |
| 诱导实验全部失败 | C1=❌ | 确认运行在支持多 Agent 的平台上；手动写 environment-profile.json 绕过 |
| 缓存过期（spawn 连续失败） | 能力档案与实际不匹配 | 删除 .meta/environment-profile.json，重新探测 |
