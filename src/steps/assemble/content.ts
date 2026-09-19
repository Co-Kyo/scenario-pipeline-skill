// 内容域:命题组装。双 Agent 分工、任务模板为唯一数据源。
// 本步私有条款：只被本步 detail/task 引用，不跨步。
export const RATIO_CLAUSE = '内容比例：通用高地 <= 70%，场景化/特化内容 >= 30%。';
export const SCENARIO_MINIMUM = '至少 3 个场景化输入、3 个边界、3 个验证点。';

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
