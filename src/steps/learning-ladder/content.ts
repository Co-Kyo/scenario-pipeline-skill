// 学习域:学习阶梯领域服务。
// 阶段数量、拓扑分层、Step 字段是学习规则——在此声明为数据,
// 提示词由规则派生:判据校准表渲染、预计时长、
// 完成标记与进度留痕、救援链接规则。
import { LEVEL_CRITERIA_TABLE } from './learner.js';

export const LADDER_STAGE_COUNT = { min: 3, max: 4 } as const;

/** 能力数量上限(超过则合并相似能力,对应失败预案) */
export const LADDER_MAX_CAPABILITIES = 8 as const;

/** 二值验收字段名 */
export const LADDER_JUDGMENT_FIELD = '做到才算过' as const;

export const LAYER_RULES = [
    'Layer 0：无依赖能力',
    'Layer 1：依赖 Layer 0',
    'Layer 2：依赖 Layer 0+1',
] as const;

/** 阶梯 Step 的固定字段;「做到才算过」是二值验收字段(见 effects.ts E-ladder-judgment) */
export const LADDER_STEP_FIELDS = [
    '要做什么',
    '预计时长(分钟)',
    '你会看到什么',
    '这说明了什么',
    '接下来去哪',
    '做到才算过',
    '完成标记',
] as const;

export function ladderDetail(): string {
    const layers = LAYER_RULES.map((l) => `- ${l}`).join('\n');
    return `提取命题能力子图。

按依赖拓扑分层：

${layers}

归纳 ${LADDER_STAGE_COUNT.min}-${LADDER_STAGE_COUNT.max} 个阶段，每阶段包含概念、技能、综合步骤。`;
}

export function stepFormat(): string {
    const fields = LADDER_STEP_FIELDS.map((f) => `- ${f}`).join('\n');
    return `每步包含：

${fields}

失败时给出明确回退指引。`;
}

/** 判据校准表渲染(运行时按 anchors.json 的 target_level 选用) */
export function judgmentCalibrationTable(): string {
    const rows = LEVEL_CRITERIA_TABLE.map((r) => `- **${r.level}**：${r.traits}`).join('\n');
    return `判据校准表（学习者的 target_level 见 {workDir}/.meta/brainstorm/anchors.json）：

${rows}

为每条「${LADDER_JUDGMENT_FIELD}」选取与该水平相称的验证动作，禁止对低水平学习者使用高水平判据。`;
}

export function workerTask(): string {
    return `你是 {proposition_name} 的学习阶梯生成专家。
提取能力子图。
拓扑排序并归纳阶段。
每个阶段编排概念、技能、综合步骤，每步给出预计时长(分钟)。
判据按学习者水平校准：依据 anchors.json 的 target_level 参照判据校准表选取相称的验证动作。
每步「接下来去哪」指向可动手的资源：未通过时给更小的步或该能力 §最小验证实验，不得只指向 §核心机制。
每步写入完成标记，并将 {step_id, passed, stuck, date} 追加至 {workDir}/.meta/learning/progress.json。
写入 learning-ladder.md。`;
}
