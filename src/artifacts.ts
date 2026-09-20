// 本 skill 的文件全图：产出什么（产物登记）、读什么（输入资产）、保什么（效果契约）。
// 产物路径只写在本文件：步骤源码用 refOf(name) 引用，不出现路径字面量;
// 契约登记的输入资产路径由下方 assets 表派生，不二次手写。
import type { KeyMap, SourceRef } from 'skillnomad';
import { createRefs } from 'skillnomad';
import { LADDER_STAGE_COUNT } from './steps/learning-ladder/content.js';

/**
 * **产物实体声明**：产物路径的**单一登记处**。
 *
 * 每条 = 产物落点（路径模板）＋描述（＋可选的格式契约 schemas.md）。
 */
export interface ProductEntity {
    /** 产物落点（路径模板）——唯一事实来源 */
    artifact: string;
    description: string;
    /** 格式契约（schemas.md，由 assets 表派生登记） */
    schema?: string;
}

/**
 * **输入资产表**：步骤读的共享文件（不是产物，是随 skill 分发的源资产）。
 * 步骤用 `{ ...assets.<名>, as: 'contract' }` 引用；契约登记（skill-decl）的路径由此派生。
 */
export const assets = {
    // ── skill 级（3 条：跨步共用）──
    refSources: { path: 'assets/common/ref-sources.md', description: 'T0 域名表 + 反爬域名表 + 信源分级规则', required: true },
    strategyLevel: { path: 'assets/common/strategy-level.md', description: '密度参数查表', required: true },
    antiCrawlFetch: { path: 'plugins/anti-crawl-fetch.md', description: 'Playwright 抓取', required: false },
    checkpointProtocol: { path: 'assets/common/protocol-checkpoint.md', description: '检查点五步流程与跳过条件', required: true },
    decisionSummarySchema: { path: 'assets/common/decision-summary.schema.json', description: '决策摘要 shape（检查点协议引用）', required: true },
    // ── intent-anchor 步（2 条）──
    yearRules: { path: 'src/steps/intent-anchor/assets/year-rules.md', description: '年限推断规则', required: true },
    skipRules: { path: 'src/steps/intent-anchor/assets/skip-rules.md', description: '跳过判断规则', required: true },
    // ── 方法投影（2 条：评估／图谱方法论）──
    evaluationMethod: { path: 'assets/05-evaluate-pool/method.md', description: '评估方法论（投影）', required: true },
    capabilityMethod: { path: 'assets/04-capability-graph/method.md', description: '能力图谱提取方法论', required: true },
    // ── 格式契约（6 条：随产物实体，由 schemaRef 引用）──
    anchorsSchema: { path: 'src/steps/intent-anchor/assets/schemas.md', description: '共享骨架格式契约', required: true },
    requirementWebSchema: { path: 'src/steps/brainstorm/assets/requirement-web-schema.md', description: '需求网输出格式契约', required: true },
    brainstormSchema: { path: 'src/steps/brainstorm/assets/schemas.md', description: '维度报告格式契约', required: true },
    partitionSchema: { path: 'src/steps/partition/assets/schemas.md', description: '分区分析格式契约', required: true },
    scanSchema: { path: 'src/steps/scan/assets/schemas.md', description: '素材索引格式契约', required: true },
    evaluationsSchema: { path: 'src/steps/evaluate-pool/assets/schemas.md', description: '评估结果格式契约', required: true },
    capabilityGraphSchema: { path: 'src/steps/capability-graph/assets/schemas.md', description: '能力图谱输出格式契约', required: true },
    capabilityResearchSchema: { path: 'src/steps/capability-research/assets/schemas.md', description: '能力研究产出格式契约', required: true },
    briefingAssembleSchema: { path: 'src/steps/briefing-assemble/assets/schemas.md', description: 'Briefing 产出格式契约', required: true },
    assembleSchema: { path: 'src/steps/assemble/assets/schemas.md', description: '命题组装产出格式契约', required: true },
    learningLadderSchema: { path: 'src/steps/learning-ladder/assets/schemas.md', description: '学习阶梯产出格式契约', required: true },
} satisfies Record<string, SourceRef>;

