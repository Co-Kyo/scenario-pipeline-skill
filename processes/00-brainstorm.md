# Step 0: 多维头脑风暴

> **本步骤不在前处理串行链内**。它是管道之前的用户意图解析阶段,产出需求网后交由 Step 1 作为精准输入。

## 目的

将用户一句话指令"揉开"成一张结构化的需求网:自动推断经验年限,向上还原文档域,向下拆解核心命题,标注命题间依赖和搜索方向。产出 `requirement-web.json`,作为 Step 1 scan 的精准输入。

## 为什么需要这一步

当前架构的因果关系是反的:

- 用户一句话 → 直接 scan → scan 抓到什么就分词 → **命题完整性取决于运气**
- 正确的因果:用户一句话 → 需求网(逻辑推演)→ 定向 scan → **命题完整性取决于用户需求的逻辑展开**

需求网是 scan 的"地图"--scan 不再是"发现命题",而是"为已有命题寻找信源"。

## 前置条件

⛔ 加载:

- `meta/output-contracts.md`§0(需求网输出格式)
- `meta/sources.md`(T0 域名表,供收敛者 Agent 校验搜索方向的可行性)
- `plugins/year-granularity.md`(年限颗粒度规则,用于命题粒度过滤)

### 🛑 必需环境检查：Python 3

```bash
python -c "import sys; assert sys.version_info >= (3, 8); print('Python', sys.version)" 2>&1 || (
  echo "Python 3.8+ 不可用，这是管线的必需依赖。"
  echo "安装方式：https://www.python.org/downloads/"
  echo "或 Windows Store 搜索 Python 3.12"
  echo "安装后确保 'python' 命令在 PATH 中可用。"
  exit 1
)
```

> **如果在 spawn 任何 agent 之前先检查 Python，管线不需要在验证阶段才回报环境缺失。**

> **🔒 上下文隔离**
>
> - ✅ 允许读取:`core/shared-conventions.md`、`meta/output-contracts.md`§0、`meta/sources.md`、`plugins/year-granularity.md`
> - ❌ 禁止读取:`processes/01~07.md`、`core/*.md`(`plugins/year-granularity.md` 除外)

## 输入

- 用户指令原文(raw_input)
- 解析出的约束参数:`--year`、`--platform`、`--depth`

## 执行步骤

### 1. 解析用户指令 + 年限自动推断

从用户指令中提取:

- `raw_input`:用户原文
- `topic`:主题关键词(如"webpack & vite")
- `constraints`:已解析的约束(year、platform、depth 等)

#### 1.1 年限推断规则

**优先级**:显式参数 `--year` > 自然语言显式数字 > 隐式信号推断

**显式数字匹配**(正则):

| 模式 | 示例 | 映射 |
|------|------|------|
| `(\d+)-(\d+)年` | "3-5年" → L2 | 取中间值查阶梯 |
| `(\d+)年以上` | "5年以上" → L3 | 下界查阶梯 |
| `(\d+)年左右` | "3年左右" → L2 | 直接查阶梯 |
| `(\d+)年经验` | "2年经验" → L1 | 直接查阶梯 |

**阶梯映射**:

| 年限 | 阶梯 |
|------|------|
| 1-3 年 | L1 |
| 3-5 年 | L2 |
| 5-8 年 | L3 |
| 8+ 年 | L4 |

**隐式信号匹配**(当无显式数字时):

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

**冲突处理**:

1. 显式参数 `--year` 优先级最高,直接采用
2. 显式数字(如"3-5年")优先级次之
3. 多个隐式信号取众数(出现最多的等级)
4. 无法推断 → 默认 L2(覆盖面最广,可由用户在 z 检查点修正)

**推断结果写入**:`inferred_year` 字段,附带 `year_inference_trace`(推断依据)

```bash
year_inference_trace 示例:
  "用户原文含'3-5年',显式匹配 → L2"
  "用户原文含'高级'+'架构选型',隐式信号[L3,L3] → L2 被覆盖 → L3"
  "无年限信号,默认 L2"
```

#### 1.2 跳过判断

**跳过条件(必须同时满足全部 3 项)**:

1. **topic 明确度判定**(确定性规则,非 LLM 推理):
   - ✅ 明确:tech_stack 中的每个词都是具体工具/框架名(如"webpack"、"vite"、"React"),且 raw_input 中不包含以下抽象词:原理、实践、场景、分析、架构、设计、治理、演进
   - ❌ 不明确:topic 包含抽象维度词(如"底层原理与工程实践"),或 tech_stack 为空
2. **year 已推断**:通过正则匹配或隐式信号推断出 L1-L4,且置信度为高(有显式数字匹配或多个一致的隐式信号)
3. **platform 已指定**:从 raw_input 或 tech_stack 中可以确定 platform(web/miniapp/rn)

**场景复杂度检查**(额外拦截条件):

即使上述 3 项均满足,如果 raw_input 中包含以下场景化关键词,强制走完整路径:

- "面试"、"场景"、"分析"、"考察"、"问"(暗示需要场景化拆分)
- "中大型"、"复杂"、"多团队"(暗示需要约束维度的精细边界)

**操作(轻量提取 → 层次骨架)**:

1. 从用户指令中提取核心技术关键词
2. 为每个关键词分配临时能力 ID(T1, T2, ...),附一句话描述
3. 区分 generic / specialized 属性
4. **按 target_level 给每个锚点标注 provisional_level 和 provisional_role**:
   - 核心锚点(命中目标年限)→ provisional_level = target_level, provisional_role = "core"
   - 基础锚点(低于目标年限)→ provisional_level = target_level - 1, provisional_role = "premise"
   - 展望锚点(高于目标年限)→ provisional_level = target_level + 1, provisional_role = "outlook"
   - **level 与 role 的强制约束**:core → level=target_level;premise → level=target_level-1;outlook → level=target_level+1
5. **按 role 分组**,生成 l{N}_core_ids / l{N}_premise_ids / l{N}_outlook_ids
6. **注入策略元数据**:从 core/shared-conventions.md 的策略表中提取对应级别的标签和比例
7. 写入 `{workDir}/.meta/brainstorm/anchors.json`

**anchors.json 格式**(层次骨架):

