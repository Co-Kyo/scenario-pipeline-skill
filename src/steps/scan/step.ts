import { step } from 'skillnomad';
import { doAction, barrier, fail, verify } from '../../step-parts.ts';
import { assets, refOf, schemaRef } from '../../artifacts.ts';
import * as scanRules from './content.ts';

export const scan = step('scan', '广域扫描')
    .target('生成可被能力图谱消费的素材索引和素材正文')
    .summary('按level_weight差异化搜索信源，结构化提取')
    .dependsOn('partition')
    .reads(
        refOf('requirementWeb'),
        { ...refOf('partitionAnalysis'), required: false },
        { ...schemaRef('scanIndex'), as: 'schema' },
        { ...assets.refSources, as: 'contract' },
        { ...assets.strategyLevel, as: 'contract' },
        assets.antiCrawlFetch,
        assets.yearGranularity,
    )
    .writes(refOf('scanIndex'), refOf('scanMaterials'))
    .inputs(
        'source_desc',
        'topic',
        '--year / --source 可选约束',
        refOf('requirementWeb').path,
        refOf('partitionAnalysis').path,
    )
    .outputs(refOf('scanIndex').path, refOf('scanMaterials').path)
    .detail(scanRules.detail())
    .section('URL 盘点与策略分配', scanRules.urlPreflightSection())
    .section('Phase A 执行细节', scanRules.phaseASection())
    .section('Phase B 执行细节', scanRules.phaseBSection())
    .section('Phase C 执行细节', scanRules.phaseCSection())
    .section('检查点', scanRules.checkpointSection())
    .section('输出 Schema', scanRules.outputSchema())
    .taskTemplate(
        '搜索 Agent',
        scanRules.searchTask(),
    )
    .taskTemplate(
        '提取 Agent',
        scanRules.extractTask(),
    )
    .verify(
        verify.file(refOf('scanIndex').path, 'index.json 已生成'),
        verify.json(refOf('scanIndex').path, 'index.json 可解析'),
        verify.field('file_path', '每条 material 有 file_path'),
        verify.field('fetch_status', '反爬抓取状态已记录'),
    )
    .onFail(
        fail.retry('搜索 agent 超时', '检查 search-batch 文件是否完整，完整则保留，否则重试一次'),
        fail.retry('提取 agent 超时', '检查 partial 文件是否完整，完整则保留，否则重试一次'),
        fail.degrade('Playwright 不可用', '反爬域名标记 failed'),
        fail.degrade('Phase C partial 缺失', '跳过该 batch，标注 degraded'),
        fail.halt('URL 盘点失败', '不进入 Phase B，先修复 preflight'),
        fail.degrade('境外网络不可达', '统一走 virtual_gateway 或 skip'),
        fail.degrade('反爬识别失败', '标记 fetch_status_trace，不反复重试'),
        fail.retry('提取超时有 partial', '读取已落盘 partial，只补未完成 URL'),
    )
    .checkpoint(
        barrier(
            ['T0 素材数非 0；T0/T1/T2/T3 各档计数与 role 覆盖逐条列出', '丢弃数 + 每条附 skip_reason/discard_reason 非空', '每个命题的 core/premise/outlook 均有素材（缺哪个 role 逐条列名）'],
            '请确认扫描素材质量和信源覆盖。',
        ),
    )
    .plugins('anti-crawl-fetch', 'year-granularity')
    .display({
        pattern: 'coverage_cards',
        primary_unit: 'batch',
        max_visible: 3,
        legend: false,
        selection: 'multi',
    })
    .seq('scan-seq', '扫描三阶段', [
        doAction('search', 'scan-phase-a', 'Phase A 并行搜索', '按命题批次并行搜索 URL，merge 后生成 url-batches.json。', 5),
        doAction('extract', 'scan-phase-b', 'Phase B 并行提取', '按 URL 批次抓取并结构化提取，生成 partial 文件和素材 Markdown。', 10),
        doAction('merge', 'scan-phase-c', 'Phase C 主线程合并', '合并 partial、域名分级、交叉比较并生成 index.json。', 5),
    ])
    .build();
