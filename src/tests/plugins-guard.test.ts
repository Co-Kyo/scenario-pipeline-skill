import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// R3-N2：plugins/anti-crawl-fetch.md 存在性锁定（scan 树 B4 补测）。
// 背景：B4（assets.antiCrawlFetch → skill-decl 登记 → plugins）在 TREE 有名，
// 但在 E 类噪音清单、唯一源 17 处声明、任何测试里全无名——三处全漏。
// 口径：只锁存在性（文件在＋登记在＋步骤引用在），不管内容对错（内容归 mdlego，不管对错）。
// 可逆：只加本文件，不碰生产码；红了即删，不留痕。
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const read = (p: string) => readFileSync(repoRoot + p, 'utf-8');

test('plugins:anti-crawl-fetch.md 文件存在（B4 内容本体）', () => {
    assert.ok(
        existsSync(repoRoot + 'plugins/anti-crawl-fetch.md'),
        'plugins/anti-crawl-fetch.md 缺失——B4 距离链断裂',
    );
});

test('plugins:antiCrawlFetch 登记存在（资产表＋登记表）', () => {
    // 路径单源（R5）：资产表写路径，登记表从表派生——两处引用同一来源即算在册。
    const assets = read('src/artifacts.ts');
    const decl = read('src/skill-decl.ts');
    assert.ok(
        assets.includes("path: 'plugins/anti-crawl-fetch.md'"),
        'artifacts.ts 缺 antiCrawlFetch 资产——B4 中转丢失',
    );
    assert.ok(
        decl.includes('path: assets.antiCrawlFetch.path'),
        'skill-decl.ts 缺 antiCrawlFetch 登记——B4 中转丢失',
    );
});

test('plugins:scan 步骤引用存在（reads 链不断）', () => {
    const src = read('src/steps/scan/step.ts');
    assert.ok(
        src.includes('assets.antiCrawlFetch'),
        'scan/step.ts 缺 antiCrawlFetch 引用——B4 起点丢失',
    );
});
