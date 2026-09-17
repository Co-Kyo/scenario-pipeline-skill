import assert from 'node:assert/strict';
import test from 'node:test';
import { LEVELS, LEVEL_CRITERIA_TABLE, levelCriterion } from '../domain/learner.js';

test('级别集合完备且有序', () => {
    assert.deepEqual(LEVELS, ['L1', 'L2', 'L3', 'L4']);
});

test('D1:判据校准表覆盖全部级别且顺序一致', () => {
    assert.deepEqual(LEVEL_CRITERIA_TABLE.map((r) => r.level), LEVELS);
});

test('D1:levelCriterion 命中指定级别', () => {
    assert.ok(levelCriterion('L3').includes('决策级'));
    assert.ok(levelCriterion('L1').includes('概念级'));
});
