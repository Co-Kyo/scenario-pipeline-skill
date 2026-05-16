# Scenario Pipeline Skill

> 前端复合工程场景知识管线 —— 从技术文章到面试答案的自动化生产线。

一个为 OpenClaw 设计的 Skill，用于将零散的技术文章、面试题、博客内容系统性地转化为结构化的深度研究产物：命题研究、原子能力知识库、以及面向学习者的渐进式阶梯引导。

> **第一次接触这个项目？** 从 [`pipeline/00-overview.md`](pipeline/00-overview.md) 开始，5 分钟了解完整管道设计。

---

## 它做什么

给它一个信息源（文章、博客、面试题集合），它会：

1. **扫描** — 从信源中识别相关素材，按质量分级
2. **分词** — 将复合场景拆解为原子能力，建立依赖图
3. **研究** — 并行调用多个 agent 深度研究每个原子能力
4. **组装** — 将研究成果编排为面试场景的四象限答案
5. **阶梯** — 生成渐进式学习路径，从"不会"到"能讲"

```
输入："扫描：这篇前端性能优化合集"
                    ↓
输出：
  01-长列表渲染/
  ├── overview.md          ← 链路解构
  ├── edge-cases.md        ← 坑点提取
  ├── trade-offs.md        ← 方案对比
  ├── experiment/          ← 可运行实验
  ├── references.md        ← 参考资料
  └── learning-ladder.md   ← 学习阶梯（渐进式引导）

  capabilities/
  ├── A1-浏览器渲染管线.md
  ├── A4-事件循环与rAF调度.md
  └── ...
```

---

## 核心设计

```
前处理（串行）           后处理（并行 + 单线程）
scan → decompose →       阶段一：能力研究（并行）
extract → highground →   ⛔ barrier
evaluate → pool          Briefing 组装（单线程）
                         ⛔ barrier
                         阶段二：命题组装（并行）
                         ⛔ barrier
                         阶段三：学习阶梯（单线程）
```

每个阶段之间有显式 barrier，确保上游产物完整后才进入下游。

> **想深入了解管道设计？**
> 查看 [`pipeline/`](pipeline/) 目录，每个阶段有独立的文档，详细列出输入、输出、涉及文件和执行逻辑：
> - [`pipeline/00-overview.md`](pipeline/00-overview.md) — 全局数据流图 + 阶段索引
> - [`pipeline/01-pre-process.md`](pipeline/01-pre-process.md) — 前处理：6 步串行管线
> - [`pipeline/02-capability-research.md`](pipeline/02-capability-research.md) — 后处理·阶段一：能力研究
> - [`pipeline/03-briefing-assemble.md`](pipeline/03-briefing-assemble.md) — 后处理·Briefing 组装
> - [`pipeline/04-proposition-assembly.md`](pipeline/04-proposition-assembly.md) — 后处理·阶段二：命题组装
> - [`pipeline/05-learning-ladder.md`](pipeline/05-learning-ladder.md) — 后处理·阶段三：学习阶梯
> - [`pipeline/99-shared.md`](pipeline/99-shared.md) — 跨阶段共享参考（数据实体、插件关系、故障模式）

### 三层产物

| 层 | 产物 | 用途 |
|----|------|------|
| **命题研究** | `<序号>-<命题>/overview + edge-cases + trade-offs + experiment` | 面试前的深度答案速查 |
| **能力知识库** | `capabilities/<id>-<name>.md` | 跨命题的原子能力参考手册 |
| **学习阶梯** | `<序号>-<命题>/learning-ladder.md` | 从不会到会的渐进式引导路径 |

### 学习阶梯（Learning Ladder）

不是"读完就懂"，而是"做到才算"。

- 基于能力依赖图的拓扑排序确定学习顺序
- 每步给出具体任务：**做什么 → 你会看到什么 → 这说明了什么 → 接下来去哪**
- 二值验证标准（做到/做不到，不是"理解程度"）
- 失败时有明确的回退指引

---

## 使用方式

### 前处理（扫描提取）

```
扫描：https://example.com/frontend-performance-article
deep scan：前端性能优化合集 --depth=deep --year=L2
```

### 后处理（深度研究）

```
研究：长列表渲染、首屏白屏
deep research：P1、P2、P4 --no-experiment
```

### 参数

| 参数 | 说明 |
|------|------|
| `--depth=shallow\|normal\|deep` | 研究深度 |
| `--platform=web\|miniapp\|rn\|all` | 目标平台 |
| `--no-experiment` | 跳过实验生成 |
| `--batch=pending` | 批量处理候选池 |
| `--year=L1\|L2\|L3\|L4` | 经验年限适配 |

