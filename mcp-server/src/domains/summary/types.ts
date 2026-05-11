/**
 * Summary domain type definitions
 * Aligns with capability-research.md Step 8 schema
 */

export interface BottleneckItem {
  name: string;
  category: "输入变异" | "状态跃迁" | "资源边界" | "规模拐点" | "时序竞争";
  priority: "P0" | "P1" | "P2" | "P3";
  trigger: string;
  symptom: string;
  version_sensitive: "none" | "weak" | "strong";
  affected_tool: string | null;
  affected_versions: string | null;
  fixed_version: string | null;
  fixed_source: string | null;
}

export interface TradeoffItem {
  dimension: string;
  option_a: string;
  option_b: string;
  suggestion: string;
}

export interface ReferenceItem {
  tier: "T1" | "T2";
  url: string;
  title: string;
}

export interface SummaryData {
  id: string;
  name: string;
  tech_layer: string;
  fanout: string;
  coupling: number;
  strategic_value: number;
  mechanism_summary: string;
  bottlenecks: BottleneckItem[];
  tradeoffs: TradeoffItem[];
  experiment_code: string | null;
  references: ReferenceItem[];
}

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

export interface SubmitSummaryResult {
  valid: boolean;
  file_path?: string;
  errors: ValidationError[];
  warnings: string[];
}