```json
{
  "generated_at": "2026-05-27T13:00:00+08:00",
  "source": "lightweight_extraction",
  "topic": "webpack & vite",
  "target_level": "L2",
  "year_inference_trace": "用户原文含'3-5年',显式匹配 → L2",
  "strategy": {
    "core_label": "方案攻克",
    "premise_label": "概念确认",
    "outlook_label": "决策方向",
    "ratios": { "premise": "10-15%", "core": "70-80%", "outlook": "5-10%" }
  },
  "anchors": [
    {
      "id": "T1",
      "name": "模块解析与依赖图",
      "provisional_level": "L2",
      "provisional_role": "core",
      "reasoning": "webpack/vite 核心机制,3-5 年必须理解依赖图构建",
      "description": "ESM/CJS 模块规范差异、依赖图构建、resolve 配置",
      "type": "generic",
      "tags": ["webpack", "vite", "esm", "cjs"]
    },
    {
      "id": "T2",
      "name": "npm 包管理基础",
      "provisional_level": "L1",
      "provisional_role": "premise",
      "reasoning": "1-3 年基础,L2 用户应该已经掌握",
      "description": "npm/yarn 基本用法、package.json 结构",
      "type": "generic",
      "tags": ["npm", "yarn"]
    },
    {
      "id": "T3",
      "name": "Monorepo 构建隔离",
      "provisional_level": "L3",
      "provisional_role": "outlook",
      "reasoning": "5-8 年架构决策级,L2 用户了解概念即可",
      "description": "多包仓库的构建隔离、依赖提升、workspace 协议",
      "type": "generic",
      "tags": ["monorepo", "pnpm"]
    }
  ],
  "l2_core_ids": ["T1"],
  "l1_premise_ids": ["T2"],
  "l3_outlook_ids": ["T3"]
}
```

**约束**:

- 锚点数量:8-15 个(太少覆盖不足,太多失去锚定意义)
- 每个锚点必须有 `provisional_level` 和 `provisional_role`
- 核心锚点的 `reasoning` 必须说明"为什么这个锚点属于核心区域"
- 锚点是**草案**,维度 Agent 可以补充遗漏的能力(用新 ID),但核心锚点不可忽略

**写入**:`{workDir}/.meta/brainstorm/anchors.json`

---

### 2. 组装 4 份维度 Agent task

每个 Agent 的 task 由五部分拼接:**角色声明** + **维度任务** + **约束注入** + **锚点注入** + **文件写入指令**。

**⚠️ 关键变更**:所有 4 个 Agent 均收到年限颗粒度规则,按对应阶梯过滤产出。

#### 年限约束注入块(所有 Agent 共享)

在每个 Agent 的 task 中注入以下约束块:

```
## 经验年限约束
- 推断年限:{target_level}({year_desc})
- 命题粒度要求:{粒度描述}
- 命题命名模式:{命名模式}
- 入池阈值:{阈值}
- 深度要求:{深度调整}
- 排除范围:{排除项}
```

注入内容来源:`plugins/year-granularity.md` 对应阶梯的定义。

#### 共享骨架注入块(所有 Agent 共享)

在每个 Agent 的 task 中注入以下层次骨架块(内容来自 §1.2 产出的 `anchors.json`):

```
## 共享层次骨架(主 agent 已按 {target_level} 核心预组织)

### {core_label}(占 {core_ratio},你的主要工作区域)
{core_anchors 格式化列表,每项含 id/name/description/reasoning}

### {premise_label}(占 {premise_ratio})
{premise_anchors 格式化列表}

### {outlook_label}(占 {outlook_ratio})
{outlook_anchors 格式化列表}

## 你的工作流
1. **检阅{core_label}**:理解核心锚点的定义和 reasoning,形成你的行动内核
2. **完善{core_label}**:围绕核心锚点展开你的维度分析({dimension_specific_instruction})
3. **向下扩展**:检查{premise_label}中是否有遗漏,补充必要的 premise 条目
4. **向上扩展**:检查{outlook_label}中是否有遗漏,补充必要的 outlook 条目
5. **自检比例**:确认你的输出中 core 占 {core_ratio},premise 占 {premise_ratio},outlook 占 {outlook_ratio}
6. **自检 level_weight**:确认每个条目的 level 与 role 关系正确(见下方规则)
7. **报告完成**
```

### level_weight 打标规则(level 与 role 的关系)

level 和 role 是两个独立字段,但存在**强制约束关系**:

| role | level 必须是 | 含义 | 示例(target_level=L2) |
|------|------------|------|----------------------|
| `core` | **= target_level** | 概念本身属于目标层 | level=L2, role=core |
| `premise` | **= target_level - 1** | 概念本身低于目标层 | level=L1, role=premise |
| `outlook` | **= target_level + 1** | 概念本身高于目标层 | level=L3, role=outlook |

**禁止**:

- ❌ level=L1, role=outlook(L1 是最低层,不存在比 L1 更低的 outlook)
- ❌ level=L2, role=premise 且 target_level=L2(premise 必须低于目标层)
- ❌ level 与 role 不匹配(如 level=L2, role=outlook 且 target_level=L2)

**正确示例**(target_level=L2):

```json
{ "level": "L2", "role": "core" }
{ "level": "L1", "role": "premise" }
{ "level": "L3", "role": "outlook" }
```

**正确示例**(target_level=L1):

```json
{ "level": "L1", "role": "core" }
{ "level": "L2", "role": "outlook" }
```

#### 2.1 场景 Agent

**角色**:你是一个资深前端面试官和技术场景分析师。

**任务**:从"这个知识点会被怎样考"的角度,展开用户输入。**你必须将产出的 JSON 用 write 工具写入指定文件(详见下方「⚠️ 文件写入」),未写入文件视为任务未完成。**

具体要求:

1. 列出该主题下所有可能出现的面试/实战场景(≥5 个)
2. **按年限阶梯过滤**:
   - L1:只保留"概念级"场景(是什么、怎么用)
   - L2:只保留"方案级"场景(怎么做、有哪些方案、各有什么坑)
   - L3:只保留"决策级"场景(为什么选 A 不选 B、代价是什么)
   - L4:只保留"体系级"场景(如何设计、如何演进、如何治理)
3. 每个场景标注:场景描述、考察深度(基础/进阶/深水区)、出现频率(高频/中频/低频)
4. 按面试出现频率排序
5. **insights 生成**:你的输出必须包含 insights 对象,其中:
   - `depth_distribution`:将场景按深度分为 deep_water(深水区,需大规模实战)/ advanced(进阶,需项目经验)/ basic(基础,阅读即懂)三层,每层列出场景 ID
   - `cross_anchor_clustering`:识别覆盖场景最多的 3 个锚点组合,说明为什么这些锚点组合是高频考察点

