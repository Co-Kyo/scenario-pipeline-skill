import { step } from 'skillnomad';
import * as intent from './content.ts';
import { displayFoldMulti, barrier, fail, verify } from '../../step-parts.ts';
import { assets, refOf, schemaRef } from '../../artifacts.ts';

export const intentAnchor = step('intent-anchor', '意图锚定')
    .wish(intent.target())
    .target('T1', '锚点集合已产出且核心字段齐备，下游步骤可直接消费')
    .target('T2', '年限推断结论可追溯，可供确认')
    .target('T3', '跳过判断结论明确且去向可交代')
    .summary('解析用户指令，推断年限，生成共享骨架')
    .dependsOn('initialize')
    .reads(
        { ...schemaRef('anchors'), as: 'schema' },
        { ...assets.yearRules, as: 'rule' },
        { ...assets.skipRules, as: 'rule' },
        { ...assets.strategyLevel, as: 'contract' },
    )
    .writes(refOf('anchors'))
    .inputs('raw_input')
    .action('parse', 'intent-extract', '轻量提取', '提取 topic、tech_stack 和显式年限参数。')
    .action('infer', 'intent-year', '年限推断', '按优先级链推断 target_level 并记录 year_inference_trace。')
    .action('validate', 'intent-skip', '跳过判断', '判断是否跳过头脑风暴。')
    .action('generate', 'intent-anchor-write', '生成骨架', '生成锚点并注入 strategy 元数据。')
    .outputs(refOf('anchors').path)
    .detail(intent.detail())
    .section('跳过判断', intent.skipSection())
// 本步 reads 按角色混标：schema（anchors 格式）/ rule（yearRules/skipRules）/ contract（strategyLevel）。
    .taskTemplate(
        '锚点生成',
        intent.anchorTask(),
    )
    .verify(
        verify.count(intent.countVerifyText(), 'T1'),
        verify.field('provisional_level', '每个锚点包含 provisional_level', 'T1'),
        verify.field('provisional_role', '每个锚点包含 provisional_role', 'T1'),
    )
    .onFail(
        fail.checkpoint('年限推断只命中了优先级链第 3 级（隐式信号）或更低级别', '默认 L2，并在初始化 Barrier 请用户确认'),
        fail.halt(intent.insufficientAnchorsText(), '提示用户补充信息或降低核心锚点门槛'),
    )
    .checkpoint(
        barrier(
            [
                { label: '年限推断依据', informational: true, target: 'T2' },
                { label: '跳过判断结果', expect: '每个被跳过的锚点都有跳过原因与去路', target: 'T3' },
            ],
            '请确认意图锚定结果、年限推断和跳过判断。',
        ),
    )
    .display(displayFoldMulti('anchor'))
    .build();
