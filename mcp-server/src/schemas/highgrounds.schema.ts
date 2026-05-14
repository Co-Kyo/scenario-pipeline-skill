/**
 * highgrounds.json Schema
 * 对应管线步骤：highground-identify（L3 战略高地识别）
 * 下游消费者：pool (Step 6 合并入 capability-graph.json)
 */

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

const LEVEL_VALUES = ["一级", "二级", "三级"] as const;
const LEVEL_EMOJI_MAP: Record<string, string> = { "一级": "🏔️", "二级": "⛰️", "三级": "🏕️" };

export interface Highground {
  capability_id: string;
  name: string;
  fanout: { count: number; total: number; ratio: string; level: string };
  coupling: number;
  strategic_value: number;
  cumulative_value: number;
  covers_capabilities: string[];
  level: string;
  level_emoji: string;
}

export interface LearningPathStep {
  step: number;
  capability_id: string;
  name: string;
  coverage: string;
  cumulative_coverage: string;
  depends_on: string[];
  rationale: string;
  verification: string;
}

export interface HighgroundsData {
  $schema: "highgrounds-v1";
  highgrounds: Highground[];
  learning_path: LearningPathStep[];
}

export const HIGHGROUNDS_TEMPLATE: HighgroundsData = {
  $schema: "highgrounds-v1",
  highgrounds: [
    {
      capability_id: "A1",
      name: "（能力名称）",
      fanout: { count: 0, total: 0, ratio: "0/0", level: "核心" },
      coupling: 1,
      strategic_value: 0,
      cumulative_value: 0,
      covers_capabilities: [],
      level: "一级",
      level_emoji: "🏔️",
    },
  ],
  learning_path: [
    {
      step: 1,
      capability_id: "A1",
      name: "（能力名称）",
      coverage: "0/0",
      cumulative_coverage: "0/0",
      depends_on: [],
      rationale: "（为什么排在这一步）",
      verification: "（做到什么程度算掌握）",
    },
  ],
};

export const HIGHGROUNDS_FIELD_RULES: Record<string, { required: boolean; type: string; constraints?: string }> = {
  "$schema": { required: true, type: "string", constraints: '"highgrounds-v1"' },
  "highgrounds[].capability_id": { required: true, type: "string" },
  "highgrounds[].name": { required: true, type: "string" },
  "highgrounds[].fanout": { required: true, type: "object", constraints: "{count, total, ratio, level}" },
  "highgrounds[].strategic_value": { required: true, type: "number" },
  "highgrounds[].cumulative_value": { required: true, type: "number", constraints: "必须 ≥ strategic_value（含传递覆盖）" },
  "highgrounds[].covers_capabilities": { required: true, type: "string[]" },
  "highgrounds[].level": { required: true, type: "enum", constraints: LEVEL_VALUES.join(" | ") },
  "highgrounds[].level_emoji": { required: true, type: "string" },
  "learning_path[].step": { required: true, type: "number" },
  "learning_path[].capability_id": { required: true, type: "string" },
  "learning_path[].name": { required: true, type: "string" },
  "learning_path[].coverage": { required: true, type: "string" },
  "learning_path[].cumulative_coverage": { required: true, type: "string", constraints: "必须含传递覆盖说明" },
  "learning_path[].depends_on": { required: true, type: "string[]" },
  "learning_path[].rationale": { required: true, type: "string" },
  "learning_path[].verification": { required: true, type: "string", constraints: "具体可验证的掌握标准，不可省略" },
};

function validateHighground(item: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const p = `highgrounds[${index}]`;
  if (typeof item !== "object" || item === null) { errors.push({ path: p, message: "必须是对象" }); return errors; }
  const obj = item as Record<string, unknown>;
  for (const f of ["capability_id", "name", "level_emoji"]) {
    if (typeof obj[f] !== "string") errors.push({ path: `${p}.${f}`, message: "必须是 string" });
  }
  if (typeof obj.fanout !== "object" || obj.fanout === null) errors.push({ path: `${p}.fanout`, message: "必须是对象" });
  for (const f of ["strategic_value", "cumulative_value", "coupling"]) {
    if (typeof obj[f] !== "number") errors.push({ path: `${p}.${f}`, message: "必须是 number" });
  }
  if (typeof obj.strategic_value === "number" && typeof obj.cumulative_value === "number" && obj.cumulative_value < obj.strategic_value) {
    errors.push({ path: `${p}.cumulative_value`, message: "必须 ≥ strategic_value" });
  }
  if (!LEVEL_VALUES.includes(obj.level as typeof LEVEL_VALUES[number])) {
    errors.push({ path: `${p}.level`, message: `必须是: ${LEVEL_VALUES.join(" | ")}` });
  }
  if (!Array.isArray(obj.covers_capabilities)) errors.push({ path: `${p}.covers_capabilities`, message: "必须是数组" });
  return errors;
}

function validateLearningPathStep(item: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const p = `learning_path[${index}]`;
  if (typeof item !== "object" || item === null) { errors.push({ path: p, message: "必须是对象" }); return errors; }
  const obj = item as Record<string, unknown>;
  for (const f of ["capability_id", "name", "coverage", "cumulative_coverage", "rationale", "verification"]) {
    if (typeof obj[f] !== "string" || (obj[f] as string).trim() === "") {
      errors.push({ path: `${p}.${f}`, message: `缺少必填字段: ${f}` });
    }
  }
  if (typeof obj.step !== "number") errors.push({ path: `${p}.step`, message: "必须是 number" });
  if (!Array.isArray(obj.depends_on)) errors.push({ path: `${p}.depends_on`, message: "必须是数组" });
  return errors;
}

export function validateHighgrounds(data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (data.$schema !== "highgrounds-v1") errors.push({ path: "$schema", message: '必须是 "highgrounds-v1"' });
  if (!Array.isArray(data.highgrounds)) {
    errors.push({ path: "highgrounds", message: "必须是数组" });
  } else {
    data.highgrounds.forEach((item: unknown, i: number) => errors.push(...validateHighground(item, i)));
  }
  if (!Array.isArray(data.learning_path)) {
    errors.push({ path: "learning_path", message: "必须是数组" });
  } else {
    data.learning_path.forEach((item: unknown, i: number) => errors.push(...validateLearningPathStep(item, i)));
  }
  return errors;
}
