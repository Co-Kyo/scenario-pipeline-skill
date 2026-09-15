// 消费者内容模块（D35 全链路首个真实用例）。
//
// 内容源＝代码模块的 render()：由构建期渲染进引用步骤的「模块附录」（执行用正本），
// 不再由步骤手工塞段落（原 scan `.section('调度绑定')`）或手工渲染函数（原 schedulingModuleDoc）。
import { defineModule, renderBinding, renderModuleDoc } from 'skillnomad';
import type { SourceModule } from 'skillnomad';
import { SCHEDULING_POLICY, SCAN_BINDING } from './domain/scheduling.js';
import { parallelMethodsModule } from './packages/parallel/index.js';

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

/** 并行方法包（内置内容包，src/packages/parallel）：方法正文由包内 md 提供。 */
export const parallelMethods: SourceModule = defineModule(parallelMethodsModule());

export const modules: SourceModule[] = [schedulingPolicyModule, scanBindingModule, parallelMethods];
