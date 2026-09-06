# sp-skill

sp-skill 开发源码仓库。

## 结构

```text
├── skill.ts                 # SkillSourceModel 定义
├── skillnomad.config.ts     # skillnomad 构建配置
├── src/                     # 开发源码
│   ├── steps/               # 各流程步骤定义
│   ├── contracts.ts
│   ├── policies.ts
│   ├── actions.ts
│   └── verify.ts
├── assets/                  # Markdown 运行资产
├── plugins/                 # 插件片段
└── docs/architecture/       # 每步骤架构 SVG（仅文档，不进入 release）
```

## 本地构建

```bash
npm install
npm run typecheck
npm run build
```

构建产物：

```text
dist/sp-skill/
├── SKILL.md
└── processes/
```

## Release

推送 `v*` tag 或手动运行 GitHub Actions `Release sp-skill` 工作流：

- 使用发布版 `skillnomad` 构建。
- 组装 `SKILL.md`、`processes/`、`assets/`、`plugins/`。
- 生成 `sp-skill-<tag>.zip`，可直接导入为 Markdown skill。
- 同时生成 `source.zip` 并创建 GitHub Release。
- `release` 分支保存可直接导入的生成 Markdown；`dev` 分支保存源码（`main` 已退役）。

默认分支建议设置为 `release`，这样 GitHub 下载和 web agent 分析默认看到的是 Markdown 产物，而不是源码。

## License

MIT
