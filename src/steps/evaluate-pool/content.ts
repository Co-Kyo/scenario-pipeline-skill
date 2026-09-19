// 内容域:评估入池。四维评分维度、防虚高规则、年限阈值为唯一数据源。
export const SCORE_DIMENSIONS = [
    'cross_stack_coupling：跨栈耦合',
    'doc_vacuum：文档真空',
    'experience_barrier：经验壁垒',
    'topical_heat：时事热度',
] as const;

export function detail(): string {
    const dims = SCORE_DIMENSIONS.map((d) => `- ${d}`).join('\n');
    return `四维评分：

${dims}

每个维度 1-3 分，总分 12。

防虚高：4 个维度均 >= 2 时必须重新审视并压低至少 1 分，除非有明确论据。`;
}

export function thresholdSection(): string {
    return `L1：通常不入池。
L2：总分 >= 6。
L3：总分 >= 5。
L4：任一维度 >= 2 即入池。

一票入池条件：多源讨论、明确 trade-off、新兴与既有体系碰撞。`;
}

export function scoreTask(): string {
    return `逐维打分、记录依据、防虚高的通用做法见模块附录（evaluate-methods）；本任务按下列步骤执行：
对每个命题按四维矩阵打分。
记录每个维度的 reasoning。
检查防虚高规则（阈值见下文详细说明）。
写入 evaluations.json。`;
}

export function archiveTask(): string {
    return `阈值门禁、直通、难度分级与排序的通用做法见模块附录（evaluate-methods）；本任务按下列步骤执行：
按年限阈值判定 priority。
记录 priority_trace。
评估 difficulty 和 recommended_order。
生成 README.md 和 candidates.md。`;
}
