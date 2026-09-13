# Changelog

## post-v1.4.3（累积待发：markrefs 接入 · 调度绑定 · body 判据 · decision 示例语义）

> 状态：**未打 tag**（v1.4.3 之后累积在 `dev` 上的全部内容）。下次发版时把本节改名为目标版本号。

**产物变化（对比 release 分支 v1.4.3，逐字核对）**

| 产物文件 | 变化 | 来源 |
|---|---|---|
| `SKILL.md` | 零变化 | — |
| `processes/02-brainstorm.md` | 8 行：decision 示例值标注（题注「示例值」、`metrics（示例）`、`【示例】` 前缀） | D33-W5（`680299e`） |
| `processes/04-scan.md` | 12 行：新增「调度绑定」节（滚动窗口：任务单元／并发／校验／重试）＋ search 任务尾「判据／参照」两句 | D35-W4（`8f53209`）／D40-R2（`1f4137c`） |

**护栏与工程改动（不进产物，产物零变化）**

- **markrefs 接入**：键表由实体表派生（27 条）＋引用在 `refOf`／`schemaRef` 内自动登记（`b503230`）——118 处调用点文字零改动。构建期校验上线：`markrefs：133 条引用（15 条判存在性，118 条模板跳过）`，诊断直指调用点 `file:line`。随后：跟随改名（`e96e024`）、框架依赖 0.1.3 → 0.1.4（`a1dea55`）、依赖收口为单条（`fde8aa8`）。
- **框架依赖对齐**：`skillnomad` 0.1.3 → 0.1.4——本次首次把"声明"与"源码用到的面"对齐；此前声明停在 0.1.3，用声明依赖跑 typecheck 报 7 处、构建直接 SyntaxError，一直靠本地直调掩盖。
- **工程**：TS/JSON 统一 4 空格缩进＋eslint（`19322f1`／`b2572b0`）；`initStepId` 一行删除（产物零 diff，`9e88c4a`）；release 分支 README 补全＋血缘由构建生成（`4952414`）。

**验收**：typecheck 零报错 · 53/53 · verify:product 4/4 · build 15 文件；框架 0.1.3 → 0.1.4 升级前后产物 13/18 文件哈希逐字相同（5 个差异均为时间戳类）。

## v1.4.3（D32 源码结构审计处置：守卫先行+逐个处置，零行为变化）

- **守卫先行（W1）**：新增 `src/assets-guard.test.ts` 孤儿扫描守卫（20 项快照：18 零引用＋2 仅测试引用；新增零引用即红、处置同步更新快照；`ALLOW_ZERO` 显式确认）。
- **删 6（W2）**：删 `assets/01-brainstorm/` 4×agent＋level-weight＋scheduling-detail 死文件；`agent-init.md` 联动改内联（禁读清单改段落＋清单表 4 行改内联定义）；B5 改单端锁（只留 schemas 活文件一端）。
- **接回 3（W4）**：`02-partition`/`05-evaluate-pool` schemas 挂实体 schema＋reads（verify 现有已够）；`04-capability-graph/method.md` 双表新增 method 条（9→10）＋reads `as:'method'`＋C2-A 漂移锁前置。
- **补锁 3（W5）**：`skill.ts:49` 注释改散文引用（非注册消费）＋D32-W5 三值字面量锁；`scan.ts:27` 改 `refOf('partitionAnalysis').path`；`entities.ts:7` 头注 26→27。
- 验收：typecheck 零报错 · 52/52 全绿 · verify:product 4/4 · build 15 文件；产物行为零变化（删死文件不进产物，agent-init 改后渲染可审）。
- 依据：`slides/32-源码结构审计/`（ADR-32-1/2/3 locked，用户拍板 D-A）。

## v1.4.2（空更新：验证 release 分支常规迭代流程）

- 无源码/依赖变更，仅版本号 1.4.1 → 1.4.2，用于触发 Release 工作流，验证 #3 合入的常规迭代更新
  （release 分支保留 git 历史、无 diff 跳过、有 diff 累积 commit、无 `--force`）。
- 预期：产物与 v1.4.1 一致，工作流应走"内容无变化，跳过提交"分支，release 分支不新增 commit。

## v1.4.1（skillnomad 0.1.1 P1 修复对齐）

- **依赖对齐**：`skillnomad` 从 **`0.1.0`** 切到 **`0.1.1`**（`--save-exact` 精确锁定）——框架 P1 缺陷修复版（`renderStep` 正文早返分支补渲染依赖/增量复用/降级协议/插件加载四节）。
- **产物恢复**：构建产物 `## 增量复用`×4、`## 插件加载`×4、`## 依赖`×11 全命中（补承诺，非新功能；`## 降级协议`零命中符合预期：11 步零 `.degrade()`）。
- 验收：typecheck ✓ · 44 测试全绿 ✓ · build 15 files ✓；无需任何适配改动。
- `VERSION_LINEAGE.json` 同步：`skillnomad_version` 0.1.1（此前滞后 beta.3 的文档债一并还清）、`sp_skill_source_version`/`sp_skill_release` 1.4.1/v1.4.1。

