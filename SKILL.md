---
name: scenario-pipeline
description: "前端复合工程场景知识管线。三阶段工作流：意图锚定→头脑风暴→前处理（定向扫描→能力图谱构建→评估入池）+ 后处理（能力研究→Briefing→命题组装→学习阶梯）。触发词：'扫描' / '研究' / 'deep scan' / 'deep research' / 'scenario research'。"
---

# Scenario Pipeline

## 管道全景

```
                         用户输入："扫描：前端性能面试题"
                                    │
┌───────────────────────────────────┼───────────────────────────────────┐
│                      00 意图锚定                                          │
│                                                                       │
│  解析用户指令 → 年限推断 → 跳过判断 → 轻量提取                        │
│       │                                                                │
│       └────────→ anchors.json（骨架+策略元数据）                       │
│                                              │                        │
│                                       Barrier 0 检查点（用户确认）            │
└───────────────────────────────────────┼────────────────────────────────┘
                                        │
                        ┌───────────────┴───────────────┐
                        │  跳过判断                      │
                        │  YES: 直接进入 02              │
                        │  NO:  ↓                       │
                        └───────────────┬───────────────┘
                                        │
┌───────────────────────────────────────┼────────────────────────────────┐
│  01 头脑风暴（条件触发）                           │
│                                                                       │
│  4 维度 Agent 并行（场景/技术/学习/约束）→ 收敛者校验                  │
│       │              ↓ 裁判收敛                                       │
│       └────────→ requirement-web.json（命题列表+能力雏形+分词）       │
│                                              │                        │
│                                       Barrier 1 检查点（用户确认）            │
└───────────────────────────────────────┼────────────────────────────────┘
                                        │
┌───────────────────────────────────────┼────────────────────────────────┐
│                      02 依赖整理与分区                                 │
│                                                                       │
│  依赖整理 → DAG → 三层分区（连通分量+拓扑深度+社区发现）              │
│       │                                                                │
│  → partition-analysis.json + execution-plan.md                        │
│                                              │               Barrier 2 检查点│
└───────────────────────────────────────┼────────────────────────────────┘
                                        │
┌───────────────────────────────────────┼────────────────────────────────┐
│                          前处理（串行 3 步）                           │
│                                                                       │
│  03 scan（两阶段管道）                                                  │
│    Phase A: 串行搜索 + Playwright前置 → url-batches.json             │
│    Phase B: 并行agent提取（W=5） → partial results                    │
│    Phase C: merge → .raw-materials/（index + markdown）              │
│       │                                                                │
│  04 capability-graph → capability-graph.json（能力+高地+参考URL）      │
│       │                                                        Barrier 3 检查点│
│  05 evaluate-pool ──→ evaluations.json + README.md                    │
│                                              │                Barrier 4 检查点│
└───────────────────────────────────────┼────────────────────────────────┘
                                        │
┌───────────────────────────────────────┼────────────────────────────────┐
│                      后处理（并行 + 检查点）                           │
│                                                                       │
│  06 capability-research ──→ capabilities/*.md + summaries/*.json      │
│       │  × N 并行（DAG 拓扑调度）                            Barrier 5 检查点│
│                                                                       │
│  07 briefing-assemble  ──→ briefings/*.md                             │
│       │  × M 并行（简单窗口 W=5）                            Barrier 6 检查点│
│                                                                       │
│  08 assemble ──────────→ {命题}/overview+edge+trade+exp+ref           │
│       │  × M 并行（每命题 2 agent）                          Barrier 7 检查点│
│                                                                       │
│  09 learning-ladder ───→ {命题}/learning-ladder.md                    │
│          × M 并行（简单窗口 W=5）                            Barrier 8 检查点│
└───────────────────────────────────────────────────────────────────────┘
```

## 三层产物

| 层 | 产物 | 用途 |
|----|------|------|
| **命题研究** | `{seq}-{name}/overview + edge-cases + trade-offs + experiment` | 面试前的深度答案速查 |
| **能力知识库** | `capabilities/{id}-{name}.md` | 跨命题的原子能力参考手册 |
| **学习阶梯** | `{seq}-{name}/learning-ladder.md` | 从不会到会的渐进式引导路径 |

## 触发方式

**前处理（扫描提取）：**
```
扫描：<信息源描述>
deep scan：<信息源描述>
```

**后处理（深度研究）：**
```
研究：<场景描述>
deep research：<场景描述>
```

**参数：** `--depth=shallow|normal|deep` `--platform=web|miniapp|rn|all` `--no-experiment` `--append` `--batch=pending` `--year=L1|L2|L3|L4`

> 💡 `--year` 参数可省略，系统会从用户自然语言中自动推断经验年限。

## 执行入口

### ⚠️ 强制分步读取协议（Context Isolation Protocol）

**核心规则：每一步只读该步的文件，严禁提前加载后续步骤。**

