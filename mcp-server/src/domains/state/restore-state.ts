import { BaseTool, ToolDefinition } from "../../core/base-tool.js";
import * as fs from "fs/promises";
import * as path from "path";

export class RestoreStateTool extends BaseTool {
  readonly name = "restore_state";
  readonly description = "Restore pipeline state from .meta/pipeline-state.json";

  getInputSchema(): ToolDefinition["inputSchema"] {
    return {
      type: "object",
      properties: {
        workDir: {
          type: "string",
          description:
            "Working directory for state file. Overrides WORK_DIR env var.",
        },
      },
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const { workDir: workDirArg } = args;

    const workDir = workDirArg || process.env.WORK_DIR || process.cwd();
    const stateFilePath = path.join(workDir, ".meta", "pipeline-state.json");

    try {
      const stateContent = await fs.readFile(stateFilePath, "utf-8");
      const state = JSON.parse(stateContent);

      // 分析状态，确定恢复点
      const result: Record<string, any> = {
        status: state.status,
        last_update: state.last_update,
        interrupt_type: state.interrupt_type || "checkpoint",
        checkpoints_passed: state.checkpoints_passed || [],
        last_checkpoint: state.last_checkpoint,
      };

      // 根据状态确定恢复点
      if (state.status === "completed") {
        result.resume_from = "completed";
        result.message = "Pipeline already completed";
      } else if (state.status === "interrupted") {
        // 找到最后完成的阶段
        const stages = state.stages || {};
        const completedStages = Object.entries(stages)
          .filter(([_, stage]: [string, any]) => stage.status === "completed")
          .map(([name]) => name);

        if (completedStages.length > 0) {
          const lastCompleted = completedStages[completedStages.length - 1];
          result.resume_from = getNextStage(lastCompleted);
          result.current_stage = result.resume_from;
        }

        // 收集完成和待处理的项目
        const capabilityResearch = stages["capability-research"];
        if (capabilityResearch) {
          result.completed_items = capabilityResearch.completed || [];
          result.pending_items = capabilityResearch.pending || [];
          result.failed_items = capabilityResearch.failed || [];
        }
      } else {
        // running 状态
        result.resume_from = state.last_checkpoint || "init";
        result.current_stage = getCurrentStage(state.last_checkpoint);
      }

      return result;
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        return {
          status: "no_state",
          message: "No pipeline state file found",
          resume_from: "start",
        };
      }
      throw error;
    }
  }
}

/**
 * 根据最后完成的阶段获取下一个阶段
 */
function getNextStage(lastCompleted: string): string {
  const stageOrder = [
    "pre-process",
    "capability-research",
    "briefing-assemble",
    "assembly",
    "learning-ladder",
  ];
  const index = stageOrder.indexOf(lastCompleted);
  if (index < stageOrder.length - 1) {
    return stageOrder[index + 1];
  }
  return "completed";
}

/**
 * 根据检查点获取当前阶段
 */
function getCurrentStage(checkpoint: string | null): string {
  if (!checkpoint) return "init";
  
  const checkpointToStage: Record<string, string> = {
    "pre-process-done": "capability-research",
    "ⓔ": "capability-research",
    "ⓓ": "briefing-assemble",
    "ⓕ": "assembly",
    "ⓖ": "learning-ladder",
  };
  
  return checkpointToStage[checkpoint] || "init";
}
