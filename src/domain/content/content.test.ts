import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { REASON_TYPES } from './brainstorm.js';
import { SCAN_DENSITY } from './scan.js';
import { countVerifyText, detail, INTERCEPT_WORDS, insufficientAnchorsText, skipSection, target } from './intent.js';
import { detail as partitionDetail, sessionOverflowText, threeLayerSection } from './partition.js';
import { capabilityOverflowText, highgroundSection } from './capability.js';
import { detail as evaluationDetail, thresholdSection } from './evaluation.js';
import { initializeDetail, WORKDIR_NAMING } from './initialize.js';
import { RATIO_CLAUSE, SCENARIO_MINIMUM } from './shared.js';
import { SCHEDULING_POLICY } from '../scheduling.js';

// 仓库根(src/domain/content/ 上三级)
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

test('intent:锚点数量常量贯穿派生文本(target/detail/verify/halt)', () => {
  assert.ok(target().startsWith('生成 8-15 个锚点'));
  assert.ok(detail().includes('- 数量 8-15 个'));
  assert.equal(countVerifyText(), '锚点数量为 8-15 个');
  assert.equal(insufficientAnchorsText(), '锚点不足 8 个');
});

test('intent:年限链与 role/level 约束进 detail', () => {
  const d = detail();
  assert.ok(d.includes('1. 显式参数 --year'));
  assert.ok(d.includes('4. 无信号默认 L2'));
  assert.ok(d.includes('core=target_level、premise=target_level-1、outlook=target_level+1'));
});

test('intent:拦截词数组进跳过判断(B7-A 并集后 8 词)', () => {
  assert.deepEqual(INTERCEPT_WORDS, ['面试', '场景', '分析', '复杂', '考察', '问', '中大型', '多团队']);
  assert.ok(skipSection().includes('面试、场景、分析、复杂、考察、问、中大型、多团队'));
});

test('B3:SCAN_DENSITY 与 strategy-level.md L2 列一致(漂移锁)', () => {
  const t = readFileSync(repoRoot + 'assets/common/strategy-level.md', 'utf-8');
  for (const d of SCAN_DENSITY) {
    assert.ok(t.includes(`kw=${d.kw}, r=${d.r}`), `密度漂移:${d.role} kw=${d.kw}, r=${d.r}`);
  }
});

test('B4:role/level 约束在两份资产中同义存在(漂移锁)', () => {
  const sl = readFileSync(repoRoot + 'assets/common/strategy-level.md', 'utf-8');
  const sr = readFileSync(repoRoot + 'assets/00-intent-anchor/skip-rules.md', 'utf-8');
  assert.ok(sl.includes('= target_level - 1'), 'strategy-level 缺 premise 约束');
  assert.ok(sr.includes('level=target_level-1'), 'skip-rules 缺 premise 约束');
});

test('B5:reason_type 枚举在 schemas 正本中齐全(漂移锁)', () => {
  // D32 W2：constraint-agent.md 已删（死文件，运行时零消费），本锁只留活文件一端；
  // 内联工厂 constraintTask() 的 REASON_TYPES 内插由 brainstorm.test.ts 字面量断言覆盖。
  const sch = readFileSync(repoRoot + 'assets/01-brainstorm/schemas.md', 'utf-8');
  for (const r of REASON_TYPES) {
    assert.ok(sch.includes(r), `schemas 缺 ${r}`);
  }
});

test('partition:Leiden 阈值与 session 上限贯穿派生文本', () => {
  assert.ok(threeLayerSection().includes('分量节点数大于 8 时运行 Leiden 聚类'));
  assert.ok(partitionDetail().includes('prerequisite：A 是 B 的前置知识'));
  assert.equal(sessionOverflowText(), '当前 session 超过 12 个命题');
});

test('capability:阈值字符串保留小数位,上限 30 进触发词', () => {
  assert.ok(highgroundSection().includes('一级高地 >= 4.0。'));
  assert.ok(highgroundSection().includes('二级高地 2.0-3.9。'));
  assert.equal(capabilityOverflowText(), '能力数量超过 30');
});

