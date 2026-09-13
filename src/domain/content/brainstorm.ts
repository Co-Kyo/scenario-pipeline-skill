// 内容域:头脑风暴。维度 Agent、调度参数、收敛优先级、reason_type 枚举为唯一数据源。
// 级别过滤短语从 learner.LEVEL_CRITERIA_TABLE 派生(消解与学习域的真重复)。
import { LEVEL_CRITERIA_TABLE } from '../learner.js';

/** 4 个维度 Agent 的输出文件名(不含扩展名) */
export const DIMENSION_FILES = ['scenario', 'technical', 'learning', 'constraint'] as const;

/** 维度 Agent 轮询间隔 */
export const POLL_INTERVAL = '15s';

/** 失败 Agent 补发次数上限 */
export const RETRY_MAX = 1 as const;

/** 收敛对齐优先级(高→低) */
export const CONVERGE_PRIORITY = '约束 > 技术 > 场景 > 学习';

/** 约束维度的 reason_type 枚举 */
export const REASON_TYPES = [
    'out_of_scope',
    'below_target',
    'deprecated',
    'not_frontend',
] as const;

/** 级别过滤短语(从 learner 校准表派生,与学习域共用级别名) */
export function levelFilterPhrase(): string {
    return LEVEL_CRITERIA_TABLE.map((r) => `${r.level} ${r.traits.split(':')[0]}`).join('，');
}

export function detail(): string {
    return `执行步骤：

1. 创建 {workDir}/.meta/brainstorm 目录。
2. 按 agent-init 分发场景、技术、学习、约束 4 个维度 Agent。
3. 轮询等待，轮询间隔 ${POLL_INTERVAL}，每个 Agent 完成时即时校验文件、JSON、dimension 和 entries。
4. 失败 Agent 最多补发 ${RETRY_MAX} 次。
5. 4 个维度全部结束后执行质量门禁。
6. 门禁通过后 spawn 收敛者。
7. 收敛者写入 requirement-web.json。
8. 执行当前步骤的 barrier 检查点。`;
}

export function qualityGateSection(): string {
    const checks = DIMENSION_FILES.map((f) => `- ${f}.json 存在且可解析`).join('\n');
    return `检查 4 个维度文件：

${checks}
- 每个 JSON 包含 dimension 字段和对应 entries

4/4 通过后进入收敛者；存在缺失时停住等待用户决策。`;
}

export function scanInjectSection(): string {
    return `将 requirement-web.json 作为 {{step:scan}} 输入：

- propositions 列表
- search_guidance 推荐关键词
- scope.exclusions 排除规则
- context 经验年限
- strategy 策略元数据
- level_weight 驱动密度分级`;
}

export function scenarioTask(): string {
    return `你是场景维度分析专家。
基于 anchors.json 列出 ≥5 个候选场景。
按 target_level 过滤：${levelFilterPhrase()}。
每个场景包含 anchor_ref、level_weight、confidence、depth、frequency、granularity_match。
写入 scenario.json。`;
}

export function technicalTask(): string {
    return `你是技术维度分析专家。
拆解原子能力，区分通用与特化能力。
标注 layer、depends_on、covers、level_weight。
检查网络层、工具层、运行时层、安全层，缺失时补充 T_ADD{N}。
写入 technical.json。`;
}

export function learningTask(): string {
    return `你是学习维度分析专家。
设计从不会到目标水平的渐进学习路径。
每个节点包含 prerequisites、estimated_time、verification、is_strategic。
输出有框架经验和无框架经验两条分支。
写入 learning.json。`;
}

export function constraintTask(): string {
    return `你是约束维度分析专家。
提取显式和隐式约束，明确排除项。
reason_type 只能是 ${REASON_TYPES.join('、')}。
加入排除已停止维护方案和经验年限约束。
写入 constraint.json。`;
}

export function integratorTask(): string {
    return `你是头脑风暴的收敛者（Integrator）。你需要执行校验、对齐、收束、去重、补位，最终产出 requirement-web.json。

你必须用 write 工具将文件写入磁盘。

## 你需要读取的文件
1. 共享骨架：{workDir}/.meta/brainstorm/anchors.json
2. 场景维度报告：{workDir}/.meta/brainstorm/scenario.json
3. 技术维度报告：{workDir}/.meta/brainstorm/technical.json
4. 学习维度报告：{workDir}/.meta/brainstorm/learning.json
5. 约束维度报告：{workDir}/.meta/brainstorm/constraint.json
6. 输出格式：assets/01-brainstorm/requirement-web-schema.md

## 你的任务
1. 校验：检查 4 个维度输出中的 level_weight 是否跨维度一致
2. 对齐：不一致时按优先级对齐（${CONVERGE_PRIORITY}）
3. 收束：用 anchor_ref 编织跨维度关系图，建立场景与能力映射
4. 去重：同维度内描述重叠则合并；不同维度同锚点则标注不同视角
5. 补位：检测 anchor_coverage 覆盖缺口
6. 图谱构建：产出 capability_web（按能力 ID 组织，含 type/fanout/covers/dependencies）

## 输出格式
严格按 requirement-web-schema.md 格式输出。
额外字段：context.target_level、context.year_source、context.year_inference_trace、strategy、capability_web、qualifier_injection；每个 proposition 附 capability_ids 和 level_weight。

## 写入
将 requirement-web.json 写入 {workDir}/.meta/requirement-web.json。`;
}
