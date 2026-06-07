# Scenario Pipeline Orchestrator Agent 设计文档

> **目标**：将 scenario-pipeline-skill 封装为一个可独立部署、可调度的管线编排 Agent。
> **原则**：零侵入——不修改 skill 现有的 processes/core/meta/plugins 文件，仅在上层添加编排层。

---

## 一、Agent 定位

```
用户 ──一句话指令──→ Pipeline Orchestrator Agent ──分步编排──→ 最终产物（4层）
                         │
                         ├── 读 processes/*.md（分步加载，严格隔离）
                         ├── Spawn 子 agent（最多 10 个并发）
                         ├── 管理 8 个检查点（barrier-0 ~ barrier-7）
                         └── 写 pipeline-state.json（断点恢复）
```

**Orchestrator 不生产内容，只调度生产。** 它本身不写任何研究产出文件，所有内容由子 agent 写入。

---

## 二、状态机

### 2.1 管道阶段

```
IDLE → INIT → BRAINSTORM → PARTITION → PREPROCESS → POSTPROCESS → DONE
                 │                              │               │
                 ⓩ                              ⓐⓑ             ⓒⓓⓕⓖ
```

### 2.2 状态文件：pipeline-state.json

路径：`{workDir}/.meta/pipeline-state.json`

```json
{
  "pipeline_id": "pp-20260607-001",
  "work_dir": "/path/to/output",
  "status": "preprocessing",
  "current_step": "02-scan",
  "phase": "phase_a",
  "last_checkpoint": "barrier-1",
  "interrupt_type": null,
  "params": {
    "target_level": "L2",
    "platform": "web",
    "depth": "normal",
    "no_experiment": false,
    "batch": null
  },
  "stats": {
    "total_propositions": 8,
    "total_capabilities": 12,
    "steps_completed": ["00", "01"],
    "sub_agents_spawned": 8,
    "sub_agents_completed": 7,
    "sub_agents_failed": 1
  },
  "resume": {
    "can_resume": true,
    "resume_from": "02-scan.phase_a",
    "cleanup_needed": []
  }
}
```

### 2.3 断点恢复逻辑

```
读取 pipeline-state.json
  ├── status == "done" → 展示已有产物，询问是否重新开始
  ├── interrupt_type == "emergency" → 扫描半成品 → 用户决定丢弃/保留/重跑
  ├── status == "idle" → 从头开始
  └── 其他 → 从 resume.resume_from 恢复
```

---

## 三、分步执行引擎

### 3.1 核心执行循环

```
execute_step(step_id, step_file):
  1. LOAD: 读 processes/{step}.md（仅当前步骤）
  2. LOAD: 读前置条件中声明的依赖文件（严格按清单）
  3. CHECK: 上下文隔离验证（禁止跨步骤加载 processes）
  4. CHECK: 增量复用检查（已存在的产出跳过）
  5. PLAN: 确定需要执行的任务队列
  6. SPAWN: 启动子 agent（如有）
  7. MONITOR: 轮询子 agent 完成状态
  8. VERIFY: 验证产出文件完整性
  9. RETRY: 失败任务重试一次
  10. WRITE: 写入 checkpoint 记录 + 更新 pipeline-state.json
  11. PAUSE: 非 batch 模式等待用户确认
```

### 3.2 上下文隔离规则

**每次步骤切换必须完全重置上下文：**

| 操作 | 规则 |
|------|------|
| 加载 processes 文件 | 仅当前步骤，禁止预加载后续步骤 |
| 加载依赖文件 | 严格按"前置条件"清单，不加载额外文件 |
| output-contracts.md | 每步只读对应的 §N 节 |
| 步骤完成后 | 不保留上一步的 processes 引用到下一步 |

**违规监控**：Orchestrator 在每步开始时打印隔离检查日志：
```
[隔离检查] 当前=02-scan | 已加载=[core/capability-graph.md, meta/output-contracts.md§2, ...]
[隔离检查] ✅ 无跨步骤加载 processes 文件
```

