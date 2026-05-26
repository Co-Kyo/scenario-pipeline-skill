# Step ⓪: 多维头脑风暴

> **本步骤不在前处理串行链内**。它是管道之前的用户意图解析阶段，产出需求网后交由 Step ① 作为精准输入。

## 目的

将用户一句话指令"揉开"成一张结构化的需求网：自动推断经验年限，向上还原文档域，向下拆解核心命题，标注命题间依赖和搜索方向。产出 `requirement-web.json`，作为 Step ① scan 的精准输入。

## 为什么需要这一步

当前架构的因果关系是反的：
- 用户一句话 → 直接 scan → scan 抓到什么就分词 → **命题完整性取决于运气**
- 正确的因果：用户一句话 → 需求网（逻辑推演）→ 定向 scan → **命题完整性取决于用户需求的逻辑展开**

需求网是 scan 的"地图"——scan 不再是"发现命题"，而是"为已有命题寻找信源"。

## 前置条件

⛔ 加载：
- `meta/output-contracts.md`§0（需求网输出格式）
- `meta/sources.md`（T0 域名表，供裁判 Agent 校验搜索方向的可行性）
- `plugins/year-granularity.md`（年限颗粒度规则，用于命题粒度过滤）

> **🔒 上下文隔离**
> - ✅ 允许读取：`core/shared-conventions.md`、`meta/output-contracts.md`§0、`meta/sources.md`、`plugins/year-granularity.md`
> - ❌ 禁止读取：`processes/01~07.md`、`core/*.md`（`plugins/year-granularity.md` 除外）

## 输入

- 用户指令原文（raw_input）
- 解析出的约束参数：`--year`、`--platform`、`--depth`

## 执行步骤

### 1. 解析用户指令 + 年限自动推断

从用户指令中提取：
- `raw_input`：用户原文
- `topic`：主题关键词（如"webpack & vite"）
- `constraints`：已解析的约束（year、platform、depth 等）

#### 1.1 年限推断规则

**优先级**：显式参数 `--year` > 自然语言显式数字 > 隐式信号推断

**显式数字匹配**（正则）：

| 模式 | 示例 | 映射 |
|------|------|------|
| `(\d+)-(\d+)年` | "3-5年" → L2 | 取中间值查阶梯 |
| `(\d+)年以上` | "5年以上" → L3 | 下界查阶梯 |
| `(\d+)年左右` | "3年左右" → L2 | 直接查阶梯 |
| `(\d+)年经验` | "2年经验" → L1 | 直接查阶梯 |

**阶梯映射**：

| 年限 | 阶梯 |
|------|------|
| 1-3 年 | L1 |
| 3-5 年 | L2 |
| 5-8 年 | L3 |
| 8+ 年 | L4 |

**隐式信号匹配**（当无显式数字时）：

| 信号类型 | 关键词 | 映射 |
|---------|--------|------|
| 职级词 | 初级、入门、新手、小白 | L1 |
| 职级词 | 中级、熟练、有经验 | L2 |
| 职级词 | 高级、资深、专家 | L3 |
| 职级词 | 架构、首席、技术总监 | L4 |
| 岗位词 | 校招、应届、实习 | L1 |
| 岗位词 | 社招、初中级开发 | L2 |
| 岗位词 | Tech Lead、Team Lead、架构师 | L3/L4 |
| 场景词 | 面试准备、八股文、刷题 | L2 |
| 场景词 | 架构选型、技术决策、治理 | L3 |
| 场景词 | 团队工程化、组织级、体系建设 | L4 |
| 深度词 | 怎么用、基本用法、入门 | L1 |
| 深度词 | 原理、机制、优化、源码 | L2 |
| 深度词 | 为什么选、trade-off、演进 | L3 |

**冲突处理**：
1. 显式参数 `--year` 优先级最高，直接采用
2. 显式数字（如"3-5年"）优先级次之
3. 多个隐式信号取众数（出现最多的等级）
4. 无法推断 → 默认 L2（覆盖面最广，可由用户在 ⓩ 检查点修正）

**推断结果写入**：`inferred_year` 字段，附带 `year_inference_trace`（推断依据）

