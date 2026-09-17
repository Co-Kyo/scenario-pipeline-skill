// 效果契约:结尾产物的既有保证,显式化为源码级数据。
// Phase R:仅数据 + 单测,不渲染进产物(产物零变更);
// Phase I 的信号落盘(judgment/stuck/time 记录)在此扩展,并按登记差异渲染。
// owns = 违约时应修改的源码位置(指向语义的现居地:领域模块 + 对应 schema 资产);
// 路径存在性由 effects.test.ts 校验。渲染层接线(消费方)属 Phase I 登记项。
// 数值类保证一律从领域常量派生(数据核验 A 项修正:不留硬编码字面量)。
import { LADDER_STAGE_COUNT } from '../steps/learning-ladder/content.js';
import { entities } from './entities.js';

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

/** D7:效果契约小节渲染(运行时 AI 与审计工具的消费方)。未知 id 抛错,防静默漏接。 */
export function effectContractSection(id: string): string {
    const c = EFFECT_CONTRACTS.find((x) => x.id === id);
    if (!c) throw new Error(`未知效果契约:${id}`);
    const expects = c.expects.map((e) => `- ${e}`).join('\n');
    return `本产物的效果契约 ${c.id}（违约时修改：${c.owns.join(' / ')}）：

${expects}`;
}
