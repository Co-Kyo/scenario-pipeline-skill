# 抽取边界记录（替换测试）· @co-kyo/brainstorm-rules

> 仓库侧记录，**不进发布物**（发布物只有 `package.json` ＋ `skill.json` ＋ `blocks/`）。
> 判据与记录格式见《抽取规范 v1》。

## 一 · 替换项（业务词 → 包内通用说法）

| 业务词（留宿主） | 原出现处 | 包内通用说法 |
|---|---|---|
| 场景／技术／学习／约束（4 个维度名＋label＋输出文件名） | `assets/01-brainstorm/agent-init.md`、`barrier-check.md`、`fallback-protocol.md` | N 个维度（由使用方声明） |
| `anchors.json`／`scenario.json` 等文件名、`{workDir}/.meta/brainstorm/` 路径 | 三规则全文 | 共享骨架／维度报告（写到约定位置） |
| `requirement-web.json` 字段表（context／propositions／capability_web／scope／search_guidance） | `fallback-protocol.md` 转换表 | 汇总产物字段（格式由使用方声明） |
| 阈值：超时 3min／5min、轮询 15s、补发 1 次、重试上限 2 次 | 三规则＋`brainstorm.ts` 内容域 | 超时与重试阈值（由使用方声明） |
| `dimension-gate.md` 检查点文件名、决策矩阵具体行 | `barrier-check.md` | 门禁报告（写到约定位置） |
| target_level／year_inference_trace／tags 等字段名 | `fallback-protocol.md` | （包内不出现） |

**判定**：以上替换后，分发→门禁→降级整台机器照转且可执行 → 属通用方法，进包。

## 二 · 保留项（替换测试下不改变行为，判为通用）

| 保留词 | 为什么通用 |
|---|---|
| 分发（主下发路径、不读内容） | 通用动作；与业务对象无关 |
| 门禁（齐备才进、缺项停住等决策） | 通用控制点；被别的方法复用时语义不变 |
| 降级（存活重建＋标注痕迹） | 通用动作；与业务对象无关 |
| 重试上限（达到上限仅留降级） | 通用控制点；与具体次数无关 |

## 三 · 反向抽查（按本包五问）

- 维度名与输出文件名 → 留宿主 ✅
- 阈值具体值 → 留宿主 ✅
- 产物字段名 → 留宿主 ✅
- 分发门禁降级形状 → 进包 ✅
- 范围裁剪 → 维度任务写法（属并行分析包）排除 ✅

## 四 · 外部验证（关闭，2026-09-16）

第二消费者（客服工单分发 skill，自带维度：紧急／账单／技术三队列，阈值超时 2min／轮询 10s／补发 2 次）装同一个包：零冲突，且两个消费者的方法正文**逐字相同**（2355 字节）——实证边界成立（见工作仓 `.sessions/2026-09-16-brainstorm-rules-detached/WORKLOG.md`，本地资产不入库）。
宿主声明不同是预期的：sp-skill 侧 4 维度＋3min／15s／1 次，skill-f 侧 3 队列＋2min／10s／2 次，各自留宿主。
