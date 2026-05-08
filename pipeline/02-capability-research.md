# 后处理·阶段一步骤1：能力研究

> ⚠️ **架构观测文档** — 不是 skill 执行配置
> 执行真相：`references/post-process.md §阶段一步骤1`、`references/processes/capability-research.md`

> 触发：`研究：<场景描述>` / `deep research：<场景描述>`（后处理启动后自动进入）
> 执行者：滑动窗口并行 spawn（每 agent 1 个能力文件，窗口大小默认4）

---

## 输入

| 输入 | 来源 | 路径 | 说明 |
|------|------|------|------|
| 原子能力图谱 | 前处理 | `.meta/capability-graph.json` | 能力列表 + 依赖关系 + 战略高地 |
| 命题列表 | 前处理 | `workflow/research/README.md` 或 `.meta/candidates.md` | 用于筛选哪些能力需要研究 |
| T1/T2 URL | 主 agent 预查找 | 传入 agent task | 官方文档 + 技术博客 |

## 输出

| 输出 | 路径 | 说明 |
|------|------|------|
| 能力知识库 | `capabilities/<id>-<name>.md` | 人类阅读的完整知识库 |
| 结构化摘要 | `.meta/summaries/<id>-<name>.json` | 机器消费的 JSON（双写） |

## 涉及文件

### Skill 内部文件

| 文件 | 角色 |
|------|------|
| `references/post-process.md` | 编排 |
| `references/processes/capability-research.md` | agent 执行指令模板 |
| `plugins/capability-research-mode.md` | 必须：材料块格式规范 |
| `plugins/source-registry.md` | 必须：信源白名单（fallback 搜索） |
| `core/capability-graph.md` | 能力定义参考 |

### 产物文件（读取）

| 文件 | 用途 |
|------|------|
| `.meta/capability-graph.json` | 获取能力列表 + T1/T2 URL |
| `workflow/research/README.md` | 获取命题列表（筛选能力） |
| `capabilities/` | 增量检查：已有 → 跳过 |

### 产物文件（写入）

| 文件 | 说明 |
|------|------|
| `capabilities/<id>-<name>.md` | 主文件（人类阅读） |
| `.meta/summaries/<id>-<name>.json` | 结构化摘要（机器消费） |

---

## 执行逻辑

```
1. 读取 capability-graph.json，获取原子能力列表
2. 筛选：覆盖待处理命题的能力（或扇出度 ≥ 30% 的能力）
3. 增量检查：capabilities/ 中已有 → 跳过，缺失 → 研究
4. 为每个能力预查找 T1/T2 URL
5. 按滑动窗口并行 spawn（窗口=4，每 agent 1 个能力）
   task = capability-research.md 模板 + 能力 ID + T1/T2 URL
   每个 agent 双写：
     → capabilities/<id>-<name>.md（主文件）
     → .meta/summaries/<id>-<name>.json（摘要）
6. ⛔ 全部完成后才能进入阶段一步骤2 Briefing 组装
```

## 信源获取四级优先级

```
① JSON 中 verified=true 的 T1 → 直接 web_fetch
② JSON 中 verified=true 的 T2 → 补充 web_fetch
③ t1_missing=true → fallback 到 source-registry 白名单搜索
④ 搜索无结果 → 标记信源不足，不编造
```

## summary.json 字段

```json
{
  "id", "name", "tech_layer", "fanout", "coupling", "strategic_value",
  "mechanism_summary",   // → overview / learning-ladder 用
  "bottlenecks",         // → edge-cases / learning-ladder 用（含 category/priority/版本相关字段）
  "tradeoffs",           // → trade-offs / learning-ladder 用
  "experiment_code",     // → experiment / learning-ladder 用
  "references"           // → references / learning-ladder 用
}
```

---

## 上下文加载

| 触发条件 | 必须加载 |
|---------|---------|
| 能力研究阶段 | plugins/capability-research-mode.md + processes/capability-research.md |

