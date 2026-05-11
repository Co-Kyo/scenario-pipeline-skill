import { BaseTool, ToolDefinition } from "../../core/base-tool.js";
import { SUMMARY_TEMPLATE, FIELD_RULES } from "./schema.js";

/**
 * get_summary_schema — 供子 agent 在双写前调用，获取 JSON schema 标准和示例模板
 *
 * 返回值包含：
 * 1. template: 完整的填空模板（agent 按此结构组织数据）
 * 2. field_rules: 每个字段的类型和约束
 * 3. strict_note: 强制约束说明
 */
export class GetSummarySchemaTool extends BaseTool {
  readonly name = "get_summary_schema";
  readonly description =
    "获取 summary.json 的标准 schema 和填空模板。能力研究 agent 在双写前必须调用此工具，按返回的模板结构组织数据，再调用 submit_summary 提交。";

  getInputSchema(): ToolDefinition["inputSchema"] {
    return {
      type: "object",
      properties: {},
    };
  }

  async execute(): Promise<any> {
    return {
      template: SUMMARY_TEMPLATE,
      field_rules: FIELD_RULES,
      strict_note: [
        "1. bottlenecks/tradeoffs/references 的每个条目必须是对象，禁止使用纯字符串",
        "2. 字段名必须与模板完全一致，禁止自创字段（如 id/description/choice 等）",
        "3. 所有 enum 字段（category/priority/version_sensitive/tier）只能使用规定值",
        "4. 组织好数据后调用 submit_summary 提交，由 MCP 校验并写入文件",
      ],
    };
  }
}
