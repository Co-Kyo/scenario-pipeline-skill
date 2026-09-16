// 内容域共享常量与片段。所有片段必须与流程版原文逐字一致(零差异纪律)。
// 双写收敛记录:RATIO_CLAUSE/SCENARIO_MINIMUM 消解 assembly 组内部双写(R2 第二刀 prompts.ts 按步拆分前);
// PARALLEL_WIDTH 为并行宽度唯一源：scan 批次公式与 research 依赖编排均插值引用本常量（R2e-P1c）。

/** 并行宽度:scan 批次公式 W = min(PARALLEL_WIDTH, 命题数) */
export const PARALLEL_WIDTH = 5 as const;

/** 内容比例条款(assembly Markdown Agent 的 detail 与 task 双写收敛) */
export const RATIO_CLAUSE = '内容比例：通用高地 <= 70%，场景化/特化内容 >= 30%。';

/** 场景化最小条款(同上双写收敛) */
export const SCENARIO_MINIMUM = '至少 3 个场景化输入、3 个边界、3 个验证点。';
