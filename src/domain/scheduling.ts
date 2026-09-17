// 消费仓并发口径（自有常量：框架零调度口径后，数字只活在本文件）。
// 改 W 只改 CONCURRENCY_LIMIT 一处；窗口/分批同文件声明。
// （原 D35 W4 透传框架 SCHEDULING；框架侧已极致移除，本文件收回为自有。
//  原 SCAN_BINDING scan绑定已随模块删除而删除：scan reads不再引用，附录不再渲染。）

/** 全局最大并发 Task Group 数。 */
export const CONCURRENCY_LIMIT = 5 as const;

/** 窗口预算（单次调用/输入压缩）。 */
export const WINDOW_BUDGET = { maxWindowSize: 4, inputChunkTokens: 6000, itemSummaryTokens: 500 } as const;

/** 分批规则（模式 + 每批容量 + 槽位）。 */
export const BATCH_POLICY = { mode: 'rolling_window' as const, maxBatchSize: 3, slotOccupancy: 1 } as const;