---

## 项目结构

本项目按层组织，每层有明确的角色、使用者和引用边界：

```
scenario-pipeline-skill/
├── SKILL.md                        ← Agent 执行入口（触发方式 + 流程概览）
│
├── core/                           ← 方法论层（领域知识框架）
│   │                                → 供 agent 在执行 L3 任务时加载
│   ├── architecture-decomposition.md   架构分词方法论
│   ├── capability-graph.md             原子能力图谱定义
│   ├── strategic-highground.md         战略高地识别规则
│   └── scenario-matrix.md             四维评估 + 四象限框架
│
├── plugins/                        ← 可选插件
│   │                                → agent 按需加载
│   ├── capability-research-mode.md     材料块格式 + 深度分级
│   └── year-granularity.md             年限→颗粒度映射
│
├── references/                     ← 执行层（agent 怎么做）
│   │                                → 供 agent 在执行时读取
│   ├── pre-process.md                  前处理编排
│   ├── post-process.md                 后处理编排
│   ├── processes/                      各步骤执行文档（decompose / capability-extract / ...）
│   └── archive/                        已降级的参考文档
│
├── mcp-server/                     ← 实现层（代码）
│   │                                → 供 agent 通过 MCP 协议调用
│   ├── src/
│   │   ├── domains/
│   │   │   ├── state/                状态管理（save_state / restore_state）
│   │   │   ├── template/             模板管理（get_template）
│   │   │   │   └── templates/        ← L2 执行指令模板（SSoT）
│   │   │   └── source/               信源管理（get_sources）
│   │   ├── schemas/                  输出 schema 定义（raw-materials / decompositions / ...）
│   │   └── validators/               通用校验框架
│
├── design/                         ← 架构层（系统设计决策）
│   │                                → 供人类 + 贡献者阅读，agent 不读
│   ├── README.md                       目录说明 + 版本管理规范
│   ├── CHANGELOG.md                    设计变更日志（以需求面为单位）
│   ├── architecture-model.md           四级模型定义 + 加载契约 + 约束规则
│   ├── mcp-skill-architecture.md       对外：MCP × Skill 双侧架构介绍
│   └── plans/                          策略计划书
│
├── pipeline/                       ← 观测层（管线描述）
│   │                                → 供人类理解设计，agent 不读
│   ├── README.md                       目录定位说明
│   ├── 00-overview.md                  全局数据流 + 阶段索引
│   ├── 01 ~ 05                         各阶段：输入/输出/涉及文件
│   └── 99-shared.md                    跨阶段参考（数据实体/插件关系/故障模式）
│
├── demo/                            ← 示例数据
└── docs/                            ← 对外文档（待定）
```

