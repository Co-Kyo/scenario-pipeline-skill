import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// A 案迁移锁（0.3.0）：意图/可判定分家在产物中的形态——
// ①意图章存在且不再有「## 目标」；②检查项行带期望或仅展示标注；
// ③159 跨步约束有家（initialize 渲染「跨步约束」章）。

const dist = fileURLToPath(new URL('../../dist/sp-skill/', import.meta.url));

function stepMd(id: string): string {
    const p = `${dist}steps/${id}/step.md`;
    return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

const IDS = [
    '00-initialize', '01-intent-anchor', '02-brainstorm', '03-partition', '04-scan',
    '05-capability-graph', '06-evaluate-pool', '07-capability-research',
    '08-briefing-assemble', '09-assemble', '10-learning-ladder',
];

test('A 案：意图章替换目标章（11 步全量）', () => {
    for (const id of IDS) {
        const md = stepMd(id);
        if (!md) continue; // dist 未构建时跳过（init 门另测）
        assert.ok(md.includes('## 意图'), `${id} 缺「意图」章`);
        assert.ok(!md.includes('## 目标'), `${id} 仍残留「目标」章`);
    }
});

test('A 案：检查项全部结构化（期望或仅展示，无裸项）', () => {
    for (const id of IDS) {
        const md = stepMd(id);
        if (!md || !md.includes('**检查项：**')) continue;
        const items = md.split('**检查项：**')[1].split('\n\n')[0].split('\n').filter(l => l.startsWith('- '));
        assert.ok(items.length > 0, `${id} 检查项为空`);
        for (const line of items) {
            const ok = line.includes('（期望：') || line.includes('（仅展示');
            assert.ok(ok, `${id} 存在裸检查项：${line}`);
        }
    }
});

test('A 案：159 跨步约束有家（initialize 渲染「跨步约束」章）', () => {
    const md = stepMd('00-initialize');
    if (!md) return;
    assert.ok(md.includes('## 跨步约束'), '缺「跨步约束」章');
    assert.ok(md.includes('不再重复确认 workDir'), '159 句原文未入章');
});
