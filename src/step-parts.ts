// 写一步的零件：动作、校验、失败、屏障、展示。
// 读者时刻：我要写或改某一步，需要这些动词与规则工厂。
// 消费者：src/steps/*/step.ts（11 步）。本文件不认识任何具体步骤，也不含路径与产物名。
import type {
    NextAction,
    SourceAction,
    SourceCheckpoint,
    SourceFailRule,
    SourceFlow,
    SourceVerifyRule,
} from 'skillnomad';

/** 动作：一个 agent 任务（step 内 flow 的最小单位）。 */
export function agentAction(
    verb: NextAction,
    id: string,
    label: string,
    content: string,
    timeout = 5,
): SourceAction {
    return {
        id,
        label,
        verb,
        actor: 'agent',
        content,
        timeout,
    };
}

/** 产物流：把动作包成 flow（step.flow 的元素）。 */
export function doAction(
    verb: NextAction,
    id: string,
    label: string,
    content: string,
    timeout = 5,
): SourceFlow {
    return {
        kind: 'do',
        task: agentAction(verb, id, label, content, timeout),
    };
}

/** 校验规则：产物存在性/可解析/字段/计数/命令。 */
export const verify = {
    file: (ref: string, description: string): SourceVerifyRule => ({
        type: 'file-exists',
        ref,
        description,
    }),
    json: (ref: string, description: string): SourceVerifyRule => ({
        type: 'json-parse',
        ref,
        description,
    }),
    schema: (ref: string, description: string): SourceVerifyRule => ({
        type: 'schema',
        ref,
        description,
    }),
    field: (ref: string, description: string): SourceVerifyRule => ({
        type: 'field',
        ref,
        description,
    }),
    count: (description: string): SourceVerifyRule => ({
        type: 'count',
        description,
    }),
    command: (description: string): SourceVerifyRule => ({
        type: 'command',
        description,
    }),
};

/** 失败规则：超时/缺项时重试、降级、跳过、停止或转人工检查点。 */
export const fail = {
    retry: (on: string, then: string): SourceFailRule => ({
        on,
        behavior: 'retry',
        then,
    }),
    degrade: (on: string, then: string): SourceFailRule => ({
        on,
        behavior: 'degrade',
        then,
    }),
    skip: (on: string, then: string): SourceFailRule => ({
        on,
        behavior: 'skip',
        then,
    }),
    halt: (on: string, then: string): SourceFailRule => ({
        on,
        behavior: 'halt',
        then,
    }),
    checkpoint: (on: string, then: string): SourceFailRule => ({
        on,
        behavior: 'checkpoint',
        then,
    }),
};

/** 检查点：必须停住等用户确认（step.checkpoint 的元素）。 */
export function barrier(
    checkItems: string[],
    clarifyPrompt: string,
): SourceCheckpoint {
    return {
        checkItems,
        clarifyPrompt,
        onConfirm: 'continue',
        onReject: 'rollback',
    };
}

/** 同一产物的成对校验：先查存在、再查可解析（verifyPair）。 */
export function verifyPair(ref: string, existsDesc: string, parseDesc: string): SourceVerifyRule[] {
    return [verify.file(ref, existsDesc), verify.json(ref, parseDesc)];
}

/** title_fold 多选 display 基座（intent-anchor/brainstorm/capability-graph 三处共同字段）。 */
const DISPLAY_FOLD_MULTI_BASE = {
    pattern: 'title_fold',
    max_visible: 7,
    badge: 'difficulty',
    legend: true,
    selection: 'multi',
} as const;

/** title_fold + difficulty 多选 display；primary_unit 按步骤传入（anchor/proposition/capability）。 */
export function displayFoldMulti(primaryUnit: string) {
    return { ...DISPLAY_FOLD_MULTI_BASE, primary_unit: primaryUnit };
}
