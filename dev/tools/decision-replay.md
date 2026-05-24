# 决策回放 Prompt

> 轻量级管道质量检测。读取 `_trace` 埋点，比对 process 规范，输出决策链路报告。
> 不引入额外工具或评分体系——纯 prompt，读文件，出报告。

---

## 使用方式

将以下 prompt 连同指定的输入文件一起交给 agent 执行：

```
请按照 dev/tools/decision-replay.md 的回放 prompt，对以下工作目录进行决策回放分析：

工作目录：{workDir}
```

---

## Prompt

你是管道决策回放分析员。你的任务是从 pipeline 产物中提取所有 `_trace` 埋点，与 process 规范比对，输出一份精简的决策链路报告。

### 输入

- 工作目录：`{workDir}`
- Process 规范：`processes/00-shared.md` §决策凭据规范 + 各步骤 process 文件的校验清单

### 执行步骤

#### Phase 1：采集埋点

扫描 `{workDir}/.meta/` 下所有 JSON 文件，提取所有 `_trace` 后缀字段，记录：

```
步骤 | 文件 | 字段名 | _trace 内容（前 100 字）
```

同时扫描 `{workDir}/` 下的命题 markdown 文件（`*/edge-cases.md` 等），提取行内 `筛选_trace` 等字段。

#### Phase 2：比对规范

读取 `processes/00-shared.md` §需要加 _trace 的字段清单，逐项检查：

| 检查项 | 判定 |
|--------|------|
| 清单中有，产物中有，内容含三要素（输入/标准/选择） | ✅ 合格 |
| 清单中有，产物中有，但内容为空或缺少三要素 | ⚠️ 质量不足 |
| 清单中有，产物中没有 | ❌ 缺失 |
| 清单中没有，产物中有（额外 trace） | ℹ️ 额外埋点（非必须，但说明 agent 有意识） |

三要素检查要点：
- **输入数据**：trace 中是否提到具体的输入值/来源
- **判定标准**：trace 中是否提到阈值/规则/对比依据
- **选择理由**：trace 中是否说明为什么选了这个值

#### Phase 3：盲区扫描

检查以下位置是否存在未埋点的关键决策：

1. `evaluations.json` 中 priority ≠ high 的命题 → 是否有 `priority_trace`
2. `capability-graph.json` 中非空 `dependencies` → 是否有 `dependencies_trace`
3. `raw-materials.json` 中 `source_tier` 非 T0 的条目 → 是否有 `source_tier_trace`
4. `edge-cases.md` 中的坑点 → 是否有 `筛选_trace`

#### Phase 4：输出报告

按以下格式输出，**总字数控制在 500 字以内**：

```
# 决策回放报告

**工作目录**：{workDir}
**扫描时间**：{时间}
**覆盖步骤**：① ② ③ ⑤ ⑨（列出实际有产物的步骤）

## 决策链路

| 步骤 | 埋点数 | 合格 | 质量不足 | 缺失 |
|------|--------|------|---------|------|
| ① scan | 3 | 2 | 1 | 0 |
| ② decompose | 1 | 1 | 0 | 0 |
| ... | | | | |

## 关键缺口

（仅列出缺失项，每项一行：步骤 + 字段 + 影响）

## 质量观察

（1-3 句话：整体决策链路的完整度、最常见的问题模式、对 skill 设计的启示）
```

### 约束

- 不评分、不评级、不做改进建议——只报告事实
- 不读 process 文件以外的 skill 文件（不做 skill 审查）
- 报告超过 500 字则压缩，删除 ℹ️ 项和重复模式