```
year_inference_trace 示例：
  "用户原文含'3-5年'，显式匹配 → L2"
  "用户原文含'高级'+'架构选型'，隐式信号[L3,L3] → L2 被覆盖 → L3"
  "无年限信号，默认 L2"
```

#### 1.2 跳过判断

如果用户指令足够明确（包含具体技术栈 + 年限已推断 + platform 已指定），可跳过头脑风暴的多 Agent 阶段，直接将推断结果注入 Step ①。
- ✅ 跳过条件：topic 明确 + year 已推断（显式或高置信隐式）+ platform 已指定
- ❌ 不可跳过：topic 模糊（如"前端性能"）、或 year 置信度低、或用户主动要求深度分析

### 2. 组装 4 份维度 Agent task

每个 Agent 的 task 由三部分拼接：**角色声明** + **维度任务** + **约束注入**。

**⚠️ 关键变更**：所有 4 个 Agent 均收到年限颗粒度规则，按对应阶梯过滤产出。

#### 年限约束注入块（所有 Agent 共享）

在每个 Agent 的 task 中注入以下约束块：

```
## 经验年限约束
- 推断年限：{year_level}（{year_desc}）
- 命题粒度要求：{粒度描述}
- 命题命名模式：{命名模式}
- 入池阈值：{阈值}
- 深度要求：{深度调整}
- 排除范围：{排除项}
```

注入内容来源：`plugins/year-granularity.md` 对应阶梯的定义。

#### 2.1 场景 Agent

**角色**：你是一个资深前端面试官和技术场景分析师。

**任务**：从"这个知识点会被怎样考"的角度，展开用户输入。

具体要求：
1. 列出该主题下所有可能出现的面试/实战场景（≥5 个）
2. **按年限阶梯过滤**：
   - L1：只保留"概念级"场景（是什么、怎么用）
   - L2：只保留"方案级"场景（怎么做、有哪些方案、各有什么坑）
   - L3：只保留"决策级"场景（为什么选 A 不选 B、代价是什么）
   - L4：只保留"体系级"场景（如何设计、如何演进、如何治理）
3. 每个场景标注：场景描述、考察深度（基础/进阶/深水区）、出现频率（高频/中频/低频）
4. 按面试出现频率排序

**输出格式**：
```json
{
  "dimension": "scenario",
  "year_filtered": true,
  "scenarios": [
    {
      "id": "S1",
      "name": "场景名称",
      "description": "场景描述",
      "depth": "基础|进阶|深水区",
      "frequency": "高频|中频|低频",
      "granularity_match": "该场景符合 L2 的方案级粒度"
    }
  ],
  "excluded_scenarios": [
    {
      "name": "被过滤的场景名称",
      "reason": "低于/高于目标年限粒度（如：L2 下过滤掉 L1 概念级场景）"
    }
  ]
}
```

#### 2.2 技术 Agent

**角色**：你是一个技术专家，擅长拆解技术能力、识别依赖关系。

**任务**：从"这个主题涉及哪些技术能力"的角度，展开用户输入。为每个命题标注涉及的原子能力，并区分通用能力和特化能力。

具体要求：
1. 拆解该主题涉及的所有技术能力点（原子级别，不可再分）
2. 每个能力点标注：名称、所属技术层、一句话描述、通用/特化属性
3. **通用/特化判定**：
   - **通用能力**：不依赖特定工具/框架/平台即可理解和掌握的能力（如渲染管线、网络协议、算法、内存管理）
   - **特化能力**：绑定特定工具/框架/平台的能力（如 Vue 响应式、React Fiber、Webpack 插件体系）
   - 判定标准：换个工具/框架，这个能力是否仍然有意义？是→通用，否→特化
4. 标注能力点之间的前置依赖关系（A 依赖 B）
5. 标注每个能力覆盖哪些命题（fanout 雏形）
6. **按年限过滤能力**：L1 跳过深层原理能力，L2 跳过基础用法能力，L3 跳过入门概念能力

