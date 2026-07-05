# 增量复用

基于文件存在性判断，不需要状态文件：

| 检查项 | 条件 | 行为 |
|--------|------|------|
| 能力主文件已存在 | `capabilities/{id}-{name}.md` 存在 | 跳过该能力研究 |
| 能力摘要已存在 | `.meta/summaries/{id}-{name}.json` 存在 | 跳过该能力摘要生成 |
| Briefing 已存在 | `.meta/briefings/{seq}-{short_name}.md` 存在 | 跳过该 Briefing |
| 命题文件已存在 | `{seq}-{short_name}/overview.md` 存在 | 跳过该命题组装 |
| 学习阶梯已存在 | `{seq}-{short_name}/learning-ladder.md` 存在 | 跳过该阶梯生成 |
| 看板已存在 | `dashboard-v2.html` 存在 | 跳过看板生成 |
