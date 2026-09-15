// 包自带检查（内容包规范 v1 §六）：清单合法性 ＋ 散文拆分结构 ＋ 组合引用完整性
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isBlocking } from 'markrefs';

import { body, keys, packageDiagnostics, refs } from './index.js';

const here = dirname(fileURLToPath(import.meta.url));
const readJson = (p: string) => JSON.parse(readFileSync(join(here, p), 'utf8')) as Record<string, unknown>;

const pkg = readJson('package.json');
const manifest = readJson('skill.json') as {
    name: string;
    version: string;
    method: { id: string; title: string };
    compose: string[];
    blocks: { id: string; role: string; file: string }[];
    module: { id: string; kind: string; version: string };
};

test('清单合法性：两处身份一致（判据 1）', () => {
    assert.equal(manifest.name, pkg.name);
    assert.equal(manifest.version, pkg.version);
});

test('清单合法性：块文件存在且非空（判据 2）', () => {
    assert.ok(manifest.blocks.length > 0);
    for (const block of manifest.blocks) {
        const text = readFileSync(join(here, block.file), 'utf8');
        assert.ok(text.trim().length > 0, `${block.file} 为空`);
    }
});

test('清单合法性：组合顺序里的块都在清单内、清单里的块都进组合（判据 3）', () => {
    const ids = new Set(manifest.blocks.map((b) => b.id));
    for (const id of manifest.compose) assert.ok(ids.has(id), `compose 中的块未声明: ${id}`);
    assert.equal(manifest.compose.length, manifest.blocks.length, '每块都应进组合（当前无分层块）');
});

test('清单合法性：名字表与引用表同源（判据 4）', () => {
    assert.deepEqual(
        keys.entries.map((e) => e.name).sort(),
        manifest.blocks.map((b) => b.id).sort(),
    );
    assert.ok(refs.length >= manifest.compose.length, '组合声明应逐条登记为引用');
});

test('清单合法性：模块身份与代码一致（判据 5）', () => {
    assert.equal(manifest.module.version, manifest.version);
    assert.ok(manifest.module.id.length > 0);
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
