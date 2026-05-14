import * as fs from "fs/promises";
import * as path from "path";

/**
 * MCP 调用日志记录器
 *
 * 每次工具调用自动记录到 .meta/mcp-calls.jsonl
 * 类似前端埋点，用于：
 * - 子 agent MCP 可用性验证
 * - L3 加载契约执行审计
 * - 性能热点分析
 */

interface CallLogEntry {
  ts: string;
  tool: string;
  caller: string;
  args_summary: string;
  status: "ok" | "error";
  latency_ms: number;
  error?: string;
}

class CallLogger {
  private logPath: string | null = null;

  /**
   * 初始化日志路径（首次写入时自动创建目录）
   * 日志写入 {workDir}/.meta/mcp-calls.jsonl
   * workDir 从 args.workDir 或 args.params.workDir 中提取
   */
  private async ensureLogDir(workDir: string): Promise<string> {
    if (this.logPath) return this.logPath;

    const metaDir = path.join(workDir, ".meta");
    await fs.mkdir(metaDir, { recursive: true });
    this.logPath = path.join(metaDir, "mcp-calls.jsonl");
    return this.logPath;
  }

  /**
   * 从 args 中提取调用者标识
   * 约定：args 中的 `caller` 字段为调用者身份
   * 未提供时标记为 "unknown"
   */
  private extractCaller(args: Record<string, any>): string {
    if (args.caller) return String(args.caller);

    // 兼容：从 params 嵌套中提取
    if (args.params?.caller) return String(args.params.caller);

    return "unknown";
  }

  /**
   * 从 args 中提取 workDir
   * 尝试多个位置：args.workDir / args.params.workDir / args 的 workDir 字段
   */
  private extractWorkDir(args: Record<string, any>): string | null {
    if (args.workDir) return String(args.workDir);
    if (args.params?.workDir) return String(args.params.workDir);

    // 遍历所有值找 workDir 字符串
    for (const [key, val] of Object.entries(args)) {
      if (key === "workDir" && typeof val === "string") return val;
      if (typeof val === "string" && val.includes("workDir")) {
        // 尝试从 JSON 字符串中提取
        try {
          const parsed = JSON.parse(val);
          if (parsed.workDir) return String(parsed.workDir);
        } catch {}
      }
    }
    return null;
  }

  /**
   * 生成参数摘要（截断到 maxLen 字符）
   */
  private summarizeArgs(args: Record<string, any>, maxLen = 200): string {
    // 去掉 caller 字段（已在独立字段记录）
    const { caller, ...rest } = args;
    const raw = JSON.stringify(rest);
    if (raw.length <= maxLen) return raw;
    return raw.slice(0, maxLen) + `...(${raw.length} chars)`;
  }

  /**
   * 记录一次工具调用
   */
  async log(
    toolName: string,
    args: Record<string, any>,
    status: "ok" | "error",
    latencyMs: number,
    error?: string
  ): Promise<void> {
    const workDir = this.extractWorkDir(args);
    if (!workDir) {
      // 无法确定 workDir，写入 stderr 作为 fallback
      console.error(
        `[mcp-logger] WARN: no workDir in args, skipping file log. tool=${toolName}`
      );
      return;
    }

    const entry: CallLogEntry = {
      ts: new Date().toISOString(),
      tool: toolName,
      caller: this.extractCaller(args),
      args_summary: this.summarizeArgs(args),
      status,
      latency_ms: latencyMs,
    };
    if (error) entry.error = error;

    try {
      const logPath = await this.ensureLogDir(workDir);
      await fs.appendFile(logPath, JSON.stringify(entry) + "\n");
    } catch (err) {
      console.error(`[mcp-logger] write failed: ${err}`);
    }
  }
}

// 单例
export const callLogger = new CallLogger();
