import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PUBLISH_DIRS, publishPath, scanDanglingRefs, type PublishableAsset } from 'skillnomad';
import { contracts } from '../skill-decl.ts';
import { steps } from '../steps/index.ts';

// 部署物路径卫生（本地快速版；发布形态的同一道检查在 scripts/assemble-release.ts）。
// 口径：随包 markdown 里的包内路径引用必须能在包内解析——发布形态算数，老布局（assets/<步>/…、
// processes/…、plugins/…）与源码形态（src/…）一律算断链（这正是 2026-09-17 实测漏掉的那类：
// 3 处 src/domain/ 死路径 ＋ 2 处 assets/00-intent-anchor/ 老布局 ＋ 1 处 processes/04-scan.md）。
// 为什么单独一片：框架 build 期只扫它渲染出的步骤与 SKILL.md，而资产是原样拷贝的（本片补拷贝件）。
// 解析集合＝按同一派生规则算出的发布目标（不读 dist，故先于构建可跑）。
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const seqOf = (id: string): number | undefined => {
    const i = steps.findIndex((s) => s.id === id);
    return i < 0 ? undefined : i;
};

function publishTargets(): Set<string> {
    const targets = new Set<string>();
    for (const [i, step] of steps.entries()) {
        targets.add(`${PUBLISH_DIRS.steps}/${String(i).padStart(2, '0')}-${step.id}/step.md`);
    }
    for (const c of contracts) {
        if (c.module) continue;
        const asset: PublishableAsset = c.scope === 'step'
            ? { path: c.path, scope: 'step', step: c.step }
            : { path: c.path, scope: 'skill' };
        const target = publishPath(asset, seqOf);
        assert.ok(target, `无法派生发布路径：${c.path}（归属步 ${String(c.step)}）`);
        targets.add(target);
    }
    return targets;
}

test('随包资产里的路径引用都能在包内解析（发布形态）', () => {
    const targets = publishTargets();
    // 目录本身也算可解析（正文可能只提到目录）
    const dirs = new Set<string>();
    for (const t of targets) {
        const parts = t.split('/');
        for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
    }
    const shipped = contracts.filter((c) => !c.module).map((c) => c.path);
    const hits = scanDanglingRefs(
        shipped.map((rel) => ({ rel, content: readFileSync(repoRoot + rel, 'utf-8') })),
        (ref) => targets.has(ref) || dirs.has(ref),
    );
    assert.deepEqual(
        hits.map((h) => `${h.rel}:${h.line}  ${h.ref}`),
        [],
        '随包资产出现包内解析不到的路径（读者按它找不到文件；改布局后手写路径会烂）',
    );
});
