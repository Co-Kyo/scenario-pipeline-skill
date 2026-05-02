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
输出：capability_graph（原子能力图谱 + 扇出度 + 限定词注入）
```

### Step 4：战略高地识别

```
调用：processes/highground-identify.md
输入：Step 3 的 capability_graph
输出：strategic_highgrounds[]（高地排序 + 修炼路径）
```

### Step 5：四维评估

```
调用：processes/evaluate.md
输入：Step 2 的 decompositions + Step 4 的 highgrounds + Step 1 的 raw_materials
输出：evaluations[]（评分 + 入池判定）
```

### Step 6：入池归档

将评估结果写入候选池，格式见下方。

---

## 候选池结构

```markdown
# 命题候选池

> 扫描范围：<描述>
> 目标人群：<年限>
> 扫描时间：<日期>

## 待处理 (Pending)

| # | 命题 | 来源 | 信源佐证 | 四维评分 | 优先级 | 战略高地命中 | 备注 |
|---|------|------|---------|---------|--------|------------|------|

## 原子能力扇出度表

| ID | 原子能力 | 扇出度 | 耦合度 | 战略价值 |
|----|---------|--------|--------|---------|

## 战略高地

| 优先级 | 高地 | 战略价值 | 修炼路径位置 |
|--------|------|---------|------------|

## 已研究 (Done)

| # | 命题 | 研究目录 | 完成时间 |
|---|------|---------|---------|

## 已淘汰 (Rejected)

| # | 命题 | 扫描时间 | 淘汰理由 |
|---|------|---------|---------|
```

候选池写入：`workflow/research/candidates.md`

---

## 摘要回传

前处理完成后，输出 ≤200 字摘要：
- 识别了多少个命题
- 战略高地排序（Top 3）
- 推荐修炼路径
- 入池/淘汰统计
