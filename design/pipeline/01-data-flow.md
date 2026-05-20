# 数据实体生命周期

> ⚠️ **观测文档**，不是执行配置。
> 执行文档 → `processes/` ｜ 本文件属于 `design/pipeline/`

## 核心数据实体

| 数据实体 | 诞生步骤 | 消费步骤 | 消费方式 |
|---------|---------|---------|---------|
| `raw-materials.json` | ① scan | ② decompose, ⑤ evaluate | 文件读写 |
| `decompositions.json` | ② decompose | ③ capability-extract, ⑤ evaluate | 文件读写 |
| `capability-graph.json` | ③ extract → ④ highground 追加 | 后处理全流程 | 文件读写 |
| `evaluations.json` | ⑤ evaluate | ⑥ pool | 文件读写 |
| `highgrounds.json` | ④ highground-identify | ⑥ pool（合并入 capability-graph） | 文件读写 |
| `README.md` | ⑥ pool | 用户 + 后处理 | 人类阅读 + agent 读取 |
| `capabilities/{id}.md` | ⑦ capability-research | **人类阅读** | 人类消费 |
| `summaries/{id}.json` | ⑦ capability-research（双写） | ⑧ Briefing + ⑩ 学习阶梯 | 机器消费 |
| `briefings/{命题}.md` | ⑧ briefing-assemble | ⑨ assemble agent | 内联到 task |
| `{命题}/overview.md` 等 | ⑨ assemble | 用户 + ⑩ 学习阶梯 | 人类消费 + 阶梯引用 |
| `{命题}/learning-ladder.md` | ⑩ learning-ladder | 用户 | 人类消费 |
| `pipeline-state.json` | 全流程检查点 | 恢复流程 | 文件读写 |
| `dynamic-sources.json` | ① scan, ③ extract | ① scan, ③ extract | 文件读写 |

## 关键交接点

```
前处理 ──────────────────────────────────────────── 后处理
                                                      
  ③ capability-graph.json  ──────────────────────→  ⑦ 能力筛选
  ③ capability-graph.json  ──────────────────────→  ⑧ 能力摘要引用
  ③ capability-graph.json  ──────────────────────→  ⑨ 命题元数据
  ③ capability-graph.json  ──────────────────────→  ⑩ 依赖关系
                                                      
  ⑦ summaries/*.json       ──────────────────────→  ⑧ Briefing 提取
  ⑧ briefings/*.md         ──────────────────────→  ⑨ 内联到 task
  ⑨ {seq}/*.md             ──────────────────────→  ⑩ 内容引用
```

**capability-graph.json 是前后处理的唯一交接文件。** 它承载了：
- 原子能力列表 + 依赖关系（⑦ 筛选用）
- 每个能力的 references（⑦ 信源用）
- propositions（⑧⑨⑩ 命题元数据用）
- highgrounds + learning_path（⑩ 排序用）

## 数据流向规则

| 规则 | 说明 |
|------|------|
| 前处理不读后处理 | 前处理步骤不读取后处理产出的任何文件 |
| 后处理只读交接文件 | 后处理只读 capability-graph.json 和 .meta/ 下的中间产物 |
| 子 agent 只写不读 | 子 agent 的 task 内联了所有必要信息，不读外部文件 |
| 检查点读状态文件 | 检查点读 pipeline-state.json 确定恢复位置 |

## 插件引用关系

```
plugins/year-granularity.md
  └── 被 ② decompose 按需加载（--year 参数）

plugins/capability-research-mode.md
  ├── 被 ⑦ capability-research 加载（材料块格式）
  └── 被 ⑨ assemble 加载（组装格式）
```

## 信源数据流

```
① scan
  ├── T0 域名表 ← meta/sources.md（静态）
  ├── 搜索结果域名 → 与 T0 表比对 → 分级
  └── unknown 域名 → web_fetch 评估 → 写入 dynamic-sources.json
                                                  │
③ capability-extract                              │
  ├── T0 域名表 ← meta/sources.md（静态）         │
  ├── 动态池 ← dynamic-sources.json（① 产出）←───┘
  └── 预查找结果 → 写入 capability-graph.json 的 references 字段
```
