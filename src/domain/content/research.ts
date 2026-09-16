// 内容域:能力研究。分组规则、域任务、素材分配、任务模板与文件模板为唯一数据源。
// 并行宽度以 shared.PARALLEL_WIDTH 为唯一源（R2e-P1b：消解手写 W=5 字面量）。
import { PARALLEL_WIDTH } from './shared.js';

export const research = {
    detail: () => `分组规则：

开始前必须先读取 {workDir}/.meta/.raw-materials/index.json，生成 {workDir}/.meta/research-plan.json。

1. 按技术层初步分组。
2. 有直接依赖的能力尽量同组。
3. 每组上限 5 个能力，不足 2 个可与相邻组合并。
4. M 系列特化能力归入其依赖的通用能力组。

依赖编排：

1. 无跨组依赖的组第一批并行。
2. 有跨组依赖的组等待依赖组完成。
3. 同一批内并行，W=${PARALLEL_WIDTH}。`,
    domainAgentTask: () => `每个域 Agent 读取能力描述、扇出度、标签和参考 URL。

按依赖顺序执行：

- 无依赖能力直接产出
- 有依赖能力先读取前置摘要再产出

每个能力写入：

- {workDir}/.meta/research-plan.json
- {workDir}/capabilities/{id}-{name}.md
- {workDir}/.meta/summaries/{id}-{name}.json`,
    materialAllocation: () => `生成 research-plan.json 时必须满足：

1. 从 index.json 读取全部 fetch_status=ok 素材。
2. 按能力描述、covers、layer 和 reference 关联分配素材。
3. 每个素材的 usage 只能是 primary / supporting / optional：
   - primary：该能力独有的核心证据
   - supporting：补充机制、工具或权衡
   - optional：可复用但不是本能力必要证据
4. 每个 ok 素材必须至少出现在一个能力的 materials 中，不能静默丢弃。
5. 无法按能力边界分配的素材标记 usage=optional，并写 selection_reason。
6. 输出 coverage：ok_total、assigned_unique、optional_count、assigned_pct。

域 Agent 必须读取自己能力的 research-plan 子集，并在摘要中写 material_usage。`,
    domainAgentTemplate: () => `你是 {domain_name} 技术域的深度研究员。
研究以下原子能力，按依赖顺序执行。
先读取 {workDir}/.meta/research-plan.json 中分配给本能力的 materials 子集。
每个能力产出主文件和结构化摘要。
每个摘要必须包含 material_usage，逐条记录 material_id、file_path、usage、selection_reason。
T0 优先，缺失时按 T1/T2/T3 补充。
禁止凭记忆生成，必须 web_fetch 验证内容。`,
    capabilityFileTemplate: () => `# {capability_name}
> {description}

## 核心机制
## 工程瓶颈
## 调试工具
## 典型权衡
## 最小验证实验
## 参考资料`,
};
