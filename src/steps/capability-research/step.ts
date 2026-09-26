import { step } from 'skillnomad';
import { doAction, barrier, fail, verify } from '../../step-parts.ts';
import { effectContractSection, assets, refOf, schemaRef } from '../../artifacts.ts';
import { research } from './content.ts';


export const capabilityResearch = step('capability-research', '能力研究')
    .target('生成能力知识库主文件、结构化摘要和索引')
    .summary('深度研究原子能力，产出知识库主文件')
    .dependsOn('evaluate-pool')
    .reads(refOf('capabilityGraph'), refOf('readme'), { ...assets.refSources, as: 'contract' }, refOf('scanIndex'), { ...schemaRef('researchPlan'), as: 'schema' }, assets.capabilityResearchMode)
    .writes(refOf('researchPlan'), refOf('capabilities'), refOf('summaries'), refOf('capabilitiesReadme'))
    .inputs(refOf('capabilityGraph').path, refOf('readme').path, refOf('scanIndex').path)
    .outputs(refOf('researchPlan').path, refOf('capabilities').path, refOf('summaries').path, refOf('capabilitiesReadme').path)
    .detail(research.detail())
    .section('域 Agent 任务', research.domainAgentTask())
    .section('素材分配与 usage trace', research.materialAllocation())
    .section('效果契约', effectContractSection('E-capability-coverage'))
// contractRefs 内 researchPlan/capabilities/summaries/capabilitiesReadme 实为 writes 产物，不进 reads；
    .taskTemplate(
        '域 Agent 任务',
        research.domainAgentTemplate(),
    )
    .taskTemplate(
        '能力主文件模板',
        research.capabilityFileTemplate(),
    )
    .verify(
        verify.file(refOf('researchPlan').path, '研究素材分配计划存在'),
        verify.json(refOf('researchPlan').path, '研究素材分配计划可解析'),
        verify.field('coverage', '研究计划包含素材覆盖率'),
        verify.field('material_usage', '每个能力摘要包含 material_usage'),
        verify.file(refOf('capabilities').path.replace('*', '{id}-{name}'), '能力主文件存在'),
        verify.json(refOf('summaries').path.replace('*', '{id}-{name}'), '能力摘要可解析'),
        verify.count('分组能力数不超过 5'),
        verify.count('能力知识库主文件与索引文件均已产出且非空'),
        verify.count('每组能力数不超过 5；不足 2 个的组已并入相邻组'),
    )
    .onFail(
        fail.retry('子组 Agent 超时', '拆分为更小子组重试'),
        fail.degrade('全部失败', '降级为逐个 spawn 重试'),
    )
    .checkpoint(
        barrier(
            ['完成数 = 能力总数（跳过与失败的逐一列出能力名）', '跳过数（展示供确认，不作过/不过依据）', '失败数（期望为 0；不为 0 时列出能力与缺项）', '素材分配率（展示分配率数值；所有抓取成功的素材都被至少一个能力使用，没有静默丢弃）'],
            '请确认能力研究质量。',
        ),
    )
    .reuse(
        { ifExists: refOf('capabilities').path.replace('*', '{id}-{name}'), skipDescription: '能力主文件已存在' },
        { ifExists: refOf('summaries').path.replace('*', '{id}-{name}'), skipDescription: '能力摘要已存在' },
    )
    .plugins('capability-research-mode')
  
    .display({
        pattern: 'auto_timeline',
        primary_unit: 'stage',
        max_visible: 4,
        legend: false,
        selection: 'none',
    })
    .map(
        'capability-research-map',
        '能力研究滚动窗口',
        { path: refOf('capabilityGraph').path + '#capabilities', dynamic: true },
        doAction(
            'generate',
            'capability-research-worker',
            '能力研究 Worker',
            '研究一个原子能力，写入能力主文件和结构化摘要。',
            15,
        ),
        5,
    )
    .build();
