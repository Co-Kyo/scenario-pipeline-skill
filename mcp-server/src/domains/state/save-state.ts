import { BaseTool, ToolDefinition } from "../../core/base-tool.js";
import * as fs from "fs/promises";
import * as path from "path";

// ── 校验辅助 ──

function isValidAbsolutePath(p: string): boolean {
  return path.isAbsolute(p);
}

export class SaveStateTool extends BaseTool {
  readonly name = "save_state";
  readonly description =
    "Save pipeline state to .meta/pipeline-state.json. " +
    "workDir 必须是绝对路径，否则文件会写入不可预期的位置。";

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

    // ── 路径校验 ──
    const workDir = workDirArg || process.env.WORK_DIR || process.cwd();
    if (!isValidAbsolutePath(workDir)) {
      // 尝试解析为绝对路径
      const resolved = path.resolve(workDir);
      if (!isValidAbsolutePath(resolved)) {
        return {
          success: false,
          error: `workDir 必须是绝对路径，收到: ${workDir}`,
          resolved_to: resolved,
        };
      }
      // 允许 resolve 后的路径，但给出警告
      console.warn(
        `[save_state] workDir 不是绝对路径，已解析为: ${resolved}。` +
          `调用方原始值: ${workDir}。建议始终使用绝对路径。`
      );
    }
    const finalWorkDir = path.resolve(workDir);
    const stateFilePath = path.join(finalWorkDir, ".meta", "pipeline-state.json");

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

    // 写入文件（atomic write）
    const tmpPath = stateFilePath + ".tmp";
    await fs.writeFile(tmpPath, JSON.stringify(state, null, 2), "utf-8");
    await fs.rename(tmpPath, stateFilePath);

    // ── 回读验证（read-after-write） ──
    try {
      const verifyContent = await fs.readFile(stateFilePath, "utf-8");
      JSON.parse(verifyContent); // 确保可解析
    } catch (verifyError) {
      return {
        success: false,
        error: `写入后回读验证失败: ${verifyError}`,
        checkpoint,
        state_file: stateFilePath,
      };
    }

    return {
      success: true,
      checkpoint,
      state_file: stateFilePath,
    };
  }
}
