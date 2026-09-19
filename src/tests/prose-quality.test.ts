import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { scanMetaDiscourse, scanMarkerDuplication } from 'skillnomad';

// 散文质量门（2026-09-19 产物散文审计后补）：既有测试只答"数据进没进文本、结构缺没缺"，
// 从不读文本本身——渲染器注入污染与 task 指针化退化在 115 测全绿下漏网。
// 本文件走产物侧对质：域绑定词存活锁（防指针化把具体动作抹进附录）＋框架通用门接线
// （元话语黑名单／标记叠加——框架提供扫描器，判据（黑名单/标记表）由本仓给）。
// 分工：通用形态门在框架（prose-gates），域词表与业务口径在这里。

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const dist = repoRoot + 'dist/sp-skill/';

function stepFiles(): { rel: string; content: string }[] {
    return readdirSync(dist + 'steps')
        .sort()
        .map((d) => ({ rel: `steps/${d}/step.md`, content: readFileSync(`${dist}steps/${d}/step.md`, 'utf-8') }));
}

/** 域绑定词存活锁：这些词是各步 task 指令的域绑定动作，必须出现在该步产物正文——
 *  若被"见模块附录"指针化抹走，此锁即红（2026-09 审计 BLOCKER-B 的回归防线）。 */
const DOMAIN_LOCKS: Record<string, string[]> = {
    '02-brainstorm': ['level_weight 是否跨维度一致', 'anchor_ref 编织', 'anchor_coverage 覆盖缺口'],
    '03-partition': ['断开 related 边', '拓扑深度'],
    '05-capability-graph': ['读取关联 material 做语义比对', 'strategic_value'],
    '06-evaluate-pool': ['priority_trace', 'reasoning'],
};

test('域绑定词存活锁：各步指令正文含域绑定动作（防指针化断供）', () => {
    for (const f of stepFiles()) {
        const words = DOMAIN_LOCKS[f.rel.split('/')[1]];
        if (!words) continue;
        for (const w of words) {
            assert.ok(f.content.includes(w), `${f.rel} 缺域绑定动作「${w}」（被指针化抹进附录？）`);
        }
    }
});

test('元话语黑名单：产物文本不得含构建过程话术（框架 scanMetaDiscourse 接线）', () => {
    const blacklist = ['构建期', '构建时渲染', 'manifest 锁定', '发布形态', '框架按角色派生', 'D35', '（D3'];
    const files = [...stepFiles(), { rel: 'SKILL.md', content: readFileSync(dist + 'SKILL.md', 'utf-8') }];
    const hits = scanMetaDiscourse(files, blacklist);
    assert.deepEqual(hits, [], `产物命中元话语黑名单：${JSON.stringify(hits)}`);
});

test('标记叠加：同一标记同行不得出现两次（框架 scanMarkerDuplication 接线）', () => {
    const hits = scanMarkerDuplication(stepFiles(), ['（示例）', '【示例】']);
    assert.deepEqual(hits, [], `产物命中标记叠加：${JSON.stringify(hits)}`);
});

test('参数守恒：旧 pipeline-params 表的 token 名不得悬空出现在产物（值必须内联）', () => {
    // 被删参数表的 token 若还以名字出现在正文而无值伴随，即断链（url-batch-size 前科）。
    const banned = ['url-batch-size', 'min-content-length', 'cap-group-cap', 'fanout-threshold'];
    for (const f of [...stepFiles(), { rel: 'SKILL.md', content: readFileSync(dist + 'SKILL.md', 'utf-8') }]) {
        for (const token of banned) {
            assert.ok(!f.content.includes(token), `${f.rel} 悬空引用旧参数 token「${token}」（值应内联）`);
        }
    }
});

test('跳过条件双源一致：正文与 skip-rules 正本条件集合相同（BLOCKER-A 产物侧锁）', () => {
    const s = readFileSync(dist + 'steps/01-intent-anchor/step.md', 'utf-8');
    const sr = readFileSync(repoRoot + 'src/steps/intent-anchor/assets/skip-rules.md', 'utf-8');
    for (const kw of ['topic', 'year', 'platform']) {
        assert.ok(s.includes(kw) && sr.includes(kw), `跳过条件「${kw}」双源不一致（正文含=${s.includes(kw)} 正本含=${sr.includes(kw)}）`);
    }
});
