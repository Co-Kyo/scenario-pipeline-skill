// 这个 skill 向框架声明什么：内容模块、契约登记、skill 级策略、并发口径。
// 读者时刻：我要把它接进框架（加包/改路径/改 skill 级口径）。
// 消费者：skill.ts、skillnomad.config.ts（装配面）；并发口径另被 scan / capability-research 的内容引用。
//
// 路径单源：输入资产的路径写 artifacts.ts 的 assets 表，本文件的登记由此派生（不二次手写）。
import { defineModule, packageModule } from 'skillnomad';
import type { SourceContract, SourceModule, SourcePolicies, SourceRef } from 'skillnomad';
import { fileURLToPath } from 'node:url';
import { assets } from './artifacts.js';

/** skill 级策略声明（框架 policies 字段）。 */
export const policies: SourcePolicies = {
    contextIsolation: true,
    reuseByFileExistence: true,
    checkpointRequired: true,
    traceFields: [
        'year_inference_trace',
        'source_tier',
        'dependencies_trace',
        'merge_trace',
        'split_trace',
        'priority_trace',
        '筛选_trace',
    ],
    runtimeTrace: {
        enabled: true,
        logDir: '{workDir}/.meta/run',
        eventTypes: [
            'step_start',
            'step_end',
            'file_written',
            'validation_failed',
            'validation_passed',
            'retry',
            'degrade',
            'fallback',
            'self_corrected',
            'reuse_skipped',
            'barrier_rejected',
            'barrier_confirmed',
            'user_modified',
            'task_timeout',
            'task_failed',
            'judgment_passed',
            'judgment_failed',
            'judgment_stuck',
        ],
    },
};

/** 并发口径（skill 级）：scan 批次公式与 capability-research 依赖编排引用；改这里两处跟随。 */
export const CONCURRENCY_LIMIT = 5 as const;
export const WINDOW_BUDGET = { maxWindowSize: 4, inputChunkTokens: 6000, itemSummaryTokens: 500 } as const;
export const BATCH_POLICY = { mode: 'rolling_window' as const, maxBatchSize: 3, slotOccupancy: 1 } as const;

/**
 * 内容模块（内置内容包，src/packages/*）：**纯声明**（skill.json ＋ blocks），
 * 由框架装载器读懂并组合——包内没有可执行入口，组合是编译器的职责。
 */
export const parallelMethods: SourceModule = defineModule(
    packageModule(fileURLToPath(new URL('./packages/parallel', import.meta.url))),
);

export const evaluateMethods: SourceModule = defineModule(
    packageModule(fileURLToPath(new URL('./packages/evaluate', import.meta.url))),
);

export const partitionMethods: SourceModule = defineModule(
    packageModule(fileURLToPath(new URL('./packages/partition', import.meta.url))),
);

export const capabilityMethods: SourceModule = defineModule(
    packageModule(fileURLToPath(new URL('./packages/capability', import.meta.url))),
);

export const brainstormRulesMethods: SourceModule = defineModule(
    packageModule(fileURLToPath(new URL('./packages/brainstorm-rules', import.meta.url))),
);

export const modules: SourceModule[] = [parallelMethods, evaluateMethods, partitionMethods, capabilityMethods, brainstormRulesMethods];

/** 内容包引用（逻辑路径，不落盘）：步骤 reads 引用它 → 构建期渲染该包附录。 */
export const parallelMethodRef: SourceRef = {
    path: 'assets/01-brainstorm/parallel-method.md',
    description: '并行分析方法（内容包正本）',
};

export const brainstormRulesMethodRef: SourceRef = {
    path: 'assets/01-brainstorm/brainstorm-rules-method.md',
    description: '头脑风暴执行规则（内容包正本）',
};

export const evalMethodRef: SourceRef = {
    path: 'assets/05-evaluate-pool/evaluate-method.md',
    description: '评估方法通用形状（内容包正本）',
};

export const partitionMethodRef: SourceRef = {
    path: 'assets/02-partition/partition-method.md',
    description: '依赖分区通用形状（内容包正本）',
};

export const capabilityMethodRef: SourceRef = {
    path: 'assets/04-capability-graph/capability-method.md',
    description: '能力图谱通用形状（内容包正本）',
};

/**
 * 契约登记（框架 contracts 字段）：
 * - scope/step 是 V1／V2 校验的判据（V2：step 级只能被归属步骤引用）；
 * - 文件背条目（前 7 条）的路径从 artifacts 的 assets 表派生——改路径只改一处；
 * - 模块通道条目（后 5 条）的路径是逻辑标识，内容＝模块 render()。
 */
export const contracts: SourceContract[] = [
    // ── skill 级（3 条）──
    { id: 'ref-sources', kind: 'policy', path: assets.refSources.path, description: '信源分级与反爬域名', scope: 'skill' },
    { id: 'strategy-level', kind: 'policy', path: assets.strategyLevel.path, description: '密度参数查表', scope: 'skill' },
    { id: 'anti-crawl-fetch', kind: 'method', path: assets.antiCrawlFetch.path, description: 'Playwright 抓取', scope: 'skill' },
    // ── intent-anchor 步（2 条）──
    { id: 'year-rules', kind: 'policy', path: assets.yearRules.path, description: '年限推断规则', scope: 'step', step: 'intent-anchor' },
    { id: 'skip-rules', kind: 'policy', path: assets.skipRules.path, description: '跳过判断规则', scope: 'step', step: 'intent-anchor' },
    // ── 方法投影（2 条）──
    { id: 'evaluation-method', kind: 'method', path: assets.evaluationMethod.path, description: '评估方法论', scope: 'step', step: 'evaluate-pool' },
    { id: 'capability-method', kind: 'method', path: assets.capabilityMethod.path, description: '能力图谱提取方法论', scope: 'step', step: 'capability-graph' },
    // ── 模块通道（5 条：路径为逻辑标识，内容＝模块 render()）──
    { id: 'parallel-method', kind: 'method', path: parallelMethodRef.path, description: '并行分析方法（内容包正本）', scope: 'step', step: 'brainstorm', module: 'parallel-methods' },
    { id: 'brainstorm-rules-method', kind: 'method', path: brainstormRulesMethodRef.path, description: '头脑风暴执行规则（内容包正本）', scope: 'step', step: 'brainstorm', module: 'brainstorm-rules-methods' },
    { id: 'evaluate-method', kind: 'method', path: evalMethodRef.path, description: '评估方法通用形状（内容包正本）', scope: 'step', step: 'evaluate-pool', module: 'evaluate-methods' },
    { id: 'partition-method', kind: 'method', path: partitionMethodRef.path, description: '依赖分区通用形状（内容包正本）', scope: 'step', step: 'partition', module: 'partition-methods' },
    { id: 'capability-method-pack', kind: 'method', path: capabilityMethodRef.path, description: '能力图谱通用形状（内容包正本）', scope: 'step', step: 'capability-graph', module: 'capability-methods' },
];
