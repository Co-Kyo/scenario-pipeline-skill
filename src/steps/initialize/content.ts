// 内容域:初始化。workDir 默认命名规则是唯一数据源(action/initRules/detail 三处引用)。
export const WORKDIR_NAMING = '{当前日期}-{场景简称}';

export function initializeDetail(): string {
    return `初始化只负责对齐 workDir 和共享文档：

1. 用户未指定目录时，默认使用 ${WORKDIR_NAMING}。
2. 向用户展示目录，等待确认；用户可修正。
3. 确认后写入 {workDir}/.meta/init.json。
4. 创建 {workDir}/.meta/run/run.json，作为本次运行的 run envelope。
5. 后续步骤按需加载 references/ 共享文档，不再重复确认 workDir。`;
}