### 3.3 步骤间的数据交接

步骤之间不共享上下文，仅通过**文件系统**传递数据：

```
Step ⓪ → requirement-web.json ──→ Step ① 定向输入
Step ① → .raw-materials/ ──────→ Step ② 素材消费
Step ② → capability-graph.json ──→ Step ③ 评估输入
Step ③ → evaluations.json ───────→ 后处理全流程
```

---

## 四、子 Agent 调度器

### 4.1 调度模式总览

| 步骤 | 模式 | Task Group 定义 | 并发策略 | 超时 | 降级 |
|------|------|----------------|---------|------|------|
| ⓪ 维度Agent | 批量并行 | 1维度=1agent | 4个同时启动 | 3min | 1个缺失可继续 |
| ⓪ 收敛者 | 串行 | 1agent | 等待所有维度 | 5min | 取最完整维度报告 |
| ① scan·A | 滚动窗口 | 1批次=1agent | W=5, 完成补位 | 3min | 缺失标记degraded |
| ① scan·B | 滚动窗口 | 1批URL=1agent | W=5, 完成补位 | 5min | 缺失标记degraded |
| ④ 能力研究 | 拓扑分批 | 1子组=1agent(≤5能力) | 依赖拓扑顺序 | 5min | 缺失标记degraded |
| ⑤ Briefing | 滚动窗口 | 1命题=1agent | W=5, 完成补位 | 5min | 缺失标注"缺失" |
| ⑥ 命题组装 | 滚动窗口 | 1命题=2agent | W=5命题, 完成补位 | 8min | 部分完成标记partial |
| ⑦ 学习阶梯 | 滚动窗口 | 1命题=1agent | W=5, 完成补位 | 5min | 缺失重跑 |

### 4.2 滚动窗口调度器

```
调度循环（滚动窗口模式）：

  queue = 待处理任务列表
  active = []  // 最多 W 个

  // 初始填充
  for task in queue[:W]:
      active.append(spawn(task))

  // 主循环
  while active or queue:
      for agent in active:
          status = poll(agent)
          if status == 'completed':
              verify_files(agent.expected_files)
              active.remove(agent)
              if queue:
                  active.append(spawn(queue.pop(0)))
          elif status == 'timeout':
              kill(agent)
              retry(agent)  // 重试一次
              if retry_failed:
                  mark_degraded(agent.task_id)
              active.remove(agent)
              if queue:
                  active.append(spawn(queue.pop(0)))

      sleep(15)  // 轮询间隔
```

### 4.3 Task 模板组装规则

每个子 agent 的 task 由三部分拼接：

```
┌─────────────────────────────┐
│ 1. 角色声明（固定文本）       │  ← 来自 processes 文件
│ 2. 变量注入块                │  ← Orchestrator 动态填充
│    - {workDir}               │
│    - {proposition_id}        │
│    - {capability_ids}        │
│    - {qualifier}             │
│    - {target_level}          │
│    - {level_weight}          │
│ 3. 执行步骤                  │  ← 来自 processes 文件
│ 4. 文件写入指令              │  ← "必须写入以下文件到磁盘"
│ 5. 验证清单                  │
└─────────────────────────────┘
```

**关键约束**：
- Step ④ task **全部内联**（能力信息在分组时确定，不读外部文件）
- Step ⑤⑥⑦ task **指定文件路径**（前置产出量大，agent 用 read 工具按需读取）
- Step ⑤ 前置文件缺失 → 标注"缺失"继续
- Step ⑥⑦ 前置文件缺失 → **停止执行并报错**

### 4.4 Label 命名规范

