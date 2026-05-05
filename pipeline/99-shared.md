# 共享协议：运行时适配、调度、故障恢复

> 本文档包含跨阶段共享的协议和参考信息。
> 各阶段文件引用本文档的对应章节。

---

## 一、运行时适配层

spawn 子 agent 的 API 因平台而异，通过 **环境探测 + 动态适配** 实现跨平台兼容：

| 层 | 文件 | 职责 |
|----|------|------|
| 探测 + 适配 | `environment/probe-protocol.md` | 自然语言诱导实验 → 7 维能力档案 → 执行策略适配 |

**执行流程前必须**：
1. 加载 `environment/probe-protocol.md`，执行/读取环境档案
2. 按档案中 C1-C7 能力指标选择执行策略

---

## 二、多线程主线程保全协议

> **平台已知 Bug**：单例模式 agent 窗口下，主线程 spawn 子 agent 后，
> 主窗口上下文可能潜入子 agent 调用链，导致主线程丢失。

**保全策略**：从环境档案 `execution_mode` + `C7` 组合推断风险等级，映射到分级保全策略。

| 保全级别 | spawn 后立即输出 | 周期性轮询 | 收尾确认 |
|---------|:---:|:---:|:---:|
| mandatory（🔴） | ✅ 必须 | ✅ 必须 | ✅ 必须 |
| enabled（🟡） | ✅ 必须 | ✅ 必须 | ✅ 必须 |
| suggested（🟢） | ✅ 建议 | — | ✅ 建议 |
| optional（⚪） | 可选 | — | — |

**行为定义**：
1. **spawn 后立即输出**：向用户输出状态确认（"已启动 N 个子任务"），强制主线程保持对话轮次
2. **周期性轮询**：主动检查产出文件（非静默等待），每次轮询是主线程的活跃 turn
3. **收尾确认**：输出完成确认（"子任务 X 已完成"），再进入下一步

**核心原则**：主线程永远不能在 spawn 后"静默等待"。

---

## 三、滑动窗口并行调度

### 核心原则

- **每 agent 只负责 1 个文件**
- **滑动窗口**：维持 N 个并发 agent，谁完成谁补位，不等整批
- **窗口大小**：默认 4（可根据系统并发能力调整）

### 调度算法

```
窗口大小 W = 4
待处理队列 Q = [任务1, 任务2, ..., 任务N]
进行中集合 running = {}
完成集合 done = {}

读取 preserve_level = environment-profile.efficiency.main_thread_preservation.preserve_level

循环：
  while |running| < W 且 Q 非空：
    task = Q.dequeue()
    agent = spawn(task)
    running.add(agent)
    if preserve_level ∈ {"mandatory", "enabled", "suggested"}:
      ⚠️ 立即输出状态确认

  if preserve_level ∈ {"mandatory", "enabled"}:
    ⚠️ 主动轮询检查产出文件
  else:
    等待任意一个 agent 完成

  running.remove(完成的 agent)
  done.add(完成的 agent)
  if preserve_level ∈ {"mandatory", "enabled", "suggested"}:
    ⚠️ 输出完成确认

  if 该 agent 失败：
    记录失败原因，可选择重入 Q

  重复直到 Q 为空且 running 为空
```

### 状态追踪

主 agent 维护状态表，每个 agent 完成时更新：

```
| 能力ID | 状态 | agent session | 备注 |
|--------|------|--------------|------|
| A1     | ✅ done | xxx | 主文件+摘要均已写入 |
| A2     | ⏳ running | xxx | |
| A3     | ❌ failed | xxx | 超时，已重入队列 |
| A4     | ⬜ pending | — | |
```

---

## 四、核心数据实体生命周期

