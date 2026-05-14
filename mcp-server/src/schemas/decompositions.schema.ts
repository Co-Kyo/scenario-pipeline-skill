/**
 * decompositions.json Schema
 * 对应管线步骤：decompose（L3 架构分词）
 * 下游消费者：capability-extract, evaluate
 */

export interface LayerCapabilities {
  layer: string;
  capabilities: string[];
}

export interface Decomposition {
  proposition_id: string;
  proposition: string;
  qualifier: string;
  tech_keyword: string;
  generic_core: LayerCapabilities[];
  specialization: LayerCapabilities[];
  content_weight: string;
  weight_reasoning: string;
  qualifier_unknown?: boolean;
  dictionary_extended?: boolean;
}

export interface DecompositionsData {
  $schema: "decompositions-v1";
  decompositions: Decomposition[];
}

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

const CONTENT_WEIGHT_VALUES = ["≥ 80%", "60-80%", "40-60%", "< 40%"] as const;

export const DECOMPOSITIONS_TEMPLATE: DecompositionsData = {
  $schema: "decompositions-v1",
  decompositions: [
    {
      proposition_id: "P1",
      proposition: "（命题文本）",
      qualifier: "（限定词，如 Vue3）",
      tech_keyword: "（技术栈关键词）",
      generic_core: [
        { layer: "（通用层名称）", capabilities: ["（能力1）", "（能力2）"] },
      ],
      specialization: [
        { layer: "（特化层名称）", capabilities: ["（能力1）"] },
      ],
      content_weight: "60-80%",
      weight_reasoning: "（权重判定理由）",
    },
  ],
};

export const DECOMPOSITIONS_FIELD_RULES: Record<string, { required: boolean; type: string; constraints?: string }> = {
  "$schema": { required: true, type: "string", constraints: '"decompositions-v1"' },
  "decompositions[].proposition_id": { required: true, type: "string", constraints: "P{序号}" },
  "decompositions[].proposition": { required: true, type: "string" },
  "decompositions[].qualifier": { required: true, type: "string" },
  "decompositions[].tech_keyword": { required: true, type: "string" },
  "decompositions[].generic_core": { required: true, type: "array", constraints: "每个元素包含 layer(string) + capabilities(string[])" },
  "decompositions[].specialization": { required: true, type: "array" },
  "decompositions[].content_weight": { required: true, type: "enum", constraints: CONTENT_WEIGHT_VALUES.join(" | ") },
  "decompositions[].weight_reasoning": { required: true, type: "string" },
};

function validateDecomposition(item: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const path = `decompositions[${index}]`;
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    errors.push({ path, message: "必须是对象", value: item });
    return errors;
  }
  const obj = item as Record<string, unknown>;
  for (const field of ["proposition_id", "proposition", "qualifier", "tech_keyword", "weight_reasoning"]) {
    if (typeof obj[field] !== "string" || (obj[field] as string).trim() === "") {
      errors.push({ path: `${path}.${field}`, message: "缺少必填字段", value: obj[field] });
    }
  }
  for (const field of ["generic_core", "specialization"]) {
    if (!Array.isArray(obj[field])) {
      errors.push({ path: `${path}.${field}`, message: "必须是数组", value: obj[field] });
    }
  }
  if (!CONTENT_WEIGHT_VALUES.includes(obj.content_weight as typeof CONTENT_WEIGHT_VALUES[number])) {
    errors.push({ path: `${path}.content_weight`, message: `必须是: ${CONTENT_WEIGHT_VALUES.join(" | ")}`, value: obj.content_weight });
  }
  return errors;
}

export function validateDecompositions(data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (data.$schema !== "decompositions-v1") {
    errors.push({ path: "$schema", message: '必须是 "decompositions-v1"', value: data.$schema });
  }
  if (!Array.isArray(data.decompositions)) {
    errors.push({ path: "decompositions", message: "必须是数组" });
  } else {
    data.decompositions.forEach((item: unknown, i: number) => errors.push(...validateDecomposition(item, i)));
  }
  return errors;
}
