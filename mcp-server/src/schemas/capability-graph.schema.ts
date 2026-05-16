/**
 * capability-graph.json Schema
 * 对应管线步骤：capability-extract（L3 原子能力提取）
 * 下游消费者：highground-identify, evaluate, 后处理 capability-research
 */

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

export const CAPABILITY_GRAPH_TEMPLATE = {
  $schema: "capability-graph-v1",
  meta: {
    scan_date: "2026-01-01",
    target_years: "L2",
    total_propositions: 6,
    scan_scope: "（扫描范围描述）",
  },
  capabilities: [
    {
      id: "A1",
      name: "（能力名称）",
      layer: "（技术层）",
      description: "（简述）",
      source_domain: "（技术域）",
      fanout: { count: 0, total: 0, ratio: "0/0", level: "（核心|重要|辅助）" },
      coupling: 1,
      covers: ["P1"],
      dependencies: [],
      tags: ["（标签）"],
      references: {
        t1: [{ url: "https://...", title: "（标题）", verified: true }],
        t2: [],
        t1_missing: false,
      },
    },
  ],
  dependency_graph: {},
  qualifier_injection: {},
  highgrounds: [],
  learning_path: [],
  /**
   * propositions — 命题元数据（可选，由 submit_output 在 capability-extract 时自动注入）
   * 用于后处理模板（assemble/briefing-assemble/learning-ladder），
   * 使后处理只需读取 capability-graph.json，不再依赖 decompositions.json。
   * 格式同 decompositions.json 的 decompositions 数组。
   */
  propositions: [],
};

export const CAPABILITY_GRAPH_FIELD_RULES: Record<string, { required: boolean; type: string; constraints?: string }> = {
  "$schema": { required: true, type: "string", constraints: '"capability-graph-v1"' },
  "meta.scan_date": { required: true, type: "string" },
  "meta.target_years": { required: true, type: "string" },
  "meta.total_propositions": { required: true, type: "number" },
  "meta.scan_scope": { required: true, type: "string" },
  "capabilities[].id": { required: true, type: "string", constraints: "A{序号} / V{序号} / R{序号} 等" },
  "capabilities[].name": { required: true, type: "string" },
  "capabilities[].layer": { required: true, type: "string" },
  "capabilities[].fanout": { required: true, type: "object", constraints: "必须是 {count, total, ratio, level}，禁止简化为数字" },
  "capabilities[].coupling": { required: true, type: "number" },
  "capabilities[].covers": { required: true, type: "string[]" },
  "capabilities[].dependencies": { required: true, type: "string[]", constraints: "空数组表示无前置依赖" },
  "capabilities[].tags": { required: true, type: "string[]", constraints: "≥1 个标签" },
  "capabilities[].references": { required: true, type: "object", constraints: "必须是 {t1, t2, t1_missing}，禁止简化为 URL 字符串" },
  "dependency_graph": { required: true, type: "object" },
  "qualifier_injection": { required: true, type: "object" },
};

export function validateCapabilityGraph(data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (data.$schema !== "capability-graph-v1") {
    errors.push({ path: "$schema", message: '必须是 "capability-graph-v1"', value: data.$schema });
  }
  if (typeof data.meta !== "object" || data.meta === null) {
    errors.push({ path: "meta", message: "必须是对象" });
  }
  if (!Array.isArray(data.capabilities)) {
    errors.push({ path: "capabilities", message: "必须是数组" });
  } else {
    data.capabilities.forEach((item: unknown, i: number) => {
      if (typeof item !== "object" || item === null) return;
      const obj = item as Record<string, unknown>;
      const p = `capabilities[${i}]`;
      for (const f of ["id", "name", "layer", "description", "source_domain"]) {
        if (typeof obj[f] !== "string") errors.push({ path: `${p}.${f}`, message: "必须是 string" });
      }
      if (typeof obj.fanout !== "object" || obj.fanout === null) {
        errors.push({ path: `${p}.fanout`, message: "必须是对象 {count, total, ratio, level}，禁止简化为数字" });
      }
      if (!Array.isArray(obj.covers)) errors.push({ path: `${p}.covers`, message: "必须是数组" });
      if (!Array.isArray(obj.dependencies)) errors.push({ path: `${p}.dependencies`, message: "必须是数组" });
      if (!Array.isArray(obj.tags) || (obj.tags as unknown[]).length === 0) {
        errors.push({ path: `${p}.tags`, message: "必须是非空数组" });
      }
      if (typeof obj.references !== "object" || obj.references === null) {
        errors.push({ path: `${p}.references`, message: "必须是对象 {t1, t2, t1_missing}" });
      }
    });
  }
  if (typeof data.dependency_graph !== "object") errors.push({ path: "dependency_graph", message: "必须是对象" });
  if (typeof data.qualifier_injection !== "object") errors.push({ path: "qualifier_injection", message: "必须是对象" });
  return errors;
}
