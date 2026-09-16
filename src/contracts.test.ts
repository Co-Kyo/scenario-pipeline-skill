import assert from 'node:assert/strict';
import test from 'node:test';
import { modules, contracts } from './contracts.js';

// 专案23（P2 双表无守卫）：modules 与 contracts 文件条目登记同一批资产路径。
// R2 钉子 1：brainstorm 旧址 3 条登记＋文件同步删除，双表 10→7。
// 登记同一批资产路径。任一单边改路径后本测试变红，防止静默漂移。
// 审计证据：改 modules.agentInit 路径后构建仍绿、产物直接采用新值，无测试兜底。
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

test('双表路径双向包含：任一单边增删改路径即变红', () => {
    // D35 全链路：module 引用条目（路径为逻辑标识、内容＝模块 render()）不参与文件双表，
    // 改由「module id 必在 src/modules.ts 声明」兜底（见下一条测试）。
    const fileBacked = contracts.filter((c) => !c.module);
    const modPaths = new Set(Object.values(modules).map((m) => m.path));
    const conPaths = new Set(fileBacked.map((c) => c.path));
    for (const p of modPaths) {
        assert.ok(conPaths.has(p), `modules 有但 contracts 缺少: ${p}`);
    }
    for (const p of conPaths) {
        assert.ok(modPaths.has(p), `contracts 有但 modules 缺少: ${p}`);
    }
    assert.equal(modPaths.size, 7, 'modules 应为 7 条（R2 钉子 1 删旧址 3 条后 10→7）');
    assert.equal(conPaths.size, 7, 'contracts（文件条目）应为 7 条（R2 钉子 1 删旧址 3 条后 10→7）');
});

test('module 引用条目：module id 必在 src/modules.ts 声明（D35 全链路）', async () => {
    const { modules: declared } = await import('./modules.js');
    const declaredIds = new Set(declared.map((m) => m.id));
    const moduleEntries = contracts.filter((c) => c.module);
    // 6 条（拆包第五例）：scan-scheduling-binding ＋ parallel-method ＋ evaluate-method ＋ partition-method ＋ capability-method-pack ＋ brainstorm-rules-method
    assert.equal(moduleEntries.length, 6, '模块通道当前 6 条引用条目（scan-binding ＋ parallel-methods ＋ evaluate-methods ＋ partition-methods ＋ capability-methods ＋ brainstorm-rules-methods）');
    for (const c of moduleEntries) {
        assert.ok(c.module && declaredIds.has(c.module), `module id 未声明: ${c.id} → ${c.module}`);
    }
});

test('双表键名可互推：camelCase 键归一化后等于 kebab-case id', () => {
    const ids = new Set(contracts.filter((c) => !c.module).map((c) => norm(c.id)));
    for (const key of Object.keys(modules)) {
        assert.ok(ids.has(norm(key)), `modules 键无对应 contracts id: ${key}`);
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
