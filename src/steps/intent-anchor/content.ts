// 内容域:意图锚定。锚点数量、年限推断链、role/level 约束、拦截词为唯一数据源。
export const ANCHOR_COUNT = { min: 8, max: 15 } as const;

/** role 与 level 的强制约束(唯一出处) */
export const LEVEL_ROLE_CONSTRAINT =
    'core=target_level、premise=target_level-1、outlook=target_level+1';

/** 跳过头脑风暴的场景化拦截词(B7-A:与 src/steps/intent-anchor/assets/skip-rules.md 并集统一) */
export const INTERCEPT_WORDS = [
    '面试',
    '场景',
    '分析',
    '复杂',
    '考察',
    '问',
    '中大型',
    '多团队',
] as const;

/** 年限推断优先级链(从高到低) */
export const YEAR_INFERENCE_CHAIN = [
    '显式参数 --year',
    '显式数字，例如 3-5 年',
    '隐式信号，例如 高级、架构师、面试准备',
    '无信号默认 L2',
] as const;

export function target(): string {
    return `生成 ${ANCHOR_COUNT.min}-${ANCHOR_COUNT.max} 个锚点并注入策略元数据`;
}

export function detail(): string {
    const chain = YEAR_INFERENCE_CHAIN.map((s, i) => `${i + 1}. ${s}`).join('\n');
    return `年限推断优先级：

${chain}

锚点生成要求：

- 数量 ${ANCHOR_COUNT.min}-${ANCHOR_COUNT.max} 个
- 每个锚点包含 id、name、provisional_level、provisional_role、reasoning、description、type、tags
- role 与 level 强制约束：${LEVEL_ROLE_CONSTRAINT}`;
}

export function skipSection(): string {
    const words = INTERCEPT_WORDS.join('、');
    return `跳过头脑风暴需要同时满足：

- topic 明确，tech_stack 都是具体工具/框架名
- 年限推断置信度高
- 无场景化拦截词，例如 ${words}

否则进入 {{step:brainstorm}}。`;
}

export function anchorTask(): string {
    return `提取 ${ANCHOR_COUNT.min}-${ANCHOR_COUNT.max} 个核心技术关键词。
为每个关键词标注 provisional_level 和 provisional_role。
从 strategy-level 注入 core_label、premise_label、outlook_label 和 ratios。
写入 anchors.json。`;
}

/** verify.count 文案 */
export function countVerifyText(): string {
    return `锚点数量为 ${ANCHOR_COUNT.min}-${ANCHOR_COUNT.max} 个`;
}

/** fail.halt 触发词 */
export function insufficientAnchorsText(): string {
    return `锚点不足 ${ANCHOR_COUNT.min} 个`;
}
