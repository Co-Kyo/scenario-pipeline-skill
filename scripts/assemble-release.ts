// 发布拷贝：把构建产物复制进 release 工作树，并生成版本血缘文件。
//
// 搬运与包内自洽检查已收进框架构建（skillnomad.config.ts 的 `shipAssets: true`）：
// 登记的随包文件由构建按派生发布路径放进输出目录，产物文本的悬空引用检查由构建当场执行。
// 本脚本因此不再推导发布路径、不再重复扫描——只做 dist → release 的原样拷贝与逐文件校验。
//
// 用法：
//   node scripts/assemble-release.ts --out release/sp-skill            # 拷贝
//   node scripts/assemble-release.ts --check --out release/sp-skill    # 只校验（CI 与本地同用）
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const outFlag = args.indexOf('--out');
const outDir = resolve(repoRoot, outFlag >= 0 ? (args[outFlag + 1] ?? 'release/sp-skill') : 'release/sp-skill');
const dist = join(repoRoot, 'dist/sp-skill');

/** 构建自产的机器登记件：随 dist 留存，不进发布包（发布形态＝agent 执行所需文件全集）。 */
const MACHINE_REPORTS = new Set(['output-manifest.json', 'artifact-manifest.json', 'decision-summary.json', 'align-report.json', 'align-report.md']);

/** 构建登记的产物清单（file + sha256）：拷贝与校验的同一份依据；剔除机器登记件。 */
function manifest(): { file: string; hash: string }[] {
    const p = join(dist, 'artifact-manifest.json');
    if (!existsSync(p)) {
        console.error('  ✗ 缺 artifact-manifest.json——先跑 npm run build');
        process.exit(1);
    }
    return (JSON.parse(readFileSync(p, 'utf-8')).files as { file: string; hash: string }[])
        .filter((f) => !MACHINE_REPORTS.has(f.file));
}

function sha256(file: string): string {
    return createHash('sha256').update(readFileSync(file)).digest('hex');
}

const files = manifest();
const problems: string[] = [];

/** 逐文件校验：dist 侧哈希自洽＋release 侧与 dist 逐文件一致＋发布附加文件实存。 */
function verify(): void {
    for (const item of files) {
        const built = join(dist, item.file);
        const shipped = join(outDir, item.file);
        if (!existsSync(built)) problems.push(`构建产物缺文件：${item.file}`);
        else if (sha256(built) !== item.hash) problems.push(`构建产物哈希不符：${item.file}`);
        if (!existsSync(shipped)) problems.push(`发布物缺文件：${item.file}`);
        else if (existsSync(built) && sha256(shipped) !== sha256(built)) problems.push(`发布物与构建产物不一致：${item.file}`);
    }
    for (const extra of ['LICENSE', 'VERSION_LINEAGE.json']) {
        if (!existsSync(join(outDir, extra))) problems.push(`发布物缺文件：${extra}`);
    }
}

function listFiles(dir: string): string[] {
    const out: string[] = [];
    const walk = (d: string): void => {
        for (const entry of readdirSync(d, { withFileTypes: true })) {
            const p = join(d, entry.name);
            if (entry.isDirectory()) walk(p);
            else if (entry.name !== '.git') out.push(p.slice(outDir.length + 1).split(/[\\/]/).join('/'));
        }
    };
    walk(dir);
    return out;
}

if (checkOnly) {
    verify();
    // 反向清点：release 里不应有清单之外的文件（LICENSE／VERSION_LINEAGE 除外）
    const expected = new Set([...files.map((f) => f.file), 'LICENSE', 'VERSION_LINEAGE.json']);
    for (const rel of listFiles(outDir)) {
        if (!expected.has(rel)) problems.push(`发布物含未登记文件：${rel}`);
    }
    if (problems.length > 0) {
        for (const p of problems) console.error(`  ✗ ${p}`);
        console.error(`verify:release failed with ${problems.length} problem(s)`);
        process.exit(1);
    }
    console.log(`verify:release OK（${files.length} 件产物 ＋ LICENSE ＋ VERSION_LINEAGE.json）`);
    process.exit(0);
}

// 拷贝：先清空（保留 .git），按构建登记的清单原样落盘
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const item of files) {
    const from = join(dist, item.file);
    const to = join(outDir, item.file);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
}
copyFileSync(join(repoRoot, 'LICENSE'), join(outDir, 'LICENSE'));
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

verify();
if (problems.length > 0) {
    for (const p of problems) console.error(`  ✗ ${p}`);
    console.error(`assembled 但校验未过（${problems.length} 处）：${outDir}`);
    process.exit(1);
}
console.log(`assembled → ${outDir}（${files.length} 件产物 ＋ LICENSE ＋ VERSION_LINEAGE.json）`);
