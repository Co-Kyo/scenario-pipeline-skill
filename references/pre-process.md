# 前处理编排

> 纯编排文件：定义前处理的步骤顺序和调用关系。
> 每个步骤的实现在 `processes/` 目录下。

---

## 触发方式

```
扫描：<信息源描述>
```

或：

```
deep scan：<信息源描述>
```

**可选参数：**

| 参数 | 说明 |
|------|------|
| `--source=<url>` | 直接指定一个具体 URL |
| `--feed=<topic>` | 按主题订阅式扫描 |
| `--digest` | 对已入池候选做摘要汇报 |
| `--year=<L1\|L2\|L3\|L4>` | 经验年限约束 |

---

## 流程

```
Step 1 ──→ Step 2 ──→ Step 3 ──→ Step 4 ──→ Step 5 ──→ Step 6
 scan      decompose   capability  highground  evaluate    pool
                       extract     identify
```

### Step 1：广域扫描

```
调用：processes/scan.md
输入：用户指令中的 source_desc + topic
输出：raw_materials[]（原始素材列表）
```

### Step 2：架构分词

```
调用：processes/decompose.md
输入：Step 1 的 raw_materials
加载条件：如果 --year → 额外加载 plugins/year-granularity.md
输出：decompositions[]（分词结果列表）
```

### Step 3：原子能力提取

```
调用：processes/capability-extract.md
输入：Step 2 的 decompositions
输出：.meta/capability-graph.json（原子能力图谱，结构化 JSON）
```

### Step 4：战略高地识别

```
调用：processes/highground-identify.md
输入：Step 3 的 .meta/capability-graph.json
输出：.meta/capability-graph.json（追加 highgrounds + learning_path 字段）
```

### Step 5：四维评估

```
调用：processes/evaluate.md
输入：Step 2 的 decompositions + Step 4 的 capability-graph.json + Step 1 的 raw_materials
输出：evaluations[]（评分 + 入池判定）
```

### Step 6：入池归档

写入两个文件：
- `README.md` — 总览导航（人类可读，替代旧 candidates.md 的展示角色）
- `.meta/candidates.md` — 原始候选池记录（pipeline 内部存档）

---

## 前处理产出结构

```
workflow/research/
├── README.md                    ← 总览导航（用户第一眼看到的）
└── .meta/
    ├── capability-graph.json    ← 原子能力图谱（结构化数据）
    └── candidates.md            ← 原始候选池记录（内部存档）
```

### 数据流关系

```
capability-graph.json  ←── 被 README.md 引用（学习路径摘要从 JSON 派生）
                     ←── 被后处理 agent 直接读取（阶段一筛选能力）
                     ←── 被 capabilities/README.md 引用（能力索引从 JSON 派生）

candidates.md (.meta) ←── 原始扫描记录，pipeline 内部存档，不面向用户
```

---

## README.md 结构（总览导航）

```markdown
# <研究主题> — 命题研究

> 目标人群：<年限>
> 扫描时间：<日期>
> 扫描范围：<描述>

## 命题索引

| # | 命题 | 四维评分 | 优先级 | 研究目录 |
|---|------|---------|--------|---------|
| P1 | 长列表渲染：... | 10 | high | [01-长列表渲染](01-长列表渲染/) |
| P2 | 首屏白屏：... | 10 | high | [02-首屏白屏](02-首屏白屏/) |
| ... | | | | |

## 学习路径（Top 3 战略高地）

1. 🏔️ **A8-DevTools 性能分析**（覆盖 7/7 命题）→ 所有诊断的起点
2. 🏔️ **A1-浏览器渲染管线**（覆盖 5/7 命题）→ 框架无关的底层基础
3. 🏔️ **A2-DOM 节点生命周期**（覆盖 4/7 命题）→ 深化渲染下游理解

完整能力图谱：[capabilities/README.md](capabilities/README.md)
结构化数据：[.meta/capability-graph.json](.meta/capability-graph.json)

## 能力知识库

按原子能力组织的跨命题参考手册：[capabilities/](capabilities/)
```

---

## 摘要回传

前处理完成后，输出 ≤200 字摘要：
- 识别了多少个命题
- 战略高地排序（Top 3）
- 推荐修炼路径
- 入池/淘汰统计
- 产出目录结构
