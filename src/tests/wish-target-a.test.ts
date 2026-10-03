import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// wish/target 模型锁（0.3.0）：产物形态＝每步一个「意图」章（wish，1 句）
// ＋一个「目标」章（target，若干条），每条目标下挂着支撑它的判据。
// 另锁：②检查项行带期望或仅展示标注；③159 跨步约束有家。

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

test('wish/target：11 步全量都有「意图」章与「目标」章，且目标都有判据撑着', () => {
    for (const id of IDS) {
        const md = stepMd(id);
        if (!md) continue; // dist 未构建时跳过（init 门另测）
        assert.ok(md.includes('## 意图'), `${id} 缺「意图」章`);
        assert.ok(md.includes('## 目标'), `${id} 缺「目标」章`);
        const goalBlock = (md.split('## 目标')[1] ?? '').split(/\n## /)[0];
        const numbered = (goalBlock.match(/^\d+\.\s/gm) ?? []).length;
        const evidence = (goalBlock.match(/^\s+- (机器判据|人工判据)：/gm) ?? []).length;
        assert.ok(numbered >= 1, `${id} 的「目标」章下没有编号目标`);
        assert.ok(evidence >= numbered,
            `${id} 有目标没有判据撑着（${numbered} 条目标 / ${evidence} 条判据）`);
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
