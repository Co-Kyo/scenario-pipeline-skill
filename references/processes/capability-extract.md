# Process: 原子能力提取 (capability-extract)

> 从多个命题的分词结果中提取原子能力，计算扇出度。

## 输入

- `decompositions`：所有命题的分词结果列表（来自 processes/decompose.md 的输出）

## 执行步骤

### Step 1：逐命题提取原子能力

对每个命题的 [通用内核] + [特化层] 进行逐层拆解：
- 每个独立可学习的技术能力 → 一个原子能力
- 命名规范：`<技术域>-<能力描述>`

### Step 2：去重与合并

跨命题去重：相同能力合并为一条，保留最高 Tier 来源

### Step 3：标注依赖关系

每个原子能力的前置依赖（A 依赖 B = 理解 A 之前必须先理解 B）

### Step 4：计算扇出度

```
扇出度 = 该能力出现在多少个命题的能力集合中 / 总命题数
```

### Step 5：限定词注入分析

分析不同限定词向命题注入的特化能力集

## 输出

```yaml
atomic_capabilities:
  - id: "A1"
    name: "浏览器渲染管线"
    layer: "浏览器层"
    fanout: 6
    total: 7
    fanout_ratio: "6/7"
    coupling: 1
    covers: ["P1", "P2", "P3", "P5", "P6", "P7"]
    dependencies: []
    
  - id: "A2"
    name: "DOM 节点生命周期"
    layer: "浏览器+V8"
    fanout: 5
    total: 7
    fanout_ratio: "5/7"
    coupling: 1
    covers: ["P1", "P3", "P5", "P6", "P7"]
    dependencies: ["A1"]

qualifier_injection:
  - qualifier: "Vue 3"
    injects: ["V1-Proxy响应式", "V2-Composition API", "V3-Patch Flag"]
    affects_priority: ["A6-事件循环（nextTick调度）"]
  - qualifier: "React 18"
    injects: ["R1-Fiber调度", "R2-Hooks", "R3-Concurrent Mode"]
    affects_priority: ["A6-事件循环（Fiber调度）"]
```

## 依赖

- 需要先执行 processes/decompose.md

## 参考

- core/capability-graph.md（原子能力图谱方法论）
