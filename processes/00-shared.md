# 共享约定

> 本文档定义跨阶段的共享规则：子 agent 调度、检查点协议、状态管理、增量复用。
> 执行具体步骤前不需要读本文档，在进入后处理（阶段⑦起）前读取即可。

---

## 子 agent 调度

### 调度方式

使用当前平台的子 agent 调度原语（`sessions_spawn` / `delegate_task` / 等价工具）。

### task 组装规则

每个子 agent 的 task 由三部分拼接：

```
1. 角色声明（一句话）
2. 执行指令（从对应 processes 文件提取"执行步骤"+"输出示例"部分）
3. 变量替换（workDir, capability_id, seq 等具体值）
```

**示例（能力研究子 agent — 单能力场景）：**

```
你是「浏览器渲染管线」的深度研究员。

⚠️ 你必须用 write 工具将文件写入磁盘，不要只输出到对话中。

## 任务
研究原子能力「浏览器渲染管线」（ID: A1），产出两个文件：
1. 能力知识库主文件 → workflow/research/capabilities/A1-浏览器渲染管线.md
2. 结构化摘要 JSON → workflow/research/.meta/summaries/A1-浏览器渲染管线.json

## 能力信息
- 技术层: 浏览器层
- 描述: 从 HTML/CSS/JS 到像素上屏的完整渲染流程
- 依赖能力: 无
- 扇出度: 2/2（100%）

## 信源
- [T0] web.dev: Rendering Performance — https://web.dev/articles/rendering-performance
- [T0] MDN: Critical Rendering Path — https://developer.mozilla.org/en-US/docs/Web/Performance/Critical_rendering_path

## 执行步骤

### Step 1: 信源获取
1. 优先使用上述预查找信源
2. 如全部不可达，按 meta/sources.md 的 T0 域名列表逐个搜索补充
3. 禁止凭记忆生成，必须 web_fetch 验证内容

### Step 2: 内容研究
按以下结构产出能力主文件：
- 核心机制（≥500 字）
- 工程瓶颈（每个包含：触发条件、表现症状、解决方案）
- 调试工具
- 典型权衡（2-3 种技术路线对比）
- 最小验证实验（可运行代码）
- 参考资料（按 Tier 排序）

### Step 3: 结构化摘要
产出 JSON，结构参见 meta/output-contracts.md §7。

### Step 4: 保存文件
用 write 工具写入上述两个路径。

## 完成后
输出：`Agent-A1 完成：已研究「浏览器渲染管线」（2 个文件已写入磁盘）`
```

> **注意**：以上为最小粒度示例。实际 task 按各步骤的 task 模板组装，一个 agent 可能研究多个能力（见 Step ⑦ 域分组方案）。task 中不引用任何外部文件路径（不出现"读取 xxx.md"），所有必要信息已内联——除非该步骤明确要求 agent 读取前置步骤的产出文件（此时 task 中必须给出具体路径 + 文件不存在时的降级动作）。

### 并发池调度

**动作定义**：固定 W=4 个并发槽位，任务完成释放槽位，新任务补位。计数单位是 Task Group（不是 agent 数）。

**两种模式**：

| 模式 | 适用步骤 | 入队条件 | 说明 |
|------|---------|---------|------|
| DAG 调度 | Step ⑦ | 前置子组全部 completed | 子组间有跨依赖，必须按拓扑批次执行 |
| 简单窗口 | Step ⑧⑨⑩ | 有空位就进 | 任务之间完全独立，先完成先补位 |

**完成判断**：agent 的 expected_files 全部存在 = completed。

**跟踪方式**：
- 预计耗时 < 5min → `sessions_yield` 直接等待（即时响应）
- 预计耗时 ≥ 5min → Cron 异步跟踪（主线程释放，isolated session 执行检查，每 2min 一轮）

**Cron 跟踪核心指令**：spawn 第一批 agent 后，写入 tracker 状态文件，创建 cron job 定期检查：文件存在 → 标记完成 → 补位 spawn → 全部完成后自删除。

**Step ⑨ 特殊处理**：1 个 Task Group = 1 个命题 = 2 个 agent（Markdown + Experiment），窗口 W=4 命题 = 最多 8 个 agent 并行。

---

## 检查点协议

每个检查点**必须**依次执行三步：

1. **展示摘要**：当前阶段的关键产物统计和质量指标
2. **给出指引**：推荐最可能的下一步操作（带理由）
3. **等待输入**：暂停执行，等用户指令

### 检查点总览

| 检查点 | 位置 | 核心产物 | 介入价值 |
|--------|------|---------|---------|
| ⓐ | 扫描完成后 | raw-materials.json | 确认信源质量 |
| ⓑ | 评估完成后 | evaluations.json | 确认命题优先级 |
| ⓒ | 后处理启动前 | 执行计划 | 确认范围、调整参数 |
| ⓔ | 能力研究完成后 | capability 文件 + summary | 审查研究质量 |
| ⓓ | Briefing 组装完成后 | briefing 文件 | 审查素材提取完整性 |
| ⓕ | 命题组装完成后 | 命题目录文件 | 审查组装质量 |
| ⓖ | 学习阶梯完成后 | learning-ladder.md | 确认最终产出 |

### 跳过条件

