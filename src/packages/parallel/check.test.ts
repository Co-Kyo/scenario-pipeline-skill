// 包自带检查（内容包规范 v1 §六）：清单合法性 ＋ 散文拆分结构 ＋ 组合引用完整性
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isBlocking } from 'markrefs';

import { body, extractRefs, keys, packageDiagnostics, packageIdentity, parallelMethodsModule, refs } from './index.js';

const here = dirname(fileURLToPath(import.meta.url));
const readJson = (p: string) => JSON.parse(readFileSync(join(here, p), 'utf8')) as Record<string, unknown>;

const pkg = readJson('package.json');
const manifest = readJson('skill.json') as {
    standard: string;
    tier: string;
    method: { id: string; title: string };
    compose: string[];
    blocks: { id: string; role: string; file: string }[];
    module: { id: string; kind: string; version: string };
};

test('清单合法性：身份单一事实源在 package.json，名字合分级命名（判据 1）', () => {
    // 清单不再重复 name/version——身份只在 package.json（防双事实源）
    assert.ok(!('name' in manifest) && !('version' in manifest), 'skill.json 不应重复 name/version');
    assert.equal(packageIdentity.name, pkg.name);
    assert.equal(packageIdentity.version, pkg.version);
    assert.match(String(pkg.name), /^@[a-z0-9-]+\/[a-z0-9-]+$/, '全名形态应为 @<域>/<名>');
    if (manifest.tier === 'general') {
        assert.ok(String(pkg.name).startsWith('@skillnomad/'), 'general 级须在 @skillnomad 域下');
    } else {
        assert.ok(!String(pkg.name).startsWith('@skillnomad/'), '非 general 级不得占用 @skillnomad 域');
    }
});

test('清单合法性：标准符合性与分级已声明（判据 2）', () => {
    assert.equal(manifest.standard, 'skillnomad-skill-package/v1');
    assert.ok(['incubating', 'shared', 'general'].includes(manifest.tier), `tier 取值非法: ${manifest.tier}`);
    assert.equal((pkg.dependencies as Record<string, string>)['methodblocks'] !== undefined, true);
});

test('清单合法性：块文件存在且非空（判据 3）', () => {
    assert.ok(manifest.blocks.length > 0);
    for (const block of manifest.blocks) {
        const text = readFileSync(join(here, block.file), 'utf8');
        assert.ok(text.trim().length > 0, `${block.file} 为空`);
    }
});

test('清单合法性：组合顺序里的块都在清单内、清单里的块都进组合（判据 4）', () => {
    const ids = new Set(manifest.blocks.map((b) => b.id));
    for (const id of manifest.compose) assert.ok(ids.has(id), `compose 中的块未声明: ${id}`);
    assert.equal(manifest.compose.length, manifest.blocks.length, '每块都应进组合（当前无分层块）');
});

test('清单合法性：名字表与引用表同源（判据 4·续）', () => {
    assert.deepEqual(
        keys.entries.map((e) => e.name).sort(),
        manifest.blocks.map((b) => b.id).sort(),
    );
    assert.ok(refs.length >= manifest.compose.length, '组合声明应逐条登记为引用');
});

test('清单合法性：模块身份与代码一致（判据 5）', () => {
    assert.equal(manifest.module.version, pkg.version);
    assert.ok(manifest.module.id.length > 0);
});

test('依赖声明：包内全部外部 import 均已声明，且工具依赖固定版本号', () => {
    const sources = ['index.ts', 'check.test.ts'].map((f) => readFileSync(join(here, f), 'utf8')).join('\n');
    const specifiers = [...sources.matchAll(/from\s+'([^']+)'/g)]
        .map((m) => m[1])
        .filter((s) => !s.startsWith('.') && !s.startsWith('node:'));
    const declared = new Set([
        ...Object.keys((pkg.dependencies ?? {}) as Record<string, string>),
        ...Object.keys((pkg.peerDependencies ?? {}) as Record<string, string>),
    ]);
    const missing = [...new Set(specifiers)].filter((s) => !declared.has(s));
    assert.deepEqual(missing, [], `未声明的外部依赖：${missing.join(', ')}`);

    // 工具依赖写固定版本号（构思阶段策略，杜绝跨号漂移）
    for (const [name, version] of Object.entries((pkg.dependencies ?? {}) as Record<string, string>)) {
        assert.match(version, /^\d+\.\d+\.\d+$/, `${name} 应为固定版本号，当前 ${version}`);
    }
});

test('引用机制：只有 [[块名]] 标记才产生引用；裸提名字不算（判据 6）', () => {
    const marked = extractRefs([{ id: 'demo', role: 'useMethod', file: 'blocks/how.md' }]);
    assert.ok(marked.length >= 1, 'how 块应至少有一条标记引用');
    assert.ok(marked.every((r) => r.name === 'parallel-gate'), '标记引用的名字应为 parallel-gate');

    // 反例：把标记换成裸提名字，抽不到任何引用
    const bare = extractRefs(
        [{ id: 'demo', role: 'useMethod', file: 'blocks/how.md' }],
        () => '这里只是提到 parallel-gate 这个名字，不建立引用关系。',
    );
    assert.deepEqual(bare, []);
});

test('散文拆分：写作块 check 无诊断（methodblocks）', () => {
    assert.deepEqual(packageDiagnostics().structure, []);
});

test('文档组合：引用全部解析且目标存在（markrefs）', () => {
    const blocking = packageDiagnostics().composition.filter((d) => isBlocking(d));
    assert.deepEqual(blocking, []);
});

test('组合结果非空且含全部块正文', () => {
    assert.equal(body.length, manifest.compose.length);
});

test('产物不留标记：渲染后正文不含 [[ ]]（源里是标记，产物里是人话）', () => {
    const rendered = parallelMethodsModule().render();
    assert.ok(!rendered.includes('[['), '渲染产物不应残留引用标记');
    assert.ok(rendered.includes('《门禁与收敛检查清单》'), '标记应解析成被引块的标题');
});