**输出格式**:

```json
{
  "dimension": "scenario",
  "target_level": "L2",
  "anchor_coverage": {
    "covered": ["T1", "T3"],
    "supplemented": [],
    "skipped": ["T7"],
    "skip_reason": "与场景维度无关"
  },
  "year_filtered": true,
  "scenarios": [
    {
      "id": "S1",
      "name": "场景名称",
      "anchor_ref": ["T1"],
      "level_weight": {
        "level": "L2",
        "role": "core",
        "reason": "方案级场景,涉及 2-3 技术层组合"
      },
      "confidence": "high",
      "description": "场景描述",
      "depth": "基础|进阶|深水区",
      "frequency": "高频|中频|低频",
      "granularity_match": "该场景符合 L2 的方案级粒度"
    }
  ],
  "excluded_scenarios": [
    {
      "name": "被过滤的场景名称",
      "reason": "低于/高于目标年限粒度(如:L2 下过滤掉 L1 概念级场景)"
    }
  ],
  "insights": {
    "depth_distribution": {
      "deep_water": ["S3"],
      "advanced": ["S1", "S2", "S4"],
      "basic": ["S5"]
    },
    "cross_anchor_clustering": [
      {
        "anchors": ["T1", "T2"],
        "reason": "模块解析与 npm 包管理组合覆盖最多方案级场景,是构建工具面试的核心考察区域"
      },
      {
        "anchors": ["T1", "T3"],
        "reason": "模块解析与 Monorepo 组合覆盖进阶/架构决策场景,体现工程化深度"
      },
      {
        "anchors": ["T2", "T3"],
        "reason": "包管理与 Monorepo 组合覆盖依赖治理场景,是大规模项目的常见痛点"
      }
    ]
  }
}
```

**⚠️ 文件写入**:输出完成后,必须使用 write 工具将上述 JSON 写入 `{workDir}/.meta/brainstorm/scenario.json`。

#### 2.2 技术 Agent

**角色**:你是一个技术专家,擅长拆解技术能力、识别依赖关系。

**任务**:从"这个主题涉及哪些技术能力"的角度,展开用户输入。为每个命题标注涉及的原子能力,并区分通用能力和特化能力。**你必须将产出的 JSON 用 write 工具写入指定文件(详见下方「⚠️ 文件写入」),未写入文件视为任务未完成。**

具体要求:

1. 拆解该主题涉及的所有技术能力点(原子级别,不可再分)
2. 每个能力点标注:名称、所属技术层、一句话描述、通用/特化属性
3. **通用/特化判定**:
   - **通用能力**:不依赖特定工具/框架/平台即可理解和掌握的能力(如渲染管线、网络协议、算法、内存管理)
   - **特化能力**:绑定特定工具/框架/平台的能力(如 Vue 响应式、React Fiber、Webpack 插件体系)
   - 判定标准:换个工具/框架,这个能力是否仍然有意义?是→通用,否→特化
4. 标注能力点之间的前置依赖关系(A 依赖 B)
5. 标注每个能力覆盖哪些命题(fanout 雏形)
6. **按年限过滤能力**:L1 跳过深层原理能力,L2 跳过基础用法能力,L3 跳过入门概念能力
7. **insights 生成**:你的输出必须包含 insights 对象,其中:
   - `critical_path`:识别 3-4 条最长的依赖链(从无依赖的基础能力到最深层能力),标注每条链的长度和覆盖的能力数
   - `layer_distribution`:按技术层级(如浏览器层/网络层/框架层/工程层/工具层等)对能力分组,统计每层的能力数量
   - `bottleneck_capabilities`:识别 1-3 个技术债最高、性能瓶颈核心或架构复杂度最高的能力,说明原因
8. **补充能力(必须执行,不可跳过)**:完成上述 1-7 后,执行以下检查--列出你的 capabilities 中出现的所有 layer 值,然后对照以下常见技术层清单,**逐层确认是否有对应能力**:
   - 网络层(HTTP、请求封装、缓存、离线策略)
   - 工具层(DevTools、调试、性能分析)
   - 运行时层(引擎机制、渲染队列、脚本执行)
   - 安全层(鉴权、数据加密、防护策略)
   **清单中有但你的 capabilities 中没有对应能力的层,必须用 `T_ADD{N}` 格式补充 1-2 个能力。** 具体操作分两步:
   - 第一步:将补充的能力追加到 capabilities 数组末尾
   - 第二步:将补充的能力 ID(如 T_ADD1)写入 anchor_coverage.supplemented 数组
   两步都必须完成,缺少任何一步都是不完整的输出。

**输出格式**:

```json
{
  "dimension": "technical",
  "target_level": "L2",
  "anchor_coverage": {
    "covered": ["T1", "T2"],
    "supplemented": ["T_ADD1"],
    "skipped": [],
    "skip_reason": ""
  },
  "capabilities": [
    {
      "id": "T1",
      "name": "能力名称",
      "anchor_ref": ["T1"],
      "level_weight": {
        "level": "L2",
        "role": "core",
        "reason": "方案级能力,构建工具核心机制"
      },
      "confidence": "high",
      "layer": "技术层(如:浏览器层/网络层/工程层/框架层/工具层/算法层/协议层等,按实际技术域自行归类)",
      "description": "一句话描述",
      "type": "generic|specialized",
      "depends_on": [],
      "covers": ["命题ID"]
    },
    {
      "id": "T_ADD1",
      "name": "补充能力名称",
      "anchor_ref": [],
      "level_weight": {
        "level": "L2",
        "role": "core",
        "reason": "supplemented: anchors 未覆盖但面试高频考察"
      },
      "confidence": "medium",
      "layer": "工程层",
      "description": "supplemented 理由说明",
      "type": "generic",
      "depends_on": [],
      "covers": ["命题ID"]
    }
  ],
  "excluded_capabilities": [],
  "insights": {
    "critical_path": [
      {
        "path": ["T2", "T1", "T_ADD1"],
        "length": 3,
        "covered_capabilities": 3,
        "description": "npm 包管理 → 模块解析 → 补充能力,从基础到方案级的最长依赖链"
      }
    ],
    "layer_distribution": {
      "工程层": ["T1", "T_ADD1"],
      "工具层": ["T2"]
    },
    "bottleneck_capabilities": [
      {
        "id": "T1",
        "reason": "作为模块解析核心,被多个上层能力依赖,修改影响面最大"
      }
    ]
  }
}
```

