import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { steps } from '../steps/index.js';

// 模式④独立复核（只对结构，不对语义）：产物侧第二套验收，与声明侧单测不同源。
// 正本＝源码声明（steps/index.ts 顺序 + decision-summary step_ids），不新建范本文件。
// 方法：读 dist 产物字节（文件存在性/数量/顺序），对照源码声明；只答"缺没缺"，不答"好不好"。
// 审计前科：P1 早返时 44 测试全绿——声明侧与实现侧同盲区；本脚本走产物侧对质。
// 噪声说明：artifact-manifest.json 含 generated_at 时间戳（每次构建必变），本脚本
// 只核对 files 清单的文件名集合，不比对 hash/时间戳（见交接文档 manifest 噪声登记）。
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const dist = repoRoot + 'dist/sp-skill/';

// 声明：steps/index.ts 导出顺序即 11 步正本（改步骤增删此处必同步改）
const DECLARED_ORDER = steps.map((s) => s.id);

test('产物 steps 目录数量与声明步数一致（防整节丢失）', () => {
    const dirs = readdirSync(dist + 'steps').sort();
    assert.equal(
        dirs.length,
        DECLARED_ORDER.length,
    `steps 目录 ${dirs.length} ≠ 声明步数 ${DECLARED_ORDER.length}`,
    );
});

test('产物步序与声明顺序一致（防顺序漂移）', () => {
    const dirs = readdirSync(dist + 'steps').sort();
    for (const [i, stepId] of DECLARED_ORDER.entries()) {
        const nn = String(i).padStart(2, '0');
        const hit = dirs.find((d) => d.startsWith(nn + '-') && d.includes(stepId));
        assert.ok(hit, `第 ${i} 步 '${stepId}' 在产物中缺对应目录（期望 ${nn}-*${stepId}/）`);
        assert.ok(existsSync(`${dist}steps/${nn}-${stepId}/step.md`), `${nn}-${stepId} 缺 step.md`);
    }
});

test('decision-summary steps 与声明一致（防摘要与产物双漂）', () => {
    const summary = JSON.parse(readFileSync(dist + 'decision-summary.json', 'utf-8'));
    const ids = summary.steps.map((s: { step_id: string }) => s.step_id);
    assert.deepEqual(ids, DECLARED_ORDER, 'decision-summary step 顺序与源码声明不一致');
});

test('manifest files 清单与 dist 实际文件一致（只比文件名，不比 hash/时间戳）', () => {
    const manifest = JSON.parse(readFileSync(dist + 'artifact-manifest.json', 'utf-8'));
    const declared = new Set(manifest.files.map((f: { file: string }) => f.file));
    assert.ok(existsSync(dist + 'SKILL.md'), 'dist 缺 SKILL.md');
    for (const f of declared) {
        assert.ok(existsSync(dist + f), `manifest 声明 '${f}' 在 dist 中缺失`);
    }
});
