// 包自带检查（内容包规范 v1 §六）：清单合法性 + 文件存在 + 方法结构（写作块 check）
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { check } from 'methodblocks';

import { moduleId, registry } from './index.js';

const here = dirname(fileURLToPath(import.meta.url));
const readJson = (p: string) => JSON.parse(readFileSync(join(here, p), 'utf8')) as Record<string, unknown>;

const pkg = readJson('package.json');
const manifest = readJson('skill.json') as {
    name: string;
    version: string;
    methods: { id: string; file: string }[];
    references?: { id: string; file: string }[];
    entry: string;
    module: { id: string; kind: string; version: string };
};

test('清单合法性：两处身份一致（判据 1）', () => {
    assert.equal(manifest.name, pkg.name);
    assert.equal(manifest.version, pkg.version);
});

test('清单合法性：方法文件存在且非空（判据 2）', () => {
    assert.ok(manifest.methods.length > 0);
    for (const method of manifest.methods) {
        const text = readFileSync(join(here, method.file), 'utf8');
        assert.ok(text.trim().length > 0, `${method.file} 为空`);
    }
});

test('清单合法性：默认方法在清单里（判据 3）', () => {
    assert.ok(manifest.methods.some((m) => m.id === manifest.entry));
});

test('清单合法性：引用文件存在（判据 4）', () => {
    for (const ref of manifest.references ?? []) {
        const text = readFileSync(join(here, ref.file), 'utf8');
        assert.ok(text.trim().length > 0, `${ref.file} 为空`);
    }
});

test('清单合法性：模块身份与代码一致（判据 5）', () => {
    assert.equal(manifest.module.id, moduleId);
    assert.equal(manifest.module.version, manifest.version);
});

test('方法结构：写作块 check 无阻断诊断', () => {
    const method = manifest.methods.find((m) => m.id === manifest.entry);
    assert.ok(method);
    const diagnostics = check(registry, { body: [{ useMethod: method.id }] });
    assert.deepEqual(diagnostics, []);
});