| 步骤 | Label 模式 | 示例 |
|------|-----------|------|
| ⓪ 维度 | `brainstorm-{dimension}` | `brainstorm-scenario` |
| ⓪ 收敛者 | `brainstorm-integrator` | — |
| ① scan·A | `search-{batch_id}` | `search-B1` |
| ① scan·B | `extract-{batch_id}` | `extract-B1` |
| ④ 能力研究 | `agent-{group_id}` | `agent-A_1` |
| ⑤ Briefing | `briefing-{seq}-{name}` | `briefing-01-长列表渲染` |
| ⑥ 组装·MD | `asm-md-{seq}-{name}` | `asm-md-01-长列表渲染` |
| ⑥ 组装·Exp | `asm-exp-{seq}-{name}` | `asm-exp-01-长列表渲染` |
| ⑦ 阶梯 | `ladder-{seq}-{name}` | `ladder-01-长列表渲染` |

---

## 五、检查点管理器

### 5.1 8 个检查点定义

| ID | 文件 | 位置 | 展示内容 | 可操作项 |
|----|------|------|---------|---------|
| ⓩ | barrier-0.md | Step ⓪ 后 | 需求网：年限推断理由、命题列表(含level_weight)、能力图谱雏形、排除项 | 确认 / 修改年限 / 删除命题 / 跳过后续检查点 |
| ⓧ | barrier-1.md | Step ① 后 | 分区方案：session划分、执行计划、排期命题 | 确认 / 调整分区 / 合并session |
| ⓐ | barrier-2.md | Step ② 后 | 能力图谱：能力列表、依赖关系、战略高地、T0覆盖率 | 确认 / 合并能力 / 拆分能力 |
| ⓑ | barrier-3.md | Step ③ 后 | 评估结果：命题优先级排序、难度标注、推荐学习顺序 | 确认 / 调整优先级 / 移除命题 |
| ⓒ | barrier-4.md | Step ④ 后 | 能力研究：完成数/缺失数、研究深度分布、质量一目了然 | 确认 / 重跑缺失能力 |
| ⓓ | barrier-5.md | Step ⑤ 后 | Briefing：完成数/跳过数/失败数、内容比例自检 | 确认 / 重跑失败 |
| ⓕ | barrier-6.md | Step ⑥ 后 | 命题组装：完成数/partial/失败数、行数统计 | 确认 / 重跑partial |
| ⓖ | barrier-7.md | Step ⑦ 后 | 最终产物：全部完成统计、产物结构树 | 确认 / 补充指定命题 |

### 5.2 检查点协议（不可跳过）

```
每个检查点强制执行四步：

  1. 展示摘要 → 当前阶段关键产物统计和质量指标
  2. 写入记录 → barrier-{N}.md（摘要 + 决策字段留空）
  3. 🛑 停住等待 → 使用 clarify 工具向用户提问，必须等待回复
  4. 收到确认 → 补写决策到记录文件 → 按指令进入下一步或回溯

严禁自动推进。即使产物全部完成，也必须等待用户确认。
```

### 5.3 跳过条件

- `--batch=pending` 模式：自动跳过所有检查点
- 用户在任何检查点回复"全部确认"：跳过后续所有检查点
- 用户回复"跳过"：仅跳过当前检查点

---

## 六、异常处理矩阵

### 6.1 子 Agent 层面

| 异常 | 检测方式 | 处理 | 降级路径 |
|------|---------|------|---------|
| agent 超时 | poll 超时 | kill → 重试一次 → 标记 degraded | 该任务不阻塞全局，继续处理其他任务 |
| 产出文件缺失 | 验证 expected_files | 重试一次 → 仍缺失标记 degraded | 后续步骤对该条目标注"前置缺失" |
| spawn 失败 | spawn 返回错误 | 重试一次 → 降级为串行执行 | 仅影响当前 task group |
| 平台限流 | spawn 返回 rate_limit | 等待30秒重试 → 自动减小 W=3 | 整体变慢但不丢数据 |
| 上下文溢出 | agent 输出截断 | 减小 task 输入量 → 拆分 task | 该能力标记为 shallow 模式 |

### 6.2 管线层面

