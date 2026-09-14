// 消费仓调度实例（D35 W4 首刀 · P2 归属框架仓，sp-skill 只做第一个消费者）。
//
// 本文件是框架机制 + sp-skill 业务配置的唯一交汇点：
// - 框架（skillnomad-common scheduling）：SCHEDULING 默认值、三动作组合子、动词、渲染；
// - 消费（本文件）：skill.ts 全局口径转出口、scan 绑定、生成断言口径。
// 改 W 只改框架 SCHEDULING 一处，本文件透传，8 步全跟随。
import {
    SCHEDULING,
} from 'skillnomad';
import type { SourceSchedulingPolicy } from 'skillnomad';

/** skill.ts 全局口径转出口（与 skill.ts:50-62 旧字面量同值；D32-W5 旧断言不断）。 */
export const SCHEDULING_POLICY: SourceSchedulingPolicy = {
    concurrencyLimit: SCHEDULING.concurrencyLimit,
    windowBudget: { ...SCHEDULING.windowBudget },
    batchPolicy: { ...SCHEDULING.batchPolicy },
    note: '各步骤具体调度模式（批量并行/滚动窗口/拓扑分批）见 process 的「调度策略」章节；本字段为 skill 级全局口径（W=5）。',
};

/** scan 绑定（首接 rollingWindow；F-10③：scan `.seq('scan-seq')` 改调模块的落点）。 */
export const SCAN_BINDING = {
    stepId: 'scan',
    mode: 'rolling_window' as const,
    taskGroup: '1 个命题批次 = 1 个 agent',
    limitW: SCHEDULING.concurrencyLimit,
    slotOccupancy: 1,
};

