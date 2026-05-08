# 前处理：6 步串行管线

> ⚠️ **架构观测文档** — 不是 skill 执行配置
> 执行真相：`references/pre-process.md`

> 触发：`扫描：<信息源描述>` / `deep scan：<信息源描述>`
> 执行者：单 agent 顺序执行（不 spawn）

---

## 输入

| 输入 | 来源 | 说明 |
|------|------|------|
| 用户指令 | 用户输入 | `扫描：<信息源描述>` + 可选参数 |
| 信息源 | 互联网 | URL / 搜索结果 / 用户指定来源 |

## 输出

| 输出 | 路径 | 说明 |
|------|------|------|
| 结构化图谱 | `.meta/capability-graph.json` | 原子能力 + 依赖关系 + 战略高地 + 学习路径 |
| 总览导航 | `workflow/research/README.md` | 研究范围 + 命题索引 |
| 原始记录 | `.meta/candidates.md` | 候选池原始记录 |

## 涉及文件

### Skill 内部文件

| 文件 | 角色 |
|------|------|
| `references/pre-process.md` | 编排（调用以下 processes） |
| `references/processes/scan.md` | Step 1：广域扫描 |
| `references/processes/decompose.md` | Step 2：架构分词 |
| `references/processes/capability-extract.md` | Step 3：原子能力提取 + 信源预查找 |
| `references/processes/highground-identify.md` | Step 4：战略高地识别 |
| `references/processes/evaluate.md` | Step 5：四维评估 |
| `core/scenario-matrix.md` | 信源分级定义（scan 使用） |
| `core/architecture-decomposition.md` | 架构分词定义（decompose 使用） |
| `core/capability-graph.md` | 能力图谱定义（capability-extract 使用） |
| `core/strategic-highground.md` | 战略高地定义（highground-identify 使用） |
| `plugins/year-granularity.md` | 按需：`--year` 参数时加载 |
| `plugins/source-registry.md` | Step 3 必须：信源白名单 |

### 产出文件

| 文件 | 产出步骤 |
|------|---------|
| `.meta/capability-graph.json` | Step 3 产出，Step 4 追加 |
| `.meta/candidates.md` | Step 6 产出 |
| `workflow/research/README.md` | Step 6 产出 |

---

## 执行流程

```
Step 1: scan（广域扫描）
  输入：source_desc + topic + constraints
  输出：raw_materials[]（标题+URL+摘要+Tier+日期+标签）

    ↓

Step 2: decompose（架构分词）
  输入：raw_materials
  输出：decompositions[]（命题+限定词+通用层+特化层+权重）

    ↓

Step 3: capability-extract（原子能力提取 + 信源预查找）
  输入：decompositions + raw_materials
  输出：.meta/capability-graph.json
  ⚠️ 最重步骤：每个能力 web_fetch 验证，16 个能力 ≈ 16-32 次

    ↓

Step 4: highground-identify（战略高地识别）
  输入：capability-graph.json
  输出：追加 JSON 的 highgrounds[] + learning_path[]

    ↓

Step 5: evaluate（四维评估）
  输入：decompositions + capability-graph.json + raw_materials
  输出：evaluations[]（评分+判定+高地命中+证据来源）

    ↓

Step 6: pool（入池归档）
  输入：evaluations
  输出：README.md + .meta/candidates.md
```

---

## 上下文加载

| 触发条件 | 必须加载 | 按需加载 |
|---------|---------|---------|
| 任意扫描指令 | pre-process.md + 涉及的 processes/*.md + core/*.md | — |
| 指令含 `--year` | 同上 | plugins/year-granularity.md |
| 指令含 `--digest` | core/architecture-decomposition.md + core/capability-graph.md + core/scenario-matrix.md | — |

---

## 检查点

| 检查点 | 时机 | 展示内容 |
|--------|------|---------|
| ⓒ 检查点 A | Step 1 完成后 | 扫描摘要（信源数/素材数/Tier 分布） |
| ⓒ 检查点 B | Step 5 完成后 | 评估结果（命题评分表/战略高地/入池统计） |
