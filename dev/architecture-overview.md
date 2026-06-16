# SP-Skill 架构全貌

> 生成时间：2026-06-16T09:09:23Z
> Commit：e5b8e0c
> 状态：常态化更新文档

---

## 一、定位

SP-Skill（Scenario Pipeline Skill）是一个前端面试知识管线，将技术文章自动化转化为结构化的面试准备材料。

**核心价值**：从零散文章 → 系统化知识库 → 面试答案 → 学习路径

---

## 二、入口层

| 入口 | 文件 | 用途 | 触发词 |
|------|------|------|--------|
| 用户 | `SKILL.md` | 运行管线 | "使用这个skill，对...进行前处理" |
| 开发者 | `dev/TEST.md` | 测试 Skill 设计 | "测试这个skill" |
| 开发者 | `dev/PATCH.md` | 修复测试失败 | "修复测试失败" |

---

## 三、执行层

### 3.1 流程概览

```
用户输入
    │
    ▼
⓪ 头脑风暴 ──→ requirement-web.json
    │
    ▼
① 依赖整理 ──→ partition-analysis.json + execution-plan.md
    │
    ▼
② 定向扫描 ──→ .raw-materials/（index + markdown）
    │
    ▼
③ 能力图谱 ──→ capability-graph.json
    │
    ▼
④ 评估入池 ──→ evaluations.json + README.md
    │
    ▼
⑤ 能力研究 ──→ capabilities/*.md + summaries/*.json
    │
    ▼
⑥ Briefing ──→ briefings/*.md
    │
    ▼
⑦ 命题组装 ──→ {命题}/overview+edge+trade+exp+ref
    │
    ▼
⑧ 学习阶梯 ──→ {命题}/learning-ladder.md
    │
    ▼
⑨ 看板生成 ──→ dashboard-v2.html
```

### 3.2 文件结构

```
scenario-pipeline/
├── SKILL.md                    ← 用户入口
├── AGENTS.md                   ← Agent 执行指引
├── README.md                   ← 项目说明
│
├── processes/                  ← 步骤定义（10 个）
│   ├── 00-brainstorm.md            头脑风暴
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
│   ├── shared-conventions.md       共享约定
│   ├── capability-graph.md         能力图谱方法论
│   ├── strategic-highground.md     战略高地方法论
│   └── scenario-matrix.md          场景矩阵方法论
│
├── meta/                       ← 数据定义（4 个）
│   ├── output-contracts.md         输出契约
│   ├── paths.md                    路径约定
│   ├── sources.md                  信源定义
│   └── partition-analysis-schema.md 分区 Schema
│
├── plugins/                    ← 可选增强（3 个）
│   ├── anti-crawl-fetch.md         反爬策略
│   ├── capability-research-mode.md 能力研究模式
│   └── year-granularity.md         年限颗粒度
│
├── dev/                        ← 开发者文档
│   ├── TEST.md                     开发者测试入口
│   ├── PATCH.md                    开发者修复入口
│   ├── architecture-overview.md    本文档
│   ├── design/                     设计决策
│   ├── pipeline-view/              管道观测
│   └── tools/                      开发工具
│
├── tests/                      ← 测试框架（24 个文件）
│   ├── unit/                       Layer 1 结构验证
│   ├── property/                   Layer 2 属性验证
│   ├── semantic/                   Layer 3 语义验证
│   └── reports/                    测试报告
│
└── scripts/                    ← 工具脚本（13 个）
    ├── build-dashboard-v2.js       看板生成
    ├── mutation-test.py            变异测试
    ├── test-coverage.py            测试覆盖率
    ├── cross-layer-check.py        跨层一致性
    ├── regression-check.py         回归检测
    └── ...
```

---

## 四、测试层

### 4.1 三层验证模型

| 层 | 测试数 | 验证内容 | 确定性 |
|----|--------|----------|--------|
| Layer 1 | 166 | 文件结构、章节、关键词 | 100% |
| Layer 2 | 9 | 命题覆盖度、DAG 无环、level_weight 分布 | 统计性 |
| Layer 3 | 9 | 命题质量、能力准确性、学习阶梯合理性 | 非确定性 |

**总计**：184 个测试，177 通过，7 跳过

### 4.2 测试覆盖

- **Skill 文件总数**：22 个
- **有测试覆盖**：17 个
- **覆盖率**：77.3%
- **未覆盖**：3 个 plugin + 2 个 meta 文件

---

## 五、质量保障层

### 5.1 Harness 机制