| 异常 | 处理 |
|------|------|
| 前处理全部 rejected | 提示用户调整搜索范围或手动补充信源 |
| 后处理全部 degraded | 展示半成品列表 → 用户决定：发布 / 补完 / 放弃 |
| 紧急中断 | 读 pipeline-state.json → 扫描半成品 → 清理后从 last_checkpoint 恢复 |
| 磁盘空间不足 | 立即暂停所有 agent → 提示用户清理 → 等待确认 |
| 连续 3+ agent 超时 | 自动降级 W=3 → 提示用户检查网络/平台状态 |
| t0_missing 普遍（>50%能力无T0信源） | 后处理自动 fallback 搜索补充 |

### 6.3 降级矩阵

```
降级等级：

  Level 0（正常）：所有子 agent 成功，产物完整
  Level 1（轻微）：1-2 个 agent 超时但重试成功
  Level 2（中度）：部分 agent 标记 degraded，但核心命题完整
  Level 3（严重）：多个 agent 失败，核心命题受影响 → 提示用户决策
  Level 4（不可恢复）：前处理无有效产出 → 终止管线
```

---

## 七、用户接口

### 7.1 触发词与模式

| 触发模式 | 触发的管线阶段 | 说明 |
|---------|-------------|------|
| `扫描：<信息源>` | ⓪→③（前处理） | 完整前处理流程 |
| `deep scan：<信息源>` | ⓪→③（深度） | 深度扫描模式（kw=3, r=10） |
| `研究：<场景>` | ④→⑦（后处理） | 基于已有 capability-graph.json 的后处理 |
| `deep research：<场景>` | ④→⑦（深度） | 深度研究模式 |
| `全线：<信息源>` | ⓪→⑦（全流程） | 从头到尾完整执行 |

### 7.2 参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--year=L1\|L2\|L3\|L4` | auto | 经验年限（省略则自动从自然语言推断） |
| `--platform=web\|miniapp\|rn\|all` | web | 目标平台 |
| `--depth=shallow\|normal\|deep` | normal | 研究深度 |
| `--no-experiment` | false | 跳过实验生成 |
| `--batch=pending` | false | 批量模式，跳过所有检查点 |
| `--append` | false | 在已有目录补充研究 |
| `--filter=<命题ID>` | null | 仅处理指定命题 |
| `--resume` | false | 从断点恢复 |

### 7.3 进度输出示例

