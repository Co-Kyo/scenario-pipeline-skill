---
name: scenario-pipeline
description: "前端复合工程场景知识管线。两阶段工作流：前处理（扫描→分词→能力提取→高地识别→评估→入池）+ 后处理（能力研究并行→命题组装并行→学习阶梯生成）。触发词：'扫描' / '研究' / 'deep scan' / 'deep research' / 'scenario research' / '面试题' / '技术调研' / '暂停' / '继续' / '恢复' / '接管' / '停'。用于：扫描技术文章提取研究主题、收集面试题、深度研究复合工程场景、构建技术知识库。支持中断恢复和用户接管。"
---

# Scenario Pipeline

## ⛔ 启动自检（每次执行前必须完成）

> 未通过自检就执行管线，会导致工具调用失败和幻觉（误判工具不存在）。

```
自检步骤：
  1. 调用 mcporter call scenario-pipeline.ping 验证 MCP server 可用
  2. 调用 mcporter call scenario-pipeline.get_output_schema params='{"step":"scan"}' 验证 schema 工具可用
  3. 如果任一步骤失败：
     a. 检查 MCP server 是否已构建：cd mcp-server && npm run build
     b. 检查 MCP server 是否已重启（新构建后必须重启进程）
     c. 重启后重新执行自检
  4. 自检全部通过后，开始执行管线
```

**常见故障**：
- `get_template` 返回空 → `tsc` 不复制 `.md` 文件，需手动 `cp -r src/domains/template/templates dist/domains/template/`
- `get_output_schema` 不存在 → MCP server 未用最新代码构建，需 `npm run build` + 重启
- `ping` 超时 → MCP server 进程未启动

---

Two-phase knowledge production pipeline for composite engineering scenarios.

**Pre-processing** = scan → decompose → capability extract → highground identify → evaluate → pool
**Post-processing** = capability research (parallel) → ⓔ → briefing → ⓓ → assembly (parallel) → ⓕ → learning ladder (single-thread) → ⓖ ⛔ 阶段间有显式 barrier + 检查点

## Trigger Patterns

**Pre-processing (scan):**
```
扫描：<信息源描述>
deep scan：<信息源描述>
```

**Post-processing (research):**
```
研究：<场景描述>
deep research：<场景描述>
```

**Parameters:** `--depth=shallow|normal|deep` `--platform=web|miniapp|rn|all` `--no-experiment` `--append` `--batch=pending` `--filter="<条件>"` `--source=<url>` `--digest` `--year=<L1|L2|L3|L4>`

## Setup（首次使用必须完成）

MCP 服务器是管线的数据底座（信源白名单 `get_sources`、状态管理 `save_state`/`restore_state`）。**未初始化时管线以降级模式运行，能力图谱的信源引用和管线状态持久化将缺失。**

### 1. 安装依赖

```bash
# MCP Server 运行时依赖
cd ~/.openclaw/skills/scenario-pipeline/mcp-server && npm install

# OpenClaw 平台：MCPorter CLI（全局安装，仅需一次）
npm install -g mcporter
```

> Claude Code / CodeBuddy / Cursor 不需要 mcporter，跳过全局安装。

### 2. 注册 MCP Server

根据当前平台选择一种方式注册：

| 平台 | 注册方式 |
|------|---------|
| **OpenClaw** | `mcporter add scenario-pipeline --transport stdio --command node --args '["~/.openclaw/skills/scenario-pipeline/mcp-server/dist/index.js"]'` |
| **Claude Code** | 项目根目录 `.mcp.json` 中添加 `mcpServers.scenario-pipeline`（见下方模板） |
| **CodeBuddy** | `.codebuddy/mcp.json` 或全局 `~/.codebuddy/mcp.json`，同上格式 |
| **Cursor** | `.cursor/mcp.json`，同上格式 |

**MCP 配置模板**（Claude Code / CodeBuddy / Cursor 通用）：
```json
{
  "mcpServers": {
    "scenario-pipeline": {
      "command": "node",
      "args": ["~/.openclaw/skills/scenario-pipeline/mcp-server/dist/index.js"]
    }
  }
}
```

### 3. 验证

