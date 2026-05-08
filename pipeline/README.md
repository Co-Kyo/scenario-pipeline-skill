# Pipeline 架构观测文档

> ⚠️ **本目录是架构观测文档，不是 skill 执行配置。**
> 
> - **执行真相**：`references/pre-process.md`、`references/post-process.md`
> - **步骤实现**：`references/processes/*.md`
> - **本目录用途**：理解设计、数据流、阶段边界，供人类阅读参考

---

## 文件索引

| 文件 | 内容 |
|------|------|
| `00-overview.md` | 全局视图：数据流图 + 阶段边界 |
| `01-pre-process.md` | 前处理观测：输入/输出/涉及文件 |
| `02-capability-research.md` | 阶段一观测：能力研究 |
| `03-briefing-assemble.md` | 中间步骤观测：Briefing 组装 |
| `04-proposition-assembly.md` | 阶段二观测：命题组装 |
| `05-learning-ladder.md` | 阶段三观测：学习阶梯生成 |
| `99-shared.md` | 跨阶段共享参考：数据实体、插件关系、故障模式 |

## 与 references/ 的关系

```
pipeline/ (观测)              references/ (执行)
├── 00-overview.md            ├── pre-process.md    ← 前处理编排（真相）
├── 01 ~ 05 各阶段观测        ├── post-process.md   ← 后处理编排（真相）
└── 99-shared.md 共享参考     └── processes/        ← 步骤实现（真相）
```

- `pipeline/` 描述"是什么"和"为什么"
- `references/` 定义"怎么做"
- 两者内容可能有重叠，但 `references/` 是唯一的执行真相来源
