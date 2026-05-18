/**
 * Summary JSON Schema definition and validation logic
 * Single source of truth — aligned with capability-research.md Step 8
 */

import {
  BottleneckItem,
  TradeoffItem,
  ReferenceItem,
  SummaryData,
  ValidationError,
} from "./types.js";

// ── Enum constraints ──

const CATEGORY_VALUES = ["输入变异", "状态跃迁", "资源边界", "规模拐点", "时序竞争"] as const;
const PRIORITY_VALUES = ["P0", "P1", "P2", "P3"] as const;
const VERSION_SENSITIVE_VALUES = ["none", "weak", "strong"] as const;
const TIER_VALUES = ["T0", "T1", "T2"] as const;

// ── Template (for get_summary_schema response) ──

export const SUMMARY_TEMPLATE: Omit<SummaryData, "id" | "name" | "tech_layer" | "fanout" | "coupling" | "strategic_value"> = {
  mechanism_summary: "（1-3 句话概括核心机制，≤200 字）",
  bottlenecks: [
    {
      name: "（瓶颈名称）",
      category: "输入变异",
      priority: "P0",
      trigger: "（触发条件）",
      symptom: "（症状表现）",
      version_sensitive: "none",
      affected_tool: null,
      affected_versions: null,
      fixed_version: null,
      fixed_source: null,
    },
  ],
  tradeoffs: [
    {
      dimension: "（权衡维度）",
      option_a: "（方案A描述及代价）",
      option_b: "（方案B描述及代价）",
      suggestion: "（选择建议）",
    },
  ],
  experiment_code: null,
  references: [
    { tier: "T0", url: "https://...", title: "（来源标题）" },
  ],
};

// ── Field-level validation rules (for agent reference) ──

export const FIELD_RULES: Record<string, { required: boolean; type: string; constraints?: string }> = {
  "bottlenecks[].name": { required: true, type: "string", constraints: "1-30 字" },
  "bottlenecks[].category": { required: true, type: "enum", constraints: CATEGORY_VALUES.join(" | ") },
  "bottlenecks[].priority": { required: true, type: "enum", constraints: PRIORITY_VALUES.join(" | ") },
  "bottlenecks[].trigger": { required: true, type: "string" },
  "bottlenecks[].symptom": { required: true, type: "string" },
  "bottlenecks[].version_sensitive": { required: true, type: "enum", constraints: VERSION_SENSITIVE_VALUES.join(" | ") },
  "bottlenecks[].affected_tool": { required: false, type: "string | null" },
  "bottlenecks[].affected_versions": { required: false, type: "string | null" },
  "bottlenecks[].fixed_version": { required: false, type: "string | null" },
  "bottlenecks[].fixed_source": { required: false, type: "string | null" },
  "tradeoffs[].dimension": { required: true, type: "string" },
  "tradeoffs[].option_a": { required: true, type: "string" },
  "tradeoffs[].option_b": { required: true, type: "string" },
  "tradeoffs[].suggestion": { required: true, type: "string" },
  "references[].tier": { required: true, type: "enum", constraints: TIER_VALUES.join(" | ") },
  "references[].url": { required: true, type: "string", constraints: "必须是有效 URL" },
  "references[].title": { required: true, type: "string" },
  "mechanism_summary": { required: true, type: "string", constraints: "1-3 句，≤200 字" },
  "experiment_code": { required: true, type: "string | null" },
};

// ── Validation ──

