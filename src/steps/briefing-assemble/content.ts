// 内容域:Briefing 组装。提取、内容比例、Worker 任务为唯一数据源。
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
