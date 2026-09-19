import { step } from 'skillnomad';
import { doAction, barrier, fail, verify } from '../../step-parts.js';
import { effectContractSection, refOf, schemaRef } from '../../artifacts.js';
import { briefing } from './content.js';


export const briefingAssemble = step('briefing-assemble', 'Briefing 组装')
    .target('为每个命题生成包含能力摘要的 Briefing')
    .summary('从能力摘要提取关键信息，组装Briefing')
    .dependsOn('capability-research')
    .reads(refOf('requirementWeb'), refOf('summaries'), { ...schemaRef('briefing'), as: 'schema' })
    .writes(refOf('briefing'))
    .inputs(refOf('requirementWeb').path, refOf('summaries').path)
    .outputs(refOf('briefing').path)
    .detail(briefing.detail())
    .section('内容比例', briefing.contentRatio())
    .section('效果契约', effectContractSection('E-briefing-trace'))
    .taskTemplate(
        'Briefing Worker',
        briefing.workerTask(),
    )
    .verify(
        verify.file(refOf('briefing').path, 'Briefing 文件存在'),
        verify.field('缺失能力标注', '缺失能力已标注'),
        verify.count('场景化 Trace >= 3/3/3'),
    )
    .onFail(
        fail.degrade('能力摘要缺失', '标注缺失并继续处理其余能力'),
        fail.halt('命题列表为空', '停止并提示先完成 {{step:brainstorm}}'),
    )
    .checkpoint(
        barrier(
            ['完成数', '跳过数', '失败数'],
            '请确认 Briefing 素材完整性。',
        ),
    )
    .reuse(
        { ifExists: refOf('briefing').path, skipDescription: 'Briefing 已存在' },
    )
  
    .display({
        pattern: 'auto_timeline',
        primary_unit: 'stage',
        max_visible: 4,
        legend: false,
        selection: 'none',
    })
    .map(
        'briefing-assemble-map',
        'Briefing 组装滚动窗口',
        { path: refOf('requirementWeb').path + '#propositions', dynamic: true },
        doAction(
            'assemble',
            'briefing-worker',
            'Briefing Worker',
            '为单个命题读取能力摘要并组装 Briefing。',
            5,
        ),
        5,
    )
    .build();
