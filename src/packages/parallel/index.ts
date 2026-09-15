// ============================================================
// parallel 内容包（内置形态，未发布）
//
// 两件工具各管一段：
//   methodblocks —— 散文怎么拆：包内 md 拆成命名块（target／useMethod），
//                   结构自洽由 check() 保证（引用缺席、母版对齐、双发布）。
//   markrefs     —— 拆出来的文档怎么被组合：块名 → 路径的解析与存在性校验，
//                   组合顺序（compose）与块间交叉引用都按名字声明、按引用校验。
//
// 本文件只做三件事：读清单 → 建注册表与引用表 → 把组合结果包成模块对象。
// ============================================================

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Registry, check, doc } from 'methodblocks';
import type { Diagnostic as BlockDiagnostic, DocPart } from 'methodblocks';
import { validate as validateRefs } from 'markrefs';
import type { Diagnostic as RefDiagnostic, Io, KeyMap, RefDecl } from 'markrefs';
import type { SourceModule } from 'skillnomad';

const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string): string => readFileSync(join(here, relative), 'utf8');

interface BlockSpec {
    id: string;
    role: 'target' | 'useMethod' | 'example';
    file: string;
    whenToUse?: string;
}

const pkg = JSON.parse(read('package.json')) as { name: string; version: string };

const manifest = JSON.parse(read('skill.json')) as {
    method: { id: string; title: string };
    compose: string[];
    blocks: BlockSpec[];
    module: { id: string; kind: string; version: string };
};

/**
 * 显式引用标记：`[[块名]]`。
 *
 * 只有标记才是引用；正文里裸提名字只是提到，不建立引用关系（防误报与错拼——
 * 这也是后续跨包引用（`包名#块名`）的落点）。
 */
const REF_MARKER = /\[\[([^\]\s]+)\]\]/g;

const byId = new Map(manifest.blocks.map((b) => [b.id, b]));

/** 块的标题（首行 H1），用于把引用标记解析成可读文字。 */
const titleOf = (id: string): string => {
    const spec = byId.get(id);
    if (!spec) throw new Error(`parallel 包：引用了未在清单声明的块 ${id}`);
    const heading = read(spec.file).match(/^#\s+(.+)$/m);
    return heading ? heading[1].trim() : id;
};

/** 正文入装前把 `[[块名]]` 解析成该块标题（源里是标记，产物里是人话）。 */
const resolve = (text: string): string => text.replace(REF_MARKER, (_m, id: string) => `《${titleOf(id)}》`);

/** 块注册表：块文字来自包内 md（单一事实源在文件，代码只做登记）。 */
export const registry = new Registry();
for (const spec of manifest.blocks) {
    const text = resolve(read(spec.file));
    if (spec.role === 'target') registry.target(spec.id, text);
    else if (spec.role === 'useMethod') registry.useMethod(spec.id, text, spec.whenToUse);
    else registry.example(spec.id, text);
}

/** 组合顺序（清单驱动）：块名 → DocPart。 */
export const body: DocPart[] = manifest.compose.map((id) => {
    const spec = byId.get(id);
    if (!spec) throw new Error(`parallel 包：compose 里的块 ${id} 未在清单声明`);
    return spec.role === 'target' ? { target: id } : spec.role === 'useMethod' ? { useMethod: id } : { example: id };
});

/** 名字表：块名 → 文件（markrefs 的注入式名字表）。 */
export const keys: KeyMap = {
    entries: manifest.blocks.map((b) => ({ name: b.id, path: b.file, site: 'skill.json' })),
};

/** 从块正文抽取显式引用（抽取归宿主；解析与存在性归引用校验）。 */
export function extractRefs(specs: BlockSpec[] = manifest.blocks, textOfSpec = read): RefDecl[] {
    const out: RefDecl[] = [];
    for (const spec of specs) {
        for (const match of textOfSpec(spec.file).matchAll(REF_MARKER)) {
            out.push({ site: spec.file, name: match[1] });
        }
    }
    return out;
}

/** 引用登记：组合声明的每条块名（块名须存在）＋ 块正文里的显式引用标记。 */
export const refs: RefDecl[] = [
    ...manifest.compose.map((id): RefDecl => ({ site: 'skill.json', name: id })),
    ...extractRefs(),
];

const io: Io = { exists: (path: string) => {
    try {
        readFileSync(join(here, path));
        return true;
    } catch {
        return false;
    }
} };

/** 包自检输入：结构（methodblocks）＋ 组合（markrefs）。 */
export function packageDiagnostics(): { structure: BlockDiagnostic[]; composition: RefDiagnostic[] } {
    return {
        structure: check(registry, { body }),
        composition: validateRefs(refs, keys, io, { keysSource: 'skill.json' }),
    };
}

export const packageIdentity = { name: pkg.name, version: pkg.version };

/** 模块对象：`render` 返回组合好的方法正文——构建期渲染进引用步骤的「模块附录」。 */
export function parallelMethodsModule(): SourceModule {
    return {
        id: manifest.module.id,
        kind: 'method',
        version: manifest.module.version,
        render: () => doc(registry, body),
    };
}
