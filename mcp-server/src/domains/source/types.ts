/**
 * 信源类型定义
 */

export interface SourceDomain {
  domain: string;
  name: string;
  search_hint: string;
}

export interface TechDomain {
  description: string;
  t1: SourceDomain[];
  t2: SourceDomain[];
}

export interface BlacklistEntry {
  domain: string;
  reason: string;
  added: string;
}

export interface SourceRegistry {
  source_domain_map: Record<string, TechDomain>;
  blacklist: BlacklistEntry[];
  capability_to_tech_domain: Record<string, string[]>;
}
