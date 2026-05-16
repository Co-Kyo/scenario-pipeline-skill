---
title: 前处理子 Agent 隔离策略架构
version: 2.0
status: current
last_updated: 2026-05-16
supersedes: v1
superseded_by: ~
type: proposal
---

# 前处理子 Agent 隔离策略架构

> 状态：计划书（v2，含三方评审修订）
> 日期：2026-05-14
> 关联：`design/architecture-model.md` §3（L3 加载契约）、`references/pre-process.md`（编排层）
> 评审团队：架构评审者、Hermes 执行环境专家、上下文预算分析师

---

## 1. 问题陈述

### 1.1 现状

前处理 7 步（scan → load core → decompose → capability-extract → highground-identify → evaluate → pool）全部在主线程中串行执行。

```
主线程上下文（随执行线性增长，基于微信小程序实验数据校准）
┌──────────────────────────────────────────────────────────┐
│ 用户指令 + 系统指令（~5K tokens）                         │
│ + scan 的 8 轮 web_search 结果（~7K tokens）              │
│ + raw-materials.json（~3.5K tokens）                      │
│ + core/ 4 个方法论文档（~8K tokens）                      │
│ + decompose 推理 + decompositions.json（~4.5K tokens）    │
│ + capability-extract 推理 + MCP + JSON（~20K tokens）★热点│
│ + highground 推理 + JSON 追加（~11K tokens）              │
│ + evaluate 推理 + evaluations.json（~12K tokens）         │
│ ──────────────────────────────────────────────────────── │
│ 实际峰值：~70K-80K tokens（旧估 44K 偏低）                │
└──────────────────────────────────────────────────────────┘
```

> 校准依据：research-log.md 实际执行数据（8 次搜索、22 个能力、6 个命题），capability-graph.json 26.5KB ≈ 6.6K tokens，加上推理过程远超旧估。

### 1.2 问题

| 问题 | 影响 | 严重度 |
|------|------|--------|
| **信息流污染** | scan 的原始搜索结果堆积在上下文，后续步骤的推理质量被稀释 | 高 |
| **执行热区集中** | IO 密集型（web_search/web_fetch）与推理密集型混在同一上下文，互相干扰 | 高 |
| **上下文窗口膨胀** | 前处理完成后累计 ~70K-80K tokens，后处理可用上下文被严重压缩 | 高 |
| **不可中断** | 主线程串行执行，中间步骤失败需从头重来 | 中 |
| **可观测性差** | 中间状态只存在于上下文，无法独立审计每步输入/输出 | 中 |

### 1.3 控制论视角

| 原则 | 问题映射 |
|------|---------|
| **信息流** | 中间数据未被隔离，上游执行痕迹直接流入下游推理 |
| **最优控制** | IO 密集型和推理密集型任务没有分离调度，未实现最优资源分配 |
| **反馈机制** | 步骤间无独立校验点，中间错误传播到下游才发现 |
| **可观测性** | 每步输入/输出不可独立审计，只能从上下文回忆 |

---

## 2. 设计目标

1. **上下文隔离**：每步执行在独立上下文中，主线程只负责编排和检查点
2. **结构化交接**：步骤间通过文件交接（JSON/Markdown），不通过上下文传递
3. **可中断/可恢复**：每步完成后持久化产出，失败可从断点恢复
4. **可观测**：每步输入/输出/耗时/异常独立记录（MCP 调用日志 + 子 agent 执行摘要）

---

## 3. 策略架构

### 3.1 整体编排

```
主线程（编排者）
│
├─ resolve_paths（L1，主线程直接执行，轻量）
│
├─ Step 1  scan ────────────────→ 子 agent A
│  │ 输入：topic, source_desc, workDir（绝对路径）
│  │ 输出：raw-materials.json
│  │ 特征：IO 密集，上下文重（~7K tokens 搜索结果）
│  │ 隔离收益：★★★（IO 污染隔离）
│  │
├─ ⓐ 检查点：扫描结果确认（主线程读 JSON，展示摘要）
│
├─ Step 1.5 加载 core/ ────────→ 主线程读取（为后续子 agent 注入做准备）
│
├─ Step 2  decompose ───────────→ 主线程或子 agent B
│  │ 输入：raw-materials.json + core/architecture-decomposition.md 内容
│  │ 输出：decompositions.json
│  │ 特征：推理密集，上下文轻（~4.5K tokens）
│  │ 隔离收益：★
│  │
├─ Step 3  capability-extract ──→ 子 agent C
│  │ 输入：decompositions.json + raw-materials.json
│  │       + core/capability-graph.md 内容（注入 prompt）
│  │       + core/architecture-decomposition.md 内容（注入 prompt）
│  │ 输出：capability-graph.json
│  │ 特征：IO + 推理混合，上下文最重（~20K tokens）★热点
│  │ 隔离收益：★★★（双重热区隔离）
│  │
├─ Step 4  highground-identify ─→ 子 agent D
│  │ 输入：capability-graph.json + core/strategic-highground.md 内容
│  │ 输出：highgrounds.json（独立文件，不追加写入 capability-graph.json）
│  │ 特征：推理密集
│  │ 隔离收益：★★
│  │
├─ Step 5  evaluate ────────────→ 子 agent E
│  │ 输入：decompositions.json + capability-graph.json（Step 3 产出，无 highgrounds）
│  │       + raw-materials.json + core/scenario-matrix.md 内容
│  │ 输出：evaluations.json
│  │ 特征：推理密集
│  │ 隔离收益：★★
│  │
├─ ⓑ 检查点：评估结果确认（主线程读 JSON，展示摘要）
│
├─ Step 6  pool ────────────────→ 主线程（确定性写入，轻量）
│  │ 输入：capability-graph.json + highgrounds.json + evaluations.json
│  │ 合并：将 highgrounds.json 合并入 capability-graph.json
│  │ 输出：README.md + candidates.md + capabilities/README.md
│  │
└─ Step 7  save_state ──────────→ MCP 工具（L1）
```

