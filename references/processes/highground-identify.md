# Process: 战略高地识别 (highground-identify)

> 基于扇出度和限定词耦合度识别战略高地，生成修炼路径。

## 输入

- `capability_graph`：原子能力图谱（来自 processes/capability-extract.md 的输出）
- `qualifier_context`：当前限定词上下文（可选）

## 执行步骤

### Step 1：计算战略价值

```
战略价值 = 扇出度 × (1 / 限定词耦合度)
```

- 耦合度 1 = 完全框架无关
- 耦合度 2 = 部分框架相关
- 耦合度 3 = 高度框架绑定

### Step 2：排序与分级

| 等级 | 战略价值 | 含义 |
|------|---------|------|
| 🏔️ 一级 | ≥ 4.0 | 必须攻克 |
| ⛰️ 二级 | 2.0 - 3.9 | 重要补充 |
| 🏕️ 三级 | 1.0 - 1.9 | 按需学习 |

### Step 3：验证依赖累积

如果高地 A 依赖高地 B，B 的累积价值 += A 的价值

### Step 4：生成修炼路径

按依赖拓扑排序 + 覆盖优先原则

### Step 5：限定词影响分析

同一命题不同限定词下，高地优先级如何变化

## 输出

```yaml
strategic_highgrounds:
  - id: "A1"
    name: "浏览器渲染管线"
    fanout: 6
    coupling: 1
    strategic_value: 6.0
    cumulative_value: 18.0
    level: "🏔️ 一级"
    path_position: "Step 1"
    
  - id: "A2"
    name: "DOM 生命周期"
    fanout: 5
    coupling: 1
    strategic_value: 5.0
    cumulative_value: 8.0
    level: "🏔️ 一级"
    path_position: "Step 2"
    depends_on: ["A1"]

learning_path:
  - step: 1
    capability: "A1-浏览器渲染管线"
    coverage: "6/7"
    rationale: "最大覆盖，框架无关"
  - step: 2
    capability: "A2-DOM生命周期"
    coverage: "6/7"
    rationale: "深化 A1 的下游理解"
```

## 依赖

- 需要先执行 processes/capability-extract.md

## 参考

- core/strategic-highground.md（战略高地方法论）
