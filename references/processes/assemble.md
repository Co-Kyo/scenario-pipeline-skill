# Process: 命题组装 (assemble)

> 将能力知识库条目组装为命题的四象限研究输出。

## 输入

- `proposition`：命题文本
- `decomposition`：分词结果（来自 processes/decompose.md）
- `capabilities_dir`：能力知识库目录路径（来自阶段一的 capabilities/）
- `depth`：组装深度（shallow / normal / deep）
- `platform`：平台约束（web / miniapp / rn / all）

## 执行步骤

### Step 1：链路编排（→ Q1 overview.md）

按数据流顺序排列能力，形成从输入到输出的完整链路：

```
数据层 [A5] → 计算层 [A5] → DOM层 [A2] → 渲染层 [A1] → 交互层 [A6]
```

每个链路节点：
- 引用对应能力知识库条目的核心机制
- 补充命题特有的上下文（限定词注入的特化内容）
- 标注原子能力 ID

### Step 2：坑点提取（→ Q2 edge-cases.md）

从各能力知识库的工程瓶颈中提取与该命题相关的坑点：
- 过滤：只保留与命题场景相关的瓶颈
- 补充：命题特有的极端场景（如 AI 聊天的流式追加）
- 组合：多个能力的瓶颈可能组合形成新的极端场景

### Step 3：方案对比（→ Q3 trade-offs.md）

从能力知识库的典型权衡中构建对比表：
- 选取 2-3 种技术路线
- 每种路线标注涉及的能力及其 tradeoff 选择
- 表格形式，标注牺牲点

### Step 4：实验组装（→ Q4 experiment/）

从能力知识库的最小验证实验中组装完整验证环境：
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

汇总所有能力知识库条目的参考资料，去重后按 Tier 排序

## 输出

写入 `workflow/research/<序号>-<命题简称>/`：

```
<序号>-<命题简称>/
├── overview.md      # Q1: 链路编排
├── edge-cases.md    # Q2: 坑点提取
├── trade-offs.md    # Q3: 方案对比
├── experiment/      # Q4: 实验组装
│   ├── README.md
│   └── src/
└── references.md    # 参考资料
```

### 命题目录命名规范

```
格式：<两位序号>-<命题中文简称>
序号按候选池中的排列顺序（P1=01, P2=02, ...）

示例：
  P1 "长列表渲染：万级数据的虚拟列表实现与滚动卡顿治理"
     → 01-长列表渲染/

  P2 "首屏白屏：SPA 首屏加载慢的全链路诊断与优化"
     → 02-首屏白屏/

  P4 "网络优化：HTTP 缓存 + CDN + 资源加载的三层协作"
     → 03-网络优化/（跳过未研究的 P3，序号不连续没关系，或重新编号）
```

> 注意：如果批量研究时跳过了某些命题（如只研究 high 优先级），序号可以不连续，
> 或者按实际研究顺序重新编号。目录名的核心语义是「人类可读 + 有序」。

---

## 依赖

- 需要先执行 processes/decompose.md
- 需要先执行 processes/capability-research.md（阶段一，产出 capabilities/ 知识库）

## 参考

- plugins/capability-research-mode.md（材料块格式 + 实验模板）
- core/scenario-matrix.md（四象限框架）