- `--batch=pending` 模式：自动跳过所有检查点
- 用户输入"全部确认"：跳过后续所有检查点

---

## 副作用清理协议

每个检查点通过时，**必须**清理前一阶段留下的任务副作用。未清理的副作用会导致：
- Zombie cron job 持续消耗 token
- Tracker 文件残留造成误判

### 清理清单（按检查点）

| 检查点 | 前一阶段 | 需清理的副作用 | 清理动作 |
|--------|---------|--------------|---------|
| ⓐ 扫描完成 | — | 无 | — |
| ⓑ 评估完成 | — | 无 | — |
| ⓒ 后处理启动前 | — | 无 | — |
| ⓔ 能力研究完成 | Step ⑦ | cron job / tracker / zombie agents | 见下方 §并发池清理 |
| ⓓ Briefing 完成 | Step ⑧ | cron job / zombie agents | 见下方 §并发池清理 |
| ⓕ 命题组装完成 | Step ⑨ | cron job | 见下方 §通用清理 |
| ⓖ 学习阶梯完成 | Step ⑩ | 所有残留 | 见下方 §终态清理 |

### 并发池清理（检查点 ⓔ / ⓓ）

Step ⑦ / Step ⑧ 使用的并发池调度（cron 跟踪），通过检查点时必须清理：

```
1. 清理 Cron Job
   - cron(action="list") → 找到 name 包含 "window-tracker" 的 job
   - cron(action="remove", jobId=xxx) → 逐个删除
   - 验证：cron(action="list") 确认无残留

2. 归档 Tracker 文件
   - 读取 {workDir}/.meta/agent-tracker.json
   - 重命名为 {workDir}/.meta/agent-tracker-archive-{timestamp}.json
   - 或直接删除（归档优先，便于调试）

3. 清理 Zombie Agents
   - subagents(action="list") → 检查是否有仍 running 的 agent
   - subagents(action="kill", target=xxx) → 杀死超时未退出的 agent
   - 验证：subagents(action="list") 确认无残留

4. 验证产出完整性
   - 检查所有 expected_files 是否存在
   - 缺失文件 → 标记为 failed，记录到 pipeline-state.json
```

### 通用清理（检查点 ⓕ）

```
1. cron(action="list") → 删除所有 name 包含当前 workDir 的 job
2. subagents(action="list") → 杀死所有残留 agent
```

### 终态清理（检查点 ⓖ）

管线完成时，彻底清理所有运行时痕迹：

```
1. Cron 全量清理
   - cron(action="list") → 删除所有与当前管线相关的 job
   - 匹配规则：name 包含 workDir 路径或管线主题关键词

2. Agent 全量清理
   - subagents(action="list") → 确认无残留
   - 有则 kill

3. Tracker 归档
   - agent-tracker.json → archive 或删除

4. 管线状态终态
   - pipeline-state.json → status: "completed"
   - 所有 stage → status: "completed"
```

### 清理失败处理

| 场景 | 处理 |
|------|------|
| cron job 删除失败 | 记录 jobId，提示用户手动删除 |
| agent kill 失败 | 记录 session_key，提示用户手动终止 |
| 清理整体失败 | **不阻塞管线继续**，记录 warning 到 pipeline-state.json |

### 清理原则

1. **幂等**：清理动作可重复执行，不产生新副作用
2. **非阻塞**：清理失败不阻塞管线推进，记录 warning 即可
3. **可审计**：所有清理动作记录到 pipeline-state.json 的 `cleanup_log` 字段
4. **先清理再推进**：检查点通过前必须完成清理，顺序不可颠倒

---

## 状态管理

### 状态文件

路径：`{workDir}/.meta/pipeline-state.json`

结构参见 `meta/output-contracts.md` §6。

### 写入时机

- 每个检查点通过后：更新 `last_checkpoint` + `checkpoints_passed`
- 每个子 agent 完成后：更新对应 stage 的 completed/failed 列表
- 每个阶段完成后：更新 `current_phase` + `current_step`

### 恢复流程

用户说"继续"/"恢复"时：

```
1. 读取 {workDir}/.meta/pipeline-state.json
2. 根据 last_checkpoint 确定恢复点
3. 增量检查已有产出文件，跳过已完成项
4. 从断点继续执行
```

---

## 增量复用

| 检查项 | 条件 | 行为 |
|--------|------|------|
| 能力主文件已存在 | `capabilities/{id}-{name}.md` 存在 | 跳过该能力研究 |
| 能力摘要已存在 | `.meta/summaries/{id}-{name}.json` 存在 | 跳过该能力摘要生成 |
| Briefing 已存在 | `.meta/briefings/{seq}-{name}.md` 存在 | 跳过该 Briefing |
| 命题文件已存在 | `{seq}-{name}/overview.md` 存在 | 跳过该命题组装 |
| 学习阶梯已存在 | `{seq}-{name}/learning-ladder.md` 存在 | 跳过该阶梯生成 |

---

## 内容比例约束（命题组装通用）

- 通用高地内容（框架无关）≥ 70%
- 特化内容（框架相关）≤ 30%
- 开篇（10-15%）从限定词切入建立共鸣
- 主体（70-80%）讲通用原理
- 收尾（10-15%）回到限定词给落地方案