| 数据实体 | 诞生步骤 | 消费步骤 | 消费方式 |
|---------|---------|---------|---------|
| `raw_materials[]` | scan | decompose, evaluate | 内存传递 |
| `decompositions[]` | decompose | capability-extract, evaluate | 内存传递 |
| `capability-graph.json` | capability-extract → highground-identify 追加 | 后处理全流程 | 文件读写 |
| `evaluations[]` | evaluate | pool | 内存→文件 |
| `README.md` | pool | 用户 + 后处理 | 人类阅读 + agent 读取 |
| `capabilities/<id>.md` | capability-research | **人类阅读** | 人类消费 |
| `summaries/<id>.json` | capability-research 双写 | Briefing 组装 + 学习阶梯 | 机器消费 |
| `briefings/<命题>.md` | Briefing 组装 | assemble agent | 内联到 task |
| `<命题>/overview.md` 等 | assemble | 用户 + 学习阶梯 | 人类消费 + 阶梯引用 |
| `<命题>/learning-ladder.md` | 阶段三 | 用户 | 人类消费（渐进式引导） |

---

## 五、插件引用关系

```
plugins/year-granularity.md
  └── 被 decompose.md 按需加载（--year 参数）

plugins/capability-research-mode.md
  ├── 被 capability-research.md 必须加载（材料块格式）
  └── 被 assemble.md 必须加载（组装格式+实验模板）

plugins/source-registry.md
  ├── 被 capability-extract.md 必须加载（信源URL预查找）
  └── 被 capability-research.md 必须加载（fallback搜索）

environment/probe-protocol.md
  ├── 被 post-process.md 必须加载（后处理启动时）
  └── 探测结果写入 .meta/environment-profile.json
```

---

## 六、故障模式与恢复

| 故障点 | 表现 | 恢复策略 |
|--------|------|---------|
| 前处理 scan 网络不通 | raw_materials 为空 | 换镜像/指定 --source |
| capability-extract 信源验证全部失败 | t1_missing=true 普遍 | 后处理 fallback 搜索 |
| 阶段一 agent 超时 | summary.json 缺失 | 精确重跑该能力（1 agent 1 文件） |
| Briefing 组装超时 | .meta/briefings/ 不完整 | 按缺失命题增量生成 |
| 阶段二 agent 输出质量差 | 文件内容空洞 | 重跑：拿同样的 briefing 再写一次 |
| 阶段三生成的阶梯质量差 | 步骤不可操作或引用错误 | 重跑：基于同样的命题产出重新生成 |
| 阶段三依赖的命题产出缺失 | overview/experiment 未生成 | 先补完阶段二，再生成阶梯 |
| summary 与主文件不一致 | 摘要过时 | 从主文件重新提取（增量修复） |
| 运行时 spawn 失败 | agent 无法创建 | 检查 environment-profile.json 中 C1 |
| 运行时 barrier 失败 | 结果未回传 | 检查 C7，若 ⚠️ 则降级为轮询文件 |
| 诱导实验全部失败 | C1=❌ | 确认平台支持多 Agent；手动写 environment-profile.json 绕过 |
| 缓存过期（spawn 连续失败） | 能力档案与实际不匹配 | 删除 environment-profile.json，重新探测 |

---

## 七、增量复用

### 能力知识库增量

```
检查 capabilities/ 目录中已有的能力条目
  → 已有：直接复用，跳过
  → 同时检查 .meta/summaries/ 中是否有对应摘要
    → 有摘要：复用，跳过
    → 无摘要：从已有主文件中提取补生成
  → 缺失：调用 capability-research.md 补充研究（双写）
```

### Briefing 增量

```
检查 .meta/briefings/ 中已有的 briefing
  → 已有该命题的 briefing：复用，跳过
  → 缺失：从 summary.json 重新生成
  → 命题涉及的能力有变更：重新生成该命题的 briefing
```

---

## 八、单命题快速路径

当只处理单个命题（非批量）时，可简化为：

```
1. 从 capability-graph.json 识别该命题依赖的原子能力
2. 增量检查 capabilities/ + .meta/summaries/，缺失的用滑动窗口并行研究（双写）
3. 从 summary.json 组装该命题的 briefing
4. 组装该命题（滑动窗口按文件拆分，task 内联 briefing）
5. 生成该命题的 learning-ladder.md（单线程）
```
