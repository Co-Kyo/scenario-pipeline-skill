import { BaseTool, ToolDefinition } from "./base.js";
import { sourceRegistry, getTechDomainsForCapability, getT1Domains, getT2Domains } from "./source-data.js";

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
