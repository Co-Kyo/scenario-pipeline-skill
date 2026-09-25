import { defineConfig } from 'skillnomad';
import { markrefs } from './src/artifacts.ts';
import { modules } from './src/skill-decl.ts';

export default defineConfig({
    skill: './skill.ts',
    outputDir: 'dist/sp-skill',
    // markrefs 校验（P1b）：键表由 entities 派生、引用在 refOf/schemaRef 内自动登记
    markrefs,
    modules,
});
