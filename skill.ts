import type { SkillSourceModel } from 'skillnomad';
import { createSkillFromModel } from 'skillnomad';
import { contracts } from './src/skill-decl.js';
import { policies } from './src/skill-decl.js';
import { steps } from './src/steps/index.js';

// Phase II:阶段→步骤映射唯一数据源（链顺序唯一事实是 dependsOn 声明，由框架构建期校验；
// flow.test 为 8.9 裁定的空壳记录文件，无断言，不跑守卫）
// B11-A:单步阶段的 description 以该步 summary 为正本(消除双写漂移)
const summaryOf = (id: string) => steps.find((s) => s.id === id)?.summary ?? '';

export const phaseDefs: { name: string; stepIds: string[]; description: string }[] = [
    { name: '初始化', stepIds: ['initialize'], description: summaryOf('initialize') },
    { name: '意图锚定', stepIds: ['intent-anchor'], description: summaryOf('intent-anchor') },
    { name: '头脑风暴', stepIds: ['brainstorm'], description: summaryOf('brainstorm') },
    { name: '依赖分区', stepIds: ['partition'], description: summaryOf('partition') },
    { name: '前处理', stepIds: ['scan', 'capability-graph', 'evaluate-pool'], description: '串行扫描、建图、评估入池' },
    { name: '后处理', stepIds: ['capability-research', 'briefing-assemble', 'assemble', 'learning-ladder'], description: '串行研究、Briefing、组装、学习阶梯' },
];

// 手写副本删除——"标注与边界一致"是派生的定义而非待守卫的约束。

const model: SkillSourceModel = {
    meta: {
        name: 'scenario-pipeline',
        title: 'Scenario Pipeline',
        description: `将前端技术文章转化为三层结构化知识产品：
- **命题研究** → overview + edge-cases + trade-offs + experiment
- **能力知识库** → capabilities/{id}-{name}.md（跨命题原子能力）
- **学习阶梯** → learning-ladder.md（渐进式引导路径）`,
        frontmatterDescription: '前端复合工程场景知识管线。工作流：意图锚定→头脑风暴→前处理（广域扫描→能力图谱构建→评估入池）＋后处理（能力研究→Briefing→命题组装→学习阶梯）。用自然语言显式调用（见 SKILL.md 调用方式），支持从任意步骤断点续写。',
        callExamples: [
            { label: '完整流程', pattern: '使用 scenario-pipeline，对 <场景描述> 进行完整研究' },
            { label: '仅前处理', pattern: '使用 scenario-pipeline，对 <信息源> 进行前处理' },
            { label: '仅后处理', pattern: '使用 scenario-pipeline，从能力研究开始，处理 <场景>' },
            { label: '断点续写', pattern: '使用 scenario-pipeline，从 Step <N> 继续处理 <场景>' },
        ],
        usageNote: '系统从自然语言自动推断：经验年限、研究深度、目标平台等约束。',
        isolationNote: '每步只读该步文件，严禁提前加载后续步骤；长文档按需分段查阅。',
        includeBuildFooter: false,
        params: [
            { name: '--year=L1|L2|L3|L4', description: '经验年限，可省略并自动推断' },
            { name: '--source=<url|file>', description: '指定扫描信源，可省略并自动推断' },
        ],
        phases: phaseDefs,
        // D40 R0-①：initStepId 删（派生值，?? deriveInitStepId 回落，root 即 initialize，零行为变化）。
    },
    contracts,
    policies,
    steps,
};

export const skill = createSkillFromModel(model);
