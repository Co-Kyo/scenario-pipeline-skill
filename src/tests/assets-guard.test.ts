import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// D32 孤儿扫描守卫（W1）：锁"不扩大"，不锁"清零"。
// 口径（T1 矩阵 + R2 a 伪代码）：生产引用 = 非测试 src/**/*.ts + skill.ts +
// skillnomad.config.ts 的精确路径字面量（注册/渲染消费）；注释行内命中、
// md→md 引用、测试引用、numbering-governance walk 均不算生产引用。
// 快照 = 无生产引用文件清单（T1 §8：18 零引用 + 2 仅测试引用 = 20 项；D32 W2 删 6 后剩 14 项；W4 接回 3 转生产后剩 11 项；
// 其中 README 为文档本身、constraint-agent 与 04-schemas 为仅测试引用，
// 均另行标注）。处置时同步更新 ALLOW_ZERO（删 6→减 6，接回 3→转生产；
// 新增合法资产时显式确认，R1 #7）。

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const assetsDir = join(repoRoot, 'assets');

const ALLOW_ZERO: Set<string> = new Set([
    // D32 W2 已删：'assets/01-brainstorm/learning-agent.md'
    // D32 W2 已删：'assets/01-brainstorm/scenario-agent.md'
    // D32 W2 已删：'assets/01-brainstorm/technical-agent.md'
    // D32 W2 已删：'assets/01-brainstorm/constraint-agent.md'
    // D32 W2 已删：'assets/01-brainstorm/level-weight.md'
    // D32 W2 已删：'assets/01-brainstorm/scheduling-detail.md'
    // D32 W4 已接回转生产：'assets/02-partition/schemas.md'
    // D32 W4 已接回转生产：'assets/04-capability-graph/method.md'
    // R4-N9 文件夹已迁出：'assets/04-capability-graph/schemas.md' → src/steps/capability-graph/assets/schemas.md（随步骤同目录；存在性改由 fragment.test.ts 锁定）
    // D32 W4 已接回转生产：'assets/05-evaluate-pool/schemas.md'
    // D35 W0 已删：'assets/common/convention-trace.md'
    // 发布布局（2026-09-18）已接回转生产：'assets/common/decision-summary.schema.json'（检查点协议引用，随包）
    // D35 W4 首刀迁出即删：'assets/common/pipeline-params.md'
    // 发布布局（2026-09-18）已接回转生产：'assets/common/protocol-checkpoint.md'（initialize 步 .reads 契约引用，随包）
    // D35 W4 首刀迁出即删：'assets/common/protocol-scheduling.md'
    // D35 W0 已删：'assets/common/ref-paths.md'
    // 发布布局（2026-09-18）：rule-isolation.md 已删（原则并入 skill.ts isolationNote；示例里的旧路径已无人可修）
    // 发布布局（2026-09-18）：rule-reuse.md 已删（增量复用表由各步 .reuse() 声明渲染，源文件无人引用）
    // D35 W4 首刀迁出即删：'assets/common/subagent-budget.md'
    // 发布布局（2026-09-18）：assets/README.md 已删（R4 前老布局索引，目录树与引用全过期）
]);

const PROD_ROOTS = ['src', 'skill.ts', 'skillnomad.config.ts'];

function stripLineComment(line: string): string {
    const idx = line.indexOf('//');
    return idx < 0 ? line : line.slice(0, idx);
}

function collectTsFiles(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === 'dist') continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
            collectTsFiles(p, out);
        } else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) {
            out.push(p);
        }
    }
    return out;
}

function collectAssets(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
            collectAssets(p, out);
        } else {
            out.push(relative(repoRoot, p).split(sep).join('/'));
        }
    }
    return out;
}

function scanZeroRefs(): Set<string> {
    const prodFiles: string[] = [];
    for (const root of PROD_ROOTS) {
        const p = join(repoRoot, root);
        try {
            if (statSync(p).isDirectory()) collectTsFiles(p, prodFiles);
            else prodFiles.push(p);
        } catch {
            // 根文件不存在则跳过
        }
    }
    const lines: string[] = [];
    for (const f of prodFiles) {
        for (const line of readFileSync(f, 'utf-8').split('\n')) {
            lines.push(stripLineComment(line));
        }
    }
    const body = lines.join('\n');
    const zero = new Set<string>();
    for (const asset of collectAssets(assetsDir)) {
        if (!body.includes(asset)) zero.add(asset);
    }
    return zero;
}

test('孤儿扫描：零引用文件不得超出快照清单（新增即红）', () => {
    const zero = scanZeroRefs();
    const extra = [...zero].filter((a) => !ALLOW_ZERO.has(a));
    assert.deepEqual(extra, [], `新增零引用文件: ${extra.join(', ')}`);
});

test('孤儿扫描：快照条目须仍为零引用（处置后同步更新快照）', () => {
    const zero = scanZeroRefs();
    const revived = [...ALLOW_ZERO].filter((a) => !zero.has(a));
    assert.deepEqual(revived, [], `快照条目已恢复生产引用，请同步更新 ALLOW_ZERO: ${revived.join(', ')}`);
});