> 💡 **贡献者必读**：各层之间引用有严格约定，参见文末[附录：分层引用约束](#附录分层引用约束)。

---

## 优势

**结构化而非堆砌** — 不是给你一堆链接，而是经过扫描→分级→分词→研究→组装的完整管线产出。每个命题有链路解构、坑点提取、方案对比、可运行实验，四个维度交叉验证。

**能力图谱驱动** — 原子能力之间的依赖关系决定了学习顺序，不是拍脑袋排的。扇出度和耦合度量化了每个能力的战略价值。

**并行且可控** — 后处理阶段用滑动窗口并行（默认窗口=4），每个 agent 只负责一个文件，失败可精确重跑，不影响其他。

**学习阶梯不是教程** — 不重写内容，而是给读者一个"入口"和"抓手"。带着问题去读现有产出，比从头到尾读一遍更高效。

**增量复用** — 已研究过的能力会跳过，已生成的 briefing 会复用，支持断点续跑。

---

## 风险与局限

### 产物质量依赖 agent 能力

本 Skill 的核心逻辑是"编排 agent 去做研究"。研究深度、信源质量、代码正确性都受限于执行 agent 的模型能力。不同模型、不同上下文窗口下，产出质量可能差异显著。

### 信源获取不稳定

前处理的 `capability-extract` 阶段需要大量 web_fetch 验证信源 URL。网络不通、反爬策略、信源失效都会导致信源缺失。后处理有 fallback 搜索机制，但不保证覆盖。

### 实验代码未经充分验证

`experiment/` 目录下的代码由 agent 生成，可能存在 bug、兼容性问题或过时的 API 调用。请在隔离环境中运行，不要直接用于生产。

### 上下文窗口限制

单 agent 的上下文消耗在 50-80KB 量级。对于特别复杂的命题（涉及 10+ 原子能力），可能需要分批处理或降低研究深度。

### 面试场景局限

当前产物主要面向前端工程面试场景。其他领域（后端、算法、系统设计）需要调整 `core/` 中的方法论定义。

### 平台依赖

依赖 OpenClaw 的多 agent spawn 能力。在不支持 spawn 的平台上，后处理将降级为单线程执行，失去并行优势。

---

## 适用场景

- ✅ 前端开发者准备技术面试
- ✅ 系统性梳理某个技术领域的知识体系
- ✅ 从零散文章中提取可复用的技术知识库
- ❌ 不适合直接作为生产环境的技术方案参考
- ❌ 不适合对准确性要求极高的学术场景

---

## MCP 加速层

MCP 服务器是 skill 的执行引擎，提供两类核心能力：

| 域 | 工具 | 作用 |
|----|------|------|
| **状态持久化** | `save_state` / `restore_state` | 跨会话中断恢复，支持检查点机制 |
| **L2 模板执行** | `get_template` | 返回自包含执行指令，子 agent 只写不读 |
| **信源管理** | `get_sources` | 统一管理信源白名单/黑名单，避免硬编码 |

### L2 架构改造

**核心目标**：降低主线程上下文消耗，最大化利用子 agent 独立上下文。

```
改造前（L1）：
├── 主 agent 准备：capability_id + capability_name + URLs + ...
├── 子 agent 需要：读取 process 文档 + 执行
└── 问题：主 agent 上下文浪费，子 agent 执行不一致

改造后（L2）：
├── 主 agent 准备：capability_id + workDir（或 seq + workDir）
├── MCP get_template：从 .meta/ 自动加载数据 + 模板
├── 子 agent 收到：完整自包含执行指令
└── 子 agent 执行：只写不读，无需读取任何文档
```

**关键设计**：
- **模板即 SSoT**：执行指令在 `mcp-server/src/domains/template/templates/*.md`
- **数据自动加载**：MCP 从 `.meta/` 读取 capability-graph.json、decompositions.json、summaries/
- **参数最小化**：主 agent 只需传 seq + workDir 或 capability_id + workDir
- **子 agent 只写不读**：收到完整指令后，只负责产出文件

> 详见 [`mcp-server/README.md`](mcp-server/README.md)。

---

## 附录：分层引用约束

> 以下规则面向项目维护者和贡献者，定义各目录层之间的引用边界。
> 首次阅读项目可先跳过，理解核心功能后再回看。

| 源层 ↓ → 目标层 | `SKILL.md` | `core/` | `references/` | `mcp-server/` | `design/` | `pipeline/` | `plugins/` |
|---|---|---|---|---|---|---|---|
| **`SKILL.md`**（agent 入口） | — | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **`core/`**（方法论） | ❌ | — | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`references/`**（执行） | ❌ | ✅ 核心依赖 | — | ✅ 工具调用 | ❌ | ❌ | ❌ |
| **`mcp-server/`**（实现层） | ❌ | ✅ | ❌ | — | ❌ | ❌ | ❌ |
| **`design/`**（架构） | ❌ | ✅ | ✅ | ✅ | — | ✅ | ❌ |
| **`pipeline/`**（观测） | ❌ | ❌ | ❌ | ❌ | ❌ | — | ❌ |
| **`plugins/`**（可选插件） | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | — |

注：✅ 允许引用；❌ 不允许引用；— 自引用或不适用。"核心依赖"指主要读取关系；"工具调用"指通过 MCP 协议调用而非直接文件引用。

**核心原则：**

1. **`design/` 和 `pipeline/` 不是执行文件**——所有面向 agent 执行的层（`SKILL.md`、`references/`、`core/`、`mcp-server/`、`plugins/`）均不可引用它们。agent 执行时不读取这两层。
2. **`core/` 方法论文档是自包含的**——它是 agent 在执行 L3 任务时加载的知识框架，不依赖其他任何层。
3. **`references/` 下的执行文档仅依赖 `core/`（方法论）和 `mcp-server/`（工具调用）**，不依赖 `SKILL.md`、架构层或观测层。
4. **`design/` 可以引用除 `SKILL.md` 外的所有层**——架构视角需要俯视全局，但 design/ 的引用是给人看的，不是给 agent 执行用的。
5. **`pipeline/` 是观察视角**——描述管线长什么样，不定义执行逻辑，不引用其他层的内容。

---

## License

MIT
