import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { EFFECT_CONTRACTS, effectContractSection } from '../artifacts.ts';

// 仓库根(src/tests/ 上两级),用于 owns 路径存在性校验
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

test('效果契约:编号唯一、归属与保证非空', () => {
    const ids = EFFECT_CONTRACTS.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length, '契约编号必须唯一');
    for (const c of EFFECT_CONTRACTS) {
        assert.ok(c.artifact.length > 0, `${c.id} 缺 artifact`);
        assert.ok(c.owns.length > 0, `${c.id} 缺归属源文件`);
        assert.ok(c.expects.length > 0, `${c.id} 缺保证条目`);
    }
});

test('效果契约:owns 指向的源文件真实存在(同源校验)', () => {
    for (const c of EFFECT_CONTRACTS) {
        for (const own of c.owns) {
            assert.ok(existsSync(repoRoot + own), `${c.id} owns 路径不存在:${own}`);
        }
    }
});

test('学习阶梯契约:二值验收与阶段数在保证列表中', () => {
    const ladder = EFFECT_CONTRACTS.find((c) => c.id === 'E-ladder-judgment');
    assert.ok(ladder, '缺少 E-ladder-judgment');
    assert.ok(ladder.expects.some((e) => e.includes('做到才算过')));
    assert.ok(ladder.expects.some((e) => e.includes('阶段数 3-4')));
    assert.ok(ladder.owns.some((o) => o.startsWith('src/steps/')));
});

test('能力研究契约:素材不静默丢弃', () => {
    const research = EFFECT_CONTRACTS.find((c) => c.id === 'E-capability-coverage');
    assert.ok(research, '缺少 E-capability-coverage');
    assert.ok(research.expects.some((e) => e.includes('不能静默丢弃')));
});

test('D7:契约小节渲染含编号与保证，且不含源码路径（维护者注记不进部署物）', () => {
    const s = effectContractSection('E-ladder-judgment');
    assert.ok(s.includes('E-ladder-judgment'));
    assert.ok(s.includes('做到才算过'));
    // owns 留在源码侧（由上一项 existsSync 锁存在），产物只渲染 expects
    assert.ok(!/src\//.test(s), `契约小节不应含源码形态路径：${s}`);
});

test('D7:未知契约 id 抛错(防静默漏接)', () => {
    assert.throws(() => effectContractSection('E-nope'));
});
