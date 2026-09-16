import type { KeyMap, SourceRef } from 'skillnomad';
import { createRefs } from 'skillnomad';

/**
 * **产物实体声明（8.16 产物路径投射 · 业务顶层）**
 *
 * 产物路径模型是从学习模型中投射出来的（老板裁定）——实体 = 业务顶层**已有领域概念**，
 * 只登记不发明（R2 红线）。27 条 runtime 产物归入 8 组概念：
 * intent / brainstorm / partition / scan / capability / evaluation / ladder + 机制产物。
 *
 * **kind**：
 * - `learning`：学习域产物（会话内生成）
 * - `asset`：长期资产（跨命题累积，如 capabilities/*.md —— M2 双身份）
 * - `mechanism`：管线机制产物（无领域概念，如 run/executionPlan）
 *
 * **schema**：格式契约投影（③A 裁决——schemas.md 跟随产物实体，不再是独立自身模块）。
 */
export type EntityKind = 'learning' | 'asset' | 'mechanism';

export interface ProductEntity {
    /** 领域概念（对应 domain/ 或 content/ 模块，只登记不发明） */
    concept: string;
    /** 产物落点（路径模板）——唯一事实来源，替代 contracts.ts runtime 表手写 */
    artifact: string;
    kind: EntityKind;
    description: string;
    /** 格式契约投影（schemas.md，③A：跟随实体） */
    schema?: string;
}

export const entities: Record<string, ProductEntity> = {
    // ── intent（content/intent.ts）────────────────────────────
    anchors: { concept: 'intent', artifact: '{workDir}/.meta/brainstorm/anchors.json', kind: 'learning', description: '共享骨架', schema: 'assets/00-intent-anchor/schemas.md' },

    // ── brainstorm（content/brainstorm.ts）────────────────────
    requirementWeb: { concept: 'brainstorm', artifact: '{workDir}/.meta/requirement-web.json', kind: 'learning', description: '需求网', schema: 'assets/01-brainstorm/schemas.md' },

    // ── partition（content/partition.ts）──────────────────────
    partitionAnalysis: { concept: 'partition', artifact: '{workDir}/.meta/partition-analysis.json', kind: 'learning', description: '分区分析', schema: 'assets/02-partition/schemas.md' },
    dependencyGraph: { concept: 'partition', artifact: '{workDir}/.meta/dependency-graph.json', kind: 'learning', description: '依赖图' },
    executionPlan: { concept: 'partition', artifact: '{workDir}/execution-plan.md', kind: 'mechanism', description: '执行计划' },

    // ── scan（content/scan.ts）────────────────────────────────
    scanIndex: { concept: 'scan', artifact: '{workDir}/.meta/.raw-materials/index.json', kind: 'learning', description: '素材索引', schema: 'assets/03-scan/schemas.md' },
    scanMaterials: { concept: 'scan', artifact: '{workDir}/.meta/.raw-materials/*.md', kind: 'learning', description: '素材正文' },
    candidates: { concept: 'scan', artifact: '{workDir}/.meta/candidates.md', kind: 'learning', description: '候选池' },

    // ── capability（content/capability.ts，最大簇）─────────────
    capabilityGraph: { concept: 'capability', artifact: '{workDir}/.meta/capability-graph.json', kind: 'learning', description: '能力图谱' },
    capabilities: { concept: 'capability', artifact: '{workDir}/capabilities/*.md', kind: 'asset', description: '能力主文件（跨命题长期资产）' },
    summaries: { concept: 'capability', artifact: '{workDir}/.meta/summaries/*.json', kind: 'learning', description: '能力摘要' },
    capabilitiesReadme: { concept: 'capability', artifact: '{workDir}/capabilities/README.md', kind: 'asset', description: '能力索引' },
    highgrounds: { concept: 'capability', artifact: '{workDir}/.meta/highgrounds.json', kind: 'learning', description: '战略高地' },
    researchPlan: { concept: 'capability', artifact: '{workDir}/.meta/research-plan.json', kind: 'learning', description: '能力研究素材分配与 usage trace' },
    briefing: { concept: 'capability', artifact: '{workDir}/.meta/briefings/{seq}-{short_name}.md', kind: 'learning', description: '命题 Briefing' },
    readme: { concept: 'capability', artifact: '{workDir}/README.md', kind: 'asset', description: '命题总览' },
    overview: { concept: 'capability', artifact: '{workDir}/{seq}-{short_name}/overview.md', kind: 'learning', description: 'Overview' },
    edgeCases: { concept: 'capability', artifact: '{workDir}/{seq}-{short_name}/edge-cases.md', kind: 'learning', description: 'Edge Cases' },
    tradeoffs: { concept: 'capability', artifact: '{workDir}/{seq}-{short_name}/trade-offs.md', kind: 'learning', description: 'Trade-offs' },
    references: { concept: 'capability', artifact: '{workDir}/{seq}-{short_name}/references.md', kind: 'learning', description: 'References' },
    experiment: { concept: 'capability', artifact: '{workDir}/{seq}-{short_name}/experiment/README.md', kind: 'learning', description: 'Experiment' },

    // ── evaluation（content/evaluation.ts）────────────────────
    evaluations: { concept: 'evaluation', artifact: '{workDir}/.meta/evaluations.json', kind: 'learning', description: '评估结果', schema: 'assets/05-evaluate-pool/schemas.md' },

    // ── ladder（content/ladder.ts）─────────────────────────────
    ladder: { concept: 'ladder', artifact: '{workDir}/{seq}-{short_name}/learning-ladder.md', kind: 'learning', description: '学习阶梯' },
    learningPath: { concept: 'ladder', artifact: '{workDir}/.meta/learning-path.json', kind: 'learning', description: '学习路径' },

    // ── 机制产物（无领域概念）─────────────────────────────────
    run: { concept: 'initialize', artifact: '{workDir}/.meta/run/run.json', kind: 'mechanism', description: '运行信封' },
    init: { concept: 'initialize', artifact: '{workDir}/.meta/init.json', kind: 'mechanism', description: '初始化结果' },
    assemblyRatioTrace: { concept: 'assemble', artifact: '{workDir}/{seq}-{short_name}/_assembly_ratio_trace.json', kind: 'mechanism', description: '组装特化占比 trace（有 EFFECT 保证）' },
} satisfies Record<string, ProductEntity>;

/**
 * **markrefs 接入（P1b）**：键表（名字→路径）由本表派生（唯一事实来源不搬家）；
 * 引用登记在 `refOf`／`schemaRef` 内自动发生——118 处调用点文字不变。
 * 构建期由框架（skillnomad build）调用 markrefs 校验：名字在表、目标存在、重复定义。
 */
export const refs = createRefs();

export const markrefsKeys: KeyMap = {
    entries: Object.entries(entities).map(([name, entity]) => ({
        name,
        path: entity.artifact,
        scope: 'entity',
        site: 'src/domain/entities.ts',
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
    if (!e) throw new Error(`未知产物实体: ${String(name)}（8.16：实体只登记不发明，请先登记）`);
    refs.ref(name, e.artifact);
    return { path: e.artifact, description: e.description, required: true };
}

/**
 * **格式契约引用（schemaRef）**：按实体名取该实体的格式投影（③A——schemas 跟随实体）。
 */
export function schemaRef(name: keyof typeof entities): SourceRef & { path: string } {
    const e = entities[name];
    if (!e?.schema) throw new Error(`实体 ${String(name)} 未登记格式契约（schema）`);
    refs.refPath(e.schema);
    return { path: e.schema, description: `${e.description} 格式契约`, required: true };
}
