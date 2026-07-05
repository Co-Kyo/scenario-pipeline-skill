# Scenario Pipeline Skill

> 前端复合工程场景知识管线 —— 从技术文章到面试答案的自动化生产线。

将零散的技术文章、面试题、博客内容系统性地转化为结构化的深度研究产物：命题研究、原子能力知识库、以及面向学习者的渐进式阶梯引导。

> **第一次接触？** 从 [`dev/pipeline-view/00-overview.md`](dev/pipeline-view/00-overview.md) 开始，5 分钟了解完整管道设计。

---

## 它做什么

给它一个信息源（文章、博客、面试题集合），它会：

1. **意图锚定** — 解析用户指令，推断经验年限，生成锚点骨架（anchors.json）
2. **头脑风暴** — 4 维度 Agent 将用户意图"揉开"成需求网（场景/技术/学习/约束），收敛为 requirement-web.json
3. **定向扫描** — 基于需求网的命题列表和搜索关键词，精准扫描信源
4. **能力图谱构建** — 跨命题去重合并原子能力，计算扇出度与战略高地
5. **评估入池** — 四维评估打分，确定优先级和学习顺序
6. **能力研究** — 并行调用多个 agent 深度研究每个原子能力
7. **组装** — 将研究成果编排为面试场景的四象限答案
8. **阶梯** — 生成渐进式学习路径，从"不会"到"能讲"

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
⓪ 意图锚定                前处理（串行 3 步）       后处理（并行 + 检查点）
年限推断+锚点生成          ③ scan（两阶段管道）      ⑥ 能力研究（并行）× N
① 头脑风暴                  Phase A: 串行搜索       ⓒ barrier
  4维度Agent并行+收敛        Phase B: 并行提取(W=5)  ⑦ Briefing 组装（并行）× M
requirement-web.json       Phase C: merge          ⓓ barrier
含能力图谱+分词结构         ④ capability-graph →     ⑧ 命题组装（并行）× M
ⓩ 检查点                      能力图谱+高地           ⓕ barrier
                            ⑤ evaluate-pool →       ⑨ 学习阶梯（并行）× M
                               评估+入池              ⓖ 完成
                            ⓐ barrier
                            ⓑ barrier
```

每个阶段之间有显式 barrier + 检查点，确保上游产物完整后才进入下游。

### 三层产物

| 层 | 产物 | 用途 |
|----|------|------|
| **命题研究** | `<序号>-<命题>/overview + edge-cases + trade-offs + experiment` | 面试前的深度答案速查 |
| **能力知识库** | `capabilities/<id>-<name>.md` | 跨命题的原子能力参考手册 |
| **学习阶梯** | `<序号>-<命题>/learning-ladder.md` | 从不会到会的渐进式引导路径 |

### 学习阶梯（Learning Ladder）

基于能力依赖图的拓扑排序确定学习顺序。

- 基于能力依赖图的拓扑排序确定学习顺序
- 每步给出具体任务：**做什么 → 你会看到什么 → 这说明了什么 → 接下来去哪**
- 二值验证标准（做到/做不到，不是"理解程度"）
- 失败时有明确的回退指引

---

## 使用方式

### 前处理（扫描提取）

```
扫描：https://example.com/frontend-performance-article
deep scan：前端性能优化合集 --depth=deep
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
| `--year=L1\|L2\|L3\|L4` | 经验年限（可省略，系统自动从自然语言推断） |
| `--append` | 在已有目录补充研究 |

---

## 项目结构

```
scenario-pipeline/
├── SKILL.md                    ← Agent 执行入口（触发方式 + 管道全景）
│
├── assets/                     ← 所有资源（schemas + method + 规则 + 模板）
│   ├── common/                    公共资源
│   │   ├── rule-isolation.md        上下文隔离（每步只读该步的文件）
│   │   ├── protocol-checkpoint.md   检查点协议（强制停顿 + barrier 记录）
│   │   ├── rule-reuse.md            增量复用（文件存在则跳过）
│   │   ├── convention-trace.md      决策凭据规范（_trace 字段）
│   │   ├── strategy-level.md        动态标准策略（策略表/level_weight/收敛者/内容比例）
│   │   ├── protocol-scheduling.md   子 agent 调度（3 种模式/label/校验/平台适配）
│   │   ├── ref-sources.md           T0 域名表 + 信源分级规则
│   │   └── ref-paths.md             路径约定表
│   ├── 01-brainstorm/              头脑风暴资源（schemas + 规则 + Agent 定义）
│   ├── 01-partition/               依赖整理与分区资源
│   ├── 02-scan/                    定向扫描资源
│   ├── 03-capability-graph/        能力图谱资源（schemas + method）
│   ├── 04-evaluate-pool/           评估入池资源（schemas + method）
│   ├── 05-capability-research/     能力研究资源
│   ├── 06-briefing-assemble/       Briefing 组装资源
│   ├── 07-assemble/                命题组装资源
│   └── 08-learning-ladder/         学习阶梯资源
│
├── plugins/                    ← 可选插件
│   ├── capability-research-mode.md
│   └── year-granularity.md         经验年限颗粒度规则
│
├── processes/                  ← 执行文档（自包含，含示例）
│   ├── 00-intent-anchor.md           多维头脑风暴
│   ├── 01-partition.md             依赖整理与分区 + 年限自动推断 + 分词（前置阶段）
│   ├── 02-scan.md                 定向扫描
│   ├── 03-capability-graph.md     能力图谱构建（含战略高地识别）
│   ├── 04-evaluate-pool.md        评估与入池
│   ├── 05 ~ 08                    后处理步骤
│
└── dev/                        ← 开发与观测（人类阅读 + 审查工具）
    ├── design/                     设计原理（why）
    ├── pipeline-view/              管道观测视角
    └── tools/                      开发工具
```

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
