# Process: 管线状态管理 (pipeline-state)

> 管线运行过程中的状态持久化模块。
> **不是独立步骤**，而是被前处理/后处理编排文件在各检查点调用。

---

## MCP 集成

**状态管理已迁移到 MCP 服务器**。主 agent 通过调用 MCP 工具实现状态持久化，而不是自己实现文件读写逻辑。

**MCP 工具**：
- `save_state`：保存管线状态
- `restore_state`：恢复管线状态

**优势**：
- 降低主线程上下文压力
- 稳定控制管道特性
- 可独立测试

**配置**：通过 mcporter 注册 MCP server（见 `mcp-server/README.md`）。

---

## 调用约定

所有 MCP 工具通过 `mcporter call` 调用，支持动态 `workDir` 参数指定产出目录：

```bash
mcporter call scenario-pipeline.<tool> [params] --args '{"workDir":"<产出目录>","caller":"<调用者标识>"}'
```

**参数优先级**：`workDir` 参数 > `WORK_DIR` 环境变量 > `process.cwd()`

### caller 调用者标识规范

> caller 字段用于 MCP 调用日志（`.meta/mcp-calls.jsonl`）的埋点追踪，标识调用来源的管线阶段。

**命名格式**：`{phase}/{step}[-{detail}]`

**前处理阶段**：

| 阶段 | caller 值 |
|------|----------|
| 编排层（pre-process.md） | `pre/resolve`、`pre/save-state` |
| 广域扫描 | `pre/scan` |
| 架构分词 | `pre/decompose` |
| 原子能力提取 | `pre/cap-extract` |
| 战略高地识别 | `pre/highground` |
| 四维评估 | `pre/evaluate` |
| 入池归档 | `pre/pool` |

**后处理阶段**：

| 阶段 | caller 值 |
|------|----------|
| 能力研究（按能力 ID） | `post/cap-research-{id}`（如 `post/cap-research-A1`） |
| Briefing 组装 | `post/briefing-{seq}` |
| 命题组装 | `post/assemble-{seq}` |
| 学习阶梯 | `post/ladder-{seq}` |

**子 agent 模式**（Phase 1+）：

| 子 agent | caller 值 |
|----------|----------|
| scan 子 agent | `subagent/scan` |
| capability-extract 子 agent | `subagent/cap-extract` |

**典型调用**：
```bash
# 写状态到产出目录
mcporter call scenario-pipeline.save_state checkpoint="ⓔ" context='{}' --args '{"workDir":"<产出目录>"}'

# 从产出目录恢复状态
mcporter call scenario-pipeline.restore_state --args '{"workDir":"<产出目录>"}'

# 从 skill 目录读信源配置（已弃用）
# 新信源管理使用以下方式：
# mcporter call scenario-pipeline.get_t0_sources
# mcporter call scenario-pipeline.classify_sources --args '{"domains":["..."]}'
# mcporter call scenario-pipeline.get_source_standard
```

> ⚠️ `workDir` 必须指向管线产出目录（即 `{{paths.workDir}}`），而非 skill 目录。
> `skillDir` 必须指向 skill 根目录（含 `plugins/` 子目录）。

---

## 存储路径

```
{{paths.meta_pipeline_state}}
```

---

## 操作

### save_state(checkpoint, context, workDir?)

**调用时机**：每个检查点（ⓒⓔⓓⓕⓖ）前、阶段内 agent 完成后

**MCP 工具**：`save_state`

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `checkpoint` | string | ✅ | 当前检查点标识，如 `pre-process-done`、`ⓔ`、`ⓓ`、`ⓕ`、`ⓖ` |
| `context` | object | ✅ | 当前阶段的进度数据，结构因阶段而异（见下方 schema） |
| `workDir` | string | ❌ | 产出目录，默认读 `WORK_DIR` 环境变量 |

**调用示例**：

```bash
mcporter call scenario-pipeline.save_state checkpoint="ⓔ" context='{"capability-research":{"total":20,"completed":["A1","A6","A8"],"failed":["A19"],"retried":{"A19":1}}}' --args '{"workDir":"<产出目录>"}'
```

---

### restore_state(workDir?)

**调用时机**：用户触发"继续"/"恢复"指令时

**MCP 工具**：`restore_state`

**参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `workDir` | string | ❌ | 产出目录，默认读 `WORK_DIR` 环境变量 |

**返回值**：

```json
{
  "status": "running",
  "resume_from": "阶段一步骤1",
  "current_stage": "capability-research",
  "completed_items": ["A1", "A6", "A8"],
  "pending_items": ["A2", "A3", "A7"],
  "failed_items": ["A19"],
  "interrupt_type": "checkpoint",
  "last_update": "2026-05-10T09:30:00.000Z"
}
```

**调用伪代码**：

```
state = restore_state(workDir=<产出目录>)
if state.status == "completed":
  告知用户"已完成，无需恢复"
elif state.status == "interrupted":
  从 state.resume_from 阶段恢复
  跳过 state.completed_items
  重跑 state.failed_items（可选）
```

---

## 状态文件 Schema

```json
{
  "pipeline_version": "1.0",
  "started_at": "2026-05-09T22:38:00+08:00",
  "last_update": "2026-05-09T23:02:00+08:00",
  "status": "running | completed | interrupted",
  "interrupt_type": "checkpoint | stage | emergency",
  
  "stages": {
    "pre-process": {
      "status": "completed",
      "completed_at": "2026-05-09T22:45:00+08:00",
      "artifacts": ["{{paths.meta_capability_graph}}", "{{paths.meta_candidates}}"]
    },
    "capability-research": {
      "status": "running | completed | pending",
      "total": 20,
      "completed": ["A1", "A6"],
      "running": ["A8"],
      "pending": ["A2", "A3"],
      "failed": [],
      "retried": {}
    },
    "briefing-assemble": {
      "status": "pending",
      "completed": [],
      "pending": []
    },
    "assembly": {
      "status": "pending",
      "completed": [],
      "pending": []
    },
    "learning-ladder": {
      "status": "pending",
      "completed": [],
      "pending": []
    }
  },
  
  "checkpoints_passed": ["ⓒ", "ⓔ"],
  "last_checkpoint": "ⓔ"
}
```

**差异化处理**：每个 stage 内部字段自解释，save 时只更新当前 stage 的字段，其他 stage 不动。

---

## 调用点汇总

| 调用点 | 时机 | checkpoint 值 | 记录内容 |
|--------|------|---------------|---------|
| 前处理完成 | Step 6 入池归档后 | `pre-process-done` | stages.pre-process.status=completed, artifacts |
| ⓔ 检查点前 | 阶段一步骤1完成后 | `ⓔ` | stages.capability-research 全量快照 |
| agent 完成后 | 每个能力研究 agent 完成时 | `agent-done` | 增量更新 completed/failed 列表 |
| ⓓ 检查点前 | 阶段一步骤2完成后 | `ⓓ` | stages.briefing-assemble 全量快照 |
| ⓕ 检查点前 | 阶段二完成后 | `ⓕ` | stages.assembly 全量快照 |
| ⓖ 检查点前 | 阶段三完成后 | `ⓖ` | stages.learning-ladder 全量快照, status=completed |

---

## 依赖

- 被 `references/pre-process.md` 调用（前处理完成后）
- 被 `references/post-process.md` 调用（后处理各检查点）
- 被 `SKILL.md` 的"继续/恢复"触发词调用
