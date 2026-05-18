# 云端实验复盘 — 2026-05-18

> 基于 OpenClaw 环境完整执行前处理+后处理管线的实测反馈与归属分析。
> 来源：`skill-ownership-analysis.md` + `research-log.md`
> 实验输入：微信小程序底层原理与中大型项目工程实践（3-5 年前端面试场景）

---

## 1. 实验结论：管线已验证可完整跑通

前处理和后处理均成功完成。核心数据：

- **37 次 MCP 调用**，33 次一次成功，4 次失败后修正通过
- **18 个产出文件**，约 107KB 有效内容
- **全流程耗时**：环境准备 6min + 前处理 5min + 后处理 10min ≈ 21min

这不是一次失败实验。系统从环境准备到最终交付物都工作了。6 次校验失败全部在 schema 校验层被捕获，agent 修正后通过——证明 schema 驱动的容错恢复链路是健壮的。

---

## 2. 核心洞见：理性主义架构 vs 经验主义执行器

这是本次实验暴露的最本质矛盾。

### 2.1 矛盾描述

SP-Skill 的架构核心是 **schema 驱动**——每个步骤的 `get_output_schema` 定义了输入输出契约，agent 按规则构造数据，一次性通过校验。

但 LLM agent 的行为本能是：

> **看示例 → 模仿 → 失败了再修**

而不是：

> **读规则 → 按规则构造 → 一次性通过**

这不是 agent 的错，是 LLM 训练方式决定的——few-shot 示例的权重远高于抽象规则。

### 2.2 实验证据

6 次校验失败全部是同一模式：agent 看了 `get_output_schema` 返回的 `template`（带空值的骨架）就提交，没有逐字段核对 `field_rules`。修正时也只补错误提示中的字段，不回头重读完整 schema。

| 步骤 | 首次错误数 | 缺失字段类型 |
|------|-----------|-------------|
| capability-extract | 16 | references/dependency_graph/qualifier_injection |
| highground-identify | 35 | coupling + learning_path 整套子结构 |
| submit_summary (A1) | 3 | priority/version_sensitive/suggestion |
| submit_summary (A2) | 3 | 同上 + T0 限制 + 文件名 bug |
| submit_summary (A14) | 3 | 同上 |

### 2.3 这个矛盾意味着什么

不意味着 schema 驱动错了。而是意味着系统需要：

1. **接受 agent 的试错模式**——首次提交很可能失败，关键是失败后能快速定位问题
2. **让 template 和 field_rules 的信号一致**——当前 `template` 返回的是骨架而非完整示例，同时传达了「大概长这样」和「必须包含这些」两种矛盾信号
3. **把「一次性通过」的目标替换为「快速失败 + 清晰指引」**

---

## 3. `get_output_schema` 的接口设计缺陷

### 3.1 template 字段产生系统性误导

当前 `get_output_schema` 返回的 template 是带空值占位的骨架：

```json
{
  "materials": [{
    "id": "RM-01",
    "title": "（文章标题）",
    "url": "https://..."
  }]
}
```

agent 看到这个骨架，本能地认为「这些是可选字段，我按这个格式填就行」。但实际的 `field_rules` 里还有大量必填字段没在模板中展示。

### 3.2 修法

所有 `strict_notes` 首行已加 ⚠️ 警告：

> template 仅为格式示意，所有必填字段的完整定义以 field_rules 为准。提交前必须逐字段核对 field_rules。

但这是缓解措施，不是根本解。根本解是让 template 从 schema 自动生成完整的、可直接提交的示例，消除手动维护带来的不一致。

---

## 4. 实验暴露的 Skill Bug 清单

### 4.1 已修复

| 问题 | 严重度 | 文件 | 修复内容 |
|------|--------|------|---------|
| submit_output 缺 highground-identify | P0 | submit-output.ts | STEP_FILE_MAP 补一行 |
| save_state 静默失败 | P0 | save-state.ts | 绝对路径校验 + atomic write + 回读验证 |
| get_template 抛底层错误 | P0 | get-template.ts | 参数校验提前到数据加载前 |
| 文件名 `/` 字符未 sanitize | P0 | submit-summary.ts | 替换 / \0 .. 等危险字符 |
| submit_summary 禁止 T0 | P0 | summary/schema.ts | TIER_VALUES 改为 T0/T1/T2 |
| delegate_task 硬编码 | P1 | pre-process.md | 平台兼容说明 |
| web_search 硬编码 | P1 | pre-process.md | 工具不绑定标注 |
| propositions 模板误导 | P2 | capability-graph.schema.ts | 标注自动注入 |
| highground_hits 必填过早 | P2 | evaluations.schema.ts | 改为可选 |
| template 误导 agent | P1 | get-output-schema.ts + get-summary-schema.ts | strict_notes 首行加 ⚠️ 警告 |

