import { BaseTool, ToolDefinition } from "../../core/base-tool.js";
import { registerSource, classifyDomain } from "./registry.js";

export class RegisterSourceTool extends BaseTool {
  readonly name = "register_source";
  readonly description =
    "Register a newly discovered quality source into the dynamic pool. Call after evaluating unknown domain content quality via web_fetch. Persists to {workDir}/.meta/sources/dynamic-sources.json.";

  getInputSchema(): ToolDefinition["inputSchema"] {
    return {
      type: "object",
      properties: {
        domain: {
          type: "string",
          description: "Domain to register (e.g. 'cloud.tencent.com')",
        },
        tier: {
          type: "string",
          enum: ["T1", "T2", "T3"],
          description:
            "Quality tier: T1=official/major company tech blog, T2=quality community, T3=general community",
        },
        reason: {
          type: "string",
          description:
            "Why this domain deserves this tier (e.g. '腾讯云开发者社区，setData性能优化文章质量高')",
        },
        discovered_by: {
          type: "string",
          description: "Discovery context (e.g. 'scan/2026-05-16')",
          default: "scan",
        },
        workDir: {
          type: "string",
          description:
            "Working directory. Falls back to WORK_DIR env var or cwd if omitted.",
        },
      },
      required: ["domain", "tier", "reason"],
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const { domain, tier, reason, discovered_by = "scan", workDir: workDirArg } = args;

    if (!domain || !tier || !reason) {
      return { error: "domain, tier, and reason are required" };
    }

    const workDir = workDirArg || process.env.WORK_DIR || process.cwd();
    const normalized = domain.toLowerCase().trim();

    // 检查是否已存在（T0 内置信源不可覆盖）
    const existing = classifyDomain(normalized, workDir);
    if (existing.tier === "T0") {
      return {
        action: "rejected",
        message: `${normalized} is a T0 built-in source and cannot be overridden by dynamic registration`,
        existing,
      };
    }
    if (existing.tier !== "unknown") {
      return {
        action: "skipped",
        message: `${normalized} already registered as ${existing.tier} (${existing.source})`,
        existing,
      };
    }

    const entry = registerSource(normalized, tier, reason, discovered_by, workDir);

    return {
      action: "registered",
      entry,
    };
  }
}
