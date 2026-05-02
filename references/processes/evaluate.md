# Process: 四维评估 (evaluate)

> 对技术命题进行四维矩阵打分，判定入池优先级。

## 输入

- `proposition`：命题文本
- `decomposition`：分词结果（来自 processes/decompose.md 的输出）
- `highground_info`：战略高地信息（来自 processes/highground-identify.md 的输出，可选）
- `search_evidence`：搜索佐证（来自 processes/scan.md 的输出，可选）

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

```yaml
evaluation:
  proposition: "长列表：AI 聊天窗口的虚拟列表渲染"
  scores:
    cross_stack: 3
    doc_vacuum: 2
    experience_barrier: 3
    trending_heat: 3
    total: 11
  verdict: "high"
  highground_hits: ["A1", "A2", "A5", "A6"]
  evidence:
    t1_sources: ["MDN IntersectionObserver"]
    t2_sources: ["@tanstack/virtual"]
    t3_sources: ["掘金-2025前端面试场景题"]
```

## 依赖

- 需要先执行 processes/decompose.md
- 可选：processes/capability-extract.md（提供 highground_hits）
- 可选：processes/scan.md（提供 search_evidence）

## 参考

- core/scenario-matrix.md §四维评估矩阵
- plugins/year-granularity.md（年限阶梯的入池阈值调整）
