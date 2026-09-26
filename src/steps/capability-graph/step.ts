import { step } from 'skillnomad';
import { doAction, displayFoldMulti, barrier, fail, verify } from '../../step-parts.ts';
import * as capability from './content.ts';
import { refOf, assets, schemaRef } from '../../artifacts.ts';
import { capabilityMethodRef } from '../../skill-decl.ts';

export const capabilityGraph = step('capability-graph', '能力图谱')
    .target('生成能力图谱、依赖图、战略高地与学习路径')
    .summary('跨命题去重合并原子能力，计算战略价值')
    .dependsOn('scan')
    .reads(refOf('requirementWeb'), refOf('scanIndex'), { ...assets.capabilityMethod, as: 'method' }, { ...schemaRef('capabilityGraph'), as: 'schema' }, capabilityMethodRef)
    .writes(refOf('capabilityGraph'), refOf('dependencyGraph'), refOf('highgrounds'), refOf('learningPath'))
    .inputs(refOf('requirementWeb').path, refOf('scanIndex').path)
    .outputs(
        refOf('capabilityGraph').path,
        refOf('dependencyGraph').path,
        refOf('highgrounds').path,
        refOf('learningPath').path,
    )
    .detail(capability.detail())
    .section('战略高地', capability.highgroundSection())
// contractRefs 内 capabilityGraph/dependencyGraph/highgrounds/learningPath 实为 writes 产物，不进 reads。
    .taskTemplate(
        '能力去重',
        capability.dedupeTask(),
    )
    .taskTemplate(
        '战略高地',
        capability.highgroundTask(),
    )
    .verify(
        verify.json(refOf('capabilityGraph').path, '能力图谱可解析'),
        verify.field('dependencies_trace', '非空依赖包含 dependencies_trace'),
        verify.field('t0_missing', 'T0 参考状态已记录'),
        verify.count('每次合并或拆分都留有对应记录（merge_trace 或 split_trace 非空）'),
    )
    .onFail(
        fail.degrade('T0 信源不可达', '标记 t0_missing 并用 T1/T2 补充'),
        fail.checkpoint(capability.capabilityOverflowText(), '提示使用 --filter 缩小范围'),
    )
    .checkpoint(
        barrier(
            ['能力数量', '展示扇出度最高的前 3 个能力（供人看，不作过/不过依据）', `一级高地数（价值评分达到 ${capability.HIGHGROUND_THRESHOLDS.tier1Min} 及以上的战略高地数量）`, '学习路径包含全部战略高地：价值高的排在前面；有前置依赖的能力不先于其前置出现（前置关系取自能力图谱的依赖声明）'],
            '请确认能力图谱质量。',
        ),
    )
    .display(displayFoldMulti('capability'))
    .seq('capability-graph-seq', '能力图谱构建', [
        doAction('merge', 'capability-dedupe', '能力去重', '跨命题合并或拆分能力，并记录 merge/split trace。', 5),
        doAction('infer', 'capability-deps', '标注依赖', '基于层级、内容引用和 covers 交集推断依赖。', 5),
        doAction('score', 'capability-highgrounds', '识别高地', '计算 strategic_value 并生成 highgrounds 与 learning-path。', 5),
    ])
    .build();