执行流程：
1. **初始化**：读 `assets/common/rule-isolation.md`（上下文隔离）+ `assets/common/protocol-checkpoint.md`（检查点协议）+ `assets/common/strategy-level.md`（动态策略）+ `assets/common/protocol-scheduling.md`（调度规则）+ `assets/common/ref-paths.md`（路径约定）。向用户确认产出目录（workDir）——告知默认路径，等用户确认后再继续
2. **意图锚定**（前置阶段）：读 `processes/00-intent-anchor.md` → 执行 → 产出 `anchors.json`
   - 自动从自然语言推断经验年限（L1-L4）
   - 判断是否可跳过头脑风暴（topic 明确 + year 已推断 + platform 已指定 → 跳过）
   - 轻量提取生成共享骨架（anchors.json，8-15 个锚点）
   - Barrier 0 检查点：用户确认骨架后，决定是否进入头脑风暴
3. **头脑风暴**（条件触发）：读 `processes/01-brainstorm.md` → 执行 → 产出 `requirement-web.json`
   - 跳过判断 YES → 直接进入依赖整理与分区
   - 跳过判断 NO → 4 维度 Agent 并行（均注入年限颗粒度规则）→ 裁判 Agent 收敛 → 写入 requirement-web.json
   - Barrier 1 检查点：用户确认需求网（含年限推断结果）后进入分区
4. **依赖整理与分区**：读 `processes/02-partition.md` → 执行 → 产出 `partition-analysis.json` + `execution-plan.md`
   - 依赖整理：确认/生成命题间依赖关系
   - 三层分区：连通分量 → 拓扑深度 → 社区发现
   - Barrier 2 检查点：用户确认执行计划后进入前处理
5. **前处理**（串行 3 步）：严格按以下循环执行：
   ```
   for step in [03, 04, 05]:
        1. 读 processes/{step}-xxx.md          ← 只读当前步骤文件
        2. 读该步骤引用的 assets/{step-id}/method.md 或 assets/{step-id}/schemas.md（按文件中的"前置条件"指示）
        3. 执行该步骤的全部操作，产出文件
        4. 进入下一步前，不再引用上一步的 processes 文件内容
   ```
6. **后处理**：按 `processes/06` → `processes/09` 分步执行（共享约定已在初始化时加载）

**违规判定**：如果在执行 Step N 时引用了 Step N+1 或更后续步骤文件的内容，即视为违规。

> 设计理由见 `dev/design/context-isolation.md`

## 数据参考

| 文件 | 内容 | 何时读取 |
|------|------|---------|
| `assets/common/rule-isolation.md` | 上下文隔离规范（每步只读该步的文件） | 初始化时读取，全程持有 |
| `assets/common/protocol-checkpoint.md` | 检查点协议（强制停顿 + barrier 记录） | 按前置条件指示读取 |
| `assets/common/rule-reuse.md` | 增量复用（文件存在性判断） | 按前置条件指示读取 |
| `assets/common/convention-trace.md` | 决策凭据规范（_trace 字段） | 按前置条件指示读取 |
| `assets/common/strategy-level.md` | 动态标准策略（策略表/level_weight/收敛者/内容比例） | 按前置条件指示读取 |
| `assets/common/protocol-scheduling.md` | 子 agent 调度（3 种模式/label/校验/平台适配） | 按前置条件指示读取 |
| `assets/common/ref-sources.md` | T0 域名表 + 信源分级规则 | 由 Step 00 和 Step 02 的前置条件指示读取 |
| `assets/common/ref-paths.md` | 路径约定表 | 初始化时读取一次即可 |
| `processes/00-intent-anchor.md` | 意图锚定执行文档 | 头脑风暴阶段读取 |
| `processes/01-brainstorm.md` | 头脑风暴执行文档 | 跳过判断 NO 时读取 |
| `processes/02-partition.md` | 依赖整理与分区执行文档 | 头脑风暴确认后、scan 前读取 |
| `assets/{step-id}/method.md` | 方法论定义 | 由对应步骤的前置条件指示读取，**不在初始化阶段加载** |
| `plugins/*.md` | 可选增强 | 由对应步骤的前置条件指示读取 |

## 流程步骤索引

| 阶段 | 编号 | 名称 | 核心产物 | 检查点 |
|------|------|------|---------|--------|
| 前置 | 00 | 意图锚定 | anchors.json | Barrier 0 |
| 前置 | 01 | 头脑风暴 | requirement-web.json | Barrier 1 |
| 前置 | 02 | 依赖整理与分区 | partition-analysis.json + execution-plan.md | Barrier 2 |
| 前处理 | 03 | 定向扫描 | .raw-materials/（index.json + markdown） | — |
| 前处理 | 04 | 能力图谱构建 | capability-graph.json | Barrier 3 |
| 前处理 | 05 | 评估与入池 | .meta/evaluations.json + README.md | Barrier 4 |
| 后处理 | 06 | 能力研究 | capabilities/*.md + summaries/*.json | Barrier 5 |
| 后处理 | 07 | Briefing 组装 | briefings/*.md | Barrier 6 |
| 后处理 | 08 | 命题组装 | 命题目录（overview/edge/trade/exp/ref） | Barrier 7 |
| 后处理 | 09 | 学习阶梯 | learning-ladder.md | Barrier 8 |