**⚠️ 文件写入**:输出完成后,必须使用 write 工具将上述 JSON 写入 `{workDir}/.meta/brainstorm/technical.json`。

#### 2.3 学习 Agent

**角色**:你是一个前端教育者,擅长设计渐进式学习路径。

**任务**:从"从不会到会应该学什么"的角度,展开用户输入。**你必须将产出的 JSON 用 write 工具写入指定文件(详见下方「⚠️ 文件写入」),未写入文件视为任务未完成。**

具体要求:

1. **按目标经验年限**,列出从基础到目标水平的学习路径
2. 每个学习节点标注:节点名称、前置节点、预估学习时长、验证标准(做到/做不到)
3. 标注哪些节点是"战略高地"--掌握后能解锁最多其他节点
4. 考虑不同起点(有框架经验 vs 无框架经验)的分支路径
5. **路径终点应与年限阶梯匹配**:L1 止于"概念辨析",L2 止于"原理+取舍",L3 止于"架构决策"
6. **分支路径**:请根据用户可能的不同背景设计 2 条分支路径:
   - "有框架经验"路径:标注 skip_nodes(有经验可跳过的节点)和 estimated_saving
   - "无框架经验"路径:标注 must_pass(必须经过的节点)
7. **insights 生成**:你的输出必须包含 insights 对象,其中:
   - `strategic_reason`:对每个 is_strategic=true 的节点,说明"掌握后可解锁哪些下游能力,理由是什么"
   - `core_insight`:用一句话总结该技术领域的核心矛盾或主线(如"小程序开发的核心矛盾是双线程通信开销")
   - `common_pitfalls`:列出 3-5 个该领域最常见的坑和应对策略
   - `path_endpoint_rationale`:说明该级别(L1/L2/L3/L4)学习路径的终点定义和边界

**输出格式**:

```json
{
  "dimension": "learning",
  "target_level": "L2",
  "anchor_coverage": {
    "covered": ["T1", "T2"],
    "supplemented": [],
    "skipped": [],
    "skip_reason": ""
  },
  "learning_path": [
    {
      "id": "L1",
      "name": "节点名称",
      "anchor_ref": ["T2"],
      "level_weight": {
        "level": "L1",
        "role": "premise",
        "reason": "基础前置节点"
      },
      "confidence": "high",
      "prerequisites": [],
      "estimated_time": "2h|1d|1w",
      "verification": "做到才算过的标准",
      "is_strategic": false
    }
  ],
  "branches": {
    "with_framework_experience": {
      "skip_nodes": ["L1"],
      "estimated_saving": "1-2d",
      "description": "有框架经验的用户可跳过 npm/yarn 基础操作"
    },
    "without_framework_experience": {
      "must_pass": ["L1", "L2"],
      "estimated_total_time": "5-7d",
      "description": "无框架经验需从零掌握模块管理和基础构建概念"
    }
  },
  "excluded_learning_path": [],
  "insights": {
    "strategic_reason": {
      "L3": "掌握模块解析依赖图后可解锁:构建优化(理解 chunk 拆分原理)、插件开发(理解 tapable 钩子触发时机)、Monorepo 构建隔离(理解依赖提升与 hoist 机制)"
    },
    "core_insight": "构建工具的核心矛盾是开发体验(快)与生产产出(小)之间的 trade-off",
    "common_pitfalls": [
      "混淆 dev 和 prod 配置导致线上性能问题 → 始终分离配置",
      "过度配置 resolve.alias 导致模块解析失控 → 仅对深层嵌套路径使用",
      "忽略 node_modules 的幽灵依赖(phantom dependencies)→ 锁定依赖版本"
    ],
    "path_endpoint_rationale": "L2 学习路径止于'原理+取舍'层级:能理解构建工具内部机制(如依赖图构建流程),能在 webpack 和 vite 之间做合理选型,但不要求深入源码实现或架构治理"
  }
}
```

**⚠️ 文件写入**:输出完成后,必须使用 write 工具将上述 JSON 写入 `{workDir}/.meta/brainstorm/learning.json`。

#### 2.4 约束 Agent

**角色**:你是一个需求分析专家,擅长识别隐含约束和边界条件。

**任务**:从"哪些该包含、哪些该排除"的角度,展开用户输入。**你必须将产出的 JSON 用 write 工具写入指定文件(详见下方「⚠️ 文件写入」),未写入文件视为任务未完成。**

具体要求:

1. 从用户指令中提取所有显式约束(年限、平台、技术栈)
2. 推断隐式约束(如"3-5年"意味着不需要讲基础概念,但需要讲原理)
3. 明确排除项(哪些内容超出目标经验范围)
4. **按年限阶梯调整**(直接引用 `year-granularity.md` 对应阶梯的规则):
   - L1:基础题→概念辨析,排除原理和架构
   - L2:进阶题→原理+取舍,排除基础概念和体系治理
   - L3:深水区→手写实现+性能优化+架构决策
   - L4:体系级→治理+演进+跨团队协作
5. 为每个约束标注 `level_weight`(level + role + reason)和 `anchor_ref`(该约束影响哪些锚点)
6. **排除理由规范**:exclusions 中的每条排除项必须使用结构化格式,包含 `content`(排除内容)和 `reason_type`(原因类型枚举,**只能**是以下四个值之一):
   - `"out_of_scope"`:内容超出目标年限的考察范围
   - `"below_target"`:内容低于目标年限应掌握的水平
   - `"deprecated"`:技术方案已停止维护或被替代
   - `"not_frontend"`:内容超出前端开发者的能力边界
7. **时效性约束**:增加一条约束"排除已停止维护的技术方案(如 mpvue、wepy 等),聚焦当前活跃维护的主流方案"
8. **经验年限约束**:如果用户指定了经验年限,在 constraints 中显式声明一条"经验年限约束:{N}年经验的核心考察点是{具体描述}",将隐含经验要求显式化

**输出格式**:

