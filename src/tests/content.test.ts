import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { REASON_TYPES } from '../steps/brainstorm/content.js';
import { SCAN_DENSITY } from '../steps/scan/content.js';
import { countVerifyText, detail, INTERCEPT_WORDS, insufficientAnchorsText, skipSection, target } from '../steps/intent-anchor/content.js';
import { detail as partitionDetail, sessionOverflowText, threeLayerSection } from '../steps/partition/content.js';
import { capabilityOverflowText, highgroundSection } from '../steps/capability-graph/content.js';
import { detail as evaluationDetail, thresholdSection } from '../steps/evaluate-pool/content.js';
import { initializeDetail, WORKDIR_NAMING } from '../steps/initialize/content.js';
import { RATIO_CLAUSE, SCENARIO_MINIMUM } from '../steps/assemble/content.js';
import { BATCH_POLICY, CONCURRENCY_LIMIT, WINDOW_BUDGET } from '../skill-decl.js';

// 仓库根(src/tests/ 上两级)
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

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
    const sr = readFileSync(repoRoot + 'src/steps/intent-anchor/assets/skip-rules.md', 'utf-8');
    assert.ok(sl.includes('= target_level - 1'), 'strategy-level 缺 premise 约束');
    assert.ok(sr.includes('level=target_level-1'), 'skip-rules 缺 premise 约束');
});

test('B5:reason_type 枚举在 schemas 正本中齐全(漂移锁)', () => {
    // D32 W2：constraint-agent.md 已删（死文件，运行时零消费），本锁只留活文件一端；
    // 内联工厂 constraintTask() 的 REASON_TYPES 内插由 brainstorm.test.ts 字面量断言覆盖。
    const sch = readFileSync(repoRoot + 'src/steps/brainstorm/assets/schemas.md', 'utf-8');
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

test('shared:片段与原文逐字一致', () => {
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

test('D32-W5:并发口径自有常量锁（字面量锁；框架零调度口径后数字只活消费侧）', () => {
    // 原 D32-W5 读 skill.ts 字面量 → D35-W4 改读透传实例；框架极致移除后改读自有常量。
    // 框架侧 SCHEDULING／SourceSchedulingPolicy／validate／渲染已删除，无同源可言。
    assert.equal(CONCURRENCY_LIMIT, 5);
    assert.equal(WINDOW_BUDGET?.maxWindowSize, 4);
    assert.equal(WINDOW_BUDGET?.inputChunkTokens, 6000);
    assert.equal(WINDOW_BUDGET?.itemSummaryTokens, 500);
    assert.equal(BATCH_POLICY?.mode, 'rolling_window');
});

test('D35-W4退役:scan-binding模块已随调度移除而删除（存在性反断言）', async () => {
    // scan-binding／scheduling-policy 两模块＋contracts条目＋scan reads已删除；
    // 模块通道现为 5 条纯内容包。本测试锁"删干净"：任一回潮即红。
    const { modules: declared } = await import('../skill-decl.js');
    const ids = new Set(declared.map((m) => m.id));
    assert.ok(!ids.has('scan-binding'), 'scan-binding 回潮');
    assert.ok(!ids.has('scheduling-policy'), 'scheduling-policy 回潮');
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
