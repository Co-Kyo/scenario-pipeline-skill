# Scenario Pipeline MCP Server

MCP server for scenario-pipeline skill, providing state management and template management tools.

## 功能

- **状态管理**：保存和恢复管线状态
- **模板管理**：获取 agent 任务模板
- **信源管理**：获取信源白名单

## 安装

### 前置条件

- Node.js ≥ 18
- npm 或 yarn

### 构建

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式（监听文件变化）
npm run dev
```

## 使用

### 作为 MCP 服务器启动

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

### ping

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

### save_state

保存管线状态到 `.meta/pipeline-state.json`。

**参数**：
- `checkpoint` (string, 必需)：检查点标识，如 `"pre-process-done"`, `"ⓔ"`, `"ⓓ"`, `"ⓕ"`, `"ⓖ"`
- `context` (object, 必需)：当前阶段的进度数据

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

### restore_state

从 `.meta/pipeline-state.json` 恢复管线状态。

**参数**：无

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

### get_template

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

### get_sources

获取信源白名单（数据已内嵌到 MCP 服务器）。

**参数**：
- `capability_name` (string, 可选)：按能力名称查询相关技术域和 T1/T2 域名
- `tech_domain` (string, 可选)：按技术域查询该域的所有 T1/T2 域名

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

## 开发

### 项目结构

```
mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # 入口文件
│   ├── tools/
│   │   ├── base.ts        # 工具基类
│   │   ├── ping.ts        # 健康检查
│   │   ├── save-state.ts  # 状态保存
│   │   ├── restore-state.ts # 状态恢复
│   │   ├── get-template.ts # 模板获取
│   │   ├── get-sources.ts # 信源获取
│   │   └── source-data.ts # 信源数据
│   └── utils/
│       └── file-io.ts     # 文件读写工具
└── dist/                  # 构建产物
```

### 添加新工具

1. 在 `src/tools/` 目录下创建新文件
2. 继承 `BaseTool` 基类
3. 实现 `name`, `description`, `getInputSchema()`, `execute()` 方法
4. 在 `src/index.ts` 中注册新工具

### 调试

```bash
# 开发模式
npm run dev

# 测试 MCP 连接
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

## 环境变量

- `WORK_DIR`：工作目录路径（默认为当前目录）

## 许可证

MIT
