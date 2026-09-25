import { defineConfig } from 'skillnomad';
import { markrefs } from './src/artifacts.ts';
import { modules } from './src/skill-decl.ts';

export default defineConfig({
    skill: './skill.ts',
    outputDir: 'dist/sp-skill',
    // markrefs 校验（P1b）：键表由 entities 派生、引用在 refOf/schemaRef 内自动登记
    markrefs,
    modules,
    // 随包搬运：登记的资产由构建按派生发布路径放进输出目录（构建期含悬空引用检查）
    shipAssets: true,
});
