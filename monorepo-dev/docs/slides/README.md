# skillpack monorepo 教学幻灯片

源自 `docs/explainer.html`，按执行链路重新编排为幻灯片格式。

## 启动

```bash
npm run dev
```

浏览器打开 `http://localhost:8080`，方向键翻页。

## 更多命令

| 命令 | 效果 |
|------|------|
| `npm run dev` | 实时预览（热更新） |
| `npm run build` | 构建静态 HTML（输出 `index.html`） |
| `npm run pdf` | 导出可搜索 PDF（输出 `slides.pdf`） |

## 目录结构

```
slides/
├── slides.md       ← 主幻灯片（唯一源）
├── theme.css       ← 暗色主题（匹配 explainer 风格）
├── package.json    ← npm scripts（dev / build / pdf）
└── README.md       ← 本文件
```

SVG 图解复用 `docs/svg/` 下的 6 张现有图片，不新增依赖。

## 维护说明

- `slides.md` 是**唯一源**，不再维护 `explainer.html`
- 新增概念时，在对应位置插入新 slide（`---` 分隔）
- SVG 图解在 `docs/svg/` 下更新，slides 中用相对路径引用