```json
{
  "dimension": "constraint",
  "target_level": "L2",
  "anchor_coverage": {
    "covered": ["T1", "T2", "T3"],
    "supplemented": [],
    "skipped": [],
    "skip_reason": ""
  },
  "constraints": [
    {
      "id": "C1",
      "name": "排除基础概念",
      "anchor_ref": [],
      "level_weight": {
        "level": "L2",
        "role": "core",
        "reason": "L2 方案级命题的核心约束"
      },
      "confidence": "high",
      "constraint_type": "exclusion",
      "scope": "所有低于 L2 的命题",
      "impact": "过滤掉概念级场景和基础用法能力"
    },
    {
      "id": "C2",
      "name": "重点覆盖原理机制",
      "anchor_ref": ["T1", "T2"],
      "level_weight": {
        "level": "L2",
        "role": "core",
        "reason": "L2 方案级需要理解原理才能做方案选型"
      },
      "confidence": "high",
      "constraint_type": "depth_adjustment",
      "scope": "所有 L2 命题",
      "impact": "原理机制部分重点展开"
    }
  ],
  "excluded_constraints": [
    {
      "name": "npm/yarn 基础用法约束",
      "reason": "低于 L2 经验水平,不构成有效约束"
    }
  ],
  "explicit_constraints": {
    "year": "L2",
    "year_source": "inferred: 用户原文含'3-5年'",
    "platform": "web",
    "tech_stack": ["webpack", "vite"]
  },
  "inferred_constraints": [
    "不需要讲解 npm/yarn 基础用法(L2 下,基础操作已掌握)",
    "需要覆盖构建性能优化和插件开发(L2 方案级深度)"
  ],
  "exclusions": [
    { "content": "Rollup 内部实现", "reason_type": "out_of_scope" },
    { "content": "Webpack 1.x/2.x 版本差异", "reason_type": "deprecated" },
    { "content": "npm/yarn 基础用法", "reason_type": "below_target" }
  ],
  "depth_adjustments": {
    "基础概念": "跳过或一笔
  ],
  "exclusions": [
    { "content": "Rollup 内部实现", "reason_type": "out_of_scope" },
    { "content": "Webpack 1.x/2.x 版本差异", "reason_type": "deprecated" },
    { "content": "npm/yarn 基础用法", "reason_type": "below_target" }
  ],
  "depth_adjustments": {
    "基础概念": "跳过或一笔带过",
    "原理机制": "重点展开",
    "实战优化": "需要案例"
  },
  "insights": {}
}
```

**⚠️ 文件写入**:输出完成后,必须使用 write 工具将上述 JSON 写入 `{workDir}/.meta/brainstorm/constraint.json`。

---

### 3. 创建输出目录

执行 `mkdir -p {workDir}/.meta/brainstorm`,确保维度 Agent 有写入目标。

### 3.1 Spawn 4 个维度 Agent(并行 + 轮询跟踪)

> ⚠️ 本步骤采用「简单窗口」调度模式(4 个任务互相独立),严格遵循 `core/shared-conventions.md` 的并行调度规则。
> 调度规则详见 `core/shared-conventions.md` §子 agent 调度。

#### 3.1.1 初始化

同时 spawn 4 个 Agent,每个 Agent 的 label 和预期产出:

| label | 维度 | 预期产出 |
|-------|------|---------|
| `brainstorm-scenario` | 场景 | 包含 `dimension: "scenario"` 的 JSON |
| `brainstorm-technical` | 技术 | 包含 `dimension: "technical"` 的 JSON |
| `brainstorm-learning` | 学习 | 包含 `dimension: "learning"` 的 JSON |
| `brainstorm-constraint` | 约束 | 包含 `dimension: "constraint"` 的 JSON |

每个 Agent 的 task 内联全部必要信息(用户指令 + 约束参数 + 年限颗粒度规则 + 维度任务定义 + **共享层次骨架** + 文件写入路径),不读取任何外部文件。其中 `{workDir}` 和骨架内容在组装 task 时从 `anchors.json` 提取替换。

#### 3.1.2 轮询跟踪

按 `core/shared-conventions.md` §**模式 A: 简单窗口** 执行轮询循环。本步骤特有参数:

| 参数 | 值 |
|------|---|
| W | 4(维度 Agent 数量固定为 4,一次性全部 spawn) |
| 超时 | 3 分钟 |
| 槽位替换 | ❌ 无(一次性填满 4 个,不补位) |
| label | `brainstorm-scenario`, `brainstorm-technical`, `brainstorm-learning`, `brainstorm-constraint` |
| expected_files | `{workDir}/.meta/brainstorm/{dimension}.json`(dimension = scenario/technical/learning/constraint) |

**特殊**:4 个维度 Agent 一次性全部 spawn,不做分批。任何一个结束不补位,等全部结束后进入收敛者阶段。

#### 3.1.3 完成判定

> **⚠️ 即时校验**:每个 agent 完成事件到达后,**立刻**执行以下三步校验(详见 `core/shared-conventions.md` §即时文件校验),不等同批其他 agent 完成。

- **completed**:三步校验全通过(文件存在 + JSON 合法 + 含 `dimension` 字段且 entries 非空)
- **pending-retry**:任一校验失败 → 立即补发(不等其他 agent)
- **failed**:Agent 返回错误 / 补发仍失败
- **timeout**:单 Agent 运行超过 3 分钟(头脑风暴的维度 Agent 体量小,3 分钟足够;不走 15 分钟的通用超时)

> **校验方式**:`cat {workDir}/.meta/brainstorm/{dimension}.json | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'dimension' in d and len(d.get('scenarios',d.get('capabilities',d.get('learning_path',d.get('constraints',[])))))>0"`

#### 3.1.3.1 超时后文件检查(必须执行)

Agent 超时后,**禁止直接丢弃该维度**,必须先执行以下检查:

1. kill 超时的 agent
2. 检查 `{workDir}/.meta/brainstorm/{dimension}.json` 是否存在于磁盘
3. 文件存在且通过校验(合法 JSON + 含 `dimension` 字段 + entries 非空)→ **保留该维度**,标记为 completed
4. 文件不存在或校验不通过 → **丢弃该文件**,标记该维度为 pending-retry

**关键原则**:超时 ≠ 产出无效。Agent 可能在超时前已将完整结果写入磁盘。

#### 3.1.4 降级策略

| 情况 | 处理 |
|------|------|
| 有维度标为 pending-retry | 补发 agent（原样重新 spawn，同一 task），补发仍超时则标为 missing |
| 1 个维度 missing | 标记 missing，进入 Step 3.2 barrier 检查（**禁止自动进入收敛者**） |
| 2 个维度 missing | 标记 missing，进入 Step 3.2 barrier 检查 |
| 3+ 个维度 missing | 标记 missing，进入 Step 3.2 barrier 检查（降级为原始指令扫描） |

