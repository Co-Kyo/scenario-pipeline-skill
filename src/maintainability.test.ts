import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// 可维护性基线（负担数即测试）：锁文件层次与心理负担，不锁正确性。
// 口径：行数 = wc -l（换行符个数）；目录深度 = 相对路径分隔符个数。
// 基线日 2026-09-16 实测：接线中枢 277 行／最胖步骤 brainstorm 134 行／
// 最胖内容域 scan.ts 209 行／包块最大 14 行／assets 25 文件／包文件 34 个。
// 任一红 = 负担涨过线，先停下看树再决定加不加，不顺手调阈值。

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

const countLines = (text: string): number => {
    if (text.length === 0) return 0;
    const nl = (text.match(/\n/g) ?? []).length;
    return text.endsWith('\n') ? nl : nl + 1;
};

const read = (rel: string): string => readFileSync(join(repoRoot, rel), 'utf-8');

const listFiles = (relDir: string, suffix?: string): string[] => {
    const out: string[] = [];
    const walk = (dir: string): void => {
        for (const name of readdirSync(dir)) {
            if (name === 'node_modules' || name === 'dist') continue;
            const p = join(dir, name);
            if (statSync(p).isDirectory()) walk(p);
            else if (!suffix || p.endsWith(suffix)) out.push(p);
        }
    };
    walk(join(repoRoot, relDir));
    return out;
};

const relOf = (abs: string): string => relative(repoRoot, abs).split(sep).join('/');

test('负担基线：接线中枢三文件总行数不超限（加包必涨，涨过线即停）', () => {
    const files = ['src/contracts.ts', 'src/modules.ts', 'src/domain/entities.ts'];
    const total = files.reduce((n, f) => n + countLines(read(f)), 0);
    assert.ok(total <= 320, `接线中枢 ${total} 行超 320 行红线（基线 277）——先看树再加包`);
});

test('负担基线：模块通道条目数与包目录数一致（包数＋scan-binding）', async () => {
    const { contracts } = await import('./contracts.js') as {
        contracts: { module?: string }[];
    };
    const entries = contracts.filter((c) => c.module).length;
    const pkgDirs = readdirSync(join(repoRoot, 'src/packages'), { withFileTypes: true })
        .filter((e) => e.isDirectory()).length;
    assert.equal(entries, pkgDirs + 1, `模块条目 ${entries} ≠ 包目录 ${pkgDirs}＋scan-binding——接线漂移`);
});

test('负担基线：单步文件不超限（brainstorm 134 为当前最胖）', () => {
    for (const abs of listFiles('src/steps', '.ts')) {
        if (abs.endsWith('/index.ts')) continue;
        const n = countLines(readFileSync(abs, 'utf-8'));
        assert.ok(n <= 150, `${relOf(abs)} ${n} 行超 150 行红线——该步该拆不断加`);
    }
});

test('负担基线：内容域单文件不超限（scan.ts 209 为当前最胖）', () => {
    for (const abs of listFiles('src/domain', '.ts')) {
        if (abs.endsWith('.test.ts')) continue;
        const n = countLines(readFileSync(abs, 'utf-8'));
        assert.ok(n <= 220, `${relOf(abs)} ${n} 行超 220 行红线——该域该拆不断加`);
    }
});

test('负担基线：包自检复制债务显性化（四份 142 行同字节，改一份即红）', () => {
    const files = listFiles('src/packages').filter((p) => p.endsWith('/check.test.ts')).sort();
    assert.ok(files.length >= 4, `包自检应至少 4 份，当前 ${files.length}`);
    const hashes = files.map((f) =>
        createHash('md5').update(readFileSync(f)).digest('hex'),
    );
    assert.ok(new Set(hashes).size === 1, `包自检已分叉（${hashes.join(', ')})——收敛成共享基座前不许各改各的`);
    for (const f of files) {
        const n = countLines(readFileSync(f, 'utf-8'));
        assert.ok(n <= 150, `${relOf(f)} ${n} 行超限`);
    }
});

test('负担基线：包块小尺寸（每块≤20 行，当前最大 14）', () => {
    const blocks = listFiles('src/packages').filter((p) => p.includes('/blocks/') && p.endsWith('.md'));
    assert.ok(blocks.length > 0, '包块缺失');
    for (const f of blocks) {
        const n = countLines(readFileSync(f, 'utf-8'));
        assert.ok(n <= 20, `${relOf(f)} ${n} 行超 20 行红线——块该切小不断加`);
    }
});

test('负担基线：assets 单步目录≤6 文件、总数≤30（当前 25）', () => {
    const all = listFiles('assets');
    assert.ok(all.length <= 30, `assets ${all.length} 文件超 30 红线`);
    const perDir = new Map<string, number>();
    for (const abs of all) {
        const rel = relOf(abs);
        const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '.';
        perDir.set(dir, (perDir.get(dir) ?? 0) + 1);
    }
    for (const [dir, n] of perDir) {
        assert.ok(n <= 6, `${dir} ${n} 文件超 6 红线——该目录该分组不断加`);
    }
});

test('负担基线：目录深度≤4（当前最深 src/packages/*/blocks/*）', () => {
    for (const abs of [...listFiles('src'), ...listFiles('assets')]) {
        const depth = relOf(abs).split('/').length - 1;
        assert.ok(depth <= 4, `${relOf(abs)} 深度 ${depth} 超 4 红线——不建更深巢`);
    }
});

test('耦合：步骤互不导入、domain 不导入 steps（依赖只朝接线中枢）', () => {
    for (const abs of listFiles('src/steps', '.ts')) {
        if (abs.endsWith('/index.ts')) continue;
        const text = readFileSync(abs, 'utf-8');
        for (const line of text.split('\n')) {
            const t = line.trim();
            if (t.startsWith('import')) {
                assert.ok(!t.includes("'./"), `${relOf(abs)}  importing sibling：${t}——步骤互引即红`);
            }
        }
    }
    for (const abs of listFiles('src/domain', '.ts')) {
        if (abs.endsWith('.test.ts')) continue;
        const text = readFileSync(abs, 'utf-8');
        for (const line of text.split('\n')) {
            const t = line.trim();
            if (t.startsWith('import')) {
                assert.ok(!t.includes('steps/'), `${relOf(abs)}  importing steps：${t}——domain 回指步骤即红`);
            }
        }
    }
});

test('配比：测试文件不断供（测试数／源码数≥0.4，包文件总数≤50）', () => {
    const allTs = listFiles('src', '.ts');
    const tests = allTs.filter((f) => f.endsWith('.test.ts'));
    const sources = allTs.length - tests.length;
    assert.ok(tests.length / sources >= 0.4, `测试 ${tests.length}／源码 ${sources} 配比跌破 0.4——加源码须加测试`);
    const pkgFiles = listFiles('src/packages');
    assert.ok(pkgFiles.length <= 50, `包文件 ${pkgFiles.length} 超 50 红线（当前 34）`);
});