export const entities: Record<string, ProductEntity> = {
    // ── intent（steps/intent-anchor/content.ts；文件夹：与步骤同目录）────────────────────────────
    anchors: { artifact: '{workDir}/.meta/brainstorm/anchors.json', description: '共享骨架', schema: assets.anchorsSchema.path },

    // ── brainstorm（steps/brainstorm/content.ts；文件夹：与步骤同目录）────────────────────
    requirementWeb: { artifact: '{workDir}/.meta/requirement-web.json', description: '需求网', schema: assets.brainstormSchema.path },

    // ── partition（steps/partition/content.ts；与步骤同目录）──────────────────────
    partitionAnalysis: { artifact: '{workDir}/.meta/partition-analysis.json', description: '分区分析', schema: assets.partitionSchema.path },
    dependencyGraph: { artifact: '{workDir}/.meta/dependency-graph.json', description: '依赖图' },
    executionPlan: { artifact: '{workDir}/execution-plan.md', description: '执行计划' },

    // ── scan（steps/scan/content.ts）────────────────────────────────
    scanIndex: { artifact: '{workDir}/.meta/.raw-materials/index.json', description: '素材索引', schema: assets.scanSchema.path },
    scanMaterials: { artifact: '{workDir}/.meta/.raw-materials/*.md', description: '素材正文' },
    candidates: { artifact: '{workDir}/.meta/candidates.md', description: '候选池' },

    // ── capability（steps/capability-graph/content.ts，最大簇）─────────────
    capabilityGraph: { artifact: '{workDir}/.meta/capability-graph.json', description: '能力图谱', schema: assets.capabilityGraphSchema.path },
    capabilities: { artifact: '{workDir}/capabilities/*.md', description: '能力主文件（跨命题长期资产）' },
    summaries: { artifact: '{workDir}/.meta/summaries/*.json', description: '能力摘要' },
    capabilitiesReadme: { artifact: '{workDir}/capabilities/README.md', description: '能力索引' },
    highgrounds: { artifact: '{workDir}/.meta/highgrounds.json', description: '战略高地' },
    researchPlan: { artifact: '{workDir}/.meta/research-plan.json', description: '能力研究素材分配与 usage trace', schema: assets.capabilityResearchSchema.path },
    briefing: { artifact: '{workDir}/.meta/briefings/{seq}-{short_name}.md', description: '命题 Briefing', schema: assets.briefingAssembleSchema.path },
    readme: { artifact: '{workDir}/README.md', description: '命题总览' },
    overview: { artifact: '{workDir}/{seq}-{short_name}/overview.md', description: 'Overview', schema: assets.assembleSchema.path },
    edgeCases: { artifact: '{workDir}/{seq}-{short_name}/edge-cases.md', description: 'Edge Cases' },
    tradeoffs: { artifact: '{workDir}/{seq}-{short_name}/trade-offs.md', description: 'Trade-offs' },
    references: { artifact: '{workDir}/{seq}-{short_name}/references.md', description: 'References' },
    experiment: { artifact: '{workDir}/{seq}-{short_name}/experiment/README.md', description: 'Experiment' },

    // ── evaluation（steps/evaluate-pool/content.ts）────────────────────
    evaluations: { artifact: '{workDir}/.meta/evaluations.json', description: '评估结果', schema: assets.evaluationsSchema.path },

    // ── ladder（steps/learning-ladder/content.ts）─────────────────────────────
    ladder: { artifact: '{workDir}/{seq}-{short_name}/learning-ladder.md', description: '学习阶梯', schema: assets.learningLadderSchema.path },
    learningPath: { artifact: '{workDir}/.meta/learning-path.json', description: '学习路径' },

    // ── 机制产物（无领域概念）─────────────────────────────────
    run: { artifact: '{workDir}/.meta/run/run.json', description: '运行信封' },
    init: { artifact: '{workDir}/.meta/init.json', description: '初始化结果' },
    assemblyRatioTrace: { artifact: '{workDir}/{seq}-{short_name}/_assembly_ratio_trace.json', description: '组装特化占比 trace（有 EFFECT 保证）' },
} satisfies Record<string, ProductEntity>;


/**
 * **markrefs 接入**：键表（名字→路径）由产物表派生；
 * 引用登记在 `refOf`／`schemaRef` 内自动发生。
 * 构建期由框架（skillnomad build）做引用校验：名字在表、目标存在、重复定义。
 */
export const refs = createRefs();

// 输入资产路径登记（改路径只改上表一处）
for (const asset of Object.values(assets)) {
    refs.refPath(asset.path);
}

