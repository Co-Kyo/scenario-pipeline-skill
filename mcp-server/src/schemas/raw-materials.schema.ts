/**
 * raw-materials.json Schema
 * 对应管线步骤：scan（L4 广域扫描）
 * 下游消费者：decompose, capability-extract, evaluate
 */

// ── 类型定义 ──

export interface RawMaterial {
  id: string;
  title: string;
  url: string;
  source_tier: "T1" | "T2" | "T3";
  summary: string;
  date: string;
  relevance_tags: string[];
  fetch_status: "ok" | "failed";
  source_blocked: boolean;
  content_thin: boolean;
  date_inferred: boolean;
}

export interface RawMaterialsData {
  $schema: "raw-materials-v1";
  scan_meta: {
    scan_date: string;
    source_desc: string;
    topic: string;
    total_sources: number;
    successful_fetches: number;
    tier_distribution: { T1: number; T2: number; T3: number };
  };
  materials: RawMaterial[];
}

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

// ── 常量 ──

const TIER_VALUES = ["T1", "T2", "T3"] as const;
const FETCH_STATUS_VALUES = ["ok", "failed"] as const;

// ── Template（供 get_output_schema 返回）──

export const RAW_MATERIALS_TEMPLATE: RawMaterialsData = {
  $schema: "raw-materials-v1",
  scan_meta: {
    scan_date: "2026-01-01",
    source_desc: "（信息源描述）",
    topic: "（目标主题）",
    total_sources: 0,
    successful_fetches: 0,
    tier_distribution: { T1: 0, T2: 0, T3: 0 },
  },
  materials: [
    {
      id: "RM-01",
      title: "（文章标题）",
      url: "https://...",
      source_tier: "T3",
      summary: "（1-3 句摘要）",
      date: "2026-01-01",
      relevance_tags: ["（标签1）"],
      fetch_status: "ok",
      source_blocked: false,
      content_thin: false,
      date_inferred: false,
    },
  ],
};

// ── Field Rules ──

export const RAW_MATERIALS_FIELD_RULES: Record<
  string,
  { required: boolean; type: string; constraints?: string }
> = {
  "$schema": { required: true, type: "string", constraints: '"raw-materials-v1"' },
  "scan_meta.scan_date": { required: true, type: "string", constraints: "YYYY-MM-DD" },
  "scan_meta.source_desc": { required: true, type: "string" },
  "scan_meta.topic": { required: true, type: "string" },
  "scan_meta.total_sources": { required: true, type: "number" },
  "scan_meta.successful_fetches": { required: true, type: "number" },
  "scan_meta.tier_distribution": { required: true, type: "object" },
  "materials[].id": { required: true, type: "string", constraints: "RM-{序号}" },
  "materials[].title": { required: true, type: "string" },
  "materials[].url": { required: true, type: "string", constraints: "必须是有效 URL" },
  "materials[].source_tier": {
    required: true,
    type: "enum",
    constraints: TIER_VALUES.join(" | "),
  },
  "materials[].summary": { required: true, type: "string" },
  "materials[].date": { required: true, type: "string", constraints: "YYYY-MM-DD" },
  "materials[].relevance_tags": { required: true, type: "string[]" },
  "materials[].fetch_status": {
    required: true,
    type: "enum",
    constraints: FETCH_STATUS_VALUES.join(" | "),
  },
  "materials[].source_blocked": { required: true, type: "boolean" },
  "materials[].content_thin": { required: true, type: "boolean" },
  "materials[].date_inferred": { required: true, type: "boolean" },
};

// ── 校验函数 ──

function validateMaterial(item: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const path = `materials[${index}]`;

  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    errors.push({ path, message: "必须是对象", value: item });
    return errors;
  }

  const obj = item as Record<string, unknown>;

  // 必填字符串字段
  for (const field of ["id", "title", "url", "summary", "date"]) {
    if (typeof obj[field] !== "string" || (obj[field] as string).trim() === "") {
      errors.push({ path: `${path}.${field}`, message: `缺少必填字段: ${field}`, value: obj[field] });
    }
  }

  // URL 格式
  if (typeof obj.url === "string" && !obj.url.startsWith("http")) {
    errors.push({ path: `${path}.url`, message: "必须是有效 URL", value: obj.url });
  }

  // Enum: source_tier
  if (!TIER_VALUES.includes(obj.source_tier as typeof TIER_VALUES[number])) {
    errors.push({
      path: `${path}.source_tier`,
      message: `必须是: ${TIER_VALUES.join(" | ")}`,
      value: obj.source_tier,
    });
  }

  // Enum: fetch_status
  if (!FETCH_STATUS_VALUES.includes(obj.fetch_status as typeof FETCH_STATUS_VALUES[number])) {
    errors.push({
      path: `${path}.fetch_status`,
      message: `必须是: ${FETCH_STATUS_VALUES.join(" | ")}`,
      value: obj.fetch_status,
    });
  }

  // Boolean 字段
  for (const field of ["source_blocked", "content_thin", "date_inferred"]) {
    if (typeof obj[field] !== "boolean") {
      errors.push({ path: `${path}.${field}`, message: "必须是 boolean", value: obj[field] });
    }
  }

  // relevance_tags
  if (!Array.isArray(obj.relevance_tags)) {
    errors.push({ path: `${path}.relevance_tags`, message: "必须是数组", value: obj.relevance_tags });
  }

  return errors;
}

export function validateRawMaterials(data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  // $schema
  if (data.$schema !== "raw-materials-v1") {
    errors.push({ path: "$schema", message: '必须是 "raw-materials-v1"', value: data.$schema });
  }

  // scan_meta
  if (typeof data.scan_meta !== "object" || data.scan_meta === null) {
    errors.push({ path: "scan_meta", message: "必须是对象", value: data.scan_meta });
  } else {
    const meta = data.scan_meta as Record<string, unknown>;
    for (const field of ["scan_date", "source_desc", "topic"]) {
      if (typeof meta[field] !== "string" || (meta[field] as string).trim() === "") {
        errors.push({ path: `scan_meta.${field}`, message: "缺少必填字段", value: meta[field] });
      }
    }
    for (const field of ["total_sources", "successful_fetches"]) {
      if (typeof meta[field] !== "number") {
        errors.push({ path: `scan_meta.${field}`, message: "必须是 number", value: meta[field] });
      }
    }
    if (typeof meta.tier_distribution !== "object" || meta.tier_distribution === null) {
      errors.push({ path: "scan_meta.tier_distribution", message: "必须是对象" });
    }
  }

  // materials
  if (!Array.isArray(data.materials)) {
    errors.push({ path: "materials", message: "必须是数组", value: data.materials });
  } else {
    data.materials.forEach((item: unknown, i: number) => {
      errors.push(...validateMaterial(item, i));
    });
  }

  return errors;
}