| 机制 | 脚本 | 功能 | 结果 |
|------|------|------|------|
| 变异测试 | `mutation-test.py` | 故意引入 bug，验证测试捕获能力 | 93.3% kill rate |
| 测试覆盖率 | `test-coverage.py` | 度量 Skill 被测试覆盖的程度 | 77.3% |
| 跨层一致性 | `cross-layer-check.py` | Layer 1/2/3 结果是否一致 | PASS |
| 回归检测 | `regression-check.py` | 新测试是否破坏旧测试 | PASS |
| 测试失败分析 | `check-test-failures.py` | 自动分析失败原因，生成修复建议 | 可用 |

### 5.2 质量指标

| 维度 | 机制 | 指标 |
|------|------|------|
| 结构完整性 | Layer 1 测试 | 166 个断言 |
| 属性合理性 | Layer 2 测试 | 9 个属性检查 |
| 语义质量 | Layer 3 测试 | 9 个 LLM 评估 |
| 测试有效性 | 变异测试 | 93.3% kill rate |
| 覆盖程度 | 覆盖率报告 | 77.3% |
| 一致性 | 跨层检查 | PASS |
| 稳定性 | 回归检测 | 177/184 通过 |

---

## 六、工具层

| 脚本 | 功能 | 用途 |
|------|------|------|
| `build-dashboard-v2.js` | 导向学习看板生成 | 管线产出 |
| `group-capabilities.py` | 能力分组 | 管线执行 |
| `evaluate-propositions.py` | 命题评估 | 管线执行 |
| `partition-propositions.py` | 命题分区 | 管线执行 |
| `cap-graph-view.py` | 能力图谱可视化 | 分析工具 |
| `eval-view.py` | 评估结果可视化 | 分析工具 |
| `gen-dashboard.py` | 看板生成 | 分析工具 |
| `mutation-test.py` | 变异测试 | 质量保障 |
| `test-coverage.py` | 测试覆盖率 | 质量保障 |
| `cross-layer-check.py` | 跨层一致性 | 质量保障 |
| `regression-check.py` | 回归检测 | 质量保障 |
| `check-test-failures.py` | 测试失败分析 | 质量保障 |
| `anti-crawl-fetch.js` | 反爬策略 | 管线执行 |

---

## 七、服务矩阵

| 服务 | 触发方式 | 产出 | 质量保障 |
|------|----------|------|----------|
| 管线执行 | "使用这个skill，对...进行前处理" | 命题研究 + 能力知识库 + 学习阶梯 + 看板 | Layer 1/2/3 测试 |
| 质量测试 | "测试这个skill" | 测试报告 | 变异测试 + 覆盖率 |
| 问题修复 | "修复测试失败" | 修复后的 Skill 文件 | 回归检测 |

---

## 八、运行方式

### 8.1 执行管线

```
使用这个skill，对3年前端web开发经验的候选人在面试场景中会遇到的webpack&vite进行前处理
```

### 8.2 运行测试

```bash
# 运行所有测试
pytest tests/ -v

# 运行特定层测试
pytest tests/unit/ -v        # Layer 1
pytest tests/property/ -v    # Layer 2
pytest tests/semantic/ -v    # Layer 3
```

### 8.3 质量保障

```bash
# 变异测试
python scripts/mutation-test.py

# 测试覆盖率
python scripts/test-coverage.py

# 跨层一致性
python scripts/cross-layer-check.py

# 回归检测
python scripts/regression-check.py
```

---

## 九、路径约定

| 占位符 | 含义 | 确定方式 |
|--------|------|----------|
| `{skillDir}` | Skill 仓库根目录 | Agent 读取 SKILL.md 时的所在目录 |
| `{workDir}` | 产出目录 | 初始化时向用户确认 |

---

## 十、约束

- Context Isolation Protocol：每一步只读该步的文件，严禁预加载后续步骤
- 9 个检查点（ⓩ–ⓗ）：强制停顿，等待用户确认
- 大文件写入规则：>20KB 用 exec + Python，不用 write 工具
- _trace 字段规范：关键决策必须保留决策凭据

---

## 十一、待改进

| 项目 | 状态 | 优先级 |
|------|------|--------|
| Layer 3 测试需要 agent 框架支持 | 跳过 | 中 |
| 5 个文件测试覆盖缺失 | 未覆盖 | 低 |
| 变异测试 M08 存活 | 需修复 | 低 |

---

## 十二、文件统计

| 类型 | 数量 |
|------|------|
| Skill 定义文件 | 21 个 |
| 测试文件 | 24 个 |
| 工具脚本 | 13 个 |
| 入口文件 | 6 个 |
| 开发者文档 | 5+ 个 |

---

*本文档由 AI 自动生成，常态化更新。*
