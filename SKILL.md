---
name: scenario-pipeline
description: "前端复合工程场景知识管线。两阶段工作流：前处理（扫描→分词→能力提取→高地识别→评估→入池）+ 后处理（能力研究并行→命题组装并行→学习阶梯生成）。触发词：'扫描' / '研究' / 'deep scan' / 'deep research' / 'scenario research' / '面试题' / '技术调研' / '暂停' / '继续' / '恢复' / '接管' / '停'。用于：扫描技术文章提取研究主题、收集面试题、深度研究复合工程场景、构建技术知识库。支持中断恢复和用户接管。"
---

# Scenario Pipeline

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

## Architecture

```
SKILL.md          ← 入口（触发方式 + 流程概览 + 导航）
core/             ← 元能力（定义方法论）
plugins/          ← 增强插件（能力扩展）
references/       ← 流程控制
  ├── pre-process.md    ← 前处理编排
  ├── post-process.md   ← 后处理编排
  └── processes/        ← 步骤实现
      ├── scan.md
      ├── decompose.md
      ├── capability-extract.md
      ├── highground-identify.md
      ├── evaluate.md
      ├── capability-research.md
      ├── briefing-assemble.md
      ├── assemble.md
      └── learning-ladder.md
mcp-server/       ← MCP 服务器（状态管理 + 模板管理 + 信源管理）
  ├── src/tools/        ← 工具实现
  └── dist/             ← 构建产物
```

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

编排文件定义步骤顺序，processes/ 定义步骤实现。

