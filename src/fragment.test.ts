import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// 专案27（P3 fragment 无校验 + propositions 无正本）：4 处 `path + '#xxx'`
// 字符串拼接的 fragment 当前值正确，但无任何机制锁定。本测试把
// "声明值 vs schema 正本"锁死：任一 typo 即变红。
// 审计证据：将 `#capabilities` 改为 typo 后构建仍 exit 0，产物含 typo。
// 框架侧 `#` 语义未定义（原样透传，不解析），校验待语义稳定后加。
const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const read = (p: string) => readFileSync(repoRoot + p, 'utf-8');

// 声明值（与 src/steps/*.ts:57/64/69/72 四处拼接一致；改源码此处必同步改）
const DECLARED = [
    { file: 'src/steps/briefing-assemble.ts', fragment: 'propositions', schemaFile: 'assets/01-brainstorm/requirement-web-schema.md' },
    { file: 'src/steps/assemble.ts', fragment: 'propositions', schemaFile: 'assets/01-brainstorm/requirement-web-schema.md' },
    { file: 'src/steps/capability-research.ts', fragment: 'capabilities', schemaFile: 'assets/04-capability-graph/schemas.md' },
    { file: 'src/steps/learning-ladder.ts', fragment: 'propositions', schemaFile: 'assets/01-brainstorm/requirement-web-schema.md' },
];

test('fragment 声明值在源码中存在（防声明与测试双漂）', () => {
    for (const d of DECLARED) {
        const src = read(d.file);
        assert.ok(
            src.includes(`#${d.fragment}`),
      `${d.file} 缺 '#${d.fragment}'——改源码拼接请同步本表`,
        );
    }
});

test('fragment 在 schema 正本中有定义（防 typo 绿构建）', () => {
    for (const d of DECLARED) {
        const schema = read(d.schemaFile);
        assert.ok(
            schema.includes(d.fragment),
      `'#${d.fragment}' 在 ${d.schemaFile} 无定义——typo 或正本缺失`,
        );
    }
});