function validateBottleneck(item: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const path = `bottlenecks[${index}]`;

  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    errors.push({ path, message: "必须是对象，不能是字符串", value: item });
    return errors;
  }

  const obj = item as Record<string, unknown>;

  // Required string fields
  for (const field of ["name", "trigger", "symptom"]) {
    if (typeof obj[field] !== "string" || (obj[field] as string).trim() === "") {
      errors.push({ path: `${path}.${field}`, message: `缺少必填字段: ${field}`, value: obj[field] });
    }
  }

  // Enum: category
  if (!CATEGORY_VALUES.includes(obj.category as typeof CATEGORY_VALUES[number])) {
    errors.push({ path: `${path}.category`, message: `必须是: ${CATEGORY_VALUES.join(" | ")}`, value: obj.category });
  }

  // Enum: priority
  if (!PRIORITY_VALUES.includes(obj.priority as typeof PRIORITY_VALUES[number])) {
    errors.push({ path: `${path}.priority`, message: `必须是: ${PRIORITY_VALUES.join(" | ")}`, value: obj.priority });
  }

  // Enum: version_sensitive
  if (!VERSION_SENSITIVE_VALUES.includes(obj.version_sensitive as typeof VERSION_SENSITIVE_VALUES[number])) {
    errors.push({ path: `${path}.version_sensitive`, message: `必须是: ${VERSION_SENSITIVE_VALUES.join(" | ")}`, value: obj.version_sensitive });
  }

  // Nullable fields
  for (const field of ["affected_tool", "affected_versions", "fixed_version", "fixed_source"]) {
    if (obj[field] !== undefined && obj[field] !== null && typeof obj[field] !== "string") {
      errors.push({ path: `${path}.${field}`, message: "必须是 string 或 null", value: obj[field] });
    }
  }

  return errors;
}

function validateTradeoff(item: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const path = `tradeoffs[${index}]`;

  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    errors.push({ path, message: "必须是对象，不能是字符串", value: item });
    return errors;
  }

  const obj = item as Record<string, unknown>;

  for (const field of ["dimension", "option_a", "option_b", "suggestion"]) {
    if (typeof obj[field] !== "string" || (obj[field] as string).trim() === "") {
      errors.push({ path: `${path}.${field}`, message: `缺少必填字段: ${field}`, value: obj[field] });
    }
  }

  return errors;
}

function validateReference(item: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const path = `references[${index}]`;

  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    errors.push({ path, message: "必须是对象，不能是字符串", value: item });
    return errors;
  }

  const obj = item as Record<string, unknown>;

  if (!TIER_VALUES.includes(obj.tier as typeof TIER_VALUES[number])) {
    errors.push({ path: `${path}.tier`, message: `必须是: ${TIER_VALUES.join(" | ")}`, value: obj.tier });
  }

  if (typeof obj.url !== "string" || !obj.url.startsWith("http")) {
    errors.push({ path: `${path}.url`, message: "必须是有效 URL", value: obj.url });
  }

  if (typeof obj.title !== "string" || (obj.title as string).trim() === "") {
    errors.push({ path: `${path}.title`, message: "缺少必填字段: title", value: obj.title });
  }

  return errors;
}

export function validateSummary(data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  // mechanism_summary
  if (typeof data.mechanism_summary !== "string" || (data.mechanism_summary as string).trim() === "") {
    errors.push({ path: "mechanism_summary", message: "缺少必填字段", value: data.mechanism_summary });
  }

  // bottlenecks
  if (!Array.isArray(data.bottlenecks)) {
    errors.push({ path: "bottlenecks", message: "必须是数组", value: data.bottlenecks });
  } else {
    data.bottlenecks.forEach((item: unknown, i: number) => {
      errors.push(...validateBottleneck(item, i));
    });
  }

  // tradeoffs
  if (!Array.isArray(data.tradeoffs)) {
    errors.push({ path: "tradeoffs", message: "必须是数组", value: data.tradeoffs });
  } else {
    data.tradeoffs.forEach((item: unknown, i: number) => {
      errors.push(...validateTradeoff(item, i));
    });
  }

  // references
  if (!Array.isArray(data.references)) {
    errors.push({ path: "references", message: "必须是数组", value: data.references });
  } else {
    data.references.forEach((item: unknown, i: number) => {
      errors.push(...validateReference(item, i));
    });
  }

  // experiment_code
  if (data.experiment_code !== null && typeof data.experiment_code !== "string") {
    errors.push({ path: "experiment_code", message: "必须是 string 或 null", value: data.experiment_code });
  }

  return errors;
}
