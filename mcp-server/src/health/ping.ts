import { BaseTool, ToolDefinition } from "../core/base-tool.js";

export class PingTool extends BaseTool {
  readonly name = "ping";
  readonly description = "Health check tool";

  getInputSchema(): ToolDefinition["inputSchema"] {
    return {
      type: "object",
      properties: {},
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    return {
      status: "ok",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    };
  }
}
