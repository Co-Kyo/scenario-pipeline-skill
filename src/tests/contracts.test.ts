import assert from 'node:assert/strict';
import test from 'node:test';
import { assets } from '../artifacts.js';
import { contracts } from '../skill-decl.js';

// 路径单源（原「双表」守卫的收敛版）：输入资产路径只写在 artifacts.ts 的 assets 表，
// skill-decl 的文件背登记从该表派生——两表同一批路径是**构造保证**，不再是需要人肉同步的双写。
// 本文件锁三件事：① 资产表与登记表条目一一对应；② 键名可互推（camelCase ↔ kebab-case）；
// ③ 模块通道条目的 module id 必须在 skill-decl 声明。
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

test('资产表 ↔ 登记表：每条输入资产都有登记，每条文件背登记都有资产', () => {
    // 模块通道条目（路径为逻辑标识、内容＝模块 render()）不参与文件比对。
    const fileBacked = contracts.filter((c) => !c.module);
    const assetPaths = new Set(Object.values(assets).map((a) => a.path));
    const conPaths = new Set(fileBacked.map((c) => c.path));
    for (const p of assetPaths) {
        assert.ok(conPaths.has(p), `资产表有但登记缺少: ${p}`);
    }
    for (const p of conPaths) {
        assert.ok(assetPaths.has(p), `登记有但资产表缺少: ${p}`);
    }
    assert.equal(assetPaths.size, 22, '随包资产应为 22 条（skill 级 7 ＋ intent-anchor 步 2 ＋ 方法投影 2 ＋ 格式契约 11）');
    assert.equal(conPaths.size, 22, '文件背登记应为 22 条');
});

test('module 引用条目：module id 必在 skill-decl.ts 声明（D35 全链路）', async () => {
    const { modules: declared } = await import('../skill-decl.js');
    const declaredIds = new Set(declared.map((m) => m.id));
    const moduleEntries = contracts.filter((c) => c.module);
    // 5 条纯内容包（调度极致移除后 scan-scheduling-binding 已删除）
    assert.equal(moduleEntries.length, 5, '模块通道当前 5 条引用条目（parallel-methods ＋ evaluate-methods ＋ partition-methods ＋ capability-methods ＋ brainstorm-rules-methods）');
    for (const c of moduleEntries) {
        assert.ok(c.module && declaredIds.has(c.module), `module id 未声明: ${c.id} → ${c.module}`);
    }
});

test('键名可互推：资产表 camelCase 键归一化后等于登记表 kebab-case id', () => {
    const ids = new Set(contracts.filter((c) => !c.module).map((c) => norm(c.id)));
    for (const key of Object.keys(assets)) {
        assert.ok(ids.has(norm(key)), `资产键无对应登记 id: ${key}`);
    }
});

test('contracts id 唯一且 scope/step 自洽', () => {
    const ids = contracts.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length, 'contracts id 必须唯一');
    for (const c of contracts) {
        if (c.scope === 'step') {
            assert.ok(c.step, `${c.id} scope=step 必须带 step 归属`);
        }
    }
});
