// 学习域:学习者模型。
// 判据校准规则数据化为 per-level 表,渲染进阶梯模板;
// 运行时由 AI 按 anchors.json 的 target_level 选用(不做构建期求值)。
export type Level = 'L1' | 'L2' | 'L3' | 'L4';

export const LEVELS: readonly Level[] = ['L1', 'L2', 'L3', 'L4'];

export interface LearnerProfile {
    level: Level;
    /** 本次学习会话的时间盒(分钟),运行时由 anchors/init 提供 */
    timeBoxMinutes?: number;
    goal?: string;
}

/** 判据校准表(初版规则,可调):各级学习者的判据特征 */
export interface LevelCriterion {
    level: Level;
    traits: string;
}

export const LEVEL_CRITERIA_TABLE: readonly LevelCriterion[] = [
    { level: 'L1', traits: '概念级:能复述定义、指认关键部件,判据以「能指出/能说清」为主' },
    { level: 'L2', traits: '方案级:能在指导下完成,判据以「能照做并对照检查表验证」为主' },
    { level: 'L3', traits: '决策级:能独立选型并说明取舍,判据以「能对比方案并给出理由」为主' },
    { level: 'L4', traits: '体系级:能设计体系并教他人,判据以「能从零设计并讲解」为主' },
];

export function levelCriterion(level: Level): string {
    const hit = LEVEL_CRITERIA_TABLE.find((r) => r.level === level);
    return hit ? hit.traits : LEVEL_CRITERIA_TABLE[1].traits;
}
