# Step ⓪: 多维头脑风暴

> **本步骤不在前处理串行链内**。它是管道之前的用户意图解析阶段，产出需求网后交由 Step ① 作为精准输入。

## 目的

将用户一句话指令"揉开"成一张结构化的需求网：向上还原文档域，向下拆解核心命题，标注命题间依赖和搜索方向。产出 `requirement-web.json`，作为 Step ① scan 的精准输入。

## 为什么需要这一步

当前架构的因果关系是反的：
- 用户一句话 → 直接 scan → scan 抓到什么就分词 → **命题完整性取决于运气**
- 正确的因果：用户一句话 → 需求网（逻辑推演）→ 定向 scan → **命题完整性取决于用户需求的逻辑展开**

需求网是 scan 的"地图"——scan 不再是"发现命题"，而是"为已有命题寻找信源"。

## 前置条件

⛔ 加载：
- `meta/output-contracts.md`§0（需求网输出格式）
- `meta/sources.md`（T0 域名表，供裁判 Agent 校验搜索方向的可行性）

> **🔒 上下文隔离**
> - ✅ 允许读取：`core/shared-conventions.md`、`meta/output-contracts.md`§0、`meta/sources.md`
> - ❌ 禁止读取：`processes/01~10.md`、`core/*.md`、`plugins/*.md`

## 输入

- 用户指令原文（raw_input）
- 解析出的约束参数：`--year`、`--platform`、`--depth`

## 架构

```
用户指令
   │
   ├──→ 场景 Agent（并行）→ 场景视角报告
   ├──→ 技术 Agent（并行）→ 技术视角报告
   ├──→ 学习 Agent（并行）→ 学习视角报告
   └──→ 约束 Agent（并行）→ 约束视角报告
         │
         └──→ 裁判 Agent（合并收敛）→ requirement-web.json → 交给 Step ①
```

- 4 个维度 Agent 并行执行，各自独立产出，互不可见
- 裁判 Agent 读取 4 份报告，执行合并/裁决/补全/排序，产出最终需求网
- 总计 5 个 Agent，2 轮调度（并行 4 → 串行 1）

## 执行步骤

### 1. 解析用户指令

从用户指令中提取：
- `raw_input`：用户原文
- `topic`：主题关键词（如"webpack & vite"）
- `constraints`：已解析的约束（year、platform、depth 等）

如果用户指令足够明确（包含具体技术栈 + 年限 + 平台），可跳过头脑风暴，直接将约束注入 Step ①。判断标准：
- ✅ 跳过条件：topic 明确 + year 已指定 + platform 已指定
- ❌ 不可跳过：topic 模糊（如"前端性能"）、或缺少年限/平台约束、或用户主动要求深度分析

### 2. 组装 4 份维度 Agent task

每个 Agent 的 task 由三部分拼接：**角色声明** + **维度任务** + **约束注入**。

#### 2.1 场景 Agent

**角色**：你是一个资深前端面试官和技术场景分析师。

**任务**：从"这个知识点会被怎样考"的角度，展开用户输入。

具体要求：
1. 列出该主题下所有可能出现的面试/实战场景（≥5 个）
2. 每个场景标注：场景描述、考察深度（基础/进阶/深水区）、出现频率（高频/中频/低频）
3. 区分"知道概念就行"和"必须能手写实现"的场景
4. 按面试出现频率排序

**输出格式**：
```json
{
  "dimension": "scenario",
  "scenarios": [
    {
      "id": "S1",
      "name": "场景名称",
      "description": "场景描述",
      "depth": "基础|进阶|深水区",
      "frequency": "高频|中频|低频"
    }
  ]
}
```

#### 2.2 技术 Agent

**角色**：你是一个前端技术专家，精通构建工具、浏览器原理和工程化。

**任务**：从"这个主题涉及哪些技术能力"的角度，展开用户输入。

具体要求：
1. 拆解该主题涉及的所有技术能力点（原子级别，不可再分）
2. 每个能力点标注：名称、所属技术层（浏览器层/网络层/工程层/框架层/工具层）、一句话描述
3. 标注能力点之间的前置依赖关系（A 依赖 B）
4. 区分"通用能力"（框架无关）和"特化能力"（框架/工具绑定）

**输出格式**：
```json
{
  "dimension": "technical",
  "capabilities": [
    {
      "id": "T1",
      "name": "能力名称",
      "layer": "浏览器层|网络层|工程层|框架层|工具层",
      "description": "一句话描述",
      "type": "generic|specialized",
      "depends_on": []
    }
  ]
}
```

#### 2.3 学习 Agent

**角色**：你是一个前端教育者，擅长设计渐进式学习路径。

**任务**：从"从不会到会应该学什么"的角度，展开用户输入。

