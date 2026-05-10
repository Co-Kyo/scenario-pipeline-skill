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
Step 1 ──→ ⓐ ──→ Step 2 ──→ Step 3 ──→ Step 4 ──→ Step 5 ──→ ⓑ ──→ Step 6
 scan    checkpoint   decompose   capability  highground  evaluate  checkpoint   pool
                          extract     identify
```

### Step 1：广域扫描

```
调用：processes/scan.md
输入：用户指令中的 source_desc + topic
输出：raw_materials[]（原始素材列表）
```

### ⓐ 检查点 A：扫描结果确认

> 扫描完成后暂停，向用户展示扫描摘要，确认后再进入分词。

```
展示内容：
  - 识别到 N 个信源，成功抓取 M 个
  - 筛选出 K 条相关素材（按 Tier 分布：T1=x, T2=y, T3=z）
  - Top 5 素材标题列表

用户操作：
  - "继续" → 进入 Step 2
  - "补充 <URL>" → 追加信源后重新扫描
  - "跳过 <条件>" → 过滤特定素材后继续
  - "查看全部" → 展示完整素材列表
```

**跳过条件**：`--batch=pending` 或 `--append` 模式下自动跳过检查点。

### Step 2：架构分词

```
调用：processes/decompose.md
输入：Step 1 的 raw_materials
加载条件：如果 --year → 额外加载 plugins/year-granularity.md
输出：decompositions[]（分词结果列表）
```

### Step 3：原子能力提取 + 信源 URL 预查找

```
调用：processes/capability-extract.md
输入：Step 2 的 decompositions + Step 1 的 raw_materials
输出：.meta/capability-graph.json（原子能力图谱，含每个能力的 T1/T2 参考 URL）
```

**关键变更：** Step 3 现在不仅提取原子能力，还为每个能力预查找官方文档 URL（T1）和技术博客 URL（T2）。
- 按信源域名地图（source_domain_map）的优先级查找
- T1 必须来自官方域名（MDN/Chrome DevTools/框架官网等），禁止 CSDN 等低质源
- URL 必须 web_fetch 验证过内容相关性
- T1 为空时才降级到 T2
- 查找结果写入 capability-graph.json 每个能力的 `references` 字段

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

### ⓑ 检查点 B：评估结果确认

> 评估完成后暂停，向用户展示评估摘要，确认后再入池。

```
展示内容：
  - 命题评估表（命题名 | 四维评分 | 判定）
  - 战略高地 Top 3（能力名 | 扇出度 | 战略价值）
  - 入池统计：high=N, medium=M, rejected=K

用户操作：
  - "继续" → 进入 Step 6 入池
  - "调整 <命题> 为 high/medium" → 手动调整优先级
  - "排除 <命题>" → 从候选池移除
  - "全部确认" → 跳过后续检查点，直接入池
```

**跳过条件**：`--batch=pending` 模式下自动跳过检查点。

### Step 6：入池归档

写入两个文件：
- `README.md` — 总览导航（人类可读，替代旧 candidates.md 的展示角色）
- `.meta/candidates.md` — 原始候选池记录（pipeline 内部存档）

### Step 7：状态持久化

调用 MCP 工具 `save_state`：

```json
{
  "checkpoint": "pre-process-done",
  "context": {
    "stages": {
      "pre-process": {
        "status": "completed",
        "completed_at": "<当前时间>",
        "artifacts": [".meta/capability-graph.json", ".meta/candidates.md", "README.md"]
      }
    }
  }
}
```

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
