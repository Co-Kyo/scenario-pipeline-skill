// 消费者内容模块（D35 全链路首个真实用例）。
//
// 内容源＝代码模块的 render()：由构建期渲染进引用步骤的「模块附录」（执行用正本），
// 不再由步骤手工塞段落（原 scan `.section('调度绑定')`）或手工渲染函数（原 schedulingModuleDoc）。
import { defineModule, packageModule, renderBinding, renderModuleDoc } from 'skillnomad';
import type { SourceModule } from 'skillnomad';
import { fileURLToPath } from 'node:url';
import { SCHEDULING_POLICY, SCAN_BINDING } from './domain/scheduling.js';

/** 调度策略模块（在册；SKILL 级挂接点待框架后续版本）。 */
export const schedulingPolicyModule: SourceModule = defineModule({
    id: 'scheduling-policy',
    kind: 'data',
    version: '0.1.0',
    render: () => renderModuleDoc(SCHEDULING_POLICY),
});

/** scan 调度绑定模块（step 级；scan reads 命中 → 构建期进该步「模块附录」）。 */
export const scanBindingModule: SourceModule = defineModule({
    id: 'scan-binding',
    kind: 'action',
    version: '0.1.0',
    render: () => renderBinding(SCAN_BINDING),
});

/**
 * 并行方法包（内置内容包，src/packages/parallel）：**纯声明**（skill.json ＋ blocks），
 * 由框架装载器读懂并组合——包内没有可执行入口，组合是编译器的职责。
 */
export const parallelMethods: SourceModule = defineModule(
    packageModule(fileURLToPath(new URL('./packages/parallel', import.meta.url))),
);

/**
 * 评估方法包（内置内容包，src/packages/evaluate）：**纯声明**（skill.json ＋ blocks），
 * 由框架装载器读懂并组合——包内没有可执行入口，组合是编译器的职责。
 */
export const evaluateMethods: SourceModule = defineModule(
    packageModule(fileURLToPath(new URL('./packages/evaluate', import.meta.url))),
);

/**
 * 分区方法包（内置内容包，src/packages/partition）：**纯声明**（skill.json ＋ blocks），
 * 由框架装载器读懂并组合——包内没有可执行入口，组合是编译器的职责。
 */
export const partitionMethods: SourceModule = defineModule(
    packageModule(fileURLToPath(new URL('./packages/partition', import.meta.url))),
);

/**
 * 图谱方法包（内置内容包，src/packages/capability）：**纯声明**（skill.json ＋ blocks），
 * 由框架装载器读懂并组合——包内没有可执行入口，组合是编译器的职责。
 */
export const capabilityMethods: SourceModule = defineModule(
    packageModule(fileURLToPath(new URL('./packages/capability', import.meta.url))),
);

/**
 * 头脑风暴执行规则包（内置内容包，src/packages/brainstorm-rules）：**纯声明**（skill.json ＋ blocks），
 * 由框架装载器读懂并组合——包内没有可执行入口，组合是编译器的职责。
 */
export const brainstormRulesMethods: SourceModule = defineModule(
    packageModule(fileURLToPath(new URL('./packages/brainstorm-rules', import.meta.url))),
);

export const modules: SourceModule[] = [schedulingPolicyModule, scanBindingModule, parallelMethods, evaluateMethods, partitionMethods, capabilityMethods, brainstormRulesMethods];
