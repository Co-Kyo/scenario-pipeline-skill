# Scenario Pipeline Skill

> 前端复合工程场景知识管线 —— 从技术文章到面试答案的自动化生产线。

将零散的技术文章、面试题、博客内容系统性地转化为结构化的深度研究产物：命题研究、原子能力知识库、以及面向学习者的渐进式阶梯引导。

> **第一次接触？** 从 [`design/pipeline/00-overview.md`](design/pipeline/00-overview.md) 开始，5 分钟了解完整管道设计。

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
前处理（串行）           后处理（并行 + 检查点）
① scan → ② decompose →  阶段一：⑦ 能力研究（并行）
③ extract →              ⓔ barrier
④ highground →           ⑧ Briefing 组装（并行）
⑤ evaluate → ⑥ pool     ⓓ barrier
                         阶段二：⑨ 命题组装（并行）
                         ⓕ barrier
                         阶段三：⑩ 学习阶梯（并行）
                         ⓖ 完成
```

每个阶段之间有显式 barrier + 检查点，确保上游产物完整后才进入下游。

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
| `--batch=pending` | 批量处理候选池（跳过检查点） |
| `--year=L1\|L2\|L3\|L4` | 经验年限适配 |
| `--append` | 在已有目录补充研究 |

---

## 项目结构

```
scenario-pipeline-v2/
├── SKILL.md                    ← Agent 执行入口（触发方式 + 管道全景）
│
├── meta/                       ← 数据定义
│   ├── sources.md                 T0 域名表 + 信源分级规则
│   ├── output-contracts.md        每步输出结构 + 完整 JSON 示例
│   └── paths.md                   路径约定表
│
├── core/                       ← 方法论（agent 按需加载）
│   ├── architecture-decomposition.md
│   ├── capability-graph.md
│   ├── strategic-highground.md
│   └── scenario-matrix.md
│
├── plugins/                    ← 可选插件
│   ├── capability-research-mode.md
│   └── year-granularity.md
│
├── processes/                  ← 执行文档（自包含，含示例）
│   ├── 00-shared.md               子 agent 调度 + 检查点 + 状态管理
│   ├── 01-scan.md ~ 06-pool.md    前处理步骤
│   └── 07 ~ 10                    后处理步骤
│
└── design/                     ← 架构观测（人类阅读）
    ├── CHANGELOG.md
    └── pipeline/                 管道数据流 + 故障模式
```

---

## 优势

**结构化而非堆砌** — 不是给你一堆链接，而是经过扫描→分级→分词→研究→组装的完整管线产出。每个命题有链路解构、坑点提取、方案对比、可运行实验，四个维度交叉验证。

**能力图谱驱动** — 原子能力之间的依赖关系决定了学习顺序，不是拍脑袋排的。扇出度和耦合度量化了每个能力的战略价值。

**并行且可控** — 后处理阶段用滑动窗口并行（默认窗口=4），每个 agent 只负责一个文件，失败可精确重跑，不影响其他。

**学习阶梯不是教程** — 不重写内容，而是给读者一个"入口"和"抓手"。带着问题去读现有产出，比从头到尾读一遍更高效。

**增量复用** — 已研究过的能力会跳过，已生成的 briefing 会复用，支持断点续跑。

**零依赖** — 纯 Markdown，无需构建、无需服务器进程、无需安装任何东西。

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

### 平台依赖

依赖平台的多 agent spawn 能力。在不支持 spawn 的平台上，后处理将降级为单线程执行，失去并行优势。

---

## 适用场景

- ✅ 前端开发者准备技术面试
- ✅ 系统性梳理某个技术领域的知识体系
- ✅ 从零散文章中提取可复用的技术知识库
- ❌ 不适合直接作为生产环境的技术方案参考
- ❌ 不适合对准确性要求极高的学术场景

---

## License

MIT
