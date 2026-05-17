/**
 * 信源管理域 — 动态 filter 架构
 */

export { ClassifySourcesTool } from "./classify-sources.js";
export { RegisterSourceTool } from "./register-source.js";
export { GetSourceStandardTool } from "./get-source-standard.js";
export { GetT0SourcesTool } from "./get-t0-sources.js";
export { classifyDomain, classifyDomains, registerSource, getRegistry } from "./registry.js";
export type { T0Source, DynamicSource, ClassifyResult, RegisterSourceInput, SourceRegistry } from "./types.js";