### 4.2 未修复（设计决策，非 bug）

| 问题 | 原因 |
|------|------|
| classify_sources 中文域名 unknown 过多 | T0 内置映射仅有 31 个英文域名，中文社区需要运行时动态注册。这不是 bug，是初始数据集的选择 |
| register_source 无批量接口 | 设计上信源注册需要逐条审核，批量接口会降低审核粒度 |
| get_output_schema 不返回完整示例 | 当前骨架模板+field_rules 的设计意图是「agent 按规则构造」，但实验证明这个意图不成立 |

---

## 5. 系统的韧性设计

尽管有多次校验失败，管线仍在合理轮次内完成了所有步骤。这得益于：

1. **校验前置**：`submit_output` / `submit_summary` 在写入前校验，不会产生脏数据
2. **错误可读**：错误信息包含具体字段名和期望值，agent 能据此修正
3. **修正闭环**：agent 修正后重新提交，不需要人工干预

当前的成功率依赖于三个要素：

- 错误提示足够明确
- 模型推理能力足够强（能从错误中推导出正确数据）
- 字段缺失是有限的（1-2 轮即可补全）

这不是一个可以无限扩展的模式——随着 schema 变复杂，单次修正可能遗漏更多关联字段。

---

## 6. 识别谁做对了什么

### 6.1 Agent 做对了的（值得保留的模式）

1. **环境准备极扎实**：GitHub 镜像测延迟 → 选最快可用 → clone → 构建 → 注册 → 自检，比大多数人工操作都严谨
2. **搜索策略好**：8 路关键词覆盖不同维度（原理/工程/跨端/性能/工具链），最后补了 `site:` 定向搜索
3. **JS 渲染页面有兜底**：web_fetch 拿不到掘金/知乎内容时，用搜索摘要补充信息

### 6.2 Agent 做错了的（需要优化的模式）

1. **「看示例不看 schema」**：6 次校验失败中 5 次根因在此
2. **「头痛医头」修正**：修正时只补错误提示中的字段，不回头读完整 field_rules
3. **SPA 页面未用 browser 工具**：browser 已配置但 agent 始终没用

---

## 7. 核心架构价值

SP-Skill 的真正创新不是「扫描 → 分词 → 提取 → 评估 → 研究 → 组装」这个流程——很多系统都有类似阶段。

真正的架构价值：

### 7.1 L2/L3/L4 分级

不是平铺的步骤，而是不同推理深度的分层：
- **L4**（Scan）：工具调用，无推理要求
- **L3**（Decompose/Extract/Identify/Evaluate）：需领域知识的结构化推理
- **L2**（Research/Assemble）：确定性模板执行，子 agent 可独立完成

### 7.2 MCP 作为事实来源

schema、模板、路径、状态全部由 MCP 统一管理。agent 是「只写不读」的执行器——执行指令来自 `get_template`，输出标准来自 `get_output_schema`，路径来自 `resolve_paths`。

### 7.3 Schema 驱动三件套

```
get_output_schema(step) → 拿到输出标准
按标准执行              → 生成内容
submit_output(step)    → 校验 + 写入
```

把步骤间的契约从隐式（文档约定）变为显式（代码强制）。这是系统最值得保护的架构决策。

---

## 8. 持续注意事项

### 8.1 SSoT 腐烂风险

SKILL.md 和 MCP schema 是两套独立维护的信息源。任何文档与代码的修改都需要同时更新两端。当前没有自动同步机制。

### 8.2 中文技术社区的初始覆盖

T0 内置映射主要是英文官方文档。中文技术社区（CSDN、掘金、知乎、SegmentFault、腾讯云开发者社区等）需要通过运行时 `register_source` 动态注册。首次扫描会因此多出约 12 次 MCP 调用，这是正常行为。

### 8.3 文件名安全性

任何从 agent 输入（capability name、proposition title 等）拼接路径的地方都需要 sanitize。当前已在 `submit-summary.ts` 做了，但其他路径拼接点也需要审计。
