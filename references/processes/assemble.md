# Process: 命题组装 (assemble)

> 将能力材料块组装为命题的四象限研究输出。

## 输入

- `proposition`：命题文本
- `decomposition`：分词结果（来自 processes/decompose.md）
- `material_blocks`：该命题依赖的能力材料块列表（来自 processes/capability-research.md）
- `depth`：组装深度（shallow / normal / deep）
- `platform`：平台约束（web / miniapp / rn / all）

## 执行步骤

### Step 1：链路编排（→ Q1 overview.md）

按数据流顺序排列能力材料块，形成从输入到输出的完整链路：

```
数据层 [A5] → 计算层 [A5] → DOM层 [A2] → 渲染层 [A1] → 交互层 [A6]
```

每个链路节点：
- 引用对应材料块的 mechanism
- 补充命题特有的上下文（限定词注入的特化内容）
- 标注原子能力 ID

### Step 2：坑点提取（→ Q2 edge-cases.md）

从每个能力材料块的 bottlenecks 中提取与该命题相关的坑点：
- 过滤：只保留与命题场景相关的 bottleneck
- 补充：命题特有的极端场景（如 AI 聊天的流式追加）
- 组合：多个能力的 bottleneck 可能组合形成新的极端场景

### Step 3：方案对比（→ Q3 trade-offs.md）

从能力材料块的 tradeoffs 中构建对比表：
- 选取 2-3 种技术路线
- 每种路线标注涉及的能力及其 tradeoff 选择
- 表格形式，标注牺牲点

### Step 4：实验组装（→ Q4 experiment/）

从能力材料块的 experiments 中组装最小验证环境：
- 选取战略价值最高的能力的实验代码
- 合并为一个可运行的 HTML/JS 文件
- 验证检查点标注对应的原子能力 ID
- 遵循 plugins/capability-research-mode.md 的实验模板

### Step 5：内容比例校验

- 通用高地内容（框架无关）≥ 70%
- 特化内容（框架相关）≤ 30%
- 开篇（10-15%）从限定词切入
- 主体（70-80%）讲通用原理
- 收尾（10-15%）回到限定词

### Step 6：参考资料汇总（→ references.md）

汇总所有材料块的 references，去重后按 Tier 排序

## 输出

写入 `workflow/research/<场景slug>/`：

```
├── overview.md      # Q1: 链路编排
├── edge-cases.md    # Q2: 坑点提取
├── trade-offs.md    # Q3: 方案对比
├── experiment/      # Q4: 实验组装
│   ├── README.md
│   └── src/
└── references.md    # 参考资料
```

## 依赖

- 需要先执行 processes/decompose.md
- 需要先执行 processes/capability-research.md（并行，产出材料块）

## 参考

- plugins/capability-research-mode.md（材料块格式 + 实验模板）
- core/scenario-matrix.md §四象限研究框架
