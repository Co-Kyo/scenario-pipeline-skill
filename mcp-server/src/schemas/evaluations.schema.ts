/**
 * evaluations.json Schema
 * 对应管线步骤：evaluate（L3 四维评估）
 * 下游消费者：pool (Step 6)
 */

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

const VERDICT_VALUES = ["high", "medium", "rejected"] as const;

export const EVALUATIONS_TEMPLATE = {
  $schema: "evaluations-v1",
  evaluations: [
    {
      proposition_id: "P1",
      proposition: "（命题文本）",
      scores: {
        cross_stack: 0,
        doc_vacuum: 0,
        experience_barrier: 0,
        trending_heat: 0,
        total: 0,
      },
      verdict: "high",
      highground_hits: ["A1"],
      one_ticket_reason: null,
      evidence: {
        t1_sources: [],
        t2_sources: [],
        t3_sources: [],
      },
    },
  ],
  summary: {
    total: 6,
    high: 0,
    medium: 0,
    rejected: 0,
  },
};

export const EVALUATIONS_FIELD_RULES: Record<string, { required: boolean; type: string; constraints?: string }> = {
  "$schema": { required: true, type: "string", constraints: '"evaluations-v1"' },
  "evaluations[].proposition_id": { required: true, type: "string" },
  "evaluations[].proposition": { required: true, type: "string" },
  "evaluations[].scores.cross_stack": { required: true, type: "number", constraints: "0-3" },
  "evaluations[].scores.doc_vacuum": { required: true, type: "number", constraints: "0-3" },
  "evaluations[].scores.experience_barrier": { required: true, type: "number", constraints: "0-3" },
  "evaluations[].scores.trending_heat": { required: true, type: "number", constraints: "0-3" },
  "evaluations[].scores.total": { required: true, type: "number" },
  "evaluations[].verdict": { required: true, type: "enum", constraints: VERDICT_VALUES.join(" | ") },
  "evaluations[].highground_hits": { required: false, type: "string[]", constraints: "可选，由战略高地识别步骤产出后填充" },
};

function validateEvaluation(item: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const p = `evaluations[${index}]`;
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    errors.push({ path: p, message: "必须是对象" });
    return errors;
  }
  const obj = item as Record<string, unknown>;
  for (const f of ["proposition_id", "proposition"]) {
    if (typeof obj[f] !== "string") errors.push({ path: `${p}.${f}`, message: "必须是 string" });
  }
  if (typeof obj.scores !== "object" || obj.scores === null) {
    errors.push({ path: `${p}.scores`, message: "必须是对象" });
  } else {
    const s = obj.scores as Record<string, unknown>;
    for (const f of ["cross_stack", "doc_vacuum", "experience_barrier", "trending_heat", "total"]) {
      if (typeof s[f] !== "number") errors.push({ path: `${p}.scores.${f}`, message: "必须是 number" });
    }
  }
  if (!VERDICT_VALUES.includes(obj.verdict as typeof VERDICT_VALUES[number])) {
    errors.push({ path: `${p}.verdict`, message: `必须是: ${VERDICT_VALUES.join(" | ")}` });
  }
  if (!Array.isArray(obj.highground_hits) && obj.highground_hits !== undefined) {
    errors.push({ path: `${p}.highground_hits`, message: "必须是数组或省略" });
  }
  return errors;
}

export function validateEvaluations(data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (data.$schema !== "evaluations-v1") {
    errors.push({ path: "$schema", message: '必须是 "evaluations-v1"' });
  }
  if (!Array.isArray(data.evaluations)) {
    errors.push({ path: "evaluations", message: "必须是数组" });
  } else {
    data.evaluations.forEach((item: unknown, i: number) => errors.push(...validateEvaluation(item, i)));
  }
  return errors;
}
