import { BaseTool, ToolDefinition } from "../../core/base-tool.js";
import { classifyDomains } from "./registry.js";

export class ClassifySourcesTool extends BaseTool {
  readonly name = "classify_sources";
  readonly description =
    "Classify domains by trust tier. Input a list of domains from web search results, get back tier classification for each. T0=builtin official, T1-T3=dynamic pool, unknown=not yet evaluated.";

  getInputSchema(): ToolDefinition["inputSchema"] {
    return {
      type: "object",
      properties: {
        domains: {
          type: "array",
          items: { type: "string" },
          description:
            "List of domains to classify (e.g. ['developer.mozilla.org', 'juejin.cn'])",
        },
        workDir: {
          type: "string",
          description:
            "Working directory for reading dynamic pool. Falls back to WORK_DIR env var or cwd if omitted.",
        },
      },
      required: ["domains"],
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const { domains, workDir: workDirArg } = args;
    const workDir = workDirArg || process.env.WORK_DIR || process.cwd();

    if (!Array.isArray(domains) || domains.length === 0) {
      return { error: "domains must be a non-empty array of strings" };
    }

    // 去重
    const unique = [...new Set(domains.map((d: string) => d.toLowerCase().trim()))];
    const results = classifyDomains(unique, workDir);

    const summary = {
      total: results.length,
      T0: results.filter((r) => r.tier === "T0").length,
      T1: results.filter((r) => r.tier === "T1").length,
      T2: results.filter((r) => r.tier === "T2").length,
      T3: results.filter((r) => r.tier === "T3").length,
      unknown: results.filter((r) => r.tier === "unknown").length,
    };

    return { results, summary };
  }
}
