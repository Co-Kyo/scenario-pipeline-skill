import { BaseTool, ToolDefinition } from "../../core/base-tool.js";
import * as fs from "fs/promises";
import * as path from "path";

export class SaveStateTool extends BaseTool {
  readonly name = "save_state";
  readonly description = "Save pipeline state to .meta/pipeline-state.json";

  getInputSchema(): ToolDefinition["inputSchema"] {
    return {
      type: "object",
      properties: {
        checkpoint: {
          type: "string",
          description:
            'Checkpoint identifier, e.g., "pre-process-done", "ⓔ", "ⓓ", "ⓕ", "ⓖ"',
        },
        context: {
          type: "object",
          description: "Stage progress data, structure varies by stage",
        },
        workDir: {
          type: "string",
          description:
            "Working directory for state file. Overrides WORK_DIR env var.",
        },
      },
      required: ["checkpoint", "context"],
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const { checkpoint, context, workDir: workDirArg } = args;

    const workDir = workDirArg || process.env.WORK_DIR || process.cwd();
    const stateFilePath = path.join(workDir, ".meta", "pipeline-state.json");

    // 确保 .meta 目录存在
    const metaDir = path.dirname(stateFilePath);
    await fs.mkdir(metaDir, { recursive: true });

    // 读取现有状态（如果存在）
    let state: any = {
      pipeline_version: "1.0",
      started_at: new Date().toISOString(),
      last_update: new Date().toISOString(),
      status: "running",
      stages: {},
      checkpoints_passed: [],
      last_checkpoint: null,
    };

    try {
      const existingState = await fs.readFile(stateFilePath, "utf-8");
      state = JSON.parse(existingState);
    } catch (error) {}

    // 更新状态
    state.last_update = new Date().toISOString();
    state.last_checkpoint = checkpoint;

    // 根据 checkpoint 更新对应的 stage
    switch (checkpoint) {
      case "pre-process-done":
        state.stages["pre-process"] = context.stages?.["pre-process"] || {
          status: "completed",
          completed_at: new Date().toISOString(),
        };
        break;
      case "ⓔ":
        state.stages["capability-research"] =
          context["capability-research"] || {};
        break;
      case "ⓓ":
        state.stages["briefing-assemble"] =
          context["briefing-assemble"] || {};
        break;
      case "ⓕ":
        state.stages["assembly"] = context["assembly"] || {};
        break;
      case "ⓖ":
        state.stages["learning-ladder"] = context["learning-ladder"] || {};
        state.status = "completed";
        break;
      case "agent-done":
        // 增量更新 agent 完成状态
        if (context.stage && context.agent_id) {
          const stage = state.stages[context.stage];
          if (stage) {
            if (!stage.completed) stage.completed = [];
            if (!stage.failed) stage.failed = [];
            if (context.status === "completed") {
              stage.completed.push(context.agent_id);
            } else if (context.status === "failed") {
              stage.failed.push(context.agent_id);
            }
          }
        }
        break;
    }

    // 记录已通过的检查点
    if (
      !state.checkpoints_passed.includes(checkpoint) &&
      checkpoint !== "agent-done"
    ) {
      state.checkpoints_passed.push(checkpoint);
    }

    // 写入文件
    await fs.writeFile(stateFilePath, JSON.stringify(state, null, 2), "utf-8");

    return {
      success: true,
      checkpoint,
      state_file: stateFilePath,
    };
  }
}
