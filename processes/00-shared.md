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

**示例（能力研究子 agent）：**

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
```

**注意**：task 中不引用任何外部文件路径（不出现"读取 xxx.md"），所有必要信息已内联。

### 滑动窗口并行

- 窗口大小 W = 4（保留 1 个槽位给主 agent）
- 维护状态表：

```
| 能力ID | 状态 | agent session | 备注 |
|--------|------|--------------|------|
| A1     | ✅ done | xxx | 主文件+摘要均已写入 |
| A2     | ⏳ running | xxx | |
| A3     | ❌ failed | xxx | 超时，已重入队列 |
```

- 失败的 agent 可选择重入队列（最多重试 1 次）

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
