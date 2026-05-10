import { Tool } from "@modelcontextprotocol/sdk/types.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export abstract class BaseTool {
  abstract readonly name: string;
  abstract readonly description: string;

  getDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.getInputSchema(),
    };
  }

  abstract getInputSchema(): ToolDefinition["inputSchema"];
  abstract execute(args: Record<string, any>): Promise<any>;
}
