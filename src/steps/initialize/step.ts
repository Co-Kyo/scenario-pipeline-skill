import { step } from 'skillnomad';
import { initializeDetail, WORKDIR_NAMING } from './content.ts';
import { verifyPair, barrier, fail, verify } from '../../step-parts.ts';
import { assets, refOf } from '../../artifacts.ts';

export const initialize = step('initialize', '初始化')
    .target('确认 workDir 并建立可追溯的初始化记录')
    .summary('确认 workDir（交互步骤），各步骤按需加载 references/ 共享文档')
// 8.4 迁移：dependsOn 收窄为单值。initialize 是链起点（root），无前驱，
// 省略 dependsOn 由框架推导（deriveInitStepId 从链起点推导 initStepId）。
    .reads({ ...assets.checkpointProtocol, as: 'contract' })
    .writes(
        { path: refOf('init').path, description: '初始化记录', required: true },
        refOf('run'),
    )
    .inputs('raw_input')
    .action('parse', 'init-parse', '解析输出目录', `解析用户指定目录或默认 ${WORKDIR_NAMING}，确认目录可用。`)
    .action('wait', 'init-confirm', '确认 workDir', '向用户展示输出目录并等待确认；用户可修正路径。')
    .action('validate', 'init-write', '写入初始化记录', '写入 workDir、确认状态和共享文档加载结果。')
    .action('generate', 'init-run-write', '写入运行信封', '创建 {workDir}/.meta/run/run.json，记录 run_id、started_at、workdir、输入摘要和 scenario-pipeline 版本（VERSION_LINEAGE.json 的发布 tag）。')
    .outputs(refOf('init').path, refOf('run').path)
    .initRules(
        { title: '确认 workDir', body: `向用户展示将要使用的输出目录并等待确认；如果用户未指定，默认使用 ${WORKDIR_NAMING} 作为 workDir；用户可修正 workDir 路径` },
        { title: '初始化记录', body: 'workDir 确认后写入 {workDir}/.meta/init.json，后续所有步骤的产出路径均基于此目录派生' },
    )
    .detail(initializeDetail())
    .verify(
        ...verifyPair(refOf('init').path, '初始化记录存在', '初始化记录可解析'),
        verify.field('workDir', '初始化记录包含 workDir'),
        verify.field('confirmed', '初始化记录包含确认状态'),
        ...verifyPair(refOf('run').path, '运行信封存在', '运行信封可解析'),
    )
    .onFail(
        fail.halt('用户未确认 workDir', '停止并等待用户修正输出目录'),
    )
    .checkpoint(
        barrier(
            ['workDir 已确认', '检查点协议文档可加载、可被引用（本步唯一声明读取的共享文档）；其余共享文档到使用它的步骤再核验'],
            '请确认 workDir 与初始化规则。',
        ),
    )
    .display({
        pattern: 'generic',
        primary_unit: 'rule',
        max_visible: 4,
        legend: false,
        selection: 'confirm',
    })
    .build();