- **Pre-process** — 前处理编排：[references/pre-process.md](references/pre-process.md)
- **Post-process** — 后处理编排：[references/post-process.md](references/post-process.md)
- **Processes/** — 步骤实现：
  - [scan.md](references/processes/scan.md) — 广域扫描
  - [decompose.md](references/processes/decompose.md) — 架构分词
  - [capability-extract.md](references/processes/capability-extract.md) — 原子能力提取
  - [highground-identify.md](references/processes/highground-identify.md) — 战略高地识别
  - [evaluate.md](references/processes/evaluate.md) — 四维评估
  - [capability-research.md](references/processes/capability-research.md) — 能力研究
  - [briefing-assemble.md](references/processes/briefing-assemble.md) — Briefing 组装
  - [assemble.md](references/processes/assemble.md) — 材料块组装
  - [learning-ladder.md](references/processes/learning-ladder.md) — 学习阶梯生成

## Pre-processing Flow

1. **Scan** — 调用 [processes/scan.md](references/processes/scan.md)
2. **ⓒ 检查点 A** — 扫描摘要确认
3. **Decompose** — 调用 [processes/decompose.md](references/processes/decompose.md)
4. **Capability Extract** — 调用 [processes/capability-extract.md](references/processes/capability-extract.md)
5. **Highground Identify** — 调用 [processes/highground-identify.md](references/processes/highground-identify.md)
6. **Evaluate** — 调用 [processes/evaluate.md](references/processes/evaluate.md)
7. **ⓒ 检查点 B** — 评估结果确认
8. **Pool** — 写入候选池

## Post-processing Flow

> ⛔ **三阶段必须顺序执行，有显式 barrier。详见 [post-process.md](references/post-process.md) §执行协议。**
> 每个阶段产物节点有检查点（ⓔⓓⓕⓖ）主动暂停，等待用户审查确认后才放行。

**阶段一：能力研究 + Briefing 组装（两步骤）**
- 步骤1：并行调用 [processes/capability-research.md](references/processes/capability-research.md)
- **⛔ ⓔ 检查点 E（能力研究审查）**
- 步骤2：并行调用 [processes/briefing-assemble.md](references/processes/briefing-assemble.md)
- **⛔ ⓓ 检查点 D（Briefing 预审 - 阶段一完成）**

**阶段二：命题组装（并行）**
- 并行调用 [processes/assemble.md](references/processes/assemble.md)（每agent 1个命题：Markdown组装 + 实验组装）
- **⛔ ⓕ 检查点 F（命题组装审查）**

**阶段三：学习阶梯生成**
- 并行生成 `learning-ladder.md`
- **⛔ ⓖ 检查点 G（全局收尾确认）**

## Output Structure

```
workflow/research/
│
├── README.md                          ← 总览导航（研究范围 + 命题索引 + 学习路径摘要）
├── learning-ladder.md                 ← 全局学习阶梯（跨命题的渐进式引导路径）
│
├── 01-长列表渲染/                      ← 命题研究（用户的主要交付物）
│   ├── overview.md                    # Q1: 链路编排
│   ├── edge-cases.md                  # Q2: 坑点提取
│   ├── trade-offs.md                  # Q3: 方案对比
│   ├── experiment/                    # Q4: 实验组装
│   │   ├── README.md
│   │   └── src/
│   ├── references.md                  # 参考资料
│   └── learning-ladder.md             # 学习阶梯（阶段三产出，渐进式引导）
│
├── 02-首屏白屏/
│   └── ...
│
├── 03-内存泄漏/
│   └── ...
│
├── capabilities/                      ← 原子能力知识库（跨命题复用的参考手册）
│   ├── README.md                      # 能力索引 + 依赖图 + 学习路径
│   ├── A1-浏览器渲染管线.md
│   ├── A2-DOM节点生命周期.md
│   └── ...
│
└── .meta/                             ← 内部数据（pipeline 工具用）
    ├── capability-graph.json          # 结构化图谱（供后处理 agent 读取）
    ├── candidates.md                  # 原始候选池记录
    ├── decompositions.json            # 命题分解记录（前处理 decompose 步骤产出）
    ├── evaluations.json               # 评估结果记录（前处理 evaluate 步骤产出）
    ├── summaries/                     # 结构化摘要（阶段一双写，Briefing 组装时消费）
    │   ├── A1-浏览器渲染管线.json
    │   ├── A2-DOM节点生命周期.json
    │   └── ...
    └── briefings/                     # 组装 Briefing（中间步骤生成，阶段二消费）
        ├── 01-长列表渲染.md
        ├── 02-首屏白屏.md
        └── ...
```

### 四层用户价值

| 层 | 目录 | 用户价值 | 使用场景 |
|----|------|---------|---------|
| 学习阶梯 | `<序号>-<命题简称>/learning-ladder.md` | 渐进式引导，从不会到会 | 系统学习一个命题，跟着阶梯走 |
| 命题研究 | `<序号>-<命题简称>/` | 面试场景的深度答案 | 面试前针对特定命题速查 |
| 能力知识库 | `capabilities/` | 跨命题的原子能力参考 | 系统性学习某个技术点 |
| 学习路径 | `capabilities/README.md` | 战略性修炼地图 | 规划学习优先级 |

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

**典型用法**：
```bash
# 写状态
mcporter call scenario-pipeline.save_state checkpoint="ⓔ" context='{"capability-research":{"total":10,"completed":["A1"]}}' --args '{"workDir":"workflow/research"}'

# 恢复状态
mcporter call scenario-pipeline.restore_state --args '{"workDir":"workflow/research"}'

# 获取模板
mcporter call scenario-pipeline.get_template template_type="capability-research" params='{"capability_name":"渲染管线","capability_id":"A1","urls":["https://developer.mozilla.org"]}'

# 读信源配置（按能力名称查询）
mcporter call scenario-pipeline.get_sources params='{"capability_name":"浏览器渲染管线"}'

# 读信源配置（按技术域查询）
mcporter call scenario-pipeline.get_sources params='{"tech_domain":"browser_api"}'
```

### MCP 工具列表

| 工具 | 说明 |
|------|------|
| `ping` | 健康检查 | — |
| `save_state` | 保存管线状态 | `workDir`（产出目录） |
| `restore_state` | 恢复管线状态 | `workDir`（产出目录） |
| `get_template` | 获取 agent 任务模板 | —（模板内嵌） |
| `get_sources` | 获取信源白名单 | —（数据内嵌，支持按 capability_name 或 tech_domain 查询） |

### 启动检查

skill 启动时会自动检查 MCP 服务器状态：
- 如果未运行 → 提示用户安装
- 如果已运行 → 直接使用