**输出格式**：
```json
{
  "dimension": "technical",
  "capabilities": [
    {
      "id": "T1",
      "name": "能力名称",
      "layer": "技术层（如：浏览器层/网络层/工程层/框架层/工具层/算法层/协议层等，按实际技术域自行归类）",
      "description": "一句话描述",
      "type": "generic|specialized",
      "depends_on": [],
      "covers": ["命题ID"]
    }
  ]
}
```

#### 2.3 学习 Agent

**角色**：你是一个前端教育者，擅长设计渐进式学习路径。

**任务**：从"从不会到会应该学什么"的角度，展开用户输入。

具体要求：
1. **按目标经验年限**，列出从基础到目标水平的学习路径
2. 每个学习节点标注：节点名称、前置节点、预估学习时长、验证标准（做到/做不到）
3. 标注哪些节点是"战略高地"——掌握后能解锁最多其他节点
4. 考虑不同起点（有框架经验 vs 无框架经验）的分支路径
5. **路径终点应与年限阶梯匹配**：L1 止于"概念辨析"，L2 止于"原理+取舍"，L3 止于"架构决策"

**输出格式**：
```json
{
  "dimension": "learning",
  "target_level": "L2",
  "learning_path": [
    {
      "id": "L1",
      "name": "节点名称",
      "prerequisites": [],
      "estimated_time": "2h|1d|1w",
      "verification": "做到才算过的标准",
      "is_strategic": false
    }
  ]
}
```

#### 2.4 约束 Agent

**角色**：你是一个需求分析专家，擅长识别隐含约束和边界条件。

**任务**：从"哪些该包含、哪些该排除"的角度，展开用户输入。

具体要求：
1. 从用户指令中提取所有显式约束（年限、平台、技术栈）
2. 推断隐式约束（如"3-5年"意味着不需要讲基础概念，但需要讲原理）
3. 明确排除项（哪些内容超出目标经验范围）
4. **按年限阶梯调整**（直接引用 `year-granularity.md` 对应阶梯的规则）：
   - L1：基础题→概念辨析，排除原理和架构
   - L2：进阶题→原理+取舍，排除基础概念和体系治理
   - L3：深水区→手写实现+性能优化+架构决策
   - L4：体系级→治理+演进+跨团队协作

**输出格式**：
```json
{
  "dimension": "constraint",
  "explicit_constraints": {
    "year": "L2",
    "year_source": "inferred: 用户原文含'3-5年'",
    "platform": "web",
    "tech_stack": ["webpack", "vite"]
  },
  "inferred_constraints": [
    "不需要讲解 npm/yarn 基础用法（L2 下，基础操作已掌握）",
    "需要覆盖构建性能优化和插件开发（L2 方案级深度）"
  ],
  "exclusions": [
    "Rollup 内部实现（超出范围）",
    "Webpack 1.x/2.x 版本差异（过时）",
    "npm/yarn 基础用法（低于 L2 经验水平）"
  ],
  "depth_adjustments": {
    "基础概念": "跳过或一笔带过",
    "原理机制": "重点展开",
    "实战优化": "需要案例"
  }
}
```

### 3. Spawn 4 个维度 Agent（并行 + 轮询跟踪）

> ⚠️ 本步骤采用「简单窗口」调度模式（4 个任务互相独立），严格遵循 `core/shared-conventions.md` 的并行调度规则。
> **严禁 `sessions_yield`。** spawn 后必须进入轮询跟踪，主动权始终在主线程。

#### 3.1 初始化

同时 spawn 4 个 Agent，每个 Agent 的 label 和预期产出：

| label | 维度 | 预期产出 |
|-------|------|---------|
| `brainstorm-scenario` | 场景 | 包含 `dimension: "scenario"` 的 JSON |
| `brainstorm-technical` | 技术 | 包含 `dimension: "technical"` 的 JSON |
| `brainstorm-learning` | 学习 | 包含 `dimension: "learning"` 的 JSON |
| `brainstorm-constraint` | 约束 | 包含 `dimension: "constraint"` 的 JSON |

每个 Agent 的 task 内联全部必要信息（用户指令 + 约束参数 + 年限颗粒度规则 + 维度任务定义），不读取任何外部文件。

#### 3.2 轮询跟踪

按 `core/shared-conventions.md` §**模式 A：简单窗口** 执行轮询循环。本步骤特有参数：

