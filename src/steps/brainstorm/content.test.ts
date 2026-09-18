import assert from 'node:assert/strict';
import test from 'node:test';
import {
    CONVERGE_PRIORITY,
    detail,
    integratorTask,
    levelFilterPhrase,
    POLL_INTERVAL,
    qualityGateSection,
    REASON_TYPES,
    RETRY_MAX,
    scenarioTask,
} from './content.js';
import { LEVEL_CRITERIA_TABLE } from '../learning-ladder/learner.js';

test('brainstorm:调度参数常量贯穿执行步骤', () => {
    const d = detail();
    assert.ok(d.includes(`轮询间隔 ${POLL_INTERVAL}，每个 Agent 完成时即时校验`));
    assert.ok(d.includes(`失败 Agent 最多补发 ${RETRY_MAX} 次。`));
});

test('brainstorm:质量门禁列出 4 个维度文件', () => {
    const s = qualityGateSection();
    for (const f of ['scenario', 'technical', 'learning', 'constraint']) {
        assert.ok(s.includes(`- ${f}.json 存在且可解析`));
    }
    assert.ok(s.includes('4/4 通过后进入收敛者'));
});

test('D1 联动:级别过滤短语从 learner 校准表派生', () => {
    assert.equal(levelFilterPhrase(), 'L1 概念级，L2 方案级，L3 决策级，L4 体系级');
    assert.ok(scenarioTask().includes(levelFilterPhrase()));
});

test('brainstorm:reason_type 枚举与收敛优先级为唯一出处', () => {
    assert.ok(
        JSON.stringify(REASON_TYPES) ===
      JSON.stringify(['out_of_scope', 'below_target', 'deprecated', 'not_frontend']),
    );
    const t = integratorTask();
    assert.ok(t.includes(`（${CONVERGE_PRIORITY}）`));
    assert.ok(t.includes('requirement-web-schema.md'));
    // 收敛者内部标题不因模板搬移而丢失
    assert.ok(t.includes('## 你需要读取的文件'));
    assert.ok(t.includes('## 写入'));
});

test('brainstorm:级别名与 learner 校准表同源', () => {
    for (const r of LEVEL_CRITERIA_TABLE) {
        assert.ok(levelFilterPhrase().includes(r.level));
    }
});
