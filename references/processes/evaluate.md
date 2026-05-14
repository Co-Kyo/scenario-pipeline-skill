# Process: 四维评估 (evaluate)

> 对技术命题进行四维矩阵打分，判定入池优先级。

## 输入

- `proposition`：命题文本
- `decomposition`：分词结果（来自 processes/decompose.md 的输出）
- `highground_info`：战略高地信息（来自 processes/highground-identify.md 的输出，可选）
- `search_evidence`：搜索佐证（来自 processes/scan.md 的输出，可选）

## 加载清单

> ⛔ **L3 执行前置条件**（architecture-model.md §3 加载契约）

```
必须加载：core/scenario-matrix.md（评估矩阵方法论）
理由：四维评分的校准标准、防虚高校验规则、入池判定逻辑、一票入池条件定义在此文件中
```

## 执行步骤

### Step 1：跨栈耦合评分

| 分数 | 条件 |
|------|------|
| 0 | 单一技术点 |
| 1 | 跨 2 层但主次分明 |
| 2 | 跨 3 层且相互影响 |
| 3 | 跨 4+ 层，链路复杂 |

校准：分词后发现被限定词遮蔽的通用层 → 上调

### Step 2：文档真空评分

| 分数 | 条件 |
|------|------|
| 0 | MDN/规范有专页覆盖 |
| 1 | 首页有博客但无全链路 |
| 2 | 需翻到第 2-3 页，跨 3+ 篇拼凑 |
| 3 | 首页无直接相关结果 |

### Step 3：经验壁垒评分

| 分数 | 条件 |
|------|------|
| 0 | 阅读即懂 |
| 1 | 需跑一次 demo |
| 2 | 需在真实项目中踩坑（注明暴露条件） |
| 3 | 需大规模业务场景才暴露 |

### Step 4：时事热度评分

| 分数 | 条件 |
|------|------|
| 0 | 近 6 月无新讨论 |
| 1 | 季度内有 1-2 次讨论 |
| 2 | 近 1 月内 3+ 平台出现 |
| 3 | 近 1 周内密集出现 |

### Step 5：防虚高校验

若 4 维均 ≥ 2 分，必须重新审视，至少 1 维压低 1 分

### Step 6：入池判定

| 总分 | 判定 |
|------|------|
| ≥ 6 | high，直接入池 |
| 4-5 | medium，待确认 |
| ≤ 3 | rejected，记录理由 |

一票入池条件：2+ 信息源同时讨论 / 包含 Trade-off / 新兴技术碰撞

## 输出

输出格式由 MCP `get_output_schema(step="evaluate")` 定义，包含 template + field_rules + strict_notes。
写入前调用 MCP `submit_output(step="evaluate", data=..., workDir=...)` 自动校验。

## 异常与 Fallback

| 异常场景 | 触发条件 | 处理动作 |
|---------|---------|---------|
| 搜索佐证缺失 | search_evidence 为空（scan 阶段网络失败） | 文档真空维度保守评分（最高 2 分），不因缺少证据而虚高 |
| 分词结果缺失 | decomposition 为空 | 跨栈耦合维度无法评分，标记 `decompose_missing: true`，总分按 3 维计算 |
| 4 维均 ≥ 2 分 | 防虚高校验触发 | 必须给出至少 1 维压低的具体论据，否则强制压低时事热度（最主观的维度） |
| 一票入池条件无法验证 | 无法确认"2+ 信息源同时讨论" | 默认不触发一票入池，按总分判定 |
| 所有命题 ≤ 3 分 | 全部不达标 | 输出空候选池 + 建议："当前主题下无高价值命题，建议扩大扫描范围或调整筛选条件" |

## 依赖

- 需要先执行 processes/decompose.md
- 可选：processes/capability-extract.md（提供 highground_hits）
- 可选：processes/scan.md（提供 search_evidence）

## 参考

- [必须加载] core/scenario-matrix.md §四维评估矩阵 — 已在加载清单中标注
- [条件加载] plugins/year-granularity.md（年限阶梯的入池阈值调整）
