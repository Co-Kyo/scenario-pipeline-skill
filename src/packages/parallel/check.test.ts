// 内容包自带检查：清单合法性 ＋ 依赖声明 ＋ 拆分结构 ＋ 组合引用面
//
// 包内没有可执行入口（纯声明）；结构与组合的检查由框架装载器提供：
//   checkPackage(dir).structure   —— 写作块：散文拆得对不对
//   checkPackage(dir).composition —— 引用校验：拆出来的文档拼不拼得起来
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkPackage, loadPackage, readPackageManifest } from 'skillnomad';

const here = dirname(fileURLToPath(import.meta.url));
const readJson = (p: string) => JSON.parse(readFileSync(join(here, p), 'utf8')) as Record<string, unknown>;

const pkg = readJson('package.json') as {
    name: string;
    version: string;
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
};
const manifest = readJson('skill.json') as {
    standard: string;
    tier: string;
    method: { id: string; title: string };
    compose: string[];
    blocks: { id: string; role: string; file: string }[];
    module: { id: string; kind: string; version: string };
};

test('清单合法性：身份单一事实源在 package.json，名字合分级命名（判据 1）', () => {
    assert.ok(!('name' in manifest) && !('version' in manifest), 'skill.json 不应重复 name/version');
    assert.match(pkg.name, /^@[a-z0-9-]+\/[a-z0-9-]+$/, '全名形态应为 @<域>/<名>');
    if (manifest.tier === 'general') {
        assert.ok(pkg.name.startsWith('@skillnomad/'), 'general 级须在 @skillnomad 域下');
    } else {
        assert.ok(!pkg.name.startsWith('@skillnomad/'), '非 general 级不得占用 @skillnomad 域');
    }
});

test('清单合法性：标准符合性与分级已声明（判据 2）', () => {
    assert.equal(manifest.standard, 'skillnomad-skill-package/v1');
    assert.ok(['incubating', 'shared', 'general'].includes(manifest.tier), `tier 取值非法: ${manifest.tier}`);
});

test('清单合法性：块文件存在且非空（判据 3）', () => {
    assert.ok(manifest.blocks.length > 0);
    for (const block of manifest.blocks) {
        assert.ok(readFileSync(join(here, block.file), 'utf8').trim().length > 0, `${block.file} 为空`);
    }
});

test('清单合法性：组合顺序与块清单一致（判据 4）', () => {
    const ids = new Set(manifest.blocks.map((b) => b.id));
    for (const id of manifest.compose) assert.ok(ids.has(id), `compose 中的块未声明: ${id}`);
    assert.equal(manifest.compose.length, manifest.blocks.length, '每块都应进组合（当前无分层块）');
});

test('清单合法性：模块身份与版本一致（判据 5）', () => {
    assert.equal(manifest.module.version, pkg.version);
    assert.ok(manifest.module.id.length > 0);
});

test('依赖声明：包内全部外部 import 均已声明，工具依赖固定版本号（判据 6）', () => {
    const files: string[] = [];
    for (const entry of readdirSync(here, { recursive: true }) as string[]) {
        if (/\.(ts|mjs)$/.test(entry) && !entry.includes('node_modules')) files.push(entry);
    }
    const declared = new Set([
        ...Object.keys(pkg.dependencies ?? {}),
        ...Object.keys(pkg.peerDependencies ?? {}),
        ...Object.keys(pkg.devDependencies ?? {}),
    ]);
    const missing = new Set<string>();
    for (const file of files) {
        const src = readFileSync(join(here, file), 'utf8');
        for (const m of src.matchAll(/from\s+'([^']+)'/g)) {
            const spec = m[1];
            if (spec.startsWith('.') || spec.startsWith('node:')) continue;
            if (!declared.has(spec)) missing.add(spec);
        }
    }
    assert.deepEqual([...missing], [], `未声明的外部依赖：${[...missing].join(', ')}`);

    // 全局策略：任何依赖字段一律固定版本号，禁用 ^ ／ ~ ／范围
    const fields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;
    for (const field of fields) {
        for (const [name, version] of Object.entries((pkg[field] ?? {}) as Record<string, string>)) {
            assert.match(
                version,
                /^\d+\.\d+\.\d+$/,
                `${field}.${name} 必须写固定版本号，当前 ${version}（构思阶段全局禁用 ^／~／范围）`,
            );
        }
    }
});

test('散文拆分：写作块 check 无诊断（结构）', () => {
    assert.deepEqual(checkPackage(here).structure, []);
});

test('文档组合：引用全部解析且目标存在（组合引用面）', () => {
    assert.deepEqual(checkPackage(here).composition, []);
});

test('装载结果：正文按 compose 组合，标记解析成人话、无残留', () => {
    const loaded = loadPackage(here);
    assert.equal(loaded.parts.length, manifest.compose.length);
    assert.ok(!loaded.body.includes('[['), '渲染产物不应残留引用标记');
    assert.equal(loaded.name, pkg.name);
    assert.equal(loaded.version, pkg.version);
});

test('身份来源：清单装载读的是 package.json 的身份，不是 skill.json', () => {
    const { name, version } = readPackageManifest(here);
    assert.equal(name, pkg.name);
    assert.equal(version, pkg.version);
});