export const markrefsKeys: KeyMap = {
    entries: Object.entries(entities).map(([name, entity]) => ({
        name,
        path: entity.artifact,
        scope: 'entity',
        site: 'src/artifacts.ts',
    })),
};

/** 传给框架的 markrefs 输入（见 skillnomad.config.ts） */
export const markrefs = { keys: markrefsKeys, refs };

/**
 * **概念引用辅助（refOf）**：按实体名取 SourceRef——步骤源码不再出现路径字面量，
 * 路径只存在于 entities 声明（唯一事实来源）。框架渲染/校验仍以 path 为准。
 * 返回类型收窄 `path: string`（refOf 保证已解析）。
 */
export function refOf(name: keyof typeof entities): SourceRef & { path: string } {
    const e = entities[name];
    if (!e) throw new Error(`未知产物实体: ${String(name)}（实体只登记不发明，请先登记）`);
    refs.ref(name, e.artifact);
    return { path: e.artifact, description: e.description, required: true };
}

/**
 * **格式契约引用（schemaRef）**：按实体名取该实体的格式契约。
 */
export function schemaRef(name: keyof typeof entities): SourceRef & { path: string } {
    const e = entities[name];
    if (!e?.schema) throw new Error(`实体 ${String(name)} 未登记格式契约（schema）`);
    refs.refPath(e.schema);
    return { path: e.schema, description: `${e.description} 格式契约`, required: true };
}

// ─────────────────────────────────────────────────────────────
// 效果契约：产物的既有保证，显式化为源码级数据。
// owns = 违约时应修改的源码位置（指向语义的现居地：步骤内容域 + 对应 schema 资产）；
// 路径存在性由 effects.test.ts 校验。数值类保证一律从步骤内容域常量派生，不留硬编码字面量。
// ─────────────────────────────────────────────────────────────

export interface EffectContract {
    id: string;
    artifact: string;
    owns: readonly string[];
    expects: readonly string[];
}

export const EFFECT_CONTRACTS: readonly EffectContract[] = [
    {
        id: 'E-ladder-judgment',
        artifact: entities.ladder.artifact,
        owns: ['src/steps/learning-ladder/content.ts', 'src/steps/learning-ladder/assets/schemas.md'],
        expects: [
            '每个阶梯 Step 有「做到才算过」二值验证标准',
      `阶段数 ${LADDER_STAGE_COUNT.min}-${LADDER_STAGE_COUNT.max}`,
      '失败时给出明确回退指引',
        ],
    },
    {
        id: 'E-capability-coverage',
        artifact: entities.capabilities.artifact,
        owns: ['src/steps/capability-research/content.ts', 'src/steps/capability-research/assets/schemas.md'],
        expects: [
            '每个 fetch_status=ok 素材至少分配到一个能力,不能静默丢弃',
            '每个摘要包含 material_usage(逐条 material_id/file_path/usage/selection_reason)',
            '分组上限 5 个能力',
        ],
    },
    {
        id: 'E-briefing-trace',
        artifact: entities.briefing.artifact,
        owns: ['src/steps/briefing-assemble/content.ts', 'src/steps/briefing-assemble/assets/schemas.md'],
        expects: ['场景化 Trace >= 3/3/3', '缺失能力摘要时标注缺失并继续'],
    },
    {
        id: 'E-assemble-ratio',
        artifact: entities.assemblyRatioTrace.artifact,
        owns: ['src/steps/assemble/content.ts', 'src/steps/assemble/assets/schemas.md'],
        expects: [
            '通用高地 <= 70%,场景化/特化内容 >= 30%',
            '至少 3 个场景化输入、3 个边界、3 个验证点',
            'trace 记录 generic_pct/scenario_pct 与各项计数',
        ],
    },
];

/** 效果契约小节渲染(运行时 AI 与审计工具的消费方)。未知 id 抛错,防静默漏接。 */
export function effectContractSection(id: string): string {
    const c = EFFECT_CONTRACTS.find((x) => x.id === id);
    if (!c) throw new Error(`未知效果契约:${id}`);
    const expects = c.expects.map((e) => `- ${e}`).join('\n');
    // owns 是维护者注记（"违约时改哪里"）：留在源码侧（effects.test 校验路径存在），不渲染进部署物。
    return `本产物的效果契约 ${c.id}：

${expects}`;
}
