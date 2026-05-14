import { BaseTool, ToolDefinition } from "../../core/base-tool.js";
import { validateOutput } from "../../validators/index.js";
import { resolvePaths } from "../template/path-config.js";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * submit_output — 泛化版输出提交工具
 *
 * 从 submit_summary 泛化而来，支持所有步骤的输出校验+写入。
 * 子 agent 按 schema 组织数据后调用此工具提交。
 */

// ── 步骤 → 文件名映射 ──

const STEP_FILE_MAP: Record<string, string> = {
  "scan": "raw-materials.json",
  "decompose": "decompositions.json",
  "capability-extract": "capability-graph.json",
  "evaluate": "evaluations.json",
  "capability-research": "summary.json",
  // highground-identify 输出独立文件，由 pool 阶段合并
  // assemble/briefing/ladder 通过 get_template 的路径变量管理
};

export class SubmitOutputTool extends BaseTool {
  readonly name = "submit_output";
  readonly description =
    "提交指定步骤的输出数据。MCP 自动校验（调用对应步骤的 schema 校验器），校验通过后写入文件。校验失败返回错误列表。";

  getInputSchema(): ToolDefinition["inputSchema"] {
    return {
      type: "object",
      properties: {
        step: {
          type: "string",
          description: `步骤名称，可选值: ${Object.keys(STEP_FILE_MAP).join(", ")}`,
        },
        workDir: {
          type: "string",
          description: "产出目录绝对路径",
        },
        data: {
          type: "object",
          description: "步骤输出数据（JSON 对象）",
        },
        caller: {
          type: "string",
          description: "调用者标识（用于日志追踪）",
        },
      },
      required: ["step", "workDir", "data"],
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const { step, workDir, data, caller } = args;

    if (!step || !workDir || !data) {
      return { error: "缺少必填参数: step, workDir, data" };
    }

    const fileName = STEP_FILE_MAP[step];
    if (!fileName) {
      return {
        error: `未注册的步骤: ${step}`,
        available_steps: Object.keys(STEP_FILE_MAP),
      };
    }

    // 1. 校验
    const errors = validateOutput(step, data);
    if (errors.length > 0) {
      return {
        valid: false,
        errors,
        message: `校验失败，${errors.length} 个错误。请按错误列表修正后重新提交。`,
      };
    }

    // 2. 写入
    const filePath = path.join(workDir, ".meta", fileName);
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // 先写临时文件，成功后 rename（防止半写入）
      const tmpPath = filePath + ".tmp";
      await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
      await fs.rename(tmpPath, filePath);

      return {
        valid: true,
        file_path: filePath,
        message: `校验通过，已写入 ${fileName}`,
      };
    } catch (err) {
      return {
        valid: false,
        errors: [{ path: "_file", message: `写入失败: ${err}` }],
      };
    }
  }
}