**补发规则**：每个维度最多补发 1 次。补发的 agent 使用与原始完全相同的 task，不做任何调整。
**补发时机**：每个维度完成事件到达后立即校验，不通过则立即补发；所有 4 个维度（含补发）均结束后，**进入 Step 3.2 barrier 检查**（而非直接进入收敛者）。

#### 3.1.5 等待期间行为

轮询期间**不做其他工作**(头脑风暴是前置阶段,没有可并行的后台任务)。每次轮询间隔 15 秒,不做 busy-wait。

---

### 3.2 🛑 Barrier 检查(强制停顿,不可跳过)

#### 3.2.1 检查项

所有 4 个维度 Agent(含补发)结束后,主 agent 必须执行以下检查:

```python
# 校验脚本
import os, json

EXPECTED_DIMENSIONS = ['scenario', 'technical', 'learning', 'constraint']
results = {}
for dim in EXPECTED_DIMENSIONS:
    path = f'{workDir}/.meta/brainstorm/{dim}.json'
    if not os.path.exists(path):
        results[dim] = 'MISSING'
        continue
    try:
        with open(path, 'r', encoding='utf-8') as f:
            d = json.load(f)
        entries_key = {'scenario':'scenarios','technical':'capabilities','learning':'learning_path','constraint':'constraints'}
        entries = d.get(entries_key.get(dim, ''), [])
        if d.get('dimension') != dim or len(entries) == 0:
            results[dim] = 'INVALID'
        else:
            results[dim] = f'OK ({len(entries)} entries)'
    except Exception as e:
        results[dim] = f'PARSE_ERROR: {e}'
```

#### 3.2.2 决策矩阵

| 完成维度 | 缺失维度 | 处理 |
|---------|---------|------|
| 4/4 | 0 | ✅ 直接进入收敛者 |
| 3/4 | 1 | 🛑 **停住**:展示缺失分析,等用户决策(见 3.2.3) |
| 2/4 | 2 | 🛑 **停住**:展示缺失分析,等用户决策 |
| ≤1/4 | ≥3 | 🛑 **停住**:降级为原始指令扫描,等用户确认 |

**核心原则**:有维度缺失时,**禁止自动推进到收敛者**。必须停住等用户决策。

#### 3.2.3 缺失维度分析报告

当存在缺失维度时,主 agent 必须输出以下分析:

```
🛑 barrier-0: 维度完整性检查

✅ 已完成:{completed_list}
❌ 缺失:{missing_list}

缺失原因分析:
- {dim}: {failure_reason}(超时/文件未写入/JSON 非法/entries 为空)
- 原因推测:{hypothesis}

影响评估:
- 无 {dim} → {impact_on_pipeline}
- 后续步骤传导:{cascade_effect}

选项:
1. 重试缺失维度(加大超时或简化任务,每个维度最多 2 次重试)
2. 降级进入收敛者(执行§4.0降级协议,基于骨架+存活维度重建最小 requirement-web.json)
```

#### 3.2.4 写入检查点记录

将分析结果写入 `{workDir}/.meta/checkpoints/barrier-0.md`:

```markdown
# barrier-0: 维度完整性检查

- 时间:{ISO 时间戳}
- 维度完成状态:{summary}
- 缺失维度:{missing_list}
- 失败原因:{failure_analysis}
- 用户决策:(待补)
```

用户决策后,补写决策字段,按用户指令行动。

#### 3.2.5 用户决策后的处理

| 用户选择 | 处理 |
|---------|------|
| 重试缺失维度 | 重新 spawn 对应 Agent。**首次重试**使用原始 task；**第二次重试**（3.1.4 已补发 1 次）使用简化 task：减少锚点覆盖（仅保留 core 锚点，跳过 premise/outlook）、降低输出要求（跳过 insights、跳过补充能力）、超时加倍。完成后重新执行 3.2 检查。**每个维度最多重试 2 次**（含 3.1.4 的 1 次补发）。达到上限后重试选项消失，仅保留「降级进入收敛者」 |
| 降级进入收敛者 | 在收敛者 task 中标注缺失维度，标注"低置信度"，继续管线 |

**重试上限规则**：每个维度的总重试次数 = 3.1.4 补发(1次) + 3.2.5 用户决策重试(最多1次) = 2次。超过上限后，主 agent 在 3.2.3 分析报告中移除「重试」选项，仅展示「降级进入收敛者」。

**简化 task 规则**（第二次重试时使用）：
- 超时：原始超时 × 2（如 180s → 360s）
- 锚点范围：仅覆盖 core 锚点（跳过 premise 和 outlook）
- 输出要求：跳过 `insights` 字段、跳过 `supplemented` 补充能力步骤
- task 中明确标注：「简化模式：仅输出核心能力列表，不需要 insights 和补充能力」

---

### 4. Spawn 收敛者 Agent(串行,单 Agent)

**⚠️ 前置条件**:Step 3.2 barrier 检查通过(4/4 完成)或用户明确授权降级。**未通过 barrier 检查时禁止进入本步骤。**

4 个维度 Agent 全部完成后(或用户授权降级后),spawn 收敛者 Agent。

**调度**:
- 单 Agent,无并发,直接 spawn
- **超时**:5 分钟
- 超时后先检查 `{workDir}/.meta/requirement-web.json` 是否已写入磁盘且合法
- 文件完整(含 `propositions` + `capability_web` 字段)→ 直接使用,不重试
- 文件不完整或不存在 → 重试一次(重新 spawn,同一 task)
- 重试仍失败 → **降级:基于骨架 + 存活维度数据重建最小可用 requirement-web.json**(见下方降级协议)
- 等待子 agent 完成(平台自行决定等待方式)

**label**:`brainstorm-integrator`

**完成判定**:Agent 输出包含合法 JSON 且包含 `propositions` 和 `capability_web` 字段。

#### 4.0 降级协议(收敛者失败时触发)

> **⚠️ 核心约束**:维度报告格式(`{dimension, scenarios[]}`)与 requirement-web.json 格式(`{context, propositions[], dependencies, capability_web, scope, search_guidance}`)完全不兼容。禁止直接用维度报告替代 requirement-web.json,必须执行格式转换。

**降级时主 agent 执行以下转换**:

