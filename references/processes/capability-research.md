# Process: 能力研究 (capability-research)

> 对单个原子能力进行深度研究，产出标准化材料块。

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

## 输出格式

严格遵循 plugins/capability-research-mode.md 定义的材料块格式。

```yaml
capability_block:
  id: "A1"
  name: "浏览器渲染管线"
  fanout: "6/7"
  coupling: 1
  
  mechanism: |
    关键渲染路径（CRP）：...
    
  bottlenecks:
    - id: "A1-B1"
      name: "强制同步布局"
      trigger: "..."
      symptom: "..."
      detection: "..."
      mitigation: ["..."]
      
  tools:
    - name: "Chrome DevTools Performance"
      usage: "..."
      
  tradeoffs:
    - id: "A1-T1"
      dimension: "..."
      option_a: "..."
      option_b: "..."
      
  experiments:
    - id: "A1-E1"
      description: "..."
      code: "..."
      verification: "..."
      
  references:
    - tier: T1
      url: "..."
      title: "..."
```

## 依赖

- 需要先执行 processes/capability-extract.md（提供能力 ID 和描述）

## 参考

- plugins/capability-research-mode.md（材料块格式规范）
- core/capability-graph.md（能力定义）
