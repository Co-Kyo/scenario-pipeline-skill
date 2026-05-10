# Scenario Pipeline MCP Server

> 对 skill 特定工作域的加速解决方案，不涉及管道定义。

## 核心价值

MCP 服务器是 scenario-pipeline skill 的**加速层**，专注于解决特定工作域中的性能瓶颈和上下文压力问题。它不参与管道流程定义（管道定义在 `references/` 中），而是为管道执行提供三类关键支撑：

### 1. 状态持久化：中断恢复的基石

**问题场景**：大型技术调研任务（如 20+ 能力点）需要跨会话执行，中断后无法恢复进度。

**解决方案**：通过 `save_state` / `restore_state` 实现检查点机制，支持：
- 精确到能力点的进度跟踪（`completed`, `failed`, `retried`）
- 智能恢复点计算（从最后一个成功检查点继续）
- 中断类型识别（用户中断、错误中断、超时中断）

### 2. 子 agent 上下文：主 agent 压力释放

**问题场景**：主 agent 需要为每个子 agent 准备任务模板，占用大量上下文窗口。

**解决方案**：`get_template` 让子 agent 直接从 MCP 获取模板，实现：
- 主 agent 专注流程控制，不参与模板准备
- 子 agent 独立获取完整任务描述
- 上下文压力从 O(n) 降至 O(1)

### 3. 信源管理：质量与可维护性保障

**问题场景**：硬编码的信源白名单难以维护，容易出现版本混乱。

**解决方案**：`get_sources` 提供统一信源管理，支持：
- 按能力名称查询相关技术域和 T1/T2 域名
- 按技术域查询该域的所有信源
- 黑名单机制过滤低质量信源

## 快速开始

### 安装

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式（监听文件变化）
npm run dev
```

### 启动

```bash
# 直接启动
npm start

# 或
node dist/index.js
```

### 配置 OpenClaw

在 `~/.openclaw/openclaw.json` 中添加：

```json
{
  "tools": {
    "mcp": [
      {
        "type": "stdio",
        "command": "node",
        "args": ["/path/to/mcp-server/dist/index.js"]
      }
    ]
  }
}
```

## 工具列表

### 状态管理域 (state)

#### save_state

保存管线状态到 `.meta/pipeline-state.json`。

**参数**：
- `checkpoint` (string, 必需)：检查点标识，如 `"pre-process-done"`, `"ⓔ"`, `"ⓓ"`, `"ⓕ"`, `"ⓖ"`
- `context` (object, 必需)：当前阶段的进度数据
- `workDir` (string, 可选)：工作目录路径

**示例**：
```json
{
  "checkpoint": "ⓔ",
  "context": {
    "capability-research": {
      "total": 20,
      "completed": ["A1", "A6", "A8"],
      "failed": ["A19"],
      "retried": {"A19": 1}
    }
  }
}
```

#### restore_state

从 `.meta/pipeline-state.json` 恢复管线状态。

**参数**：
- `workDir` (string, 可选)：工作目录路径

**返回**：
```json
{
  "status": "running",
  "resume_from": "阶段一步骤1",
  "current_stage": "capability-research",
  "completed_items": ["A1", "A6", "A8"],
  "pending_items": ["A2", "A3", "A7"],
  "failed_items": ["A19"],
  "interrupt_type": "checkpoint",
  "last_update": "2026-05-10T09:30:00.000Z"
}
```

### 模板管理域 (template)

#### get_template

获取 agent 任务模板。

**参数**：
- `template_type` (string, 必需)：模板类型，可选值：
  - `"capability-research"`
  - `"assemble"`
  - `"briefing-assemble"`
  - `"learning-ladder"`
- `params` (object, 可选)：模板参数

**示例**：
```json
{
  "template_type": "capability-research",
  "params": {
    "capability_id": "A1",
    "capability_name": "浏览器渲染管线",
    "urls": [
      {"url": "https://developer.mozilla.org/...", "title": "MDN Web Docs"}
    ]
  }
}
```

### 信源管理域 (source)

#### get_sources

获取信源白名单（数据已内嵌到 MCP 服务器）。

**参数**：
- `capability_name` (string, 可选)：按能力名称查询相关技术域和 T1/T2 域名
- `tech_domain` (string, 可选)：按技术域查询该域的所有 T1/T2 域名
- `include_blacklist` (boolean, 可选)：是否包含黑名单，默认 true

**返回**：
```json
{
  "tech_domains": ["browser_api", "chrome_v8"],
  "t1_domains": [
    {"domain": "developer.mozilla.org", "name": "MDN Web Docs"},
    {"domain": "w3c.github.io", "name": "W3C 规范"}
  ],
  "t2_domains": [
    {"domain": "web.dev", "name": "Google Web 技术博客"}
  ],
  "blacklist": []
}
```

### 健康检查 (health)

#### ping

健康检查工具。

**参数**：无

**返回**：
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-05-10T09:30:00.000Z"
}
```

