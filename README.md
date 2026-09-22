# scenario-pipeline

scenario-pipeline 开发源码仓库。

## 结构

```text
├── skill.ts                 # SkillSourceModel 定义
├── skillnomad.config.ts     # skillnomad 构建配置
├── src/                     # 开发源码
│   ├── steps/               # 各流程步骤定义
│   ├── packages/            # 内容包（块与方法）
│   ├── skill-decl.ts        # 声明面：契约登记、模块、策略
│   ├── artifacts.ts         # 产物与输入资产登记
│   ├── step-parts.ts        # 步骤零件（动作/校验/失败/屏障）
│   └── tests/               # 回归测试
├── assets/                  # Markdown 运行资产
├── plugins/                 # 插件片段
└── docs/architecture/       # 步骤架构 SVG（仅文档，不进入 release）
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
└── steps/
```

## Release

- 使用发布版 `skillnomad` 构建。
- 组装 `SKILL.md`、`steps/`、`assets/`、`references/`。
- 生成 `sp-skill-<tag>.zip`，可直接导入为 Markdown skill。
- 同时生成 `source.zip` 并创建 GitHub Release。
- `release` 分支保存可直接导入的生成 Markdown；`dev` 分支保存源码。


## License

MIT
