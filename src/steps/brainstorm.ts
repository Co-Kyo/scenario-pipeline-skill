import { step } from 'skillnomad';
import { agentAction, doAction } from '../actions.js';
import * as brainstormRules from '../domain/content/brainstorm.js';
import { displayFoldMulti } from '../domain/mechanics.js';
import { modules } from '../contracts.js';
import { refOf, schemaRef } from '../domain/entities.js';
import { barrier } from '../policies.js';
import { fail, verify } from '../verify.js';

export const brainstorm = step('brainstorm', '头脑风暴')
    .target('收敛出可被 {{step:scan}} 消费的 requirement-web.json')
    .summary('4维度Agent并行分析，产出结构化需求网')
    .dependsOn('intent-anchor')
    .reads(
        refOf('anchors'),
        { ...modules.agentInit, as: 'rule' },
        { ...modules.barrierCheck, as: 'rule' },
        { ...modules.fallbackProtocol, as: 'rule' },
        { ...schemaRef('requirementWeb'), as: 'schema' },
    )
    .writes(refOf('requirementWeb'))
    .inputs(refOf('anchors').path)
    .outputs(refOf('requirementWeb').path)
    .detail(brainstormRules.detail())
    .section('质量门禁', brainstormRules.qualityGateSection())
    .section('{{step:scan}} 注入', brainstormRules.scanInjectSection())
// 8.5 迁移：contractRefs 收拢进 reads + as:'contract'，本方法已从 beta.4 类型删除。
    .taskTemplate(
        '场景维度',
        brainstormRules.scenarioTask(),
    )
    .taskTemplate(
        '技术维度',
        brainstormRules.technicalTask(),
    )
    .taskTemplate(
        '学习维度',
        brainstormRules.learningTask(),
    )
    .taskTemplate(
        '约束维度',
        brainstormRules.constraintTask(),
    )
    .taskTemplate(
        '收敛者',
        brainstormRules.integratorTask(),
    )
    .verify(
        verify.json(refOf('requirementWeb').path, 'requirement-web.json 可解析'),
        verify.field('context', 'context 包含 target_level、year_source、year_inference_trace'),
        verify.field('id', '每个 proposition 包含 id'),
        verify.field('name', '每个 proposition 包含 name'),
        verify.field('depth', '每个 proposition 包含 depth'),
        verify.field('search_keywords', '每个 proposition 包含 search_keywords'),
        verify.field('capability_ids', 'capability_web 与 propositions 的 capability_ids 一致'),
        verify.field('dependencies', 'dependencies 中引用的 id 全部存在'),
        verify.count('scope.exclusions 非空'),
        verify.field('level_weight', '每个 proposition 包含 level_weight'),
        verify.field('strategy', 'strategy 元数据已写入'),
        verify.field('provisional_role', '锚点与 proposition 的 level_weight 一致'),
    )
    .onFail(
        fail.retry('维度 Agent 超时', '检查文件是否已写入；完整保留，不完整补发一次'),
        fail.degrade('3+ 维度缺失', '降级为原始指令扫描，{{step:scan}} 按原始指令执行'),
        fail.retry('收敛者超时', '检查 requirement-web.json 是否完整；不完整重试一次'),
        fail.degrade('收敛者 JSON 解析失败', '执行 fallback-protocol 重建 requirement-web.json'),
    )
    .checkpoint(
        barrier(
            ['命题数量', '能力数量', '依赖关系数', '排除项数'],
            '请确认头脑风暴收敛后的需求网。',
        ),
    )
// P2 decision 示例值（专案24/D33）：以下 metrics/selection/risks/barrier_summary 均为
// **某次真实历史运行的示例取值**（命题 10、L2、排除项 20），非运行时计算值。
// `isExample: true` 为机器可读边界（语义见 `SourceDecisionSummary.isExample`）；
// "（示例）"字样保留作降级兼容（deprecated，移除待渲染层统一处理后的下版）。
    .decision({
        isExample: true,
        gateType: 'human_gate',
        title: '需求网确认（示例值）',
        confirm: '确认需求网',
        context: {
            current: '需求网确认',
            question: '这些命题、年限锚点与排除边界是否可作为后续分区和扫描的依据？',
            next: '分区确认',
        },
        metrics: [
            { id: 'propositions', label: '命题（示例）', value: '10', detail: '示例：全部 L2 core' },
            { id: 'year', label: '年限推断（示例）', value: 'L2', detail: '示例：3-5 年' },
            { id: 'exclusions', label: '排除项（示例）', value: '20', detail: '示例：deprecated/越界' },
        ],
        selection: {
            unit: '需求网命题',
            summary: '示例：10/10 命题默认选中，可按命题或分组调整。',
            total: 10,
            selected: 10,
        },
        risks: [
            { code: 'validation', label: 'JSON 转义修复（示例风险项）', severity: 'warning', count: 1, detail: '示例：已修复并重新校验通过' },
        ],
        actions: [
            { id: 'confirm', label: '确认需求网', verb: 'confirm', primary: true },
        ],
        barrier_summary: '示例值——当前阶段：需求网确认；本次确认：命题/年限/排除边界；下一步：分区确认；命题 10，年限 L2，排除项 20；10/10 已选。',
    })
    .plugins('year-granularity')
    .parallel(
        'brainstorm-parallel',
        '4 维度并行分析',
        [
            doAction('generate', 'brainstorm-scenario', '场景维度', '列出候选场景，按 target_level 过滤，写入 scenario.json。', 3),
            doAction('parse', 'brainstorm-technical', '技术维度', '拆解原子能力，标注 layer/depends_on/covers，写入 technical.json。', 3),
            doAction('generate', 'brainstorm-learning', '学习维度', '设计渐进学习路径，写入 learning.json。', 3),
            doAction('validate', 'brainstorm-constraint', '约束维度', '提取显式/隐式约束和排除项，写入 constraint.json。', 3),
        ],
        {
            gate: {
                rule: '4/4 completed or user authorizes degrade',
                onPass: 'converge',
                onFail: 'userChoice',
            },
            converge: agentAction(
                'merge',
                'brainstorm-integrator',
                '收敛者',
                '读取四份维度报告，执行校验、对齐、收束、去重、补位，生成 requirement-web.json。',
                5,
            ),
        },
    )
    .display(displayFoldMulti('proposition'))
    .build();
