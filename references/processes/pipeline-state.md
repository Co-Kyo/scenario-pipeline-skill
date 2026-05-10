# Process: 管线状态管理 (pipeline-state)

> 管线运行过程中的状态持久化模块。
> **不是独立步骤**，而是被前处理/后处理编排文件在各检查点调用。

---

## 存储路径

```
.meta/pipeline-state.json
```

---

## 操作

### save(checkpoint, context)

**调用时机**：每个检查点（ⓒⓔⓓⓕⓖ）前、阶段内 agent 完成后

**行为**：读取现有状态文件（如有）→ 合并更新 → 写入

**参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `checkpoint` | string | 当前检查点标识，如 `pre-process-done`、`ⓔ`、`ⓓ`、`ⓕ`、`ⓖ` |
| `context` | object | 当前阶段的进度数据，结构因阶段而异（见下方 schema） |

**调用伪代码**：

```
// 检查点调用示例
save("ⓔ", {
  "capability-research": {
    "total": 20,
    "completed": ["A1", "A6", "A8"],
    "failed": ["A19"],
    "retried": {"A19": 1}
  }
})

// agent 完成后增量调用示例
save("agent-done", {
  "stage": "capability-research",
  "agent_id": "A1",
  "status": "completed"
})
```

---

### restore()

**调用时机**：用户触发"继续"/"恢复"指令时

**行为**：读取 `.meta/pipeline-state.json` → 返回恢复指令

**返回值**：

```json
{
  "resume_from": "阶段一步骤1",
  "current_stage": "capability-research",
  "completed_items": ["A1", "A6", "A8"],
  "pending_items": ["A2", "A3", "A7", "A9", "A10", "..."],
  "failed_items": ["A19"],
  "interrupt_type": "checkpoint"
}
```

**调用伪代码**：

```
state = restore()
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
      "artifacts": [".meta/capability-graph.json", ".meta/candidates.md"]
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
