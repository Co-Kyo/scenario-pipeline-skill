import { step } from 'skillnomad';
import { doAction } from '../actions.js';
import * as partitionRules from '../domain/content/partition.js';
import { refOf, schemaRef } from '../domain/entities.js';
import { barrier } from '../policies.js';
import { fail, verify } from '../verify.js';

export const partition = step('partition', '依赖分区')
  .target('生成可被 scan 消费的分区分析和执行计划')
  .summary('整理命题依赖DAG，识别分区点分批执行')
  .dependsOn('brainstorm')
  .reads(refOf('requirementWeb'), { ...schemaRef('partitionAnalysis'), as: 'schema' })
  .writes(refOf('partitionAnalysis'), refOf('executionPlan'))
  .inputs(refOf('requirementWeb').path)
  .outputs(refOf('partitionAnalysis').path, refOf('executionPlan').path)
  .detail(partitionRules.detail())
  .section('三层分区', partitionRules.threeLayerSection())
  .section('Session 分配', partitionRules.sessionSection())
  // 8.5 迁移：contractRefs 收拢进 reads + as:'contract'，本方法已从 beta.4 类型删除。
  // contractRefs 内 partitionAnalysis/executionPlan 实为 writes 产物，不进 reads；
  .taskTemplate(
    'DAG 构建',
    partitionRules.dagTask(),
  )
  .taskTemplate(
    'Session 分配',
    partitionRules.sessionTask(),
  )
  .verify(
    verify.json(refOf('partitionAnalysis').path, '分区分析可解析'),
    verify.field('current_session', 'current_session 命题明确'),
    verify.field('scan_batches', 'scan_batches 可消费'),
  )
  .onFail(
    fail.degrade('存在循环依赖', '断开 related 类型边并记录 warning'),
    fail.degrade(partitionRules.sessionOverflowText(), '按社区进一步拆分'),
  )
  .checkpoint(
    barrier(
      ['session 数量', '当前 session 命题', '排期 session 命题'],
      '请确认分区方案和本次执行计划。',
    ),
  )
  .display({
    pattern: 'partition_cards',
    primary_unit: 'batch',
    max_visible: 3,
    legend: false,
    selection: 'multi',
  })
  .seq('partition-seq', '依赖分区', [
    doAction('parse', 'partition-confirm', '确认依赖', '读取 requirement-web，确认或推断 dependencies。', 3),
    doAction('validate', 'partition-dag', '构建 DAG', '构建命题 DAG，检测并打断循环依赖。', 3),
    doAction('merge', 'partition-sessions', '分配 Session', '按连通分量、拓扑深度和社区分组生成 sessions。', 3),
  ])
  .build();