| 参数 | 值 |
|------|---|
| W | 4（维度 Agent 数量固定为 4，一次性全部 spawn） |
| 超时 | 3 分钟 |
| 槽位替换 | ❌ 无（一次性填满 4 个，不补位） |
| label | `brainstorm-scenario`, `brainstorm-technical`, `brainstorm-learning`, `brainstorm-constraint` |
| expected_files | 无文件产出，完成判定 = 输出含合法 JSON + `dimension` 字段 |

**特殊**：4 个维度 Agent 一次性全部 spawn，不做分批。任何一个结束不补位，等全部结束后进入裁判阶段。

#### 3.3 完成判定

- **completed**：Agent 输出包含合法 JSON 且包含 `dimension` 字段
- **failed**：Agent 返回错误或输出不含合法 JSON
- **timeout**：单 Agent 运行超过 3 分钟（头脑风暴的维度 Agent 体量小，3 分钟足够；不走 15 分钟的通用超时）

#### 3.4 降级策略

| 情况 | 处理 |
|------|------|
| 1 个维度缺失 | 裁判 Agent 基于其余 3 份报告推断补全 |
| 2 个维度缺失 | 裁判 Agent 基于其余 2 份报告补全，标注"低置信度" |
| 3+ 个维度缺失 | 降级：跳过头脑风暴，直接进入 Step ① 按原始指令扫描 |

#### 3.5 等待期间行为

轮询期间**不做其他工作**（头脑风暴是前置阶段，没有可并行的后台任务）。每次轮询间隔 15 秒，不做 busy-wait。

### 4. Spawn 裁判 Agent（串行，单 Agent）

4 个维度 Agent 全部完成后（或降级判定后），spawn 裁判 Agent。

**调度**：
- 单 Agent，无并发，直接 spawn
- **超时**：5 分钟。超时则重试一次（重新 spawn）
- 重试仍失败 → 降级：取 4 份维度报告中最完整的 1 份作为需求网，标注"低置信度"
- 等待期间每 15 秒轮询一次 `subagents list`

**完成判定**：Agent 输出包含合法 JSON 且包含 `propositions` 和 `capability_web` 字段。

裁判 Agent 读取 4 份视角报告，执行以下收敛逻辑：

#### 4.1 合并

- 4 个维度的重叠部分合并（如场景 Agent 列出的"HMR 原理"和技术 Agent 列出的"模块热替换"是同一能力点）
- 以技术 Agent 的能力点为骨架，将场景/学习/约束的视角挂载到对应能力点上

#### 4.2 裁决

- 矛盾部分按优先级裁决：约束 Agent 的排除项 > 技术 Agent 的能力边界 > 场景 Agent 的频率判断
- 如果约束 Agent 排除某个能力点，但场景 Agent 标记为高频 → 保留但标注"受限于约束，降级为可选"

#### 4.3 补全

- 如果某个维度缺失（Agent 超时），裁判基于其余报告推断补全
- 检查依赖链完整性：如果 A 依赖 B，但 B 不在列表中 → 补入 B
- 检查覆盖度：如果场景 Agent 列出 8 个场景但技术 Agent 只覆盖 5 个 → 提示并补全

#### 4.4 排序

- 按战略价值排序：fanout（被多少场景覆盖）× 与约束的契合度
- 输出推荐的扫描优先级

#### 4.5 构建能力图谱雏形

裁判 Agent 在合并时，同时产出：
- `capability_web`：按能力 ID 组织的结构（含 name、layer、type、depends_on、fanout、covers）
- 每个命题附带 `capability_ids`（从能力列表中按 covers 关系提取）
- `qualifier_injection`：限定词注入映射

**裁判 task 模板**：

