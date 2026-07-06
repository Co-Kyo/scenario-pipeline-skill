# 上下文隔离规范（Context Isolation）

> **每一步只加载当前步骤所需的文件，严禁预加载后续步骤。**
> 从 Step 02 起适用。

---

## 分步执行协议

```
前处理循环（Step 03 → 05）：
  1. 读 processes/{step}.md           ← 仅当前步骤定义
  2. 读该步骤"文件引用"中列出的文件   ← 仅该步需要的方法论/契约
  3. 执行 → 产出文件
  4. 进入下一步

后处理循环（Step 06 → 09）：
  同样遵循：读一步 → 执行一步 → 读下一步
```

## 读取规则引擎

**核心原则**：每步的具体读取需求由该步的 `processes/{step}-xxx.md` 中的"文件引用"部分声明，不在本文档中硬编码。

**执行逻辑**：
1. 读取 `processes/{step}-xxx.md` 的"文件引用"部分
2. 按照该部分列出的文件清单，逐个加载
3. 仅加载"文件引用"中明确指示的文件，不加载其他
4. 如果文件引用未指示某个文件，则禁止加载

**文件类型分类**：
- **🔵 meta 数据文件**（路径约定、信源分级、输出契约）：根据文件引用指示，按需加载对应 §N 节
- **🟢 core 方法论文件**（能力图谱、高地、评估矩阵）：仅在对应步骤的文件引用中加载
- **🟠 plugins 可选增强**：仅在对应步骤的文件引用中加载
- **🔴 processes 执行文件**：严格禁止跨步加载（Step N 不能加载 Step N+1 的文件）

**违规检查清单**：
- ❌ Step N 加载 Step N+1 或更后续的 processes 文件
- ❌ 初始化阶段加载 assets/{step-id}/method.md（应在对应步骤的文件引用中加载）
- ❌ 一次性加载 `assets/{step-id}/schemas.md` 全文（应按 §N 节分段查阅）
- ❌ 子 agent 在 spawn 前预加载后续步骤的 processes 文件

**规则验证**：
每个 processes 文件的"文件引用"部分应遵循以下模板验证：
```
✅ 文件引用包含 assets/ 数据文件引用（如 ref-sources.md、schemas.md§N）
✅ 文件引用包含必要的 assets/{step-id}/method.md 方法论（如 capability-graph.md）
✅ 文件引用包含前序步骤的产出文件
✅ 不包含同层或后续步骤的 processes 文件引用
✅ 不包含未被该步骤使用的 assets 或 plugins 文件
```

**示例**（如何在 processes 文件中声明）：
```markdown
## 文件引用

⛔ 加载：
- `assets/04-capability-graph/method.md`（能力图谱方法论）
- `assets/04-capability-graph/schemas.md`（本步输出格式）
- `{workDir}/.meta/.raw-materials/index.json`（Step 03 产出索引）

> **🔒 上下文隔离**
> - ✅ 允许读取：`assets/common/rule-isolation.md`、`assets/04-capability-graph/method.md`、`assets/04-capability-graph/schemas.md`§2、`{workDir}/.meta/.raw-materials/index.json`（Step 03 产出）
> - ❌ 禁止读取：`processes/02.md`、`processes/04~08.md`、其他 `assets/{step-id}/method.md`、`plugins/*.md`
> - 📌 `schemas.md` 只读 §2 节
```

**维护原则**：
- 如果修改了 Step N 的输入/输出或依赖，**仅更新** `processes/{step}-xxx.md` 的文件引用
- **不需要**同时修改本文档

## schemas.md 分节查阅

`assets/{step-id}/schemas.md` 包含全部步骤的输出示例（§0-§8），**不要一次性全文加载**。
每步执行时只查阅对应的 §N 节。如果文件较长，用 offset/limit 精确读取对应段落。