### 3.2 子 Agent 接口规范

每个子 agent 遵循统一接口：

```
输入：
  - 文件路径（JSON/Markdown，由主线程通过 context 传入绝对路径）
  - 参数对象（task_type, workDir 等）
  - core/ 方法论内容（直接注入 prompt，不只是文件路径 — 保证 L3 加载契约）

输出：
  - 结构化文件（写入指定路径）
  - 执行摘要（stdout，≤200 字，供主线程展示/记录）

生命周期：
  - 启动 → 读取输入文件 → 执行 → 写入输出文件 → 退出
  - 不得修改输入文件
  - 不得调用其他子 agent

MCP 调用：
  - 通过 terminal 执行 mcporter call CLI（子 agent 继承 terminal 工具）
  - caller 字段必须传入阶段标识（如 "subagent/scan"）
  - MCP server 必须在主 agent session 中预启动
```

#### L3 加载契约的子 agent 保证机制

> 架构评审者关键发现：「传入文件路径」≠「加载到上下文」。子 agent 收到路径后可能不读取。

**解决方案**：主线程在 dispatch 子 agent 前，将 core/ 方法论的**完整内容**读取后拼入子 agent 的 task description。加载契约的执行主体从「子 agent 自觉读取」变为「主线程强制注入」。

```
主线程 dispatch 子 agent C 时的 task description：

  你是原子能力提取专家。

  ## 方法论（已加载）
  以下是 core/capability-graph.md 的完整内容，你必须遵循其中的规则：

  ---
  {core/capability-graph.md 的完整内容}
  ---

  以下是 core/architecture-decomposition.md 的完整内容：

  ---
  {core/architecture-decomposition.md 的完整内容}
  ---

  ## 任务
  读取 {decompositions.json 绝对路径} 和 {raw-materials.json 绝对路径}
  执行原子能力提取，输出到 {capability-graph.json 绝对路径}
```

### 3.3 数据流

```
raw-materials.json ──→ decompose ──→ decompositions.json
       │                                     │
       │                                     ↓
       └──────────→ capability-extract ←──────┘
                          │
                 capability-graph.json
                          │
           ┌──────────────┼──────────────┐
           ↓              ↓              ↓
    highground-id     evaluate      （后处理消费）
           │              │
    highgrounds.json  evaluations.json
    (独立文件)        (独立文件)
           │              │
           └──────┬───────┘
                  ↓
           pool（主线程合并）
```

> **关键变更**：Step 4 输出 `highgrounds.json`（独立文件），不追加写入 `capability-graph.json`。
> 原因：接口规范要求「不得修改输入文件」，追加写入违反此规范且存在半写入风险。
> 合并操作移至 Step 6（pool），由主线程在确定性环境中执行。

### 3.4 上下文预算对比（校准后）

| 指标 | 主线程串行（现状） | 子 agent 隔离后 |
|------|-------------------|----------------|
| 前处理主线程峰值 | ~70K-80K tokens | ≤6K tokens |
| Step 3 峰值（capability-extract） | ~20K（在主线程累积） | ~20K（子 agent C 内，完成后释放） |
| 后处理可用上下文（128K 窗口） | ~43K tokens（~33%） | ~117K tokens（~91%） |
| 后处理上下文增量 | — | +74K tokens（增加 2.7 倍） |

#### Token 消耗热区排名

