# 头脑风暴调度细节

> Step 01 维度 Agent 的调度参数、超时检查、降级策略的详细定义。

---

## 维度 Agent 调度参数

同时 spawn 4 个 Agent，每个 Agent 的 label 和预期产出：

| label | 维度 | 预期产出 |
|-------|------|---------|
| `brainstorm-scenario` | 场景 | 包含 `dimension: "scenario"` 的 JSON |
| `brainstorm-technical` | 技术 | 包含 `dimension: "technical"` 的 JSON |
| `brainstorm-learning` | 学习 | 包含 `dimension: "learning"` 的 JSON |
| `brainstorm-constraint` | 约束 | 包含 `dimension: "constraint"` 的 JSON |

每个 Agent 的 task 内联全部必要信息（用户指令 + 约束参数 + 年限颗粒度规则 + 维度任务定义 + **共享层次骨架** + 文件写入路径），不读取任何外部文件。其中 `{workDir}` 和骨架内容在组装 task 时从 `{{anchors}}` 提取替换。

---

## 轮询参数

本步骤采用「简单窗口」调度模式（4 个任务互相独立）。

| 参数 | 值 |
|------|---|
| W | 4（维度 Agent 数量固定为 4，一次性全部 spawn） |
| 超时 | 3 分钟 |
| 槽位替换 | ❌ 无（一次性填满 4 个，不补位） |
| label | `brainstorm-scenario`, `brainstorm-technical`, `brainstorm-learning`, `brainstorm-constraint` |
| expected_files | `{workDir}/.meta/brainstorm/{dimension}.json`（dimension = scenario/technical/learning/constraint） |

**特殊**：4 个维度 Agent 一次性全部 spawn，不做分批。任何一个结束不补位，等全部结束后进入收敛者阶段。

---

## 完成判定

每个 agent 完成事件到达后，**立刻**执行以下三步校验（详见 `{{protocol-scheduling}}` §即时文件校验），不等同批其他 agent 完成。

- **completed**：三步校验全通过（文件存在 + JSON 合法 + 含 `dimension` 字段且 entries 非空）
- **pending-retry**：任一校验失败 → 立即补发（不等其他 agent）
- **failed**：Agent 返回错误 / 补发仍失败
- **timeout**：单 Agent 运行超过 3 分钟（头脑风暴的维度 Agent 体量小，3 分钟足够；不走 15 分钟的通用超时）

---

## 超时后文件检查（必须执行）

Agent 超时后，**禁止直接丢弃该维度**，必须先执行以下检查：

1. kill 超时的 agent
2. 检查 `{workDir}/.meta/brainstorm/{dimension}.json` 是否存在于磁盘
3. 文件存在且通过校验（合法 JSON + 含 `dimension` 字段 + entries 非空）→ **保留该维度**，标记为 completed
4. 文件不存在或校验不通过 → **丢弃该文件**，标记该维度为 pending-retry

**关键原则**：超时 ≠ 产出无效。Agent 可能在超时前已将完整结果写入磁盘。

---

## 降级策略

| 情况 | 处理 |
|------|------|
| 有维度标为 pending-retry | 补发 agent（原样重新 spawn，同一 task），补发仍超时则标为 missing |
| 1 个维度 missing | 标记 missing，进入 Barrier 检查（**禁止自动进入收敛者**） |
| 2 个维度 missing | 标记 missing，进入 Barrier 检查 |
| 3+ 个维度 missing | 标记 missing，进入 Barrier 检查（降级为原始指令扫描） |

**补发规则**：每个维度最多补发 1 次。补发的 agent 使用与原始完全相同的 task，不做任何调整。
**补发时机**：每个维度完成事件到达后立即校验，不通过则立即补发；所有 4 个维度（含补发）均结束后，**进入 Barrier 检查**（而非直接进入收敛者）。

---

## 等待期间行为

轮询期间**不做其他工作**（头脑风暴是前置阶段，没有可并行的后台任务）。每次轮询间隔 15 秒，不做 busy-wait。
