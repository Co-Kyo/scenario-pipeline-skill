     1|     1|# 数据实体生命周期
     2|     2|
     3|     3|> ⚠️ **观测文档**，不是执行配置。
     4|     4|> 执行文档 → `processes/` ｜ 本文件属于 `design/pipeline/`
     5|     5|
     6|     6|## 核心数据实体
     7|     7|
     8|     8|| 数据实体 | 诞生步骤 | 消费步骤 | 消费方式 |
     9|     9||---------|---------|---------|---------|
    10|    10|| `requirement-web.json` | ⓪ 头脑风暴（裁判 Agent） | ① scan | 文件读取（定向模式） |
    11|    11|| `.raw-materials/index.json` + `*.md` | ① scan | ② capability-graph, ③ evaluate-pool | 文件读写 |
    12|    12|| `capability-graph.json（命题数据已注入）` | ② capability-graph | ② capability-graph, ③ evaluate-pool | 文件读写 |
    13|    13|| `capability-graph.json` | ③ extract → ④ highground 追加 | 后处理全流程 | 文件读写 |
    14|    14|| `evaluations.json` | ③ evaluate-pool | 入池归档（README.md） | 文件读写 |
    15|    15|| `highgrounds.json` | ④ highground-identify | ⑥ pool（合并入 capability-graph） | 文件读写 |
    16|    16|| `README.md` | ⑥ pool | 用户 + 后处理 | 人类阅读 + agent 读取 |
    17|    17|| `capabilities/{id}.md` | ④ capability-research | **人类阅读** | 人类消费 |
    18|    18|| `summaries/{id}.json` | ④ capability-research（双写） | ⑤ Briefing + ④ 学习阶梯 | 机器消费 |
    19|    19|| `briefings/{命题}.md` | ⑤ briefing-assemble | ⑥ assemble agent | 内联到 task |
    20|    20|| `{命题}/overview.md` 等 | ⑥ assemble | 用户 + ④ 学习阶梯 | 人类消费 + 阶梯引用 |
    21|    21|| `{命题}/learning-ladder.md` | ④ learning-ladder | 用户 | 人类消费 |
    22|    22|| `pipeline-state.json` | 全流程检查点 | 恢复流程 | 文件读写 |
    23|    23|| `dynamic-sources.json` | ① scan, ③ extract | ① scan, ③ extract | 文件读写 |
    24|    24|
    25|    25|## 关键交接点
    26|    26|
    27|    27|```
    28|    28|头脑风暴 ─────────────────────────────────────────── 前处理
    29|    29|
    30|    30|  ⓪ requirement-web.json  ──────────────────────→  ① scan 定向输入（命题列表+搜索关键词）
    31|    31|
    32|    32|前处理 ──────────────────────────────────────────── 后处理
    33|    33|                                                      
    34|    34|  ③ capability-graph.json  ──────────────────────→  ④ 能力筛选（task 内联）
    35|    35|  ③ capability-graph.json  ──────────────────────→  ⑤ 命题列表（task 内联）
    36|    36|  ③ capability-graph.json  ──────────────────────→  ⑥ 命题元数据（task 内联）
    37|    37|  ③ capability-graph.json  ──────────────────────→  ④ 依赖关系（task 内联）
    38|    38|                                                      
    39|    39|  ④ summaries/*.json       ─── read 工具 ────────→  ⑤ Briefing 提取
    40|    40|  ⑤ briefings/*.md         ─── read 工具 ────────→  ⑥ 命题组装
    41|    41|  ⑥ {seq}/overview.md      ─── read 工具 ────────→  ④ 学习阶梯
    42|    42|  ④ summaries/*.json       ─── read 工具 ────────→  ④ 能力详情
    43|    43|```
    44|    44|
    45|    45|**requirement-web.json 是头脑风暴→前处理的交接文件。** 它承载了：
    46|    46|- 命题列表 + 搜索关键词（① scan 的定向输入）
    47|    47|- 命题间依赖关系（② capability-graph 的参考）
    48|    48|- 排除规则和搜索策略（① scan 的过滤条件）
    49|    49|
    50|    50|**capability-graph.json 是前处理→后处理的唯一交接文件。** 它承载了：
    51|    51|- 原子能力列表 + 依赖关系（④ 筛选用）
    52|    52|- 每个能力的 references（④ 信源用）
    53|    53|- propositions（⑤⑥⑦ 命题元数据用）
    54|    54|- highgrounds + learning_path（④ 排序用）
    55|    55|
    56|    56|**Step ④ → ⑤⑥⑦ 的产出交接**通过文件系统 + `read` 工具完成：
    57|    57|- Step ④ 双写：能力主文件（人类消费）+ summary JSON（机器消费）
    58|    58|- Step ⑤⑥⑦ 的 task 中指定具体文件路径，agent 用 `read` 工具读取
    59|    59|- 文件不存在时：⑤ 标注"缺失"继续；⑥④ 停止并报错
    60|    60|
    61|    61|## 数据流向规则
    62|    62|
    63|    63|| 规则 | 说明 |
    64|    64||------|------|
    65|    65|| 前处理不读后处理 | 前处理步骤不读取后处理产出的任何文件 |
    66|    66|| 后处理只读交接文件 | 后处理只读 capability-graph.json 和 .meta/ 下的中间产物 |
    67|    67|| 子 agent 按需读取 | Step ④ 的 task 全部内联（不读外部文件）；Step ⑤⑥⑦ 的 task 指定具体文件路径，agent 用 read 工具读取前置步骤产出，文件不存在时有降级动作 |
    68|    68|| 检查点读状态文件 | 检查点读 pipeline-state.json 确定恢复位置 |
    69|    69|
    70|    70|## 插件引用关系
    71|    71|
    72|    72|```
    73|    73|plugins/year-granularity.md
    74|    74|  └── 被 ② capability-graph 按需加载（--year 参数）
    75|    75|
    76|    76|plugins/capability-research-mode.md
    77|    77|  ├── 被 ④ capability-research 加载（材料块格式）
    78|    78|  └── 被 ⑥ assemble 加载（组装格式）
    79|    79|```
    80|    80|
    81|    81|## 信源数据流
    82|    82|
    83|    83|```
    84|    84|① scan
    85|    85|  ├── T0 域名表 ← meta/sources.md（静态）
    86|    86|  ├── 搜索结果域名 → 与 T0 表比对 → 分级
    87|    87|  └── unknown 域名 → web_fetch 评估 → 写入 dynamic-sources.json
    88|    88|                                                  │
    89|    89|② capability-graph                              │
    90|    90|  ├── T0 域名表 ← meta/sources.md（静态）         │
    91|    91|  ├── 动态池 ← dynamic-sources.json（① 产出）←───┘
    92|    92|  └── 预查找结果 → 写入 capability-graph.json 的 references 字段
    93|    93|```
    94|    94|