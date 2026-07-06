# Step 02: 依赖整理与命题分区

**目的**：将命题列表整理为依赖图（DAG），自动识别分区点，分批执行

**核心流程**：
1. 依赖关系确认（如有缺失则基于 capability_web 推断）
2. 构建 DAG（检测环、打断循环依赖）
3. 三层分区：连通分量 → 拓扑深度 → 社区发现（条件触发）
4. session 分配（核心命题优先）

**关键产出**：`partition-analysis.json` + `execution-plan.md`

---

## 文件引用

| 变量 | 文件 | 说明 |
|------|------|------|
| `{{schemas-partition}}` | `assets/02-partition/schemas.md` | 分区 JSON 的结构定义 |
| `{{requirement-web}}` | `{workDir}/.meta/requirement-web.json` | Step 01 产出，含命题列表 + 能力图谱雏形 |
| `{{pipeline-params}}` | `assets/common/pipeline-params.md` | 管线参数配置 |

## 输入

- `{{requirement-web}}` 中的 `propositions[]`（命题列表）
- `{{requirement-web}}` 中的 `dependencies[]`（命题间依赖关系，如已存在）
- `{{requirement-web}}` 中的 `capability_web`（能力图谱雏形，用于辅助判断依赖）

---

## 执行步骤

### 1. 依赖关系确认

读取 `{{requirement-web}}`：

**如果 `dependencies[]` 已存在**（头脑风暴收敛者已整理依赖）：
- 直接使用，跳到步骤 2

**如果 `dependencies[]` 不存在**：
- 基于 `propositions[]` 和 `capability_web`，为每对命题判断是否存在依赖
- 依赖类型：
  - `prerequisite`：A 是 B 的前置知识（必须先学 A 才能理解 B）
  - `enables`：A 的掌握使 B 更容易理解
  - `related`：A 和 B 有相关性但无严格先后
  - `extends`：B 是 A 的进阶变体
- 将依赖写入 `{{requirement-web}}` 的 `dependencies[]` 字段

### 2. 构建 DAG

从 `propositions[]` + `dependencies[]` 构建有向无环图：
- 节点 = 命题
- 边 = 依赖关系（`prerequisite` 和 `enables` 为有向边，`related` 为无向边）
- 检测环：如果存在环，断开 `related` 类型的边直到无环

### 3. 三层分区

#### 3.1 连通分量识别

- 将 DAG 拆分为连通分量
- 每个连通分量 = 一个候选 session
- 记录每个分量的节点数、label（基于命题名称的语义聚类）

#### 3.2 拓扑深度分层

对每个连通分量：
- 计算每个节点的 depth（最长依赖路径长度）
- 同 depth 的节点组成一个"层"（反链，可并行执行）
- 记录每层的节点数和是否可并行

#### 3.3 社区发现（条件触发）

**触发条件**：某个连通分量的节点数 > {{params.community-threshold}} 个（见 `{{pipeline-params}}`，经验值，可调整）

- 在该分量内运行 Leiden 算法
- 基于依赖边的权重和语义相似度聚类
- 每个社区 = 一个 scan 批次的候选分组
- 如果社区数 ≤ 1，跳过此步

### 4. session 分配

**分配规则**：
1. 包含最多 `core` 角色命题的连通分量 → 当前 session（S1）
2. 其余分量 → 排期到下次 session（S2, S3, ...）
3. 如果当前 session 的命题数 > 12，按社区进一步拆分

**执行顺序**：按拓扑 depth 从低到高，同 depth 层内按社区分组并行

### 5. 生成产物

#### 5.1 partition-analysis.json

按 `{{schemas-partition}}` 的结构生成，包含：
- `dag`：完整 DAG 数据（节点 + 边 + depth + component_id）
- `components`：连通分量 + depth 分层 + 社区
- `current_session`：当前 session 的命题列表 + scan 批次
- `deferred_sessions`：排期的 session 列表 + 恢复指令
- `partition_stats`：分区统计和决策依据

#### 5.2 execution-plan.md

面向用户的执行计划，包含：
- 本次执行的命题列表（序号、名称、角色、依赖、搜索密度）
- 排期到下次的命题（名称、排期原因、恢复指令）

---

## 检查点

⚠️ **检查点 Barrier 2**：写入 `{workDir}/.meta/checkpoints/barrier-2.md` 后停住等待用户确认。

展示内容：
- 分区结果摘要（几个 session，每个 session 几个命题）
- 本次执行的命题列表
- 排期的命题列表

用户可以：
- 确认分区方案，进入 scan
- 调整："把 P14 加回本次执行"
- 重新分区："按另一种方式切"

---

## expected_files

| 文件 | 验证条件 |
|------|---------|
| `{workDir}/.meta/partition-analysis.json` | JSON 有效，包含 current_session |
| `{workDir}/execution-plan.md` | 文件存在且非空 |
| `{workDir}/.meta/checkpoints/barrier-2.md` | 文件存在 |
