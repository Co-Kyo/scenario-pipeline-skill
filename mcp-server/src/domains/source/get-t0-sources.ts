/**
 * get_t0_sources — T0 内置信源列表查询工具
 *
 * 返回所有 T0 内置信源的域名 → 名称映射表。
 * 与 get_source_standard（标准定义）分离，仅返回数据。
 *
 * 使用场景：
 * - scan 阶段：agent 获取 T0 列表后在每个域名内定向搜索对口文章
 * - capability-extract 阶段：agent 获取 T0 列表后为每个能力预查找官方参考 URL
 */

import { BaseTool, ToolDefinition } from "../../core/base-tool.js";
import { getRegistry } from "./registry.js";

export class GetT0SourcesTool extends BaseTool {
  readonly name = "get_t0_sources";
  readonly description =
    "Get the full list of T0 built-in sources (domain → name mapping). T0 sources are official documentation sites (MDN, React docs, Chrome blog, Webpack docs, etc.) with the highest trust level. Use this at scan or capability-extract stage to know which domains to search for authoritative content.";

  getInputSchema(): ToolDefinition["inputSchema"] {
    return {
      type: "object",
      properties: {},
      required: [],
    };
  }

  async execute(_args: Record<string, any>): Promise<any> {
    const reg = getRegistry();
    const sources = Object.entries(reg.t0).map(([domain, name]) => ({
      domain,
      name,
    }));

    return {
      count: sources.length,
      sources,
    };
  }
}
