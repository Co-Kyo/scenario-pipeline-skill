import type {
    SourceContract,
    SourceRef,
} from 'skillnomad';
import { refs } from './domain/entities.js';

/**
 * **modules —— 内容模块（9 条）**
 *
 * 静态资产路径，构建期已知；路径只是**渲染载体**，改路径 = 打包期重定向，零语义影响。
 * 8.16 起，这些模块中的格式契约（schemas.md ×3）将挂到产物实体名下（裁决 ③A）。
 *
 * 8.15 Step 1 相对旧 `refs` 的两处变化：
 * - **移除 4 条**：protocolScheduling / pipelineParams / subagentBudget / schedulingDetail
 *   已随 8.13/8.14 下沉到 `meta.schedulingPolicy`，步骤不再引用（零处引用，非行为变更）。
 * - **收编 1 条**：`assets/00-intent-anchor/schemas.md` 原为裸路径字面量（intent-anchor.ts），
 *   逃逸在注册表外；8.16 起已挂到产物实体名下（`entities.ts` anchors 条目的 `schema` 字段），
 *   不再是独立模块（description 保持原字面量，确保产物零 diff）。
 */
export const modules = {
    // ── skill 级（3 条：跨步共用；改动走 skill 级评审）──
    refSources: { path: 'assets/common/ref-sources.md', description: 'T0 域名表 + 反爬域名表 + 信源分级规则', required: true },
    strategyLevel: { path: 'assets/common/strategy-level.md', description: '密度参数查表', required: true },
    antiCrawlFetch: { path: 'plugins/anti-crawl-fetch.md', description: 'Playwright 抓取', required: false },
    // ── intent-anchor 步（2 条）──
    yearRules: { path: 'assets/00-intent-anchor/year-rules.md', description: '年限推断规则', required: true },
    skipRules: { path: 'assets/00-intent-anchor/skip-rules.md', description: '跳过判断规则', required: true },
    // ── brainstorm 步（3 条旧址：形状已迁入 @co-kyo/brainstorm-rules，读包附录）──
    agentInit: { path: 'assets/01-brainstorm/agent-init.md', description: '维度 Agent 初始化定义（旧址：形状已迁入 @co-kyo/brainstorm-rules，见 brainstorm-rules-methods 附录）', required: true },
    barrierCheck: { path: 'assets/01-brainstorm/barrier-check.md', description: 'Barrier 检查项与决策矩阵（旧址：形状已迁入 @co-kyo/brainstorm-rules，见 brainstorm-rules-methods 附录）', required: true },
    fallbackProtocol: { path: 'assets/01-brainstorm/fallback-protocol.md', description: '收敛者失败降级协议（旧址：形状已迁入 @co-kyo/brainstorm-rules，见 brainstorm-rules-methods 附录）', required: true },
    // ── 方法投影（2 条：评估／图谱方法论）──
    evaluationMethod: { path: 'assets/05-evaluate-pool/method.md', description: '评估方法论（投影）', required: true },
    capabilityMethod: { path: 'assets/04-capability-graph/method.md', description: '能力图谱提取方法论', required: true },
} satisfies Record<string, SourceRef>;

// markrefs：模块资产路径登记（构建期校验文件存在性；模块表即声明源，路径即事实）
for (const module of Object.values(modules)) {
    refs.refPath(module.path);
}


/**
 * **模块注册表（8.15 Step 2 起复活）**
 *
 * 8.5 之前是「契约注册表」（构建器渲染契约引用章节，后被 `reads.filter(as==='contract')`
 * 派生取代，成为无消费方字段）；8.15 Step 1 清空冗余后，Step 2 重新定义为
 * **内容模块注册表**：`id`（符号名）+ `scope`（归属层）+ `kind`（语义种类）+ `path`（渲染载体）。
 *
 * 消费方：`validateModuleUsage`（skillnomad 构建期校验）——
 * - V1 角色×归属一致性：`as:'contract'` 必须指向 `scope:'skill'` 条目
 * - V2 私有可见性：`scope:'step'` 条目只能被归属步骤引用
 *
 * 存量安置（两次裁决合成）：2 个 skill 级 contract 保留；9 个 step 级按真实性质贴标签
 * （5 rule + 1 method + 3 schema——schema ×3 待 8.16 挂产物实体）；anti-crawl-fetch 并入 skill 级。
 */
/** scan 调度绑定引用（D35 全链路：内容＝模块 render()；路径仅作逻辑标识与表内展示）。 */
export const scanBindingRef: SourceRef = {
    path: 'assets/03-scan/scheduling-binding.md',
    description: '调度绑定',
};

/** 并行方法包引用（内容包 parallel：内容＝包内 md 经模块 render()；路径仅作逻辑标识）。 */
export const parallelMethodRef: SourceRef = {
    path: 'assets/01-brainstorm/parallel-method.md',
    description: '并行分析方法（内容包正本）',
};