## post-v1.4.0（skillnomad 0.1.0 正式版对齐，deck15 裁决收尾）

- **依赖对齐**：`skillnomad` 从 `^0.1.0-beta.9` 切到 **`0.1.0`**（`--save-exact` 精确锁定）——框架首个稳定版（可信度里程碑，`latest` dist-tag 首次指向正式版）。
- **零行为变化预期兑现**：typecheck ✓ · 44 测试全绿 ✓ · build 15 files ✓；beta.9 → 0.1.0 间框架代码差异仅 validate CLI Windows 修复与注释清理，sp-skill 无需任何适配改动。
- 第二用例 narrative-focus-port 已先行归位并落地 ref 声明模式（`SourceRef.ref` 真实消费者，框架未解析防护 4/4 验证）——与 sp-skill 实体常量模式互为反证。

## post-v1.4.0（8.16 产物路径投射，beta.9 配套）

- **产物实体声明**：新建 `src/domain/entities.ts`（27 条实体：8 组领域概念 + 机制产物，含 `init.json` 补漏）；`refOf`/`schemaRef` 概念引用辅助。
- **步骤层路径字面量清零**：reads/writes/inputs/outputs/map-over/verify/reuse 全部改概念引用（`refOf('xxx').path`）；代码级 `{workDir}` 字面量 0（仅提示词文本保留）。
- **contracts.ts**：runtime 表删除；modules 12→9（3 个 schemas 挂实体，③A）；注册表同步。
- **effects 同源**：4 条 EFFECT_CONTRACTS artifact 从实体取值（ladder 双写消失）。
- 验收：typecheck ✓ · 44 测试 ✓ · 产物 = 预期修正性变化（2 处 description 精化）· 依赖 skillnomad beta.9 候选。

## post-v1.4.0（8.15 模块抽象 Step 1/2，未打 tag）

- **Step 1 · refs 双表拆分**（`e86fb38`）：`contracts.ts` 拆为 `runtime`（26 条数据契约）/ `modules`（12 条内容模块）；移除 4 条下沉残留、收编 1 处裸路径、清空 `contracts` 数组（当时零消费方）；产物零 diff。
- **Step 2 · 模块注册表 + 标签安置**：`contracts` 数组复活为模块注册表（12 条，含 `id`/`kind`/`scope`）；9 处 `as` 标签按真实性质修正（5 rule + 1 method + 3 schema）；2 个 skill 级契约保留。产物 = 预期修正性变化（契约引用 13→4，9 条移入读取表，信息不丢失）。
- 注：依赖 skillnomad beta.7 候选（`scope` 字段 + `validateModuleUsage` 构建期校验）；未打新 sp-skill 发布 tag。

## post-v1.4.0（skillnomad beta.5 / beta.6 配套，依赖对齐）

- **跟随 skillnomad 0.1.0-beta.5**（`170d5f6`）：依赖升级；序言「契约引用」章节恢复（8.5 渲染侧派生修复落地）。
- **跟随 skillnomad 0.1.0-beta.6**（`00cc676`）：8.13/8.14 调度策略 schedulingPolicy 迁移——`skill.ts` meta 加 `schedulingPolicy`（W=5 / 窗口预算 / 分批规则）；7 步「待迁移」注释更新为「已下沉」；6 步调度契约文档从 reads 表消失，策略约束收敛到 SKILL.md「## 调度策略」公共章节（process 级 0 泄漏）。
- 注：以上为依赖对齐 commit，未打新 sp-skill 发布 tag；当前最新 tag 仍为 **v1.4.0**。

## v1.4.0

- 构建工具链换轨：@co-kyo/skillpack → skillnomad（0.1.0-beta.3），产物逐字节不变。
- 阶段 2 顺序收敛：顺序事实 11/11 统一到 dependsOn——删除 EDGES/HEAD/TAIL 会话表、prevStep/nextStep 查表、全部 .next() 字面量；flowOverview 改由构建期派生。
- flow.test 精简为纯锚定断言；链自洽守卫由 skillnomad 构建期校验承接（validateStepChain / DependencyRefs / PhaseCoverage）。
- 修复 B1-A 漂移锁的 Windows 行尾误报（CRLF/LF 归一）。


## v1.0.0

- 使用发布版 `skillnomad` 构建 sp-skill。
- 源码仓库包含 `skill.ts`、`src/`、`assets/`、`plugins/`。
- GitHub Actions 自动生成可直接导入的 Markdown skill 压缩包。
