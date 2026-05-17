/**
 * 信源类型定义 — 动态 filter 架构
 */

/** T0 内置信源条目 */
export interface T0Source {
  domain: string;
  name: string;
  tier: "T0";
}

/** 动态发现的信源条目 */
export interface DynamicSource {
  domain: string;
  tier: "T1" | "T2" | "T3";
  reason: string;
  discovered_by: string;
  discovered_at: string;
}

/** classify_sources 的单条输出 */
export interface ClassifyResult {
  domain: string;
  tier: "T0" | "T1" | "T2" | "T3" | "unknown";
  source: "builtin" | "dynamic" | "unknown";
  name?: string;
  reason?: string;
}

/** register_source 的输入 */
export interface RegisterSourceInput {
  domain: string;
  tier: "T1" | "T2" | "T3";
  reason: string;
  discovered_by?: string;
}

/** 信源注册表（运行时状态） */
export interface SourceRegistry {
  t0: Record<string, string>;
  dynamic: Record<string, DynamicSource>;
  blacklist: string[];
}