| 排名 | 步骤 | 主线程增量 | 占比 | 隔离收益 |
|------|------|-----------|------|---------|
| #1 | capability-extract | 18K-24K | 30% | ★★★ 最大 |
| #2 | evaluate | 12K-16K | 18% | ★★ |
| #3 | highground-identify | 10K-13K | 15% | ★★ |
| #4 | scan | 9K-12K | 14% | ★★★ 大（IO 污染） |
| #5 | 加载 core/ | 8K | 11% | ★ |
| #6 | decompose | 4.5K-6.2K | 7% | ★ |

#### IO 耗时热区排名

| 排名 | 步骤 | 耗时 | 瓶颈 |
|------|------|------|------|
| #1 | scan | ~4min | web_search × 8 轮 |
| #2 | capability-extract | ~2min | MCP + 推理 |
| #3 | decompose / highground / evaluate | ~1min × 3 | 推理 |

---

## 4. 与 L3 加载契约的关系

L3 加载契约（`design/architecture-model.md` §3）定义了**每个 L3 任务必须加载哪个 core/ 方法论文档**。

子 agent 隔离架构下，加载契约的执行方式变化：

| 维度 | 当前（主线程） | 子 agent 隔离后 |
|------|--------------|----------------|
| 加载时机 | Step 1.5 统一预加载到主线程 | 主线程在 dispatch 时将内容注入子 agent prompt |
| 加载主体 | 主线程上下文 | 主线程强制注入（非子 agent 自觉读取） |
| 加载范围 | 4 个 core/ 全部加载 | 按需注入（每个子 agent 只接收对应的 core/） |
| 契约验证 | 无（依赖 agent 自觉） | 可观测性检查：子 agent 产出 JSON 的方法论特有字段 |

**优势**：子 agent 隔离 + 强制注入 = 「按需加载 + 保证执行」，比当前主线程模式更可靠。

---

## 5. MCP 调用日志（可观测性基础设施）

> 基于「前端埋点」思路实现，已落地。

### 5.1 实现

- `mcp-server/src/core/call-logger.ts` — 日志模块，单例模式
- `mcp-server/src/index.ts` — CallToolRequestSchema handler 中埋点

### 5.2 日志格式

写入 `{workDir}/.meta/mcp-calls.jsonl`，每行一个 JSON：

```json
{"ts":"2026-05-14T06:23:01Z","tool":"resolve_paths","caller":"pre/resolve","args_summary":"...","status":"ok","latency_ms":45}
{"ts":"2026-05-14T06:23:05Z","tool":"get_sources","caller":"subagent/cap-extract","args_summary":"...","status":"ok","latency_ms":230}
```

### 5.3 caller 命名规范

格式：`{phase}/{step}[-{detail}]`

| 模式 | caller 示例 |
|------|------------|
| 前处理主线程 | `pre/resolve`、`pre/scan`、`pre/cap-extract`、`pre/save-state` |
| 后处理 | `post/cap-research-A1`、`post/briefing-01`、`post/assemble-01` |
| 子 agent | `subagent/scan`、`subagent/cap-extract` |

### 5.4 日志分析用途

| 问题 | 分析方式 |
|------|---------|
| 子 agent MCP 可用性 | 过滤 `caller=subagent/*`，有记录即可用 |
| L3 加载契约审计 | 检查 `pre/cap-extract` 是否调用了 `get_sources` |
| 性能热点 | 按 `caller` 分组统计 `latency_ms` |
| 调用失败 | 过滤 `status=error` |

---

## 6. 改造范围

### 6.1 需要改动的文件

| 文件 | 改动内容 | 工作量 |
|------|---------|--------|
| `pre-process.md` | 编排模式从串行改为子 agent 编排 | 中 |
| `SKILL.md` | 触发词映射更新、子 agent 调用说明 | 小 |
| `processes/scan.md` | 明确输入/输出文件路径规范 | 小 |
| `processes/decompose.md` | 同上 | 小 |
| `processes/capability-extract.md` | 同上 + caller 字段 | 小 |
| `processes/highground-identify.md` | 同上 + 输出改为独立文件 | 中 |
| `processes/evaluate.md` | 同上 | 小 |

### 6.2 不需要改动的部分

- `core/` 方法论文档 — 内容不变，只是加载方式变化
- `mcp-server/` — L1/L2 工具和模板不受影响（call-logger 已落地）
- `design/architecture-model.md` — 四级模型和加载契约不变
- `plugins/` — 不变

### 6.3 依赖条件

| 依赖 | 状态 | 验证方式 |
|------|------|---------|
| 子 agent 文件读写权限 | ✅ 已确认 | Hermes delegate_task 共享文件系统，无 sandbox |
| 子 agent terminal 工具 | ✅ 已确认 | 子 agent 可通过 terminal 调用 mcporter CLI |
| 子 agent web_search | ❌ 不可用 | delegate_task 子 agent 无 web_search 工具（Hermes 当前限制） |
| 子 agent web_fetch 替代 | ✅ 可用 | 子 agent 可通过 terminal + curl 做 HTTP 请求 |
| MCP server 预启动 | ⚠️ 前提条件 | 主 agent session 中必须已启动 |

