import { step } from 'skillnomad';
import { doAction, barrier, fail, verify } from '../../step-parts.js';
import { effectContractSection, refOf } from '../../artifacts.js';
import { assembly } from './content.js';


export const assemble = step('assemble', '命题组装')
    .target('为每个命题生成四象限研究输出')
    .summary('组装四象限研究输出（overview/edge-cases/trade-offs/experiment）')
    .dependsOn('briefing-assemble')
    .reads(refOf('briefing'), refOf('requirementWeb'), refOf('capabilityGraph'))
    .writes(refOf('overview'), refOf('edgeCases'), refOf('tradeoffs'), refOf('references'), refOf('experiment'), refOf('assemblyRatioTrace'))
    .inputs(refOf('briefing').path)
    .outputs(
        refOf('overview').path,
        refOf('edgeCases').path,
        refOf('tradeoffs').path,
        refOf('references').path,
        refOf('experiment').path,
        refOf('assemblyRatioTrace').path,
    )
    .detail(assembly.detail())
    .section('Markdown Agent', assembly.markdownAgent())
    .section('Experiment Agent', assembly.experimentAgent())
    .section('效果契约', effectContractSection('E-assemble-ratio'))
// 8.5 迁移：contractRefs 收拢进 reads + as:'contract'，本方法已从 beta.4 类型删除。
// 8.13 浮出条目裁决：contractRefs 内的 overview/edgeCases/tradeoffs/references/experiment/assemblyRatioTrace
    .taskTemplate(
        'Markdown Agent',
        assembly.markdownAgentTask(),
    )
    .taskTemplate(
        'Experiment Agent',
        assembly.experimentAgentTask(),
    )
    .verify(
        verify.file(refOf('edgeCases').path, 'edge-cases 文件存在'),
        verify.field('筛选_trace', 'edge-cases 每个坑点包含筛选_trace'),
        verify.file(refOf('assemblyRatioTrace').path, '组装占比 trace 存在'),
        verify.json(refOf('assemblyRatioTrace').path, '组装占比 trace 可解析'),
        verify.count('场景化输入/边界/验证 >= 3，特化占比 >= 30%'),
    )
    .onFail(
        fail.halt('Briefing 缺失', '停止并提示先完成 {{step:briefing-assemble}}'),
        fail.degrade('一个 Agent 失败', '标记 partial，不阻塞同命题另一 Agent'),
    )
    .checkpoint(
        barrier(
            ['完成数', '部分完成数', '失败数'],
            '请确认命题组装质量。',
        ),
    )
    .reuse(
        { ifExists: refOf('overview').path, skipDescription: '命题 overview 已存在' },
    )
  
    .display({
        pattern: 'auto_timeline',
        primary_unit: 'stage',
        max_visible: 4,
        legend: false,
        selection: 'none',
    })
    .map(
        'assemble-map',
        '命题组装滚动窗口',
        { path: refOf('requirementWeb').path + '#propositions', dynamic: true },
        doAction(
            'assemble',
            'assemble-worker',
            '命题组装 Worker',
            '为单个命题组装 overview、edge-cases、trade-offs、references 和 experiment。',
            8,
        ),
        5,
    )
    .build();
