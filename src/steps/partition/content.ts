// 内容域:依赖分区。依赖类型枚举、Leiden 阈值、session 上限为唯一数据源。
export const DEPENDENCY_TYPES = [
    'prerequisite：A 是 B 的前置知识',
    'enables：A 让 B 更容易理解',
    'related：无严格先后',
    'extends：B 是 A 的进阶变体',
] as const;

/** 分量节点数超过该阈值时运行 Leiden 聚类 */
export const LEIDEN_THRESHOLD = 8 as const;

/** 当前 session 命题数上限 */
export const SESSION_MAX_PROPOSITIONS = 12 as const;

export function detail(): string {
    const types = DEPENDENCY_TYPES.map((t) => `- ${t}`).join('\n');
    return `依赖类型：

${types}

构建 DAG 时，prerequisite 和 enables 为有向边，related 为无向边。

检测到环时，先断开 related 类型边，直到无环。`;
}

export function threeLayerSection(): string {
    return `1. 连通分量：每个分量是一个候选 session。
2. 拓扑深度：同 depth 的节点组成反链，可并行。
3. 社区发现：分量节点数大于 ${LEIDEN_THRESHOLD} 时运行 Leiden 聚类。`;
}

export function sessionSection(): string {
    return `包含最多 core 命题的分量进入当前 session S1。

当前 session 超过 ${SESSION_MAX_PROPOSITIONS} 个命题时按社区拆分。

其余分量排期到 S2/S3，并写入恢复指令。`;
}

export function dagTask(): string {
    return `建图做法见模块附录（partition-methods）：建图、断环。
本任务绑定：读取 requirement-web.json，构建节点和边。`;
}

export function sessionTask(): string {
    return `分层分批见模块附录（partition-methods）：三层分层、批次分配。
本任务绑定：分配 current_session 和 deferred_sessions，生成 execution-plan.md。`;
}

/** fail.degrade 触发词 */
export function sessionOverflowText(): string {
    return `当前 session 超过 ${SESSION_MAX_PROPOSITIONS} 个命题`;
}