```
你是一个技术需求分析的裁判。你收到了 4 份维度分析报告，需要将它们合并收敛为一张需求网。

## 用户原始指令
{raw_input}

## 已解析约束
year={year}（{year_source}），year_level={L1/L2/L3/L4}，platform={platform}，depth={depth}

## 年限颗粒度规则
{year-granularity.md 对应阶梯的完整定义}

## 4 份维度报告
### 场景维度
{scenario_report_json}

### 技术维度
{technical_report_json}

### 学习维度
{learning_report_json}

### 约束维度
{constraint_report_json}

## 你的任务

1. **合并**：以技术维度的能力点为骨架，将其他维度的信息挂载上去。重叠部分合并。
2. **裁决**：约束维度的排除项优先级最高。矛盾时以约束为准。
3. **补全**：检查依赖链完整性（A 依赖 B → B 必须在列表中）。检查覆盖度（场景维度的每个场景必须有技术能力覆盖）4. **排序**：按战略价值（被多少场景覆盖）排序。标注扫描优先级（high/medium/low）。
5. **搜索建议**：为每个命题给出推荐的搜索关键词（原理类 + 实践类各 1-2 组）。
6. **能力图谱雏形**：产出 capability_web（按能力 ID 组织，含 type、fanout、covers、dependencies），以及每个命题的 capability_ids。

## 输出格式

严格按以下 JSON 格式输出，不要输出其他内容：
（见 meta/output-contracts.md §0 的 requirement-web.json 示例）

注意：requirement-web.json 除了标准字段外，还必须包含：
- context.year_level（L1/L2/L3/L4）
- context.year_source（推断依据）
- context.year_inference_trace（完整推断过程）
- capability_web（能力图谱雏形）
- qualifier_injection（限定词注入映射）
- 每个 proposition 附带 capability_ids
```

### 5. 写入

裁判 Agent 产出 `requirement-web.json`，写入 `{workDir}/.meta/requirement-web.json`。

### 6. 注入 Step ①

将 `requirement-web.json` 作为 Step ① scan 的附加输入。Step ① 在执行时：
- 从 requirement-web 中读取 `propositions` 列表，为每个命题执行定向搜索
- 从 `search_guidance` 中获取每个命题的推荐关键词
- 从 `scope.exclusions` 中获取排除规则，过滤不相关内容
- 从 `context` 中获取经验年限（含推断依据），影响信源深度判断

## 输出

- 文件：`{workDir}/.meta/requirement-web.json`
- 摘要（stdout，≤200 字）：域上下文、年限推断结果、命题数量、能力数量、依赖关系数、排除项数

## 校验清单

- [ ] requirement-web.json 包含 context、propositions、dependencies、scope、search_guidance 五个顶层字段
- [ ] context 包含 year_level、year_source、year_inference_trace
- [ ] 每个 proposition 包含 id、name、depth、search_keywords、capability_ids
- [ ] capability_web 中的能力 ID 与 propositions 的 capability_ids 一致
- [ ] dependencies 中引用的 id 全部在 propositions 中存在
- [ ] scope.exclusions 非空（至少有 1 条排除规则）
- [ ] 排序后的 proposition 顺序与 search_priority 一致
- [ ] 裁判 Agent 的输出可被 JSON.parse 解析
- [ ] 年限推断有明确依据（显式匹配或隐式信号记录）

## 异常处理

| 场景 | 处理 |
|------|------|
| 维度 Agent 超时（>3min） | 该维度缺失，裁判基于其余 3 份报告补全 |
| 4 个维度 Agent 全部超时 | 降级：跳过头脑风暴，Step ① 按原始指令扫描 |
| 裁判 Agent 超时（>5min） | 降级：取 4 份报告中最完整的 1 份作为需求网 |
| 裁判输出 JSON 解析失败 | 重试一次；仍失败则降级 |
| 用户指令已足够明确（topic+year+platform 齐全） | 跳过头脑风暴，直接进入 Step ① |
| 年限推断置信度低（无显式信号，隐式信号冲突） | 默认 L2，在 ⓩ 检查点展示推断依据请用户确认 |

## 检查点

🚨 **🛑 必须停顿，进入 ⓩ 检查点**。展示需求网摘要（域上下文、年限推断结果及依据、命题列表、能力图谱雏形、排除项），使用 `clarify` 等待用户确认后才进入 Step ①。

用户可在此检查点：
- **修正年限推断**（如推断为 L2 但实际是 L3）
- 补充遗漏的命题
- 删除不需要的命题
- 调整排序优先级
- 修改排除规则
