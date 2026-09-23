import assert from 'node:assert/strict';
import test from 'node:test';
import {
    LADDER_STAGE_COUNT,
    LADDER_STEP_FIELDS,
    LAYER_RULES,
    judgmentCalibrationTable,
    ladderDetail,
    stepFormat,
    workerTask,
} from './content.ts';
import { LEVELS } from './learner.ts';

test('ladderDetail 派生文本包含分层规则与阶段数约束', () => {
    const d = ladderDetail();
    for (const rule of LAYER_RULES) {
        assert.ok(d.includes(`- ${rule}`), `缺少分层规则:${rule}`);
    }
    assert.ok(d.includes(`归纳 ${LADDER_STAGE_COUNT.min}-${LADDER_STAGE_COUNT.max} 个阶段`));
});

test('stepFormat 包含全部固定字段,且含二值验收字段', () => {
    const s = stepFormat();
    for (const f of LADDER_STEP_FIELDS) {
        assert.ok(s.includes(`- ${f}`), `缺少字段:${f}`);
    }
    assert.ok(LADDER_STEP_FIELDS.includes('做到才算过'));
});

test('D2/D3:阶梯字段含预计时长与完成标记', () => {
    assert.ok(LADDER_STEP_FIELDS.includes('预计时长(分钟)'));
    assert.ok(LADDER_STEP_FIELDS.includes('完成标记'));
});

test('D1:判据校准表渲染覆盖全部级别并含选用指令', () => {
    const t = judgmentCalibrationTable();
    for (const l of LEVELS) {
        assert.ok(t.includes(`**${l}**`), `校准表缺少级别:${l}`);
    }
    assert.ok(t.includes('anchors.json'));
});

test('D2/D3/D4:worker 任务含预计时长/留痕/救援链接规则', () => {
    const w = workerTask();
    assert.ok(w.includes('预计时长(分钟)'));
    assert.ok(w.includes('progress.json'));
    assert.ok(w.includes('不得只指向 §核心机制'));
});

test('workerTask 输出为阶梯生成提示词', () => {
    assert.ok(workerTask().includes('学习阶梯生成专家'));
});