```
🚀 Scenario Pipeline v1.0 | 工作目录: .../frontend-perf-study

📋 解析用户指令
   ├── 主题：前端性能优化面试题
   ├── 年限：L2（3-5年）— 来源："3-5年经验"显式匹配
   ├── 平台：web
   └── 约束：无

╔══════════════════════════════════════════════╗
║  🧠 Step ⓪ 头脑风暴                          ║
╚══════════════════════════════════════════════╝

   [场景Agent] ✅ 场景视角报告（8个场景，含 cross-anchor clustering）
   [技术Agent] ✅ 技术视角报告（12个能力，含 critical_path 分析）
   [学习Agent] ✅ 学习路径（4阶段，含战略高地识别）
   [约束Agent] ✅ 约束报告（6条约束，含时效性检查）
   [收敛者]   ✅ 需求网已生成（10个命题，含 level_weight 标注）

   ⓩ 检查点：需求网预览
   命题数量：10（core=6, premise=2, outlook=2）
   年限：L2（3-5年）
   排除项：Gulp/Grunt（过时）、Webpack 1.x（过时）、jQuery（不相关）

╔══════════════════════════════════════════════╗
║  📊 Step ① 依赖整理与分区                     ║
╚══════════════════════════════════════════════╝

   Session 1（本次）：渲染优化链（7命题，max_depth=4）
   Session 2（排期）：网络与资源（3命题，与主链路断开）
   ✅ execution-plan.md 已生成

   ⓧ 检查点：确认执行计划

╔══════════════════════════════════════════════╗
║  🔍 Step ② 定向扫描                          ║
╚══════════════════════════════════════════════╝

   Phase A（搜索）：3/3 批次完成，45个URL
   Phase B（提取）：3/3 批次完成，38份素材
   Phase C（合并）：index.json 已生成
   📊 素材统计：T0=12, T1=8, T2=15, T3=3, discarded=7

╔══════════════════════════════════════════════╗
║  🗺️  Step ③ 能力图谱构建                     ║
╚══════════════════════════════════════════════╝

   原子能力：12个（去重后）
   依赖关系：15条边
   战略高地：A1（浏览器渲染管线，strategic_value=2.0）
   T0覆盖率：10/12（83%）

   ⓐ 检查点：确认能力图谱

╔══════════════════════════════════════════════╗
║  📈 Step ④ 评估与入池                        ║
╚══════════════════════════════════════════════╝

   评估结果：high=4, medium=3, rejected=0
   README.md 已生成

   ⓑ 检查点：确认评估结果 → 进入后处理

╔══════════════════════════════════════════════╗
║  🔬 Step ⑤ 能力研究（后处理-阶段一）          ║
╚══════════════════════════════════════════════╝

   并发池 W=5, 拓扑分批调度
   [agent-A_1] ✅ A1 浏览器渲染管线（deep）
   [agent-A_2] ✅ A2 DOM节点生命周期（normal）
   [agent-A_3] ✅ A3 事件循环与rAF（normal）
   ... 12/12 完成, 0 失败, 0 degraded

   ⓒ 检查点：审查研究质量

╔══════════════════════════════════════════════╗
║  📝 Step ⑥ Briefing 组装                    ║
╚══════════════════════════════════════════════╝

   并发池 W=5, 简单窗口调度
   6/6 命题 Briefing 完成

   ⓓ 检查点：确认素材提取完整性

╔══════════════════════════════════════════════╗
║  🏗️  Step ⑦ 命题组装                         ║
╚══════════════════════════════════════════════╝

   并发池 W=5命题×2agent=10agent
   6/6 命题完成

   ⓕ 检查点：审查组装质量

╔══════════════════════════════════════════════╗
║  🪜 Step ⑧ 学习阶梯                          ║
╚══════════════════════════════════════════════╝

   并发池 W=5, 简单窗口调度
   6/6 阶梯生成完成

   ⓖ 检查点：确认最终产出 ✅ 管线完成

📦 最终产物：
   ├── 01-长列表渲染/（overview + edge + trade + exp + ref + ladder）
   ├── 02-首屏优化/ ...
   ├── 06-内存管理/ ...
   ├── capabilities/（12个原子能力）
   ├── README.md
   └── .meta/（中间产物）
```

---

## 八、集成架构

### 8.1 作为 OpenClaw Skill 部署

```
~/.qclaw/skills/scenario-pipeline/
├── SKILL.md                      ← 入口（触发词 + 管道全景，不变）
├── agent/
│   ├── orchestrator.md           ← 本文件：编排 Agent 定义
│   └── task-assembler.md         ← 子 agent task 组装器定义
├── core/                         ← 方法论（不变）
├── meta/                         ← 数据定义（不变）
├── processes/                    ← 执行文档（不变）
├── plugins/                      ← 可选插件（不变）
└── dev/                          ← 开发文档（不变）
```

### 8.2 OpenClaw 能力映射

| OpenClaw 能力 | 管线用途 |
|---------------|---------|
| `sessions_spawn` | 创建子 agent（brainstorm-*, search-*, extract-*, agent-*, briefing-*, asm-*, ladder-*） |
| `subagents list/steer/kill` | 监控子 agent 状态、杀掉超时 agent |
| `read` | 按分步隔离协议加载 processes/meta/core 文件 |
| `write` | 子 agent 写入产出文件（确保用 write_file.py 处理编码） |
| `web_fetch` | Phase B 内容提取（T0/T1 域名） |
| `browser (Playwright)` | 反爬域名抓取（juejin/zhihu/CSDN 等） |
| `cron` | 长时间任务（≥5min）的异步跟踪 |
| `exec` | 环境检查、文件验证 |

