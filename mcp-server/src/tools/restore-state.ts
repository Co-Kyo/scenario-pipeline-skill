import { BaseTool, ToolDefinition } from "./base.js";
import * as fs from "fs/promises";
import * as path from "path";

export class RestoreStateTool extends BaseTool {
  readonly name = "restore_state";
  readonly description =
    "Restore pipeline state from .meta/pipeline-state.json";

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
    const workDir = args.workDir || process.env.WORK_DIR || process.cwd();
    const stateFilePath = path.join(workDir, ".meta", "pipeline-state.json");

    try {
      const stateContent = await fs.readFile(stateFilePath, "utf-8");
      const state = JSON.parse(stateContent);

      // 分析当前状态，确定恢复点
      const result = this.analyzeState(state);

      return {
        status: state.status,
        ...result,
        last_update: state.last_update,
      };
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        return {
          status: "no_state",
          message: "No pipeline state file found. Starting fresh.",
        };
      }
      throw error;
    }
  }

  private analyzeState(state: any): any {
    const stages = state.stages || {};
    const checkpointsPassed = state.checkpoints_passed || [];

    // 确定当前阶段
    let resumeFrom = "start";
    let currentStage = "pre-process";
    let completedItems: string[] = [];
    let pendingItems: string[] = [];
    let failedItems: string[] = [];

    // 检查 pre-process
    if (stages["pre-process"]?.status === "completed") {
      if (!checkpointsPassed.includes("ⓔ")) {
        // pre-process 完成，但能力研究未开始
        resumeFrom = "阶段一步骤1";
        currentStage = "capability-research";
      } else if (!checkpointsPassed.includes("ⓓ")) {
        // 能力研究完成，但 briefing 未完成
        resumeFrom = "阶段一步骤2";
        currentStage = "briefing-assemble";
        completedItems = stages["capability-research"]?.completed || [];
        failedItems = stages["capability-research"]?.failed || [];
      } else if (!checkpointsPassed.includes("ⓕ")) {
        // briefing 完成，但命题组装未完成
        resumeFrom = "阶段二";
        currentStage = "assembly";
        completedItems = stages["briefing-assemble"]?.completed || [];
      } else if (!checkpointsPassed.includes("ⓖ")) {
        // 命题组装完成，但学习阶梯未完成
        resumeFrom = "阶段三";
        currentStage = "learning-ladder";
        completedItems = stages["assembly"]?.completed || [];
        failedItems = stages["assembly"]?.failed || [];
      } else {
        // 全部完成
        resumeFrom = "completed";
        currentStage = "completed";
      }
    }

    // 计算 pending items
    if (currentStage === "capability-research") {
      const total = stages["capability-research"]?.total || 0;
      const completed = stages["capability-research"]?.completed || [];
      const failed = stages["capability-research"]?.failed || [];
      // 这里需要从 capability-graph.json 获取完整列表
      // 暂时返回空数组，实际使用时需要读取文件
      pendingItems = [];
    }

    return {
      resume_from: resumeFrom,
      current_stage: currentStage,
      completed_items: completedItems,
      pending_items: pendingItems,
      failed_items: failedItems,
      interrupt_type: state.interrupt_type || "checkpoint",
    };
  }
}
