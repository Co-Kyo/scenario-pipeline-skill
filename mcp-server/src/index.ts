#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// 按业务域导入工具
import { SaveStateTool, RestoreStateTool } from "./domains/state/index.js";
import { GetTemplateTool, ResolvePathsTool } from "./domains/template/index.js";
import { ClassifySourcesTool, RegisterSourceTool, GetSourceStandardTool, GetT0SourcesTool } from "./domains/source/index.js";
import { GetSummarySchemaTool, SubmitSummaryTool } from "./domains/summary/index.js";
import { GetOutputSchemaTool, SubmitOutputTool } from "./domains/output/index.js";
import { PingTool } from "./health/ping.js";
import { callLogger } from "./core/call-logger.js";

const server = new Server(
  {
    name: "scenario-pipeline",
    version: "1.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 注册所有工具（按业务域分组）
const tools = [
  // 状态管理域
  new SaveStateTool(),
  new RestoreStateTool(),
  
  // 模板管理域
  new GetTemplateTool(),
  new ResolvePathsTool(),
  
  // 信源管理域（动态 filter）
  new GetSourceStandardTool(),
  new GetT0SourcesTool(),
  new ClassifySourcesTool(),
  new RegisterSourceTool(),

  // 摘要管理域（schema 强制闭环）
  new GetSummarySchemaTool(),
  new SubmitSummaryTool(),

  // 输出管理域（泛化 schema 驱动）
  new GetOutputSchemaTool(),
  new SubmitOutputTool(),

  // 健康检查
  new PingTool(),
];

// 列出所有工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((tool) => tool.getDefinition()),
  };
});

// 调用工具
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  const startMs = Date.now();

  try {
    const result = await tool.execute(args || {});
    const latencyMs = Date.now() - startMs;

    // 埋点：记录调用日志
    await callLogger.log(name, args || {}, "ok", latencyMs);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const latencyMs = Date.now() - startMs;

    // 埋点：记录失败日志
    await callLogger.log(name, args || {}, "error", latencyMs, errorMessage);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Scenario Pipeline MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