## 开发指南

### 项目结构

```
mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # 入口文件（注册所有工具）
│   ├── domains/                    # 业务领域模块
│   │   ├── state/                  # 状态管理域
│   │   │   ├── index.ts
│   │   │   ├── save-state.ts
│   │   │   └── restore-state.ts
│   │   ├── template/               # 模板管理域
│   │   │   ├── index.ts
│   │   │   └── get-template.ts
│   │   └── source/                 # 信源管理域
│   │       ├── index.ts
│   │       ├── get-sources.ts
│   │       ├── registry.ts
│   │       └── types.ts
│   ├── core/                       # 核心基础设施
│   │   └── base-tool.ts            # 工具基类
│   └── health/                     # 健康检查
│       └── ping.ts
└── dist/                           # 构建产物
```

### 添加新工具

1. 确定工具所属的业务域（state/template/source/health）
2. 在对应域目录下创建新文件
3. 继承 `BaseTool` 基类
4. 实现 `name`, `description`, `getInputSchema()`, `execute()` 方法
5. 在域的 `index.ts` 中导出
6. 在 `src/index.ts` 中注册

### 调试

```bash
# 开发模式
npm run dev

# 测试 MCP 连接
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

## 愿景与价值观

### 设计哲学

1. **专注加速，不越界**：MCP 服务器只做加速层该做的事，不参与管道定义或流程控制
2. **领域驱动，模块清晰**：按业务域组织代码，每个域职责单一，边界清晰
3. **渐进增强，按需扩展**：从核心问题出发，逐步扩展能力，避免过度设计
4. **务实优先，价值导向**：每个功能都必须解决实际问题，带来可衡量的收益

### 发展方向

#### 短期（v1.x）

- **性能优化**：模板缓存机制，减少重复加载
- **错误处理**：更细粒度的错误分类和恢复策略
- **监控指标**：添加使用统计，量化加速效果

#### 中期（v2.x）

- **多模板支持**：支持自定义模板注入，扩展使用场景
- **信源动态更新**：支持从远程源更新信源数据，保持时效性
- **状态压缩**：大型任务的状态数据压缩，减少存储开销

#### 长期（v3.x）

- **智能恢复**：基于历史数据预测最佳恢复点
- **上下文感知**：根据任务复杂度动态调整模板内容
- **生态扩展**：支持第三方插件扩展 MCP 能力

### 价值衡量

| 指标 | 衡量方式 | 目标值 |
|------|----------|--------|
| 上下文压力减少 | 主 agent token 使用量下降比例 | ≥ 60% |
| 中断恢复成功率 | 从中断点成功恢复的任务比例 | ≥ 95% |
| 信源质量提升 | 使用 MCP 信源后搜索成功率提升 | ≥ 30% |

## 环境变量

- `WORK_DIR`：工作目录路径（默认为当前目录）

## 许可证

MIT
