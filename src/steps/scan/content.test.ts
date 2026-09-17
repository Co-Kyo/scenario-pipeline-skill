import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { detail, extractTask, EXTRACT_FIELDS, outputSchema, phaseASection, SCAN_DENSITY } from './content.js';
import { CONCURRENCY_LIMIT } from '../../skill-decl.js';

// 仓库根(src/steps/scan/ 上三级)
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

test('scan:密度表派生逐字一致(含 L2 默认注记)', () => {
    const d = detail();
    assert.ok(d.includes('- core: kw=2, r=8（L2 默认）'));
    assert.ok(d.includes('- premise: kw=1, r=3'));
    assert.ok(d.includes('- outlook: kw=1, r=2'));
});

test('scan:W 公式与自有 CONCURRENCY_LIMIT 同源', () => {
    assert.ok(phaseASection().includes(`本 skill 并发上限 ${CONCURRENCY_LIMIT}`));
    assert.equal(CONCURRENCY_LIMIT, 5);
});

test('scan:提取字段四件套在枚举与任务文案同源', () => {
    assert.deepEqual(EXTRACT_FIELDS, ['key_concepts', 'capability_points', 'depth_level', 'quality_signals']);
    assert.ok(extractTask().includes('key_concepts、capability_points、depth_level、quality_signals'));
});

test('scan:输出 Schema 整块搬移无缺损(三个 JSON 样例)', () => {
    const s = outputSchema();
    assert.ok(s.includes('search-batch.{batch_id}.json:'));
    assert.ok(s.includes('url-batches.json:'));
    assert.ok(s.includes('partial.{batch_id}.json:'));
    assert.equal(s.split('```json').length - 1, 3);
});

test('scan:密度表角色覆盖 detail 与 SCAN_DENSITY 一致', () => {
    assert.deepEqual(SCAN_DENSITY.map((d) => d.role), ['core', 'premise', 'outlook']);
});

test('B1-A:outputSchema 与 scan/assets/schemas.md 正本逐块一致(漂移锁)', () => {
    // 行尾归一:Windows checkout(autocrlf)会把正本转成 CRLF,源码模板是 LF,
    // 行尾是格式不是内容——归一后再逐块比较,内容漂移仍会被锁捕获。
    const asset = readFileSync(repoRoot + 'src/steps/scan/assets/schemas.md', 'utf-8').replace(/\r\n/g, '\n');
    const blocks = (t: string) => t.split('```json').slice(1).map((b) => b.split('```')[0].trim());
    assert.deepEqual(blocks(outputSchema()), blocks(asset));
});

test('B1-A:正本演化字段在场(t0_domains/fetch_status_trace/playwright_available=true)', () => {
    const s = outputSchema();
    assert.ok(s.includes('"t0_domains"'));
    assert.ok(s.includes('"anti_crawl_domains"'));
    assert.ok(s.includes('"fetch_status_trace"'));
    assert.ok(s.includes('"playwright_available": true'));
    assert.ok(s.includes('文件名规则'));
});
