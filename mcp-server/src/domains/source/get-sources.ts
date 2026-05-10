import { BaseTool, ToolDefinition } from "../../core/base-tool.js";
import { sourceRegistry } from "./registry.js";
import { SourceDomain } from "./types.js";

/**
 * 根据能力名称或关键词获取相关技术域
 */
export function getTechDomainsForCapability(capabilityName: string): string[] {
  const domains = new Set<string>();
  
  // 直接匹配
  if (sourceRegistry.capability_to_tech_domain[capabilityName]) {
    sourceRegistry.capability_to_tech_domain[capabilityName].forEach(d => domains.add(d));
  }
  
  // 关键词匹配
  for (const [keyword, techDomains] of Object.entries(sourceRegistry.capability_to_tech_domain)) {
    if (capabilityName.includes(keyword)) {
      techDomains.forEach(d => domains.add(d));
    }
  }
  
  return Array.from(domains);
}

/**
 * 获取指定技术域的 T1 域名列表
 */
export function getT1Domains(techDomain: string): SourceDomain[] {
  return sourceRegistry.source_domain_map[techDomain]?.t1 || [];
}

/**
 * 获取指定技术域的 T2 域名列表
 */
export function getT2Domains(techDomain: string): SourceDomain[] {
  return sourceRegistry.source_domain_map[techDomain]?.t2 || [];
}

/**
 * 检查域名是否在黑名单中
 */
export function isBlacklisted(domain: string): boolean {
  return sourceRegistry.blacklist.some(entry => entry.domain === domain);
}

export class GetSourcesTool extends BaseTool {
  readonly name = "get_sources";
  readonly description = "Get source registry (whitelist/blacklist)";

  getInputSchema(): ToolDefinition["inputSchema"] {
    return {
      type: "object",
      properties: {
        capability_name: {
          type: "string",
          description: "Capability name to get tech domains for",
        },
        tech_domain: {
          type: "string",
          description: "Specific tech domain to get sources for",
        },
        include_blacklist: {
          type: "boolean",
          description: "Whether to include blacklist in response",
          default: true,
        },
      },
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const { capability_name, tech_domain, include_blacklist = true } = args;

    try {
      // 如果指定了技术域，返回该域的 T1/T2 域名
      if (tech_domain) {
        const t1 = getT1Domains(tech_domain);
        const t2 = getT2Domains(tech_domain);
        
        return {
          tech_domain,
          t1,
          t2,
          description: sourceRegistry.source_domain_map[tech_domain]?.description || "",
        };
      }

      // 如果指定了能力名称，返回相关技术域的域名
      if (capability_name) {
        const techDomains = getTechDomainsForCapability(capability_name);
        
        const result: Record<string, any> = {
          capability_name,
          tech_domains: techDomains,
          sources: {},
        };

        for (const domain of techDomains) {
          result.sources[domain] = {
            t1: getT1Domains(domain),
            t2: getT2Domains(domain),
            description: sourceRegistry.source_domain_map[domain]?.description || "",
          };
        }

        if (include_blacklist) {
          result.blacklist = sourceRegistry.blacklist;
        }

        return result;
      }

      // 默认返回完整注册表
      return {
        source_domain_map: sourceRegistry.source_domain_map,
        blacklist: include_blacklist ? sourceRegistry.blacklist : [],
        capability_to_tech_domain: sourceRegistry.capability_to_tech_domain,
      };
    } catch (error) {
      return {
        error: "Failed to get sources",
        message: (error as Error).message,
      };
    }
  }
}
