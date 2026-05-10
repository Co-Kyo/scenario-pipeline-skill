import { BaseTool, ToolDefinition } from "./base.js";

export class PingTool extends BaseTool {
  readonly name = "ping";
  readonly description = "Check if MCP server is running";

  getInputSchema(): ToolDefinition["inputSchema"] {
    return {
      type: "object",
      properties: {},
    };
  }

  async execute(_args: Record<string, any>): Promise<any> {
    return {
      status: "ok",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    };
  }
}
