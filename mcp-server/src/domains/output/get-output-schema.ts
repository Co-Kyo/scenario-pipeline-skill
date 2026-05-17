import { BaseTool, ToolDefinition } from "../../core/base-tool.js";
import {
  RAW_MATERIALS_TEMPLATE,
  RAW_MATERIALS_FIELD_RULES,
} from "../../schemas/raw-materials.schema.js";
import {
  DECOMPOSITIONS_TEMPLATE,
  DECOMPOSITIONS_FIELD_RULES,
} from "../../schemas/decompositions.schema.js";
import {
  CAPABILITY_GRAPH_TEMPLATE,
  CAPABILITY_GRAPH_FIELD_RULES,
} from "../../schemas/capability-graph.schema.js";
import {
  EVALUATIONS_TEMPLATE,
  EVALUATIONS_FIELD_RULES,
} from "../../schemas/evaluations.schema.js";
import {
  HIGHGROUNDS_TEMPLATE,
  HIGHGROUNDS_FIELD_RULES,
} from "../../schemas/highgrounds.schema.js";
import {
  SUMMARY_TEMPLATE,
  FIELD_RULES as SUMMARY_FIELD_RULES,
} from "../../domains/summary/schema.js";

/**
 * get_output_schema — 泛化版 schema 获取工具
 *
 * 从 get_summary_schema 泛化而来，支持所有步骤的输出 schema 查询。
 * 子 agent 在执行前调用，获取输出标准。
 */

// ── Schema 注册表 ──

const SCHEMA_REGISTRY: Record<
  string,
  { template: unknown; field_rules: Record<string, unknown>; strict_notes: string[] }
> = {
  "scan": {
    template: RAW_MATERIALS_TEMPLATE,
    field_rules: RAW_MATERIALS_FIELD_RULES,
    strict_notes: [
      "1. $schema 字段必须是 \"raw-materials-v1\"",
      "2. materials 数组中每个条目必须包含所有必填字段",
      "3. source_tier 只能是 T0/T1/T2/T3",
      "4. fetch_status 只能是 ok/failed",
      "5. boolean 字段禁止用字符串 \"true\"/\"false\"",
      "6. url 必须是有效 HTTP(S) URL",
    ],
  },
  "decompose": {
    template: DECOMPOSITIONS_TEMPLATE,
    field_rules: DECOMPOSITIONS_FIELD_RULES,
    strict_notes: [
      "1. $schema 字段必须是 \"decompositions-v1\"",
      "2. 每个命题必须有 proposition_id、proposition、qualifier、tech_keyword",
      "3. generic_core 和 specialization 必须是数组，每个元素包含 layer + capabilities",
      "4. content_weight 必须是规定枚举值",
      "5. 禁止合并多个命题为一个条目",
    ],
  },
  "capability-extract": {
    template: CAPABILITY_GRAPH_TEMPLATE,
    field_rules: CAPABILITY_GRAPH_FIELD_RULES,
    strict_notes: [
      "1. $schema 字段必须是 \"capability-graph-v1\"",
      "2. fanout 必须是对象 {count, total, ratio, level}，禁止简化为数字",
      "3. references 必须是对象 {t0, t1, t2, t3, t0_missing}，禁止简化为 URL 字符串",
      "4. 每个 capability 必须包含 dependencies、tags、covers 字段",
      "5. dependency_graph 和 qualifier_injection 是必填顶层字段",
    ],
  },
  "evaluate": {
    template: EVALUATIONS_TEMPLATE,
    field_rules: EVALUATIONS_FIELD_RULES,
    strict_notes: [
      "1. $schema 字段必须是 \"evaluations-v1\"",
      "2. scores 中每个维度必须是 0-3 的数字",
      "3. verdict 必须是 high/medium/rejected",
      "4. summary 中的 high+medium+rejected 必须等于 total",
      "5. 防虚高校验：4 维均 ≥ 2 时必须压低至少 1 维",
    ],
  },
  "highground-identify": {
    template: HIGHGROUNDS_TEMPLATE,
    field_rules: HIGHGROUNDS_FIELD_RULES,
    strict_notes: [
      "1. $schema 字段必须是 \"highgrounds-v1\"",
      "2. cumulative_value 必须 ≥ strategic_value（含传递覆盖）",
      "3. level 必须是一级/二级/三级",
      "4. learning_path 中 verification 是必填字段，不可省略",
      "5. cumulative_coverage 必须含传递覆盖说明",
    ],
  },
  "capability-research": {
    template: SUMMARY_TEMPLATE,
    field_rules: SUMMARY_FIELD_RULES,
    strict_notes: [
      "1. bottlenecks/tradeoffs/references 每个条目必须是对象，禁止纯字符串",
      "2. 字段名必须与模板完全一致，禁止自创字段",
      "3. 所有 enum 字段只能使用规定值",
    ],
  },
};

// ── 工具实现 ──

export class GetOutputSchemaTool extends BaseTool {
  readonly name = "get_output_schema";
  readonly description =
    "获取指定步骤的输出 JSON Schema。子 agent 在执行前调用，获取输出标准（template + field_rules + strict_notes），按标准组织数据后调用 submit_output 提交。";

  getInputSchema(): ToolDefinition["inputSchema"] {
    return {
      type: "object",
      properties: {
        step: {
          type: "string",
          description: `步骤名称，可选值: ${Object.keys(SCHEMA_REGISTRY).join(", ")}`,
        },
      },
      required: ["step"],
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const step = args.step;
    if (!step) {
      return { error: "缺少 step 参数" };
    }

    const schema = SCHEMA_REGISTRY[step];
    if (!schema) {
      return {
        error: `未注册的步骤: ${step}`,
        available_steps: Object.keys(SCHEMA_REGISTRY),
      };
    }

    return {
      step,
      template: schema.template,
      field_rules: schema.field_rules,
      strict_notes: schema.strict_notes,
    };
  }
}
