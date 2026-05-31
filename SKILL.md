---
name: scenario-pipeline
description: "前端复合工程场景知识管线。三阶段工作流：头脑风暴（年限推断+需求网+分词）→ 前处理（定向扫描→能力图谱构建→评估入池）+ 后处理（能力研究→Briefing→命题组装→学习阶梯）。触发词：'扫描' / '研究' / 'deep scan' / 'deep research' / 'scenario research'。"
---

# Scenario Pipeline

## 管道全景

```
                         用户输入："扫描：前端性能面试题"
                                    │
┌───────────────────────────────────┼───────────────────────────────────┐
│                      ⓪ 头脑风暴（前置）                               │
│                                                                       │
│  年限自动推断 → 4 维度 Agent 并行（场景/技术/学习/约束）              │
│       │              ↓ 裁判收敛                                       │
│       └────────→ requirement-web.json（命题列表+能力雏形+分词）       │
│                                              │                        │
│                                       ⓩ 检查点（用户确认）            │
└───────────────────────────────────────┼────────────────────────────────┘
                                        │
┌───────────────────────────────────────┼────────────────────────────────┐
│                          前处理（串行 3 步）                           │
│                                                                       │
│  ① scan（两阶段管道）                                                  │
│    Phase A: 串行搜索 + Playwright前置 → url-batches.json             │
│    Phase B: 并行agent提取（W=5） → partial results                    │
│    Phase C: merge → .raw-materials/（index + markdown）              │
│       │                                                                │
│  ② capability-graph → capability-graph.json（能力+高地+参考URL）      │
│       │                                                        ⓐ 检查点│
│  ③ evaluate-pool ──→ evaluations.json + README.md                    │
│                                              │                ⓑ 检查点│
└───────────────────────────────────────┼────────────────────────────────┘
                                        │
┌───────────────────────────────────────┼────────────────────────────────┐
│                      后处理（并行 + 检查点）                           │
│                                                                       │
│  ④ capability-research ──→ capabilities/*.md + summaries/*.json      │
│       │  × N 并行（DAG 拓扑调度）                            ⓒ 检查点│
│                                                                       │
│  ⑤ briefing-assemble  ──→ briefings/*.md                             │
│       │  × M 并行（简单窗口 W=5）                            ⓓ 检查点│
│                                                                       │
│  ⑥ assemble ──────────→ {命题}/overview+edge+trade+exp+ref           │
│       │  × M 并行（每命题 2 agent）                          ⓕ 检查点│
│                                                                       │
│  ⑦ learning-ladder ───→ {命题}/learning-ladder.md                    │
│          × M 并行（简单窗口 W=5）                            ⓖ 检查点│
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
1. **初始化**：读 `core/shared-conventions.md`（共享约定）+ `meta/paths.md`（路径约定）
2. **头脑风暴**（前置阶段）：读 `processes/00-brainstorm.md` → 执行 → 产出 `requirement-web.json`
   - 自动从自然语言推断经验年限（L1-L4）
   - 判断是否可跳过（topic 明确 + year 已推断 + platform 已指定 → 跳过）
   - 不可跳过 → 4 维度 Agent 并行（均注入年限颗粒度规则）→ 裁判 Agent 收敛 → 写入 requirement-web.json
   - ⓩ 检查点：用户确认需求网（含年限推断结果）后进入前处理
3. **前处理**（串行 3 步）：严格按以下循环执行：
   ```
   for step in [01, 02, 03]:
       ① 读 processes/{step}-xxx.md          ← 只读当前步骤文件
       ② 读该步骤引用的 core/*.md 或 meta/*.md（按文件中的"前置条件"指示）
       ③ 执行该步骤的全部操作，产出文件
       ④ 进入下一步前，不再引用上一步的 processes 文件内容
   ```
4. **后处理**：按 `processes/04` → `processes/07` 分步执行（共享约定已在初始化时加载）

**违规判定**：如果在执行 Step N 时引用了 Step N+1 或更后续步骤文件的内容，即视为违规。

> 设计理由见 `dev/design/context-isolation.md`

## 数据参考

| 文件 | 内容 | 何时读取 |
|------|------|---------|
| `core/shared-conventions.md` | 共享约定（调度/检查点/隔离/增量复用/凭据/比例） | 初始化时读取，全程持有 |
| `processes/00-brainstorm.md` | 头脑风暴执行文档（年限推断/维度定义/裁判逻辑/输出格式） | 头脑风暴阶段读取 |
| `meta/paths.md` | 路径约定表 | 初始化时读取一次即可 |
| `meta/sources.md` | T0 域名表 + 信源分级规则 | 由 Step 00 和 Step 01 的前置条件指示读取 |
| `meta/output-contracts.md` | 每步的输出结构 + 完整示例 | 由每步的前置条件指示读取对应 §N 节 |
| `core/*.md` | 方法论定义 | 由对应步骤的前置条件指示读取，**不在初始化阶段加载** |
| `plugins/*.md` | 可选增强 | 由对应步骤的前置条件指示读取 |

## 流程步骤索引

| 阶段 | 编号 | 名称 | 核心产物 | 检查点 |
|------|------|------|---------|--------|
| 前置 | ⓪ | 头脑风暴 | requirement-web.json | ⓩ |
| 前处理 | ① | 定向扫描 | .raw-materials/（index.json + markdown） | — |
| 前处理 | ② | 能力图谱构建 | capability-graph.json | ⓐ |
| 前处理 | ③ | 评估与入池 | .meta/evaluations.json + README.md | ⓑ |
| 后处理 | ④ | 能力研究 | capabilities/*.md + summaries/*.json | ⓒ |
| 后处理 | ⑤ | Briefing 组装 | briefings/*.md | ⓓ |
| 后处理 | ⑥ | 命题组装 | 命题目录（overview/edge/trade/exp/ref） | ⓕ |
| 后处理 | ⑦ | 学习阶梯 | learning-ladder.md | ⓖ |
