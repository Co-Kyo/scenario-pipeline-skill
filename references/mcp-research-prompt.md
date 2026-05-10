# MCP 集成调研 Prompt

## 背景

我们有一个 agent 系统，当前架构如下：

```
SKILL.md          ← 入口（触发方式 + 流程概览 + 导航）
core/             ← 元能力（定义方法论）
plugins/          ← 增强插件（能力扩展）
references/       ← 流程控制
  ├── pre-process.md    ← 前处理编排
  ├── post-process.md   ← 后处理编排
  └── processes/        ← 步骤实现
      ├── pipeline-state.md    ← 状态管理（save/restore）
      ├── capability-research.md  ← 能力研究模板（~100 行）
      ├── assemble.md            ← 命题组装模板
      ├── source-registry.md     ← 信源白名单
      └── ...
```

## 问题

1. **主线程上下文压力大**：模板代码（如 capability-research.md ~100 行）需要在主线程读取后传递给子 agent
2. **状态管理不稳定**：pipeline-state.md 的 save/restore 逻辑由主 agent 实现，容易出错
3. **跨平台兼容性差**：不同平台的工具调用接口不一致
4. **可测试性差**：组件之间耦合度高，难以独立测试

## 目标

将 MCP 集成到现有架构中，实现：

1. **降低主线程上下文压力**：模板代码只在 MCP 服务器内部，主线程不需要读取和传递完整模板
2. **稳定控制管道特性**：MCP 工具提供稳定接口，减少 agent 自由发挥的空间
3. **跨平台兼容**：统一工具调用接口，减少平台差异
4. **可测试性**：MCP 工具可以独立测试，提高代码质量

## 调研方向

### 1. MCP 在 agent 系统中的最佳实践

**问题**：
- MCP 工具如何与 agent 系统集成？
- MCP 工具的设计原则是什么？
- MCP 工具的上下文管理策略是什么？

**参考**：
- MCP 官方文档：https://modelcontextprotocol.io/
- MCP 规范：https://modelcontextprotocol.io/specification
- MCP 工具设计指南：https://modelcontextprotocol.io/docs/concepts/tools

### 2. MCP 工具设计原则

**问题**：
- MCP 工具应该如何命名？
- MCP 工具的参数应该如何设计？
- MCP 工具的返回值应该如何设计？
- MCP 工具的错误处理应该如何设计？

**参考**：
- MCP 工具规范：https://modelcontextprotocol.io/docs/concepts/tools
- MCP 工具最佳实践：https://modelcontextprotocol.io/docs/concepts/tools#best-practices

### 3. MCP 与现有架构的集成方式

**问题**：
- 如何将现有组件迁移到 MCP？
- 如何保持向后兼容？
- 如何处理渐进式迁移？

**参考**：
- MCP 迁移指南：https://modelcontextprotocol.io/docs/concepts/tools#migration
- MCP 版本管理：https://modelcontextprotocol.io/docs/concepts/tools#versioning

### 4. MCP 的上下文管理策略

**问题**：
- MCP 工具如何管理上下文？
- MCP 工具如何降低 agent 的上下文压力？
- MCP 工具如何处理大型模板？

**参考**：
- MCP 上下文管理：https://modelcontextprotocol.io/docs/concepts/tools#context-management
- MCP 模板管理：https://modelcontextprotocol.io/docs/concepts/tools#template-management

## 具体调研问题

### 问题 1：MCP 工具与 agent 系统的集成模式

**场景**：当前架构中，主 agent 读取模板文件（如 capability-research.md），构造 task，发送给子 agent。

**问题**：
- MCP 工具应该如何与这种模式集成？
- 是主 agent 调用 MCP 工具获取模板，还是子 agent 调用 MCP 工具获取模板？
- 如何处理模板中的动态参数（如能力名称、URL 列表）？

### 问题 2：MCP 工具的状态管理

**场景**：当前架构中，pipeline-state.md 定义了 save/restore 逻辑，主 agent 实现文件读写。

**问题**：
- MCP 工具应该如何实现状态管理？
- MCP 工具应该如何处理并发访问？
- MCP 工具应该如何处理错误恢复？

### 问题 3：MCP 工具的信源管理

**场景**：当前架构中，source-registry.md 定义了信源白名单，agent 读取后使用。

**问题**：
- MCP 工具应该如何实现信源管理？
- MCP 工具应该如何处理信源的动态更新？
- MCP 工具应该如何处理信源的验证？

### 问题 4：MCP 工具的工具调用封装

**场景**：当前架构中，agent 直接调用平台工具（如 web_search、web_fetch）。

**问题**：
- MCP 工具应该如何封装这些工具调用？
- MCP 工具应该如何处理跨平台兼容？
- MCP 工具应该如何处理错误重试？

## 预期输出

### 1. MCP 集成方案

- MCP 工具设计规范
- MCP 工具命名规范
- MCP 工具参数设计规范
- MCP 工具返回值设计规范
- MCP 工具错误处理规范

### 2. 架构改造路线图

- 阶段一：MCP 化状态管理（短期）
- 阶段二：MCP 化模板管理（中期）
- 阶段三：MCP 化信源管理（长期）
- 阶段四：完全 MCP 化（未来）

### 3. 具体实现方案

- MCP 工具实现示例
- MCP 工具测试方案
- MCP 工具部署方案
- MCP 工具监控方案

## 参考资源

### MCP 官方文档
- MCP 规范：https://modelcontextprotocol.io/specification
- MCP 工具：https://modelcontextprotocol.io/docs/concepts/tools
- MCP 传输：https://modelcontextprotocol.io/docs/concepts/transports
- MCP 服务器：https://modelcontextprotocol.io/docs/concepts/servers

### MCP 实现示例
- MCP TypeScript SDK：https://github.com/modelcontextprotocol/typescript-sdk
- MCP Python SDK：https://github.com/modelcontextprotocol/python-sdk
- MCP 服务器示例：https://github.com/modelcontextprotocol/servers

### MCP 最佳实践
- MCP 工具设计：https://modelcontextprotocol.io/docs/concepts/tools#best-practices
- MCP 错误处理：https://modelcontextprotocol.io/docs/concepts/tools#error-handling
- MCP 上下文管理：https://modelcontextprotocol.io/docs/concepts/tools#context-management
