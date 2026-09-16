import { step } from 'skillnomad';
import { doAction } from '../actions.js';
import { effectContractSection } from '../domain/effects.js';
import {
    LADDER_JUDGMENT_FIELD,
    LADDER_MAX_CAPABILITIES,
    LADDER_STAGE_COUNT,
    ladderDetail,
    stepFormat,
    workerTask,
} from '../domain/content/ladder.js';
import { refOf } from '../domain/entities.js';

import { barrier } from '../policies.js';
import { fail, verify } from '../verify.js';

export const learningLadder = step('learning-ladder', '学习阶梯')
    .target('为每个命题生成从不会到能讲的渐进学习路径')
    .summary('生成从"不会"到"能讲"的渐进式路径')
    .dependsOn('assemble')
    .reads(refOf('dependencyGraph'), refOf('summaries'), refOf('overview'), refOf('anchors'))
    .writes(refOf('ladder'))
    .inputs(refOf('dependencyGraph').path, refOf('summaries').path, refOf('overview').path)
    .outputs(refOf('ladder').path)
    .detail(ladderDetail())
    .section('步骤格式', stepFormat())
    .section('效果契约', effectContractSection('E-ladder-judgment'))
// 8.5 迁移：contractRefs 收拢进 reads + as:'contract'，本方法已从 beta.4 类型删除。
    .taskTemplate(
        '学习阶梯 Worker',
        workerTask(),
    )
    .verify(
        verify.file(refOf('ladder').path, '学习阶梯文件存在'),
        verify.count(`阶段数 ${LADDER_STAGE_COUNT.min}-${LADDER_STAGE_COUNT.max}`),
        verify.field(LADDER_JUDGMENT_FIELD, '每步有二值验证标准'),
    )
    .onFail(
        fail.degrade('能力依赖图有环', '打断循环依赖并标记 warning'),
        fail.degrade(`能力数量超过 ${LADDER_MAX_CAPABILITIES}`, '合并相似能力减少阶段数'),
    )
    .checkpoint(
        barrier(
            ['完成数', '跳过数', '失败数'],
            '请确认学习阶梯最终产物。',
        ),
    )
    .reuse(
        { ifExists: refOf('ladder').path, skipDescription: '学习阶梯已存在' },
    )
  
    .display({
        pattern: 'auto_timeline',
        primary_unit: 'stage',
        max_visible: 4,
        legend: false,
        selection: 'none',
    })
    .map(
        'learning-ladder-map',
        '学习阶梯滚动窗口',
        { path: refOf('requirementWeb').path + '#propositions', dynamic: true },
        doAction(
            'generate',
            'learning-ladder-worker',
            '学习阶梯 Worker',
            '为单个命题基于依赖图生成学习阶梯。',
            5,
        ),
        5,
    )
    .build();
