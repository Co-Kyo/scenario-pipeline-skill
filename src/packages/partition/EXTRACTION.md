# 抽取边界记录（替换测试）· @co-kyo/partition

> 仓库侧记录，**不进发布物**（发布物只有 `package.json` ＋ `skill.json` ＋ `blocks/`）。
> 判据与记录格式见《抽取规范 v1》。

## 一 · 替换项（业务词 → 包内通用说法）

| 业务词（留宿主） | 原出现处 | 包内通用说法 |
|---|---|---|
| prerequisite／enables／related／extends＋中文解释（4 个依赖类型） | `src/domain/content/partition.ts` L2–7 | 本域依赖类型表（由使用方声明，含方向） |
| LEIDEN_THRESHOLD＝8、聚类算法名 Leiden | `partition.ts` L10、`threeLayerSection()` | 社区分量阈值（由使用方声明）＋社区聚类 |
| SESSION_MAX_PROPOSITIONS＝12、S1／S2／S3、core 命题 | `partition.ts` L13、`sessionSection()` | 当前批次上限（由使用方声明）＋后续批次 |
| `partition-analysis.json`／`dependency-graph.json`／`execution-plan.md`＋`current_session`／`scan_batches` | 步骤 reads／writes、entities L39–41 | 分区分析／执行计划（写到约定位置） |
| requirement-web.json（输入） | 步骤 inputs、`dagTask()` | 输入需求网（格式由使用方声明） |

**判定**：以上替换后，建图→断环→三层分层→分批整台机器照转且可执行 → 属通用方法，进包。

## 二 · 保留项（替换测试下不改变行为，判为通用）

| 保留词 | 为什么通用 |
|---|---|
| 依赖（dependency）／分量／深度／社区 | 不含具体对象；图论中性词 |
| 断环（先断无严格先后边） | 通用控制点；与业务对象无关 |
| 三层分批（分量／深度／社区） | 通用形状；划分逻辑可复用 |
| 恢复指令 | 通用动作；"排期项留恢复"与业务对象无关 |

## 三 · 反向抽查（按本包五问）

- 依赖类型与解释 → 留宿主：partition.ts L2–7 ✅
- 阈值与上限具体值 → 留宿主：L10／L13 ✅
- 产物名与字段名 → 留宿主：entities L39–41 ✅
- 建图断环分层分批形状 → 进包：替换后仍成立 ✅
- 范围裁剪 → schema 文件（197 行结构设计）排除：它是本域数据契约，不是方法 ✅

## 四 · 外部验证（关闭，2026-09-16）

第二消费者（仓库拣货分区 skill，自带类型：同区／同单／冷链，阈值分量超 20 聚类／单波次上限 50 单）装同一个包：零冲突，且两个消费者的方法正文**逐字相同**（1875 字节）——实证边界成立（见工作仓 `.sessions/2026-09-16-partition-detached/WORKLOG.md`，本地资产不入库）。
宿主声明不同是预期的：sp-skill 侧 4 依赖类型＋Leiden 8＋上限 12，skill-d 侧 3 拣货类型＋20／50，各自留宿主。
