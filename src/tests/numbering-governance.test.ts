// 编号治理不变量(去数字化之后的不变量,取代 B12 的 CANON 正本锁)。
// 设计裁定:顺序属于源码层(dependsOn/session 流);编号属于打包层(skillpack 构建期生成);
// assets/plugins 散文一律用步骤名引用,禁止手写编号字面量。
// 注:assets/NN-* 目录名保留旧编号(登记项,路径改名成本高),守卫已排除路径上下文。
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

function assetTexts(): [string, string][] {
    const out: [string, string][] = [];
    for (const dir of ['assets', 'plugins']) {
        const walk = (p: string) => {
            for (const e of readdirSync(p, { withFileTypes: true })) {
                const full = `${p}/${e.name}`;
                if (e.isDirectory()) walk(full);
                else if (e.name.endsWith('.md')) out.push([full.replace(repoRoot, ''), readFileSync(full, 'utf-8')]);
            }
        };
        walk(dir);
    }
    return out;
}

/** 步骤名 → canonical 编号(用于检测「数字+步骤名」型残留) */
const LABELS: Record<string, number> = {
    'intent-anchor': 1, 意图锚定: 1,
    'brainstorm': 2, 头脑风暴: 2,
    'partition': 3, 依赖分区: 3,
    'scan': 4,
    'capability-graph': 5, 能力图谱: 5,
    'evaluate-pool': 6, 评估入池: 6,
    'capability-research': 7, 能力研究: 7,
    'briefing-assemble': 8, 'Briefing 组装': 8,
    'assemble': 9, 命题组装: 9,
    'learning-ladder': 10, 学习阶梯: 10,
};

test('编号治理:assets/plugins 禁止裸 Step NN(散文用步骤名引用)', () => {
    for (const [rel, text] of assetTexts()) {
        const hits = text.match(/Step [0-9]{2}/g);
        assert.ok(!hits, `${rel} 含手写步骤编号:${hits?.join(', ')}(改用步骤名引用)`);
    }
});

test('编号治理:「数字+步骤名」型残留清零', () => {
    for (const [rel, text] of assetTexts()) {
        for (const [label, canon] of Object.entries(LABELS)) {
            const re = new RegExp(`(\\d{1,2})\\s*[-·]?\\s*${label.replace(/[.]/g, '\\.')}`, 'g');
            for (const m of text.matchAll(re)) {
                const i = m.index ?? 0;
                const before = i > 0 ? text[i - 1] : '';
                const after = text[i + m[0].length] ?? '';
                // 目录名/路径上下文豁免(assets/03-scan 等登记保留的旧编号目录)
                if (before === '/' || before === '-' || before === '`') continue;
                if (after === '/' || after === '`') continue;
                assert.fail(`${rel}:「${m[0]}」编号残留,canonical 应为 ${canon}`);
            }
        }
    }
});

test('编号治理:processes 渲染产物无未解析占位符', (t) => {
    const dist = `${repoRoot}dist/sp-skill/processes`;
    if (!existsSync(dist)) {
        t.skip('需先 npm run build');
        return;
    }
    for (const e of readdirSync(dist)) {
        const text = readFileSync(`${dist}/${e}`, 'utf-8');
        const hits = text.match(/\{\{(step|num|order):/g);
        assert.ok(!hits, `${e} 含未解析占位符:${hits?.join(', ')}`);
    }
});

test('编号治理:assets/plugins 引用的 processes 路径必须存在(对照构建产物)', (t) => {
    const dist = `${repoRoot}dist/sp-skill/processes`;
    if (!existsSync(dist)) {
        t.skip('需先 npm run build');
        return;
    }
    for (const [rel, text] of assetTexts()) {
        for (const m of text.matchAll(/processes\/([A-Za-z0-9-]+\.md)/g)) {
            assert.ok(existsSync(`${dist}/${m[1]}`), `${rel} 引用不存在的步骤文件:${m[1]}`);
        }
    }
});
