// 研究/Briefing/组装域的提示词 API。
// 步骤定义不再内联散文,统一从此处按类型化函数获取;
// Phase R 返回文本与流程版逐字一致(行为保持)。
// Phase II:重复片段(RATIO_CLAUSE/SCENARIO_MINIMUM)收敛到 content/shared.ts。
import { RATIO_CLAUSE, SCENARIO_MINIMUM } from './content/shared.js';

export const research = {
    detail: () => `分组规则：

开始前必须先读取 {workDir}/.meta/.raw-materials/index.json，生成 {workDir}/.meta/research-plan.json。

1. 按技术层初步分组。
2. 有直接依赖的能力尽量同组。
3. 每组上限 5 个能力，不足 2 个可与相邻组合并。
4. M 系列特化能力归入其依赖的通用能力组。

依赖编排：

1. 无跨组依赖的组第一批并行。
2. 有跨组依赖的组等待依赖组完成。
3. 同一批内并行，W=5。`,
    domainAgentTask: () => `每个域 Agent 读取能力描述、扇出度、标签和参考 URL。

按依赖顺序执行：

- 无依赖能力直接产出
- 有依赖能力先读取前置摘要再产出

每个能力写入：

- {workDir}/.meta/research-plan.json
- {workDir}/capabilities/{id}-{name}.md
- {workDir}/.meta/summaries/{id}-{name}.json`,
    materialAllocation: () => `生成 research-plan.json 时必须满足：

1. 从 index.json 读取全部 fetch_status=ok 素材。
2. 按能力描述、covers、layer 和 reference 关联分配素材。
3. 每个素材的 usage 只能是 primary / supporting / optional：
   - primary：该能力独有的核心证据
   - supporting：补充机制、工具或权衡
   - optional：可复用但不是本能力必要证据
4. 每个 ok 素材必须至少出现在一个能力的 materials 中，不能静默丢弃。
5. 无法按能力边界分配的素材标记 usage=optional，并写 selection_reason。
6. 输出 coverage：ok_total、assigned_unique、optional_count、assigned_pct。

域 Agent 必须读取自己能力的 research-plan 子集，并在摘要中写 material_usage。`,
    domainAgentTemplate: () => `你是 {domain_name} 技术域的深度研究员。
研究以下原子能力，按依赖顺序执行。
先读取 {workDir}/.meta/research-plan.json 中分配给本能力的 materials 子集。
每个能力产出主文件和结构化摘要。
每个摘要必须包含 material_usage，逐条记录 material_id、file_path、usage、selection_reason。
T0 优先，缺失时按 T1/T2/T3 补充。
禁止凭记忆生成，必须 web_fetch 验证内容。`,
    capabilityFileTemplate: () => `# {capability_name}
> {description}

## 核心机制
## 工程瓶颈
## 调试工具
## 典型权衡
## 最小验证实验
## 参考资料`,
};

export const briefing = {
    detail: () => `每个命题读取涉及能力摘要。

提取：

- mechanism_summary
- bottlenecks
- tradeoffs
- experiment_code
- references

缺失能力摘要时标注缺失并继续处理其余能力。`,
    contentRatio: () => `开篇 10-15%：从限定词痛点切入。
主体 <= 70%：通用工程原理。
场景化/特化 >= 30%：限定词、上下文、边界、验证点。
收尾 10-15%：回到限定词给落地方案。

每个 Briefing 必须包含场景化 Trace，至少 3 个场景输入、3 个边界、3 个验证点。`,
    workerTask: () => `你是 {proposition_name} 的 Briefing 组装专家。
读取涉及能力摘要。
提取机制、瓶颈、权衡、实验和参考。
按内容比例组装 Briefing。
写入场景化 Trace，至少 3/3/3。
写入 {workDir}/.meta/briefings/{seq}-{short_name}.md。`,
};

export const assembly = {
    detail: () => `每个命题使用 2 个 Agent：

- Markdown Agent：overview / edge-cases / trade-offs / references
- Experiment Agent：experiment/README.md + experiment/src/

两个 Agent 无相互依赖，可并行。

完成判定：

- 两个 Agent 均完成 = 命题完成
- 一个失败 = partial
- 两个失败 = failed`,
    markdownAgent: () => `读取 Briefing 和涉及能力摘要。

按数据流顺序编排 overview。

edge-cases 至少 3 个坑点，每个坑点附带筛选_trace。

trade-offs 输出 2-3 种技术路线。

references 按 Tier 排序去重。

每个命题必须包含${SCENARIO_MINIMUM}
${RATIO_CLAUSE}
完成后写入 _assembly_ratio_trace.json，记录 generic_pct、scenario_pct 和各项计数。`,
    experimentAgent: () => `读取 Briefing。

选取战略价值最高的实验代码。

合并为可运行的 HTML/JS 文件。

README 必须包含运行方式、预期结果、成功判据、失败含义和验证检查点。`,
    markdownAgentTask: () => `你是 {proposition_name} 的 Markdown 组装专家。
读取 Briefing。
组装 overview、edge-cases、trade-offs、references。
每个坑点必须包含筛选_trace。
${RATIO_CLAUSE}
${SCENARIO_MINIMUM}
写入 _assembly_ratio_trace.json。`,
    experimentAgentTask: () => `你是 {proposition_name} 的实验组装专家。
读取 Briefing。
选取战略价值最高的实验代码。
合并为可运行 HTML/JS。
README 说明运行方式、预期结果、成功判据、失败含义和验证检查点。`,
};
