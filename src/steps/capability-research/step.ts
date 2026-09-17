import { step } from 'skillnomad';
import { doAction } from '../../actions.js';
import { effectContractSection } from '../../domain/effects.js';
import { research } from './content.js';
import { modules } from '../../contracts.js';
import { refOf } from '../../domain/entities.js';

import { barrier } from '../../policies.js';
import { fail, verify } from '../../verify.js';

export const capabilityResearch = step('capability-research', '能力研究')
    .target('生成能力知识库主文件、结构化摘要和索引')
    .summary('深度研究原子能力，产出知识库主文件')
    .dependsOn('evaluate-pool')
    .reads(refOf('capabilityGraph'), refOf('readme'), { ...modules.refSources, as: 'contract' }, refOf('scanIndex'))
    .writes(refOf('researchPlan'), refOf('capabilities'), refOf('summaries'), refOf('capabilitiesReadme'))
    .inputs(refOf('capabilityGraph').path, refOf('readme').path, refOf('scanIndex').path)
    .outputs(refOf('researchPlan').path, refOf('capabilities').path, refOf('summaries').path, refOf('capabilitiesReadme').path)
    .detail(research.detail())
    .section('域 Agent 任务', research.domainAgentTask())
    .section('素材分配与 usage trace', research.materialAllocation())
    .section('效果契约', effectContractSection('E-capability-coverage'))
// 8.5 迁移：contractRefs 收拢进 reads + as:'contract'，本方法已从 beta.4 类型删除。
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
    )
    .onFail(
        fail.retry('子组 Agent 超时', '拆分为更小子组重试'),
        fail.degrade('全部失败', '降级为逐个 spawn 重试'),
    )
    .checkpoint(
        barrier(
            ['完成数', '跳过数', '失败数', '素材覆盖率'],
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