/** 头脑风暴执行规则包引用（内容包 brainstorm-rules：内容＝包内 md 经模块 render()；路径仅作逻辑标识）。 */
export const brainstormRulesMethodRef: SourceRef = {
    path: 'assets/01-brainstorm/brainstorm-rules-method.md',
    description: '头脑风暴执行规则（内容包正本）',
};

/** 评估方法包引用（内容包 evaluate：内容＝包内 md 经模块 render()；路径仅作逻辑标识）。 */
export const evalMethodRef: SourceRef = {
    path: 'assets/05-evaluate-pool/evaluate-method.md',
    description: '评估方法通用形状（内容包正本）',
};

/** 分区方法包引用（内容包 partition：内容＝包内 md 经模块 render()；路径仅作逻辑标识）。 */
export const partitionMethodRef: SourceRef = {
    path: 'assets/02-partition/partition-method.md',
    description: '依赖分区通用形状（内容包正本）',
};

/** 图谱方法包引用（内容包 capability：内容＝包内 md 经模块 render()；路径仅作逻辑标识）。 */
export const capabilityMethodRef: SourceRef = {
    path: 'assets/04-capability-graph/capability-method.md',
    description: '能力图谱通用形状（内容包正本）',
};

export const contracts: SourceContract[] = [
    // ── skill 级（3 条）──
    { id: 'ref-sources', kind: 'policy', path: 'assets/common/ref-sources.md', description: '信源分级与反爬域名', scope: 'skill' },
    { id: 'strategy-level', kind: 'policy', path: 'assets/common/strategy-level.md', description: '密度参数查表', scope: 'skill' },
    { id: 'anti-crawl-fetch', kind: 'method', path: 'plugins/anti-crawl-fetch.md', description: 'Playwright 抓取', scope: 'skill' },
    // ── intent-anchor 步（2 条）──
    { id: 'year-rules', kind: 'policy', path: 'assets/00-intent-anchor/year-rules.md', description: '年限推断规则', scope: 'step', step: 'intent-anchor' },
    { id: 'skip-rules', kind: 'policy', path: 'assets/00-intent-anchor/skip-rules.md', description: '跳过判断规则', scope: 'step', step: 'intent-anchor' },
    // ── brainstorm 步文件背（3 条旧址）──
    { id: 'agent-init', kind: 'policy', path: 'assets/01-brainstorm/agent-init.md', description: '维度 Agent 初始化定义', scope: 'step', step: 'brainstorm' },
    { id: 'barrier-check', kind: 'policy', path: 'assets/01-brainstorm/barrier-check.md', description: 'Barrier 检查项与决策矩阵', scope: 'step', step: 'brainstorm' },
    { id: 'fallback-protocol', kind: 'policy', path: 'assets/01-brainstorm/fallback-protocol.md', description: '收敛者失败降级协议', scope: 'step', step: 'brainstorm' },
    // ── 方法投影（2 条）──
    { id: 'evaluation-method', kind: 'method', path: 'assets/05-evaluate-pool/method.md', description: '评估方法论', scope: 'step', step: 'evaluate-pool' },
    { id: 'capability-method', kind: 'method', path: 'assets/04-capability-graph/method.md', description: '能力图谱提取方法论', scope: 'step', step: 'capability-graph' },
    // ── 模块通道（6 条：路径为逻辑标识，内容＝模块 render()）──
    // D35 全链路首用例：模块渲染正本（路径为逻辑标识，不落盘、不入 markrefs 存在性校验）。
    { id: 'scan-scheduling-binding', kind: 'method', path: scanBindingRef.path, description: '调度绑定（模块渲染正本）', scope: 'step', step: 'scan', module: 'scan-binding' },
    // 内容包 parallel（内置形态）：方法正文由包内 md 经模块 render() 提供。
    { id: 'parallel-method', kind: 'method', path: parallelMethodRef.path, description: '并行分析方法（内容包正本）', scope: 'step', step: 'brainstorm', module: 'parallel-methods' },
    // 内容包 brainstorm-rules（内置形态）：方法正文由包内 md 经模块 render() 提供。
    { id: 'brainstorm-rules-method', kind: 'method', path: brainstormRulesMethodRef.path, description: '头脑风暴执行规则（内容包正本）', scope: 'step', step: 'brainstorm', module: 'brainstorm-rules-methods' },
    // 内容包 evaluate（内置形态）：方法正文由包内 md 经模块 render() 提供。
    { id: 'evaluate-method', kind: 'method', path: evalMethodRef.path, description: '评估方法通用形状（内容包正本）', scope: 'step', step: 'evaluate-pool', module: 'evaluate-methods' },
    // 内容包 partition（内置形态）：方法正文由包内 md 经模块 render() 提供。
    { id: 'partition-method', kind: 'method', path: partitionMethodRef.path, description: '依赖分区通用形状（内容包正本）', scope: 'step', step: 'partition', module: 'partition-methods' },
    // 内容包 capability（内置形态）：方法正文由包内 md 经模块 render() 提供。
    { id: 'capability-method-pack', kind: 'method', path: capabilityMethodRef.path, description: '能力图谱通用形状（内容包正本）', scope: 'step', step: 'capability-graph', module: 'capability-methods' },
];