```python
import json, os
from datetime import datetime, timezone

workDir = '{workDir}'  # 替换为实际路径

# 1. 读取存活的维度报告
surviving = {}
for dim in ['scenario', 'technical', 'learning', 'constraint']:
    path = os.path.join(workDir, '.meta', 'brainstorm', f'{dim}.json')
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            surviving[dim] = json.load(f)

# 2. 读取骨架
anchors_path = os.path.join(workDir, '.meta', 'brainstorm', 'anchors.json')
with open(anchors_path, 'r', encoding='utf-8') as f:
    anchors_data = json.load(f)

# 3. 重建 requirement-web.json
req = {
    'generated_at': datetime.now(timezone.utc).isoformat(),
    'raw_input': anchors_data.get('topic', ''),
    'context': {
        'domain': '前端性能优化',
        'domain_up': '前端工程化',
        'target_level': anchors_data.get('target_level', 'L2'),
        'year': anchors_data.get('target_level', 'L2'),
        'year_source': anchors_data.get('year_inference_trace', ''),
        'year_inference_trace': anchors_data.get('year_inference_trace', ''),
        'platform': 'web',
        'tech_stack': []
    },
    'strategy': anchors_data.get('strategy', {}),
    'propositions': [],  # 从场景维度转换
    'dependencies': {},
    'capability_web': {},  # 从技术维度转换(如果存在)
    'scope': {'inclusions': [], 'exclusions': []},
    'search_guidance': {
        'global_keywords': [],
        'excluded_keywords': [],
        'preferred_domains': [],
        'depth_filter': '跳过入门教程,优先原理分析和实战优化'
    },
    'convergence_trace': {
        'agents_completed': list(surviving.keys()),
        'conflicts_resolved': [],
        'gaps_filled': [],
        'degraded': True,
        'missing_dimensions': [d for d in ['scenario','technical','learning','constraint'] if d not in surviving]
    }
}

# 4. 场景 → propositions 转换
if 'scenario' in surviving:
    scenarios = surviving['scenario'].get('scenarios', [])
    for i, s in enumerate(scenarios, 1):
        prop = {
            'id': f'RW-P{i}',
            'name': s.get('name', ''),
            'description': s.get('description', ''),
            'depth': s.get('depth', '进阶'),
            'search_priority': 'high' if s.get('frequency') == '高频' else 'medium',
            'search_keywords': {'principles': [s.get('name', '')], 'practices': [s.get('name', '')]},
            'covered_by_scenarios': [s.get('id', '')],
            'capability_ids': s.get('anchor_ref', []),
            'level_weight': s.get('level_weight', {'level': 'L2', 'role': 'core', 'reason': '降级转换'})
        }
        req['propositions'].append(prop)
        req['dependencies'][prop['id']] = []

# 5. 技术维度 → capability_web 转换(如果存在)
if 'technical' in surviving:
    caps = surviving['technical'].get('capabilities', [])
    for c in caps:
        cap_id = c.get('id', '')
        req['capability_web'][cap_id] = {
            'name': c.get('name', ''),
            'layer': c.get('layer', ''),
            'type': c.get('type', 'generic'),
            'provisional_level': c.get('level_weight', {}).get('level', 'L2'),
            'provisional_role': c.get('level_weight', {}).get('role', 'core'),
            'depends_on': c.get('depends_on', []),
            'fanout': {'count': len(c.get('covers', [])), 'total': len(req['propositions']), 'ratio': f"{len(c.get('covers', []))}/{len(req['propositions'])}", 'level': f"{int(len(c.get('covers', []))/max(len(req['propositions']),1)*100)}%"},
            'covers': c.get('covers', [])
        }

# 6. 约束维度 → scope 转换
if 'constraint' in surviving:
    excl = surviving['constraint'].get('exclusions', [])
    req['scope']['exclusions'] = [e.get('content', '') for e in excl]

# 7. 骨架锚点 → search_guidance
all_tags = []
for a in anchors_data.get('anchors', []):
    all_tags.extend(a.get('tags', []))
req['search_guidance']['global_keywords'] = list(set(all_tags))[:10]

# 8. 写入
out_path = os.path.join(workDir, '.meta', 'requirement-web.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(req, f, ensure_ascii=False, indent=2)

print(f'降级产物已写入: {out_path}')
print(f'  propositions: {len(req["propositions"])}')
print(f'  capability_web: {len(req["capability_web"])} entries')
print(f'  exclusions: {len(req["scope"]["exclusions"])}')
```

**降级产物校验**:写入后执行以下校验:
```python
with open(out_path, 'r', encoding='utf-8') as f:
    d = json.load(f)
assert 'propositions' in d and len(d['propositions']) > 0, 'propositions 缺失或为空'
assert 'context' in d and 'target_level' in d['context'], 'context 缺失'
assert 'scope' in d and 'exclusions' in d['scope'], 'scope 缺失'
print('降级产物校验通过')
```

**降级后行为**:标注 `"degraded": true` + `"missing_dimensions": [...]` 在 `convergence_trace` 中,后续步骤读取时可据此调整深度(如跳过深度研究,仅做基础扫描)。

收敛者 Agent 读取共享骨架 + 4 份维度报告,执行校验、对齐、收束、去重、补位:

#### 4.1 校验 + 对齐

- 检查 4 个维度输出中的 level_weight 是否跨维度一致(同一锚点 T1 在不同维度中的 level/role 应一致)
- 不一致时按优先级对齐:约束维度 > 技术维度 > 场景维度 > 学习维度
- 记录对齐原因

#### 4.2 收束

- 用 anchor_ref 编织跨维度关系图
- 建立场景↔能力映射、学习节点↔能力前置关系
- 标注覆盖度缺口(某场景无能力覆盖 / 某能力无场景关联)

#### 4.3 去重

- 同一维度内:两个条目引用相同锚点且描述重叠 → 合并(保留更详细的)
- 不同维度:引用相同锚点但命名不同 → 不合并,标注为"同一锚点的不同视角"

#### 4.4 补位

- 检测 anchor_coverage 覆盖缺口(骨架中有锚点但 4 个维度都没覆盖),决定是否补充
- 检查依赖链完整性:如果 A 依赖 B,但 B 不在列表中 → 补入 B

#### 4.5 构建能力图谱

收敛者 Agent 产出:
- `capability_web`:按能力 ID 组织的结构(含 name、layer、type、depends_on、fanout、covers)
- 每个命题附带 `capability_ids`
- `qualifier_injection`:限定词注入映射
- 排序:按 fanout(被多少场景覆盖)输出推荐的扫描优先级

**收敛者 task 模板**:

