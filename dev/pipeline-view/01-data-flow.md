# 数据实体生命周期

> ⚠️ **观测文档**，不是执行配置。
> 执行文档 → `processes/` ｜ 本文件属于 `design/pipeline/`

## 核心数据实体

| 数据实体 | 诞生步骤 | 消费步骤 | 消费方式 |
|---------|---------|---------|---------|
| `requirement-web.json` | ⓪ 头脑风暴（裁判 Agent） | ① scan | 文件读取（定向模式） |
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
头脑风暴 ─────────────────────────────────────────── 前处理

  ⓪ requirement-web.json  ──────────────────────→  ① scan 定向输入（命题列表+搜索关键词）

前处理 ──────────────────────────────────────────── 后处理
                                                      
  ③ capability-graph.json  ──────────────────────→  ⑦ 能力筛选（task 内联）
  ③ capability-graph.json  ──────────────────────→  ⑧ 命题列表（task 内联）
  ③ capability-graph.json  ──────────────────────→  ⑨ 命题元数据（task 内联）
  ③ capability-graph.json  ──────────────────────→  ⑩ 依赖关系（task 内联）
                                                      
  ⑦ summaries/*.json       ─── read 工具 ────────→  ⑧ Briefing 提取
  ⑧ briefings/*.md         ─── read 工具 ────────→  ⑨ 命题组装
  ⑨ {seq}/overview.md      ─── read 工具 ────────→  ⑩ 学习阶梯
  ⑦ summaries/*.json       ─── read 工具 ────────→  ⑩ 能力详情
```

**requirement-web.json 是头脑风暴→前处理的交接文件。** 它承载了：
- 命题列表 + 搜索关键词（① scan 的定向输入）
- 命题间依赖关系（② decompose 的参考）
- 排除规则和搜索策略（① scan 的过滤条件）

**capability-graph.json 是前处理→后处理的唯一交接文件。** 它承载了：
- 原子能力列表 + 依赖关系（⑦ 筛选用）
- 每个能力的 references（⑦ 信源用）
- propositions（⑧⑨⑩ 命题元数据用）
- highgrounds + learning_path（⑩ 排序用）

**Step ⑦ → ⑧⑨⑩ 的产出交接**通过文件系统 + `read` 工具完成：
- Step ⑦ 双写：能力主文件（人类消费）+ summary JSON（机器消费）
- Step ⑧⑨⑩ 的 task 中指定具体文件路径，agent 用 `read` 工具读取
- 文件不存在时：⑧ 标注"缺失"继续；⑨⑩ 停止并报错

## 数据流向规则

| 规则 | 说明 |
|------|------|
| 前处理不读后处理 | 前处理步骤不读取后处理产出的任何文件 |
| 后处理只读交接文件 | 后处理只读 capability-graph.json 和 .meta/ 下的中间产物 |
| 子 agent 按需读取 | Step ⑦ 的 task 全部内联（不读外部文件）；Step ⑧⑨⑩ 的 task 指定具体文件路径，agent 用 read 工具读取前置步骤产出，文件不存在时有降级动作 |
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
