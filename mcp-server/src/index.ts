#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// 按业务域导入工具
import { SaveStateTool, RestoreStateTool } from "./domains/state/index.js";
import { GetTemplateTool } from "./domains/template/index.js";
import { GetSourcesTool } from "./domains/source/index.js";
import { PingTool } from "./health/ping.js";

const server = new Server(
  {
    name: "scenario-pipeline",
    version: "1.0.0",
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
  
  // 信源管理域
  new GetSourcesTool(),
  
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

  try {
    const result = await tool.execute(args || {});
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