```text
你是头脑风暴的收敛者(Integrator)。你收到了 4 个维度 Agent 的输出和一份共享骨架,需要执行校验、对齐、收束、去重、补位,最终产出 requirement-web.json。

## 用户原始指令
{raw_input}

## 已解析约束
year={year}({year_source}),target_level={L1/L2/L3/L4},platform={platform},depth={depth}

## 策略元数据
{strategy 对象,从 anchors.json 中提取}

## 共享骨架
`{workDir}/.meta/brainstorm/anchors.json`(使用 read 工具读取)

## 4 份维度报告(文件路径,使用 read 工具逐个读取)

- 场景维度:`{workDir}/.meta/brainstorm/scenario.json`(entries 命名:scenarios)
- 技术维度:`{workDir}/.meta/brainstorm/technical.json`(entries 命名:capabilities)
- 学习维度:`{workDir}/.meta/brainstorm/learning.json`(entries 命名:learning_path)
- 约束维度:`{workDir}/.meta/brainstorm/constraint.json`(entries 命名:constraints)

## 你的任务

1. **校验**:检查 4 个维度输出中的 level_weight 是否跨维度一致(同一锚点 T1 在不同维度中的 level/role 应一致)
2. **对齐**:不一致时按优先级对齐(约束维度 > 技术维度 > 场景维度 > 学习维度),记录对齐原因
3. **收束**:用 anchor_ref 编织跨维度关系图,建立场景↔能力映射、学习节点↔能力前置关系
4. **去重**:
   - 同一维度内:两个条目引用相同锚点且描述重叠 → 合并(保留更详细的)
   - 不同维度:引用相同锚点但命名不同 → 不合并,标注为"同一锚点的不同视角"
5. **补位**:检测 anchor_coverage 覆盖缺口(骨架中有锚点但 4 个维度都没覆盖),决定是否补充
6. **图谱构建**:产出 capability_web(按能力 ID 组织,含 type、fanout、covers、dependencies),每个命题附带 capability_ids

## 大文件写入

按 core/shared-conventions.md「大文件写入规则」,用 exec + Python 写入 requirement-web.json,写入后验证 json.load 不报错。

## 输出格式

严格按 meta/output-contracts.md §0 的 requirement-web.json 格式输出。

注意:requirement-web.json 除了标准字段外,还必须包含:
- context.target_level(L1/L2/L3/L4)
- context.year_source(推断依据)
- context.year_inference_trace(完整推断过程)
- strategy(从 anchors.json 继承的策略元数据)
- capability_web(能力图谱雏形)
- qualifier_injection(限定词注入映射)
- 每个 proposition 附带 capability_ids 和 level_weight
```

---

### 5. 写入

收敛者 Agent 将产出写入 `{workDir}/.meta/requirement-web.json`(使用 exec + Python,见上方「大文件写入」规则)。
头脑风暴的中间产物(4 份维度报告 + anchors.json)已持久化在 `{workDir}/.meta/brainstorm/` 目录下,可供回溯审查。

**传递到 requirement-web.json 的元数据**:
- `strategy`:从 `anchors.json` 继承的策略元数据(core_label / premise_label / outlook_label / ratios)
- `level_weight`:每个 proposition 携带 level_weight(level + role + reason)

### 6. 注入 Step 1

将 `requirement-web.json` 作为 Step 1 scan 的附加输入。Step 1 在执行时读取以下数据:
- 从 requirement-web 中读取 `propositions` 列表,为每个命题执行定向搜索
- 从 `search_guidance` 中获取每个命题的推荐关键词
- 从 `scope.exclusions` 中获取排除规则,过滤不相关内容
- 从 `context` 中获取经验年限(含推断依据),影响信源深度判断
- 从 `strategy` 中获取策略元数据,影响后续步骤的行为参数
- 从每个 proposition 的 `level_weight` 中获取 level + role,驱动后续步骤的密度分级(core 深扫、premise 浅扫、outlook 确认存在)

---

## 输出

- 文件:`{workDir}/.meta/requirement-web.json`
- 摘要(stdout,≤200 字):域上下文、年限推断结果、命题数量、能力数量、依赖关系数、排除项数

## 校验清单

- [ ] requirement-web.json 包含 context、propositions、dependencies、scope、search_guidance 五个顶层字段
- [ ] context 包含 target_level、year_source、year_inference_trace
- [ ] 每个 proposition 包含 id、name、depth、search_keywords、capability_ids
- [ ] capability_web 中的能力 ID 与 propositions 的 capability_ids 一致
- [ ] dependencies 中引用的 id 全部在 propositions 中存在
- [ ] scope.exclusions 非空(至少有 1 条排除规则)
- [ ] 排序后的 proposition 顺序与 search_priority 一致
- [ ] 收敛者 Agent 的输出可被 JSON.parse 解析
- [ ] 年限推断有明确依据(显式匹配或隐式信号记录)
- [ ] 每个 proposition 包含 level_weight(level + role + reason)
- [ ] strategy 元数据已写入 requirement-web.json
- [ ] 锚点的 provisional_level/provisional_role 与 proposition 的 level_weight 一致

## 异常处理

| 场景 | 处理 |
|------|------|
| 维度 Agent 超时(>3min) | 检查输出文件是否已写入磁盘:完整则保留使用,不完整则丢弃并补发一次(最多补发 1 次),补发仍超时则标为 missing |
| 4 个维度 Agent 全部超时 | 检查各维度文件:保留完整的,缺失的尝试补发,补发后仍 3+ 个缺失 → 跳过头脑风暴,Step 1 按原始指令扫描 |
| 收敛者 Agent 超时(>5min) | 检查 requirement-web.json 是否已写入磁盘:完整则直接使用,不完整则重试一次,重试失败 → **执行 §4.0 降级协议**(基于骨架+存活维度重建最小 requirement-web.json) |
| 收敛者输出 JSON 解析失败 | 重试一次;仍失败 → **执行 §4.0 降级协议** |
| 用户指令已足够明确(topic+year+platform 齐全) | 跳过头脑风暴,直接进入 Step ① |
| 年限推断置信度低(无显式信号,隐式信号冲突) | 默认 L2,在 z 检查点展示推断依据请用户确认 |

## 检查点

🚨 **🛑 必须停顿,进入 z 检查点**。展示需求网摘要(域上下文、年限推断结果及依据、策略元数据、命题列表、level_weight 分布统计、能力图谱雏形、排除项),使用 `clarify` 等待用户确认后才进入 Step ①。

用户可在此检查点:
- **修正年限推断**(如推断为 L2 但实际是 L3)
- 补充遗漏的命题
- 删除不需要的命题
- 调整排序优先级
- 修改排除规则
