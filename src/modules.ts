// 消费者内容模块（D35 全链路首个真实用例）。
//
// 内容源＝代码模块的 render()：由构建期渲染进引用步骤的「模块附录」（执行用正本），
// 不再由步骤手工塞段落（原 scan `.section('调度绑定')`）或手工渲染函数（原 schedulingModuleDoc）。
import { defineModule, packageModule } from 'skillnomad';
import type { SourceModule } from 'skillnomad';
import { fileURLToPath } from 'node:url';

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

export const modules: SourceModule[] = [parallelMethods, evaluateMethods, partitionMethods, capabilityMethods, brainstormRulesMethods];
