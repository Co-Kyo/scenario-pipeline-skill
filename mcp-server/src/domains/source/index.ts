/**
 * 信源管理域 - 模块入口
 * 导出信源相关工具和类型
 */

export { GetSourcesTool } from "./get-sources.js";
export { getTechDomainsForCapability, getT1Domains, getT2Domains, isBlacklisted } from "./get-sources.js";
export type { SourceDomain, TechDomain, BlacklistEntry, SourceRegistry } from "./types.js";
export { sourceRegistry } from "./registry.js";