test('evaluation:四维评分与年限阈值表', () => {
  const d = evaluationDetail();
  assert.ok(d.includes('- cross_stack_coupling：跨栈耦合'));
  assert.ok(d.includes('防虚高：4 个维度均 >= 2 时必须重新审视并压低至少 1 分'));
  assert.ok(thresholdSection().includes('L2：总分 >= 6。'));
});

test('initialize:workDir 命名规则单一出处', () => {
  assert.equal(WORKDIR_NAMING, '{当前日期}-{场景简称}');
  assert.ok(initializeDetail().includes(`默认使用 ${WORKDIR_NAMING}。`));
});

test('shared:片段与原文逐字一致(供 prompts.ts 双写收敛)', () => {
  assert.equal(RATIO_CLAUSE, '内容比例：通用高地 <= 70%，场景化/特化内容 >= 30%。');
  assert.equal(SCENARIO_MINIMUM, '至少 3 个场景化输入、3 个边界、3 个验证点。');
});

test('C2-A:04 method.md 阈值与能力域正本一致(漂移锁，D32 W4)', () => {
  // D32 W4 接回 04 method 的前置锁（R2 F-4 条件）：阈值漂移即红，接 reads 前先锁。
  const text = readFileSync(repoRoot + 'assets/04-capability-graph/method.md', 'utf-8');
  assert.ok(text.includes('≥ 4.0'), '一级高地阈值未对齐正本（HIGHGROUND_THRESHOLDS.tier1Min）');
  assert.ok(text.includes('2.0 - 3.9'), '二级高地阈值未对齐正本（tier2Range）');
  assert.ok(text.includes('1.0 - 1.9'), '三级营地阈值未对齐正本（tier3Range）');
  assert.ok(text.includes('扇出'), '扇出度概念缺失');
});

test('D32-W5:调度三值下沉字面量锁（补锁 3，散文引用不断）', () => {
  // D32 W5 修法 R2 F-5：三 md 为散文引用（非注册消费），锁字面量不断引用链。
  // D35 W4 首刀升级不断旧断言（过渡期双锁，R2 F-10）：旧字面量锁保留，新生成断言见 D35-W4。
  // 旧断言读 skill.ts 字面量；首刀后 skill.ts 改透传 scheduling.ts 实例（值同源），故改读实例值。
  assert.equal(SCHEDULING_POLICY.concurrencyLimit, 5);
  assert.equal(SCHEDULING_POLICY.windowBudget?.maxWindowSize, 4);
  assert.equal(SCHEDULING_POLICY.windowBudget?.inputChunkTokens, 6000);
  assert.equal(SCHEDULING_POLICY.windowBudget?.itemSummaryTokens, 500);
});

test('D35-W4:调度实例与框架同源（生成关系锁；改 W 即产物变）', async () => {
  // 首刀生成锁：实例透传框架 SCHEDULING；scan 节由渲染派生；改框架即产物变（G1 生成断言）。
  const { SCHEDULING } = await import('skillnomad');
  const { SCHEDULING_POLICY, SCAN_BINDING, scanSchedulingSection } = await import('../scheduling.js');
  assert.equal(SCHEDULING_POLICY.concurrencyLimit, SCHEDULING.concurrencyLimit);
  assert.equal(SCHEDULING_POLICY.windowBudget?.maxWindowSize, SCHEDULING.windowBudget.maxWindowSize);
  assert.equal(SCAN_BINDING.limitW, SCHEDULING.concurrencyLimit);
  assert.ok(scanSchedulingSection().includes('### scan（滚动窗口）'));
});

test('B2-A:method.md 投影与评估域正本一致(漂移锁)', () => {
  const text = readFileSync(repoRoot + 'assets/05-evaluate-pool/method.md', 'utf-8');
  assert.ok(text.includes('唯一事实源'), '缺少投影声明');
  assert.ok(text.includes('每个维度 1-3 分'), '评分制未对齐正本');
  assert.ok(text.includes('L2 | 总分 >= 6'), '入池阈值未对齐正本');
  assert.ok(!text.includes('0-3 分'), '旧评分制残留');
  assert.ok(!text.includes('≥ 8'), '旧入池线残留');
  assert.ok(!text.includes('6-7'), '旧档位残留');
});