---

## 7. 错误处理策略

| 场景 | 处理 |
|------|------|
| 子 agent 超时 | 单步最大执行时间 5 分钟，超时后 kill 子 agent |
| 子 agent 产出 JSON 格式不合法 | 主线程读取后校验 schema，不合法则重试 1 次 |
| 子 agent 部分写入 | 子 agent 先写临时文件（.tmp），成功后 rename 为正式文件 |
| 子 agent 重试仍失败 | 中断并报告，删除半成品文件，恢复到上一步状态 |
| MCP 工具不可用 | 降级：主线程预取 resolve_paths/get_sources 结果，通过 context 传入 |

**重试规则**：最多重试 1 次（相同输入），第 2 次失败则中断。

---

## 8. 实施路径

### Phase 1：最小隔离（调整后）

**目标**：仅隔离 capability-extract（Step 3）

**调整原因**：Hermes delegate_task 子 agent 当前不支持 web_search 工具，scan 步骤依赖 web_search 做广域扫描，保留在主线程执行。

**收益**：
- 消除 ~20K tokens 主线程上下文占用（capability-extract 是 token 热区 #1，占比 30%）
- 双重热区隔离（唯一同时高 token + 高时间的步骤）
- scan 的搜索结果虽留在主线程，但 capability-extract 的推理+JSON 不再累积

**前提**：
1. decompose（Step 2）产出必须持久化为文件（否则子 agent C 读不到）
2. 主线程读取 core/ 内容注入子 agent prompt（L3 加载契约强制注入）

**改造清单**：
1. 改造 pre-process.md：Step 3 改为 delegate_task 调用，Step 1 保持主线程
2. 主线程读取 core/capability-graph.md + core/architecture-decomposition.md 内容，注入子 agent task description
3. 主线程在 dispatch 前调用 resolve_paths，将绝对路径传入子 agent
4. 子 agent 完成后，主线程读取产出 JSON 做校验（方法论特有字段是否存在）
5. URL 预查找部分：子 agent 通过 terminal + curl 替代 web_fetch 验证 URL 可达性

**预期效果**：主线程前处理上下文从 ~70K-80K 降至 ~50K-60K tokens

### Phase 2：全面隔离

- Step 2/4/5 也隔离到子 agent
- 主线程仅负责编排、检查点、pool

### Phase 3：并行优化

- Step 4（highground）和 Step 5（evaluate）可并行
  - Step 5 使用 Step 3 产出的 capability-graph.json（无 highgrounds）
  - highground_info 在 evaluate 中已是可选参数
  - 并行节省 ~1min，质量损失可忽略
- 多个命题的 capability-research（后处理）可并行

### 升级路径：scan 子 agent 隔离

> 当 Hermes delegate_task 支持 web_search 工具后，scan 可升级为子 agent 隔离。

**触发条件**：
- delegate_task 的 toolsets 参数中 `web` 或 `search` 包含 web_search 工具
- 验证方式：delegate 一个测试子 agent，检查工具列表是否包含 web_search

**升级步骤**：
1. pre-process.md 的 Step 1 从"主线程执行"改为"子 agent 隔离"
2. 主线程将 processes/scan.md 内容注入子 agent task description
3. 子 agent 工具集设为 `["terminal", "file", "web"]`

**升级收益**：
- 消除 ~7K tokens 搜索结果污染
- 总隔离收益从 ~20K 提升到 ~35K tokens
- 后处理可用上下文进一步增加

**工具增强与质量保证**：
- scan 子 agent 隔离后，可引入更深度的搜索工具而不影响主线程
- 多引擎聚合、学术搜索、实时爬虫等重型工具天然适配子 agent 隔离模式
- 工具质量提升 ↔ 上下文隔离形成正向循环：更好的工具 → 更多的搜索结果 → 更需要隔离

---

## 9. 验收标准

- [ ] Phase 1：capability-extract 子 agent 隔离后，主线程前处理上下文 ≤ 60K tokens（当前 ~70K-80K）
- [ ] 子 agent 产出的 capability-graph.json 包含方法论特有字段（dependency_graph, fanout 对象结构）
- [ ] 每步产出可独立审计（有文件持久化 + mcp-calls.jsonl 日志）
- [ ] 单步失败可从断点恢复（不需重做全流程）
- [ ] 子 agent 通过 terminal + curl 完成 URL 可达性验证
- [ ] 产出质量不低于当前（通过对比微信小程序实验数据验证）
- [ ] 升级路径就绪：scan.md 已标注子 agent 接口规范，web_search 可用后即可切换
