// 内容域:能力图谱。去重规则、战略价值公式与三档阈值、能力上限为唯一数据源。
// 注意阈值以字符串保存(4.0 而非 4),保证派生文本与原文逐字节一致。
export const HIGHGROUND_THRESHOLDS = {
    tier1Min: '4.0',
    tier2Range: '2.0-3.9',
    tier3Range: '1.0-1.9',
} as const;

/** 能力数量上限(超过时 checkpoint 提示 --filter) */
export const CAPABILITY_MAX = 30 as const;

export function detail(): string {
    return `能力去重：

第一轮按名称+层级匹配。
第二轮读取 raw-materials 内容做语义比对。
描述一致则合并，描述不同则拆分，并记录 merge_trace/split_trace。

依赖推断：

1. 技术层级关系
2. 内容前置引用
3. covers 交集

高置信度直接写入，中置信度附带 dependencies_trace。`;
}

export function highgroundSection(): string {
    return `strategic_value = fanout.count x (1 / coupling)。

一级高地 >= ${HIGHGROUND_THRESHOLDS.tier1Min}。
二级高地 ${HIGHGROUND_THRESHOLDS.tier2Range}。
三级营地 ${HIGHGROUND_THRESHOLDS.tier3Range}。

高地 A 依赖高地 B 时，B 的实际价值叠加 A。`;
}

export function dedupeTask(): string {
    return `提取 capability_web 雏形。
按名称+层级匹配候选合并。
读取关联 material 做语义比对。
记录 merge_trace 或 split_trace。`;
}

export function highgroundTask(): string {
    return `计算每个能力 strategic_value。
按阈值分级。
执行高地依赖累积。
输出 highgrounds.json 和 learning-path.json。`;
}

/** fail.checkpoint 触发词 */
export function capabilityOverflowText(): string {
    return `能力数量超过 ${CAPABILITY_MAX}`;
}
