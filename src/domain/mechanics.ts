// 步骤机制层工厂:消除步骤定义中的机械重复。
// 约束:所有工厂的输出必须与手写字面量等价(渲染字节不变)。
import type { SourceVerifyRule } from 'skillnomad';
import { fail as failKit, verify as verifyKit } from '../verify.js';

/** 同一产物的成对校验:先查存在、再查可解析 */
export function verifyPair(ref: string, existsDesc: string, parseDesc: string): SourceVerifyRule[] {
    return [verifyKit.file(ref, existsDesc), verifyKit.json(ref, parseDesc)];
}

/** title_fold 多选 display 基座(intent-anchor/brainstorm/capability-graph 三处共同字段) */
const DISPLAY_FOLD_MULTI_BASE = {
    pattern: 'title_fold',
    max_visible: 7,
    badge: 'difficulty',
    legend: true,
    selection: 'multi',
} as const;

/** title_fold + difficulty 多选 display;primary_unit 按步骤传入(anchor/proposition/capability) */
export function displayFoldMulti(primaryUnit: string) {
    return { ...DISPLAY_FOLD_MULTI_BASE, primary_unit: primaryUnit };
}

// re-export 便于步骤文件单一导入点
export { failKit as fail, verifyKit as verify };
