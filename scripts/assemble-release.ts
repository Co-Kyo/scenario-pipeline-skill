// 发布物组装（声明驱动）：SKILL.md ＋ steps/ ＋ 各资产按「角色派生的发布路径」落盘，随后自检。
//
// 为什么不是 yml 里几条 cp：发布布局只有一处可改（框架的角色派生规则），
// 组装必须读同一份声明，否则「声明改了、打包没跟」会静默漏发。
//
// 用法：
//   tsx scripts/assemble-release.ts --out release/sp-skill            # 组装
//   tsx scripts/assemble-release.ts --check --out release/sp-skill    # 只校验（CI 与本地同用）
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    PUBLISH_DIRS,
    STEP_ENTRY_FILE,
    checkPublishLayout,
    publishPath,
    type PublishableAsset,
} from 'skillnomad';
import { contracts } from '../src/skill-decl.js';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const outFlag = args.indexOf('--out');
const outDir = resolve(repoRoot, outFlag >= 0 ? (args[outFlag + 1] ?? 'release/sp-skill') : 'release/sp-skill');
const dist = join(repoRoot, 'dist/sp-skill');

/** 步序号从构建产物读（steps/<NN>-<id>/ 本身是链序派生的结果，不重复推导）。 */
function stepSeq(): Map<string, number> {
    const stepsDir = join(dist, PUBLISH_DIRS.steps);
    const seqOf = new Map<string, number>();
    if (!existsSync(stepsDir)) return seqOf;
    for (const name of readdirSync(stepsDir)) {
        const match = name.match(/^(\d+)-(.+)$/);
        if (match) seqOf.set(match[2], Number(match[1]));
    }
    return seqOf;
}

const seqOf = stepSeq();
const seqOfStep = (id: string): number | undefined => seqOf.get(id);

// 角色声明：registry 的文件背条目（带 module 的是逻辑标识，不落盘）
const assets: PublishableAsset[] = contracts
    .filter((c) => !c.module)
    .map((c) => (c.scope === 'step'
        ? { path: c.path, scope: 'step' as const, step: c.step }
        : { path: c.path, scope: 'skill' as const }));

// 校验：归属步存在／保留名／同名冲突
const diagnostics = checkPublishLayout(assets, [...seqOf].map(([id, seq]) => ({ id, seq })));
if (diagnostics.length > 0) {
    for (const d of diagnostics) console.error(`  ✗ publish ${d.message}`);
    process.exit(1);
}

// 派生「源 → 发布位置」清单
const plan = assets.map((asset) => {
    const target = publishPath(asset, seqOfStep);
    if (target === null) {
        console.error(`  ✗ publish 无法派生发布路径：${asset.path}`);
        process.exit(1);
    }
    return { source: asset.path, target };
});

const problems: string[] = [];
for (const item of plan) {
    if (!existsSync(join(repoRoot, item.source))) problems.push(`源文件不存在：${item.source}`);
}

if (checkOnly) {
    for (const item of plan) {
        if (!existsSync(join(outDir, item.target))) problems.push(`发布物缺文件：${item.target}（源自 ${item.source}）`);
    }
    if (!existsSync(join(outDir, 'SKILL.md'))) problems.push('发布物缺 SKILL.md');
    for (const [id, seq] of seqOf) {
        const rel = `${PUBLISH_DIRS.steps}/${String(seq).padStart(2, '0')}-${id}/${STEP_ENTRY_FILE}`;
        if (!existsSync(join(outDir, rel))) problems.push(`发布物缺步骤文件：${rel}`);
    }
    if (problems.length > 0) {
        for (const p of problems) console.error(`  ✗ ${p}`);
        console.error(`verify:release failed with ${problems.length} problem(s)`);
        process.exit(1);
    }
    console.log(`verify:release OK（${plan.length} 条资产 ＋ ${seqOf.size} 个步骤文件）`);
    process.exit(0);
}

if (problems.length > 0) {
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(1);
}

// 组装：先清空（保留 .git），再按计划落盘
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

cpSync(join(dist, 'SKILL.md'), join(outDir, 'SKILL.md'));
cpSync(join(dist, PUBLISH_DIRS.steps), join(outDir, PUBLISH_DIRS.steps), { recursive: true });
for (const item of plan) {
    const targetPath = join(outDir, item.target);
    mkdirSync(dirname(targetPath), { recursive: true });
    cpSync(join(repoRoot, item.source), targetPath);
}
cpSync(join(repoRoot, 'LICENSE'), join(outDir, 'LICENSE'));
writeFileSync(
    join(outDir, 'VERSION_LINEAGE.json'),
    JSON.stringify(
        {
            skillnomad_package: 'skillnomad',
            skillnomad_version: JSON.parse(readFileSync(join(repoRoot, 'node_modules/skillnomad/package.json'), 'utf-8')).version,
            sp_skill_repo: process.env.GITHUB_REPOSITORY || 'Co-Kyo/scenario-pipeline-skill',
            sp_skill_source_version: JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf-8')).version,
            sp_skill_release: process.env.RELEASE_TAG || '(local)',
        },
        null,
        4,
    ) + '\n',
    'utf-8',
);

console.log(`assembled → ${outDir}`);
for (const item of plan) console.log(`  ✓ ${item.source} → ${item.target}`);
console.log(`  ✓ steps/（${seqOf.size} 步）＋ SKILL.md ＋ LICENSE ＋ VERSION_LINEAGE.json`);
