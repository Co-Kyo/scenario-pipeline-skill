#!/usr/bin/env node
// 产物变更清单：对比「上一版 release 分支内容」与「本次组装产物」，输出 Markdown。
//
// 用法：node scripts/release-diff.mjs <prevDir> <newDir> [--prev <标签>] [--now <标签>] [--ignore <a,b>]
//   prevDir 不存在（首次发布）时按空目录处理。
// 退出码恒 0：这是报告，不是门禁（产物零变化也是合法发布，如 v1.4.2 空更新）。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flag = (name, fallback = null) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const prevDir = positional[0];
const newDir = positional[1];
if (!prevDir || !newDir) {
    console.error('用法：node scripts/release-diff.mjs <prevDir> <newDir> [--prev 标签] [--now 标签] [--ignore a,b]');
    process.exit(2);
}

const ignore = new Set(
    (flag('--ignore', '') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
);
/** 每次发布必变的生成性文件（不参与"内容文件变化"计数） */
const EXPECTED_VOLATILE = new Set(['VERSION_LINEAGE.json']);

const walk = (dir, base = dir, out = new Map()) => {
    if (!existsSync(dir)) return out;
    for (const name of readdirSync(dir)) {
        if (name === '.git') continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p, base, out);
        else {
            const rel = relative(base, p).split(sep).join('/');
            if (!ignore.has(rel)) out.set(rel, p);
        }
    }
    return out;
};

const readIfText = (p) => {
    const buf = readFileSync(p);
    if (buf.includes(0)) return null; // 二进制：不做行级统计
    return buf.toString('utf8');
};

/** 行级 ± 统计（LCS）；过大或二进制时返回 null */
const lineDelta = (aText, bText) => {
    if (aText === null || bText === null) return null;
    const A = aText.replace(/\n$/, '').split('\n');
    const B = bText.replace(/\n$/, '').split('\n');
    if (A.length * B.length > 4_000_000) return null;
    const n = A.length;
    const m = B.length;
    const w = m + 1;
    const dp = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            dp[i * w + j] =
                A[i] === B[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
        }
    }
    const lcs = dp[0];
    return { add: m - lcs, del: n - lcs };
};

const prev = walk(prevDir);
const now = walk(newDir);

const rows = [];
let added = 0;
let removed = 0;
let modified = 0;
let unchanged = 0;
let contentChanged = 0;

for (const path of [...new Set([...prev.keys(), ...now.keys()])].sort()) {
    const inPrev = prev.has(path);
    const inNow = now.has(path);
    if (inPrev && !inNow) {
        removed++;
        rows.push(`| \`${path}\` | **删除** | — |`);
        continue;
    }
    if (!inPrev && inNow) {
        added++;
        rows.push(`| \`${path}\` | **新增** | — |`);
        continue;
    }
    const a = readIfText(prev.get(path));
    const b = readIfText(now.get(path));
    if (a === b) {
        unchanged++;
        continue;
    }
    modified++;
    if (!EXPECTED_VOLATILE.has(path)) contentChanged++;
    const d = lineDelta(a, b);
    const note = EXPECTED_VOLATILE.has(path) ? '（血缘，预期）' : '';
    rows.push(`| \`${path}\` | 修改${note} | ${d ? `+${d.add} / −${d.del}` : '（大文件，未逐行统计）'} |`);
}

const total = added + removed + modified + unchanged;
const out = [];
out.push('### 产物变更清单（对比上一版 release 分支）');
out.push('');
out.push(`- 上一版：${flag('--prev', '（无上一版：首次发布）')}`);
out.push(`- 本次：${flag('--now', '（未标注）')}`);
out.push(`- 说明：只列变化项；\`README.md\` 由发布分支步骤生成，不在本清单。`);
out.push('');
if (rows.length === 0) {
    out.push('**产物无变化**：与上一版逐字一致（骨架/文风类发版可能如此）。');
} else {
    out.push('| 文件 | 状态 | ±行 |');
    out.push('|---|---|---|');
    out.push(...rows);
}
out.push('');
out.push(
    `合计：新增 ${added} · 删除 ${removed} · 修改 ${modified} · 无变化 ${unchanged} · 本次共 ${total} 个文件` +
        (contentChanged !== modified ? `（其中内容文件变化 ${contentChanged} 个）` : ''),
);
process.stdout.write(out.join('\n') + '\n');