```bash
# OpenClaw
mcporter call scenario-pipeline.ping   # → pong

# Claude Code：直接调用 MCP 工具 ping

# CodeBuddy/Cursor：IDE MCP 面板查看状态
```

> **如果依赖已安装且 MCP 已注册，以上步骤自动跳过。**

---

## Architecture

```
SKILL.md          ← 入口（触发方式 + 流程概览 + 导航）
core/             ← 元能力（定义方法论）
plugins/          ← 增强插件（能力扩展）
references/       ← 流程编排（参考文档，非执行手册）
  ├── pre-process.md    ← 前处理编排（参考）
  ├── post-process.md   ← 后处理编排（参考）
  └── processes/        ← 步骤说明（参考文档，L2 改造后降级）
mcp-server/       ← MCP 服务器（状态管理 + 模板管理 + 信源管理）
  ├── src/tools/                  ← 工具实现
  ├── src/domains/template/templates/  ← 执行指令模板（SSoT，*.md）
  │   ├── capability-research.md
  │   ├── briefing-assemble.md
  │   ├── assemble.md
  │   ├── learning-ladder.md
  │   └── ...
  └── dist/                       ← 构建产物
```

### L2 架构改造说明

> **执行指令的 SSoT 已从 `references/processes/*.md` 迁移到 `mcp-server/src/domains/template/templates/*.md`。**
>
> - **MCP templates**（`*.md` in `mcp-server/src/domains/template/templates/`）：执行指令的唯一事实来源
> - **references/processes/*.md**：降级为参考文档，仅供人类阅读理解流程
> - **执行流程**：主 agent 调用 `get_template` → MCP 返回完整指令 → 子 agent 执行
> - **子 agent 只写不读**：无需读取任何 process 文档，所有指令由 MCP 模板提供

### Core — 元能力

定义"什么是 X"以及"如何评判 X"。

- **Architecture Decomposition** — 架构分词：[core/architecture-decomposition.md](core/architecture-decomposition.md)
- **Capability Graph** — 原子能力图谱：[core/capability-graph.md](core/capability-graph.md)
- **Strategic Highground** — 战略高地识别：[core/strategic-highground.md](core/strategic-highground.md)
- **Scenario Framework** — 四维评估矩阵：[core/scenario-matrix.md](core/scenario-matrix.md)

### Plugins — 增强插件

对 core 能力的增强/扩展/配置化。

- **Year-Granularity** — 经验年限与命题颗粒度匹配：[plugins/year-granularity.md](plugins/year-granularity.md)
- **Capability Research Mode** — 材料块标准格式 + 研究深度分级：[plugins/capability-research-mode.md](plugins/capability-research-mode.md)
- **Source Registry** — 信源质量白名单 + 域名映射（已集成到 MCP `get_sources` 工具）

### References — 流程控制

编排文件定义步骤顺序（参考文档），实际执行指令由 MCP templates 提供。

- **Pre-process** — 前处理编排：[references/pre-process.md](references/pre-process.md)
- **Post-process** — 后处理编排：[references/post-process.md](references/post-process.md)
- **Processes/** — 步骤说明（参考文档，L2 后降级）：
  - [scan.md](references/processes/scan.md) — 广域扫描
  - [decompose.md](references/processes/decompose.md) — 架构分词
  - [capability-extract.md](references/processes/capability-extract.md) — 原子能力提取
  - [highground-identify.md](references/processes/highground-identify.md) — 战略高地识别
  - [evaluate.md](references/processes/evaluate.md) — 四维评估
  - [capability-research.md](references/archive/capability-research.md) — 能力研究
  - [briefing-assemble.md](references/archive/briefing-assemble.md) — Briefing 组装
  - [assemble.md](references/archive/assemble.md) — 材料块组装
  - [learning-ladder.md](references/archive/learning-ladder.md) — 学习阶梯生成

## Pre-processing Flow

1. **Scan** — 调用 MCP template `get_template("scan")`
2. **ⓒ 检查点 A** — 扫描摘要确认
3. **Decompose** — 调用 MCP template `get_template("decompose")`
4. **Capability Extract** — 调用 MCP template `get_template("capability-extract")`
5. **Highground Identify** — 调用 MCP template `get_template("highground-identify")`
6. **Evaluate** — 调用 MCP template `get_template("evaluate")`
7. **ⓒ 检查点 B** — 评估结果确认
8. **Pool** — 写入候选池

## Post-processing Flow

> ⛔ **三阶段必须顺序执行，有显式 barrier。详见 [post-process.md](references/post-process.md) §执行协议。**
> 每个阶段产物节点有检查点（ⓔⓓⓕⓖ）主动暂停，等待用户审查确认后才放行。

**阶段一：能力研究 + Briefing 组装（两步骤）**
- 步骤1：并行调用 MCP template `get_template("capability-research")`
- **⛔ ⓔ 检查点 E（能力研究审查）**
- 步骤2：并行调用 MCP template `get_template("briefing-assemble")`
- **⛔ ⓓ 检查点 D（Briefing 预审 - 阶段一完成）**

**阶段二：命题组装（并行）**
- 并行调用 MCP template `get_template("assemble")`（每agent 1个命题：Markdown组装 + 实验组装）
- **⛔ ⓕ 检查点 F（命题组装审查）**

**阶段三：学习阶梯生成**
- 并行调用 MCP template `get_template("learning-ladder")`
- **⛔ ⓖ 检查点 G（全局收尾确认）**

## Output Structure

> **路径规范**：以下为参考目录结构。实际产出路径以 MCP `resolve_paths` 工具返回为准，运行时请调用 `resolve_paths` 获取标准路径（参见 `pipeline/architecture-model.md` §5 MCP ↔ Skill 双侧改造原则）。文档中 `{{paths.xxx}}` 表示路径字段引用。

```
{{paths.workDir}}/                     ← 根目录，由调用方传入
│
├── README.md                          ← {{paths.readme}}：总览导航（研究范围 + 命题索引 + 学习路径摘要）
├── learning-ladder.md                 ← {{paths.learning_ladder}}：全局学习阶梯（跨命题的渐进式引导路径）
│
├── {{seq}}-{{short_name}}/            ← {{paths.proposition_dir}}：命题研究（用户的主要交付物）
│   ├── overview.md                    # {{paths.proposition_overview}}：Q1 链路编排
│   ├── edge-cases.md                  # {{paths.proposition_edge_cases}}：Q2 坑点提取
│   ├── trade-offs.md                  # {{paths.proposition_trade_offs}}：Q3 方案对比
│   ├── experiment/                    # {{paths.proposition_experiment}}：Q4 实验组装
│   │   ├── README.md
│   │   └── src/
│   ├── references.md                  # {{paths.proposition_references}}：参考资料
│   └── learning-ladder.md             # {{paths.proposition_learning_ladder}}：学习阶梯（阶段三产出，渐进式引导）
│
├── 02-首屏白屏/
│   └── ...
│
├── 03-内存泄漏/
│   └── ...
│
├── capabilities/                      ← 原子能力知识库（跨命题复用的参考手册）
│   ├── README.md                      # {{paths.capabilities_readme}}：能力索引 + 依赖图 + 学习路径
│   ├── {{capability_id}}-{{capability_name}}.md  # {{paths.capability_file}}
│   └── ...
│
└── .meta/                             ← 内部数据（pipeline 工具用）
    ├── capability-graph.json          # {{paths.meta_capability_graph}}：结构化图谱
    ├── candidates.md                  # {{paths.meta_candidates}}：原始候选池记录
    ├── decompositions.json            # {{paths.meta_decompositions}}：命题分解记录
    ├── evaluations.json               # {{paths.meta_evaluations}}：评估结果记录
    ├── summaries/                     # {{paths.meta_summaries_dir}}：结构化摘要（阶段一双写）
    │   ├── {{capability_id}}-{{capability_name}}.json  # {{paths.capability_summary}}
    │   └── ...
    ├── briefings/                     # {{paths.meta_briefings_dir}}：组装 Briefing（阶段二消费）
    │   ├── {{seq}}-{{short_name}}.md  # {{paths.briefing}}
    │   └── ...
    └── pipeline-state.json            # {{paths.meta_pipeline_state}}：管线状态文件
```

### 四层用户价值

| 层 | 目录 | 用户价值 | 使用场景 |
|----|------|---------|---------|
| 学习阶梯 | `{{paths.proposition_learning_ladder}}` | 渐进式引导，从不会到会 | 系统学习一个命题，跟着阶梯走 |
| 命题研究 | `{{paths.proposition_dir}}/` | 面试场景的深度答案 | 面试前针对特定命题速查 |
| 能力知识库 | `{{paths.capability_file}}` | 跨命题的原子能力参考 | 系统性学习某个技术点 |
| 学习路径 | `{{paths.capabilities_readme}}` | 战略性修炼地图 | 规划学习优先级 |

---

## MCP 依赖

本 skill 依赖 MCP 服务器提供状态管理和模板管理功能。

### 安装

**方式 1：使用安装脚本（推荐）**

```bash
# 克隆仓库（含 submodule）
git clone --recurse-submodules https://github.com/Co-Kyo/scenario-pipeline-skill.git

# 运行安装脚本
cd scenario-pipeline-skill
chmod +x install.sh  # Linux/Mac
./install.sh          # Linux/Mac
# 或
.\install.bat         # Windows (PowerShell)
```

**方式 2：手动安装**

```bash
# 克隆仓库（含 submodule）
git clone --recurse-submodules https://github.com/Co-Kyo/scenario-pipeline-skill.git

# 构建 MCP 服务器
cd scenario-pipeline-skill/mcp-server
npm install
npm run build
```

### 配置 OpenClaw

编辑 `~/.openclaw/openclaw.json`，添加：

```json
{
  "tools": {
    "mcp": [
      {
        "type": "stdio",
        "command": "node",
        "args": ["/path/to/scenario-pipeline-skill/mcp-server/dist/index.js"]
      }
    ]
  }
}
```

### 验证安装

重启 OpenClaw Gateway 后，在对话中输入 `ping` 测试连接。

### MCP 调用约定

所有 MCP 工具通过 `mcporter call` 调用：

```bash
mcporter call scenario-pipeline.<tool> [params] --args '{"workDir":"<产出目录>"}'
```

**参数说明**：
- `workDir`：管线产出目录（`save_state`/`restore_state` 必须传入，确保状态文件与产出同目录）
- `get_template`/`get_sources`/`ping`：无需额外目录参数
- `resolve_paths`：获取标准化路径，返回 `PathTemplates` 对象（所有路径字段的 SSoT）

**典型用法**：
```bash
# 获取标准化路径（推荐：每个步骤开始前调用，获取当前任务的所有路径）
mcporter call scenario-pipeline.resolve_paths params='{"task_type":"capability-research","workDir":"workflow/research","capability_id":"A1","capability_name":"渲染管线"}'

# 写状态
mcporter call scenario-pipeline.save_state checkpoint="ⓔ" context='{"capability-research":{"total":10,"completed":["A1"]}}' --args '{"workDir":"workflow/research"}'

# 恢复状态
mcporter call scenario-pipeline.restore_state --args '{"workDir":"workflow/research"}'

# 获取模板（路径已由 resolve_paths 确定，模板中通过 {{paths.xxx}} 引用）
mcporter call scenario-pipeline.get_template template_type="capability-research" params='{"capability_name":"渲染管线","capability_id":"A1","urls":["https://developer.mozilla.org"]}'

# 读信源配置（按能力名称查询）
mcporter call scenario-pipeline.get_sources params='{"capability_name":"浏览器渲染管线"}'

# 读信源配置（按技术域查询）
mcporter call scenario-pipeline.get_sources params='{"tech_domain":"browser_api"}'
```

### MCP 工具列表

| 工具 | 说明 | 关键参数 |
|------|------|----------|
| `ping` | 健康检查 | — |
| `save_state` | 保存管线状态 | `workDir`（产出目录） |
| `restore_state` | 恢复管线状态 | `workDir`（产出目录） |
| `get_template` | 获取 agent 任务模板 | `template_type`, `params` |
| **`resolve_paths`** | **解析标准化路径（SSoT）** | `task_type`, `workDir`, `seq`, `short_name` 等 |
| `get_sources` | 获取信源白名单 | —（支持按 capability_name 或 tech_domain 查询） |

### 启动检查

skill 启动时会自动检查 MCP 服务器状态：
- 如果未运行 → 提示用户安装
- 如果已运行 → 直接使用