具体要求：
1. 按目标经验年限，列出从基础到目标水平的学习路径
2. 每个学习节点标注：节点名称、前置节点、预估学习时长、验证标准（做到/做不到）
3. 标注哪些节点是"战略高地"——掌握后能解锁最多其他节点
4. 考虑不同起点（有框架经验 vs 无框架经验）的分支路径

**输出格式**：
```json
{
  "dimension": "learning",
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
4. 按目标年限调整每个命题的预期深度（基础题→概念辨析，进阶题→原理+取舍，深水区→手写实现+性能优化）

**输出格式**：
```json
{
  "dimension": "constraint",
  "explicit_constraints": {
    "year": "L2",
    "platform": "web",
    "tech_stack": ["webpack", "vite"]
  },
  "inferred_constraints": [
    "不需要讲解 npm/yarn 基础用法",
    "需要覆盖构建性能优化和插件开发"
  ],
  "exclusions": [
    "Rollup 内部实现（超出范围）",
    "Webpack 1.x/2.x 版本差异（过时）"
  ],
  "depth_adjustments": {
    "基础概念": "跳过或一笔带过",
    "原理机制": "重点展开",
    "实战优化": "需要案例"
  }
}
```

### 3. Spawn 4 个维度 Agent（并行）

按 `core/shared-conventions.md` 的并发池规则，同时 spawn 4 个 Agent。每个 Agent：
- task 内联全部必要信息（用户指令 + 约束参数 + 维度任务定义）
- 不读取任何外部文件
- 产出一份 JSON 格式的视角报告

**完成判定**：Agent 输出包含合法 JSON 且包含 `dimension` 字段。

**超时**：单 Agent 3 分钟。超时则该维度缺失，裁判 Agent 基于其余 3 份报告补全。

### 4. Spawn 裁判 Agent（串行）

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

**裁判 task 模板**：

```
你是一个技术需求分析的裁判。你收到了 4 份维度分析报告，需要将它们合并收敛为一张需求网。

## 用户原始指令
{raw_input}

## 已解析约束
year={year}, platform={platform}, depth={depth}

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
3. **补全**：检查依赖链完整性（A 依赖 B → B 必须在列表中）。检查覆盖度（场景维度的每个场景必须有技术能力覆盖）。
4. **排序**：按战略价值（被多少场景覆盖）排序。标注扫描优先级（high/medium/low）。
5. **搜索建议**：为每个命题给出推荐的搜索关键词（原理类 + 实践类各 1-2 组）。

## 输出格式

严格按以下 JSON 格式输出，不要输出其他内容：
（见 meta/output-contracts.md §0 的 requirement-web.json 示例）
```

### 5. 写入

裁判 Agent 产出 `requirement-web.json`，写入 `{workDir}/.meta/requirement-web.json`。

### 6. 注入 Step ①

将 `requirement-web.json` 作为 Step ① scan 的附加输入。Step ① 在执行时：
- 从 requirement-web 中读取 `propositions` 列表，为每个命题执行定向搜索
- 从 `search_guidance` 中获取每个命题的推荐关键词
- 从 `scope.exclusions` 中获取排除规则，过滤不相关内容
- 从 `context` 中获取经验年限，影响信源深度判断

## 输出

- 文件：`{workDir}/.meta/requirement-web.json`
- 摘要（stdout，≤200 字）：域上下文、命题数量、依赖关系数、排除项数

## 校验清单

- [ ] requirement-web.json 包含 context、propositions、dependencies、scope、search_guidance 五个顶层字段
- [ ] 每个 proposition 包含 id、name、depth、search_keywords
- [ ] dependencies 中引用的 id 全部在 propositions 中存在
- [ ] scope.exclusions 非空（至少有 1 条排除规则）
- [ ] 排序后的 proposition 顺序与 search_priority 一致
- [ ] 裁判 Agent 的输出可被 JSON.parse 解析

## 异常处理

| 场景 | 处理 |
|------|------|
| 维度 Agent 超时（>3min） | 该维度缺失，裁判基于其余 3 份报告补全 |
| 4 个维度 Agent 全部超时 | 降级：跳过头脑风暴，Step ① 按原始指令扫描 |
| 裁判 Agent 超时（>5min） | 降级：取 4 份报告中最完整的 1 份作为需求网 |
| 裁判输出 JSON 解析失败 | 重试一次；仍失败则降级 |
| 用户指令已足够明确（topic+year+platform 齐全） | 跳过头脑风暴，直接进入 Step ① |

## 检查点

🚨 **🛑 必须停顿，进入 ⓩ 检查点**。展示需求网摘要（域上下文、命题列表、排除项），使用 `clarify` 等待用户确认后才进入 Step ①。

用户可在此检查点：
- 补充遗漏的命题
- 删除不需要的命题
- 调整排序优先级
- 修改排除规则
