import assert from 'node:assert/strict';
import test from 'node:test';
import { modules, contracts } from './contracts.js';

// 专案23（P2 双表无守卫）：modules（Record 10 键）与 contracts（数组 10 条）
// D32 W4：+1 capability-method（04 method 接回），双表同步 9→10
// 登记同一批资产路径。任一单边改路径后本测试变红，防止静默漂移。
// 审计证据：改 modules.agentInit 路径后构建仍绿、产物直接采用新值，无测试兜底。
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

test('双表路径双向包含：任一单边增删改路径即变红', () => {
  const modPaths = new Set(Object.values(modules).map((m) => m.path));
  const conPaths = new Set(contracts.map((c) => c.path));
  for (const p of modPaths) {
    assert.ok(conPaths.has(p), `modules 有但 contracts 缺少: ${p}`);
  }
  for (const p of conPaths) {
    assert.ok(modPaths.has(p), `contracts 有但 modules 缺少: ${p}`);
  }
  assert.equal(modPaths.size, 10, 'modules 应为 10 条');
  assert.equal(conPaths.size, 10, 'contracts 应为 10 条');
});

test('双表键名可互推：camelCase 键归一化后等于 kebab-case id', () => {
  const ids = new Set(contracts.map((c) => norm(c.id)));
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
