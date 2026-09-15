// ============================================================
// parallel 内容包（内置形态，未发布）：并行分析通用方法
//
// 包清单与自检见 ./skill.json 与 ./check.test.ts；
// 本文件只做一件事：把包里的方法正文包成模块对象（进框架的挂接声明见 skill.json.module）。
// ============================================================

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Registry, doc } from 'methodblocks';
import type { SourceModule } from 'skillnomad';

const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string): string => readFileSync(join(here, relative), 'utf8');

const METHOD_ID = 'parallel-analysis';

/** 块注册表：方法正文即包内 md（单一事实源在文件，代码只做登记）。 */
export const registry = new Registry().useMethod(
    METHOD_ID,
    read('methods/parallel-analysis.md'),
    '当同一主题需要多个独立维度并行分析并汇总时',
);

/** 包清单里声明的模块身份（skill.json.module）。 */
export const moduleId = 'parallel-methods';

/** 模块对象：`render` 返回方法正文——构建期渲染进引用步骤的「模块附录」。 */
export function parallelMethodsModule(): SourceModule {
    return {
        id: moduleId,
        kind: 'method',
        version: '0.1.0',
        render: () => doc(registry, [{ useMethod: METHOD_ID }]),
    };
}
