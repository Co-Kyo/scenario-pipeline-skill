import { BaseTool, ToolDefinition } from "../../core/base-tool.js";
import { resolvePaths } from "./path-config.js";

export class ResolvePathsTool extends BaseTool {
  readonly name = "resolve_paths";
  readonly description =
    "Resolve standardized output paths for a given task type and parameters";

  getInputSchema(): ToolDefinition["inputSchema"] {
    return {
      type: "object",
      properties: {
        task_type: {
          type: "string",
          description:
            'Task type: "capability-research", "assemble", "briefing-assemble", "learning-ladder"',
          enum: [
            "capability-research",
            "assemble",
            "briefing-assemble",
            "learning-ladder",
          ],
        },
        workDir: {
          type: "string",
          description: "Pipeline output root directory (absolute path)",
        },
        seq: {
          type: "string",
          description: "Proposition sequence number, e.g. '01', '02'",
        },
        short_name: {
          type: "string",
          description:
            "Proposition short name in Chinese, e.g. '长列表渲染'",
        },
        capability_id: {
          type: "string",
          description: "Capability ID, e.g. 'A1'",
        },
        capability_name: {
          type: "string",
          description:
            "Capability name in Chinese, e.g. '浏览器渲染管线'",
        },
      },
      required: ["task_type", "workDir"],
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const { task_type, workDir, seq, short_name, capability_id, capability_name } = args;

    if (!workDir) {
      return {
        error: "Missing required parameter: workDir",
      };
    }

    const paths = resolvePaths(task_type, {
      workDir,
      seq,
      short_name,
      capability_id,
      capability_name,
    });

    return {
      task_type,
      params: { workDir, seq, short_name, capability_id, capability_name },
      paths,
    };
  }
}
