# Process: 能力研究 (capability-research)

> 对单个原子能力进行深度研究，产出能力知识库条目。

## 输入

- `capability_id`：能力 ID（如 "A1"）
- `capability_name`：能力名称（如 "浏览器渲染管线"）
- `capability_desc`：能力描述（依赖的技术层、关键概念）
- `depth`：研究深度（shallow / normal / deep）

## 执行步骤

### Step 1：机制阐述

- 该能力的核心机制是什么？
- 从底层原理到表层行为的完整链路
- 引用 T1/T2 来源

### Step 2：瓶颈识别

列出该能力在实际工程中常见的 3-5 个瓶颈点：
- 触发条件
- 表现症状
- 检测手段
- 缓解策略

### Step 3：工具链

列出验证和调试该能力所需的工具：
- Chrome DevTools 面板及具体操作
- 性能分析 API
- 第三方工具

### Step 4：Trade-off 模式

列出该能力涉及的 2-3 个典型权衡：
- 两个维度的对立关系
- 不同场景下的选择建议

### Step 5：最小实验（deep 模式）

提供一个可直接运行的代码片段，验证该能力的核心行为

## 输出

写入 `workflow/research/capabilities/<id>-<name>.md`：

```markdown
# <能力名称>

> ID: <id> | 扇出: <fanout> | 耦合度: <coupling> | 战略价值: <value>

## 核心机制

（从底层原理到表层行为的完整链路）

## 工程瓶颈

| # | 瓶颈名 | 触发条件 | 表现症状 | 检测手段 | 缓解策略 |
|---|--------|---------|---------|---------|---------|

## 调试工具

| 工具 | 用法 |

## 典型权衡

| 维度 | 方案A | 方案B | 选择建议 |

## 最小验证实验

（可直接运行的 HTML/JS 代码片段）

## 参考资料

（按 Tier 排序，至少 1 个 T1）
```

### 文件命名规范

```
格式：<id>-<中文名称>.md
示例：
  ✓ A1-浏览器渲染管线.md
  ✓ A8-DevTools性能分析.md
  ✗ A1.md（纯 ID 无语义）
  ✗ browser-rendering-pipeline.md（英文不直观）
```

---

## 依赖

- 需要先执行 processes/capability-extract.md（提供能力 ID 和描述）

## 参考

- plugins/capability-research-mode.md（材料块格式规范）
- core/capability-graph.md（能力定义）
