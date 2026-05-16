import { BaseTool, ToolDefinition } from "../../core/base-tool.js";
import * as fs from "fs/promises";
import * as path from "path";
import { validateSummary } from "./schema.js";
import { ValidationError, SubmitSummaryResult, SummaryData } from "./types.js";

/**
 * submit_summary — 子 agent 提交结构化摘要数据，MCP 校验后写入文件
 *
 * 流程：
 * 1. 从 capability-graph.json 读取能力元数据（name/tech_layer/fanout/coupling/strategic_value）
 * 2. 合并 agent 提交的内容字段
 * 3. 校验完整 summary 对象
 * 4. 校验通过 → 写入 .meta/summaries/<id>-<name>.json
 * 5. 校验失败 → 返回错误列表，agent 修正后重新提交
 */
export class SubmitSummaryTool extends BaseTool {
  readonly name = "submit_summary";
  readonly description =
    "提交 summary.json 数据。MCP 自动校验 schema，通过后写入文件，失败则返回错误列表。禁止 agent 直接写 JSON 文件。";

  getInputSchema(): ToolDefinition["inputSchema"] {
    return {
      type: "object",
      properties: {
        capability_id: {
          type: "string",
          description: "能力 ID，如 A1、W2",
        },
        workDir: {
          type: "string",
          description: "工作目录，覆盖 WORK_DIR 环境变量",
        },
        mechanism_summary: {
          type: "string",
          description: "1-3 句话概括核心机制，≤200 字",
        },
        bottlenecks: {
          type: "array",
          description:
            '瓶颈列表，每项必须为对象（禁止字符串），包含 name/category/priority/trigger/symptom/version_sensitive 等字段',
          items: { type: "object" },
        },
        tradeoffs: {
          type: "array",
          description:
            "权衡列表，每项必须为对象（禁止字符串），包含 dimension/option_a/option_b/suggestion",
          items: { type: "object" },
        },
        experiment_code: {
          type: ["string", "null"],
          description: "仅 deep 模式提供代码片段，非 deep 填 null",
        },
        references: {
          type: "array",
          description: "参考信源列表，每项必须为对象（禁止字符串），包含 tier/url/title",
          items: { type: "object" },
        },
      },
      required: ["capability_id", "mechanism_summary", "bottlenecks", "tradeoffs", "references"],
    };
  }

  async execute(args: Record<string, any>): Promise<SubmitSummaryResult> {
    const {
      capability_id,
      workDir: workDirArg,
      mechanism_summary,
      bottlenecks,
      tradeoffs,
      experiment_code = null,
      references,
    } = args;

    const workDir = workDirArg || process.env.WORK_DIR || process.cwd();
    const warnings: string[] = [];

    // ── 1. 读取 capability-graph.json 获取元数据 ──
    const graphPath = path.join(workDir, ".meta", "capability-graph.json");
    let metadata: Pick<SummaryData, "id" | "name" | "tech_layer" | "fanout" | "coupling" | "strategic_value"> = {
      id: capability_id, name: "", tech_layer: "", fanout: "", coupling: 0, strategic_value: 0,
    };

    try {
      const graphRaw = await fs.readFile(graphPath, "utf-8");
      const graph = JSON.parse(graphRaw);
      const capabilities = graph.capabilities || [];
      const found = capabilities.find(
        (c: any) => c.id === capability_id
      );

      if (found) {
        metadata = {
          id: found.id,
          name: found.name,
          tech_layer: found.tech_layer,
          fanout: found.fanout?.level ?? found.fanout ?? "",
          coupling: found.coupling ?? 0,
          strategic_value: found.strategic_value ?? 0,
        };
      } else {
        warnings.push(`capability-graph.json 中未找到 ${capability_id}，元数据将从 agent 输入推断`);
      }
    } catch {
      warnings.push("capability-graph.json 读取失败，元数据将从 agent 输入推断");
    }

    // ── 2. 组装完整 summary 对象 ──
    const summary: SummaryData = {
      ...metadata,
      mechanism_summary,
      bottlenecks,
      tradeoffs,
      experiment_code,
      references,
    };

    // ── 3. 校验 ──
    const errors: ValidationError[] = validateSummary(summary as any);

    if (errors.length > 0) {
      return {
        valid: false,
        errors,
        warnings,
      };
    }

    // ── 4. 写入文件 ──
    const summariesDir = path.join(workDir, ".meta", "summaries");
    await fs.mkdir(summariesDir, { recursive: true });

    const fileName = `${summary.id}-${summary.name}.json`;
    const filePath = path.join(summariesDir, fileName);

    await fs.writeFile(filePath, JSON.stringify(summary, null, 2), "utf-8");

    return {
      valid: true,
      file_path: filePath,
      errors: [],
      warnings,
    };
  }
}