### 8.3 调用流程

```
用户输入："扫描：前端性能优化 --year=L2"
    │
    ▼
OpenClaw 匹配 scenario-pipeline skill
    │
    ▼
触发 SKILL.md → 初始化 → 读 shared-conventions.md + paths.md
    │
    ▼
Orchestrator 按 processes/ 分步执行
    │
    ├── Step ⓪: sessions_spawn × 5 (4 维度 + 1 收敛者)
    ├── Step ①: read + 本步骤操作
    ├── Step ②: sessions_spawn × N (搜索+提取 agent)
    ├── Step ③: read + 本步骤操作
    ├── Step ④: read + 本步骤操作
    ├── Step ⑤: sessions_spawn × N (能力研究 agent)
    ├── Step ⑥: sessions_spawn × M (Briefing agent)
    ├── Step ⑦: sessions_spawn × 2M (组装 agent)
    └── Step ⑧: sessions_spawn × M (阶梯 agent)
    │
    ▼
最终产物文件树
```

---

## 九、性能预估

### 9.1 资源预算

| 维度 | 预算 | 说明 |
|------|------|------|
| 最大子 agent 数 | ≤ 50 | 10命题 × 5轮可能触发 |
| 最大并发 agent | 10 | W=5命题 × 2 agent（Step ⑦） |
| 单 agent 超时 | 3-8min | 按步骤不同 |
| 总执行时间 | 15-45min | 含轮询等待、检查点交互 |
| 上下文 token/步 | < 8K | 严格隔离确保不膨胀 |
| 磁盘占用 | < 50MB | 纯文本产出（不含实验代码） |

### 9.2 规模上限与建议

| 条件 | 上限 | 建议 |
|------|------|------|
| 命题数 > 15 | ⚠️ 触发警告 | 分批处理，每次 ≤ 10 |
| 能力数 > 30 | ⚠️ 触发警告 | 缩小范围或拆分 topic |
| 单命题 agent 连续失败 3 次 | ❌ 标记 unrecoverable | 跳过该命题，不阻塞全局 |

---

## 附录 A：与现有 SKILL.md 的分工

| 现有 SKILL.md | 本 Agent 设计 |
|--------------|-------------|
| 管道全景图（架构总览） | 编排执行引擎（怎么跑） |
| 触发方式定义（用户入口） | 状态机 + 断点恢复（可靠性） |
| 分步读取协议（规则声明） | 上下文隔离执行器（规则实施） |
| 数据参考表（文件索引） | 子 agent 调度器（并发管理） |
| 流程步骤索引（目录） | 检查点管理器 + 异常处理矩阵（运维） |

两者互补：SKILL.md 定义"做什么"，本设计定义"怎么做"。

---

## 附录 B：渐进式实现路线图

| 阶段 | 内容 | 粒度 |
|------|------|------|
| Phase 1 | 状态机 + 分步执行循环 | 纯串行，无子 agent，验证状态流转正确 |
| Phase 2 | 单步骤内子 agent 调度 | 滚动窗口模式，验证 spawn/poll/kill/retry |
| Phase 3 | 检查点管理器 | 用户交互 + barrier 写入 + 跳过逻辑 |
| Phase 4 | 断点恢复 | pipeline-state.json 读写 + 中断恢复 |
| Phase 5 | 完整异常处理 | 降级矩阵 + 质量兜底 + 重试策略 |
| Phase 6 | 审计日志 + 监控 | 执行日志 + 健康检查 + 统计面板 |

---

> **设计原则**：不修改 processes/ 文件，向上兼容，零侵入。
> Agent 是管线的"司机"，不是管线的"改装厂"。