# Scenario Pipeline Skill

> 前端复合工程场景知识管线 —— 从技术文章到面试答案的自动化生产线。

将零散的技术文章、面试题、博客内容系统性地转化为结构化的深度研究产物：命题研究、原子能力知识库、以及面向学习者的渐进式阶梯引导。

> **第一次接触？** 从 [`dev/pipeline-view/00-overview.md`](dev/pipeline-view/00-overview.md) 开始，5 分钟了解完整管道设计。

---

## 它做什么

给它一个信息源（文章、博客、面试题集合），它会：

1. **头脑风暴** — 自动推断经验年限，4 维度 Agent 将用户意图"揉开"成需求网（场景/技术/学习/约束），同时完成架构分词
2. **定向扫描** — 基于需求网的命题列表和搜索关键词，精准扫描信源
3. **能力图谱构建** — 跨命题去重合并原子能力，计算扇出度与战略高地
4. **评估入池** — 四维评估打分，确定优先级和学习顺序
5. **能力研究** — 并行调用多个 agent 深度研究每个原子能力
6. **组装** — 将研究成果编排为面试场景的四象限答案
7. **阶梯** — 生成渐进式学习路径，从"不会"到"能讲"

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
⓪ 头脑风暴（前置）     前处理（串行 3 步）       后处理（并行 + 检查点）
年限自动推断             ② scan（两阶段管道）      ⑤ 能力研究（并行）× N
4 维度 Agent 并行          Phase A: 串行搜索       ⓒ barrier
↓ 裁判收敛                 Phase B: 并行提取(W=5)  ⑥ Briefing 组装（并行）× M
requirement-web.json      Phase C: merge          ⓓ barrier
含能力图谱+分词结构        ③ capability-graph →     ⑦ 命题组装（并行）× M
ⓩ 检查点                     能力图谱+高地           ⓕ barrier
                           ④ evaluate-pool →       ⑧ 学习阶梯（并行）× M
① 依赖整理与分区            评估+入池              ⓖ 完成
                            ⓐ barrier              ⑨ 看板生成
                            ⓑ barrier              ⓗ 完成
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
├── SKILL.md                    ← 用户入口（执行管线）
├── AGENTS.md                   ← Agent 执行指引
│
├── processes/                  ← 步骤定义（10 个）
│   ├── 00-brainstorm.md           头脑风暴
│   ├── 01-partition.md             依赖整理与分区
│   ├── 02-scan.md                  定向扫描
│   ├── 03-capability-graph.md      能力图谱构建
│   ├── 04-evaluate-pool.md         评估与入池
│   ├── 05-capability-research.md   能力研究
│   ├── 06-briefing-assemble.md     Briefing 组装
│   ├── 07-assemble.md              命题组装
│   ├── 08-learning-ladder.md       学习阶梯
│   └── 09-build-dashboard.md       看板生成
│
├── core/                       ← 方法论（4 个）
├── meta/                       ← 数据定义（4 个）
├── plugins/                    ← 可选增强（3 个）
│
├── dev/                        ← 开发者文档
│   ├── TEST.md                     开发者测试入口
│   ├── PATCH.md                    开发者修复入口
│   ├── architecture-overview.md    架构全貌
│   ├── design/                     设计决策
│   └── tools/                      开发工具
│
├── tests/                      ← 测试框架（184 个测试）
│   ├── unit/                       Layer 1 结构验证（166 个）
│   ├── property/                   Layer 2 属性验证（9 个）
│   └── semantic/                   Layer 3 语义验证（9 个）
│
└── scripts/                    ← 工具脚本（13 个）
    ├── build-dashboard-v2.js       看板生成
    ├── mutation-test.py            变异测试
    ├── test-coverage.py            测试覆盖率
    ├── cross-layer-check.py        跨层一致性
    └── regression-check.py         回归检测
```

---

## 测试框架

| 层 | 测试数 | 验证内容 |
|----|--------|----------|
| Layer 1 | 166 | 文件结构、章节、关键词 |
| Layer 2 | 9 | 命题覆盖度、DAG 无环、level_weight 分布 |
| Layer 3 | 9 | 命题质量、能力准确性、学习阶梯合理性 |

```bash
# 运行所有测试
pytest tests/ -v

# 运行特定层测试
pytest tests/unit/ -v        # Layer 1
pytest tests/property/ -v    # Layer 2
pytest tests/semantic/ -v    # Layer 3
```

---

## 质量保障

| 机制 | 脚本 | 功能 |
|------|------|------|
| 变异测试 | `python scripts/mutation-test.py` | 故意引入 bug，验证测试捕获能力 |
| 测试覆盖率 | `python scripts/test-coverage.py` | 度量 Skill 被测试覆盖的程度 |
| 跨层一致性 | `python scripts/cross-layer-check.py` | Layer 1/2/3 结果是否一致 |
| 回归检测 | `python scripts/regression-check.py` | 新测试是否破坏旧测试 |

---

## 入口文件

| 入口 | 文件 | 用途 |
|------|------|------|
| 用户 | `SKILL.md` | 运行管线 |
| 开发者 | `dev/TEST.md` | 测试 Skill 设计 |
| 开发者 | `dev/PATCH.md` | 修复测试失败 |

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
