import { BaseTool, ToolDefinition } from "../../core/base-tool.js";
import { resolvePaths, validateParams, PathTemplates } from "./path-config.js";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * L2 模板执行层 — 架构分级设计
 *
 * Layer 1: 参数解析（最小输入 → 路径解析）
 * Layer 2: 数据加载（从 .meta/ 读取完整上下文）
 * Layer 3: 模板加载（从 templates/ 读取模板内容）
 * Layer 4: 变量替换（模板 + 数据 → 完整执行指令）
 *
 * 设计目标：
 * - 主 agent 只传 capability_id + workDir（或 seq + short_name + workDir）
 * - get_template 内部从 .meta/ 读取所有上下文
 * - 模板内容存储在 templates/*.md，便于维护
 * - 返回完整执行指令，子 agent 无需读取其他文档
 */

// ============ 类型定义 ============

interface TemplateParams {
  workDir: string;
  capability_id?: string;
  capability_name?: string;
  seq?: string;
  short_name?: string;
  [key: string]: any;
}

interface CapabilityData {
  id: string;
  name: string;
  layer: string;
  description: string;
  source_domain: string;
  fanout: { count: number; total: number; ratio: string; level: string };
  coupling: number;
  covers: string[];
  dependencies: string[];
  tags: string[];
  references: {
    t0: { url: string; title: string; verified: boolean }[];
    t1: { url: string; title: string; verified: boolean }[];
    t2: { url: string; title: string; verified: boolean }[];
    t3: { url: string; title: string; verified: boolean }[];
    t0_missing: boolean;
  };
}

interface PropositionData {
  proposition_id: string;
  proposition: string;
  qualifier: string;
  tech_keyword: string;
  generic_core: { layer: string; capabilities: string[] }[];
  specialization: { layer: string; capabilities: string[] }[];
  content_weight: string;
  weight_reasoning: string;
}

// ============ Layer 2: 数据加载层 ============

async function loadCapabilityGraph(workDir: string): Promise<CapabilityData[]> {
  const graphPath = path.join(workDir, ".meta", "capability-graph.json");
  try {
    const content = await fs.readFile(graphPath, "utf-8");
    const data = JSON.parse(content);
    return data.capabilities || [];
  } catch (error) {
    return [];
  }
}

/**
 * 加载命题元数据 — 优先从 capability-graph.json.propositions 读取（§5.1 解耦），
 * 降级到 decompositions.json（旧格式兼容）。
 * 后处理模板只需 capability-graph.json + briefings/，不再必需 decompositions.json。
 */
async function loadPropositions(workDir: string): Promise<PropositionData[]> {
  // 优先从能力图谱获取（submit_output 在 capability-extract 步骤自动注入）
  const graphPath = path.join(workDir, ".meta", "capability-graph.json");
  try {
    const content = await fs.readFile(graphPath, "utf-8");
    const data = JSON.parse(content);
    if (Array.isArray(data.propositions) && data.propositions.length > 0) {
      return data.propositions;
    }
  } catch {
    // capability-graph.json 不存在 — 降级
  }
  // 降级：从 decompositions.json 读取
  return loadDecompositions(workDir);
}

async function loadDecompositions(workDir: string): Promise<PropositionData[]> {
  const decompPath = path.join(workDir, ".meta", "decompositions.json");
  try {
    const content = await fs.readFile(decompPath, "utf-8");
    const data = JSON.parse(content);
    // decompositions.json 格式: {$schema, decompositions: [...]}
    return data.decompositions || [];
  } catch (error) {
    return [];
  }
}

async function loadCapabilitySummary(
  workDir: string,
  capabilityId: string
): Promise<any> {
  const summariesDir = path.join(workDir, ".meta", "summaries");
  try {
    const files = await fs.readdir(summariesDir);
    const matchFile = files.find(
      (f) => f.startsWith(capabilityId + "-") && f.endsWith(".json")
    );
    if (matchFile) {
      const content = await fs.readFile(path.join(summariesDir, matchFile), "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {}
  return null;
}

async function loadPropositionCapabilities(
  workDir: string,
  propositionId: string
): Promise<string[]> {
  const capabilities = await loadCapabilityGraph(workDir);
  return capabilities
    .filter((cap) => cap.covers.includes(propositionId))
    .map((cap) => cap.id);
}

// ============ Layer 3: 模板加载层 ============

const TEMPLATES_DIR = path.join(import.meta.dirname, "templates");

async function loadTemplate(templateType: string): Promise<string> {
  const templatePath = path.join(TEMPLATES_DIR, `${templateType}.md`);
  try {
    return await fs.readFile(templatePath, "utf-8");
  } catch (error) {
    throw new Error(`Template file not found: ${templatePath}`);
  }
}

// ============ Layer 4: 变量替换层 ============

function replaceVariables(
  template: string,
  variables: Record<string, any>
): string {
  let result = template;

  // 处理嵌套对象占位符 {{paths.xxx}}
  for (const [key, value] of Object.entries(variables)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      for (const [subKey, subValue] of Object.entries(value as Record<string, any>)) {
        const pattern = `{{${key}.${subKey}}}`;
        result = result.split(pattern).join(String(subValue));
      }
    }
  }

  // 替换所有 {{key}} 格式的占位符
  for (const [key, value] of Object.entries(variables)) {
    if (typeof value === "string") {
      result = result.split(`{{${key}}}`).join(value);
    } else if (Array.isArray(value)) {
      const arrayStr = value
        .map((item: any) =>
          typeof item === "object" ? `- ${item.url} (${item.title})` : `- ${item}`
        )
        .join("\n");
      result = result.split(`{{${key}}}`).join(arrayStr);
    } else if (typeof value === "object" && value !== null) {
      const objStr = JSON.stringify(value, null, 2);
      result = result.split(`{{${key}}}`).join(objStr);
    }
  }

  return result;
}

// ============ 变量构建层 ============

function buildCapabilityVariables(
  capability: CapabilityData,
  paths: PathTemplates
): Record<string, any> {
  // 按 tier 优先级排序，只输出非空列表
  const tierLabels: Array<{ key: keyof CapabilityData["references"]; label: string }> = [
    { key: "t0", label: "[T0] 官方/规范" },
    { key: "t1", label: "[T1] 大厂技术博客" },
    { key: "t2", label: "[T2] 优质社区" },
    { key: "t3", label: "[T3] 一般社区" },
  ];
  const allUrls = tierLabels
    .filter(({ key }) => {
      const refs = capability.references[key];
      return Array.isArray(refs) && refs.length > 0;
    })
    .map(({ key, label }) => {
      const refs = capability.references[key] as { url: string; title: string; verified: boolean }[];
      return refs.map((r) => `- ${label} ${r.title}: ${r.url}`).join("\n");
    })
    .join("\n");

  return {
    paths,
    capability_id: capability.id,
    capability_name: capability.name,
    capability_layer: capability.layer,
    capability_description: capability.description,
    capability_tags: capability.tags.join(", "),
    capability_dependencies: capability.dependencies.length > 0
      ? capability.dependencies.join(", ")
      : "无",
    capability_fanout_ratio: capability.fanout.ratio,
    capability_fanout_level: capability.fanout.level,
    capability_coupling: String(capability.coupling),
    urls: allUrls || "⚠️ 无预查找信源，请使用 Fallback 搜索流程",
    t0_missing: capability.references.t0_missing ? "是" : "否",
  };
}

async function loadBriefingContent(
  workDir: string,
  seq: string,
  shortName: string
): Promise<string> {
  // 尝试两种命名格式:
  // 1. P{n}-{shortName}.md (现有格式)
  // 2. {seq}-{shortName}.md (新格式)
  const briefingsDir = path.join(workDir, ".meta", "briefings");
  const seqNum = parseInt(seq, 10);

  try {
    const files = await fs.readdir(briefingsDir);
    // 优先查找 P{n}- 格式
    const pFormat = files.find(
      (f) => f.startsWith(`P${seqNum}-`) && f.endsWith(".md")
    );
    if (pFormat) {
      return await fs.readFile(path.join(briefingsDir, pFormat), "utf-8");
    }
    // 回退查找 {seq}- 格式
    const seqFormat = files.find(
      (f) => f.startsWith(`${seq}-`) && f.endsWith(".md")
    );
    if (seqFormat) {
      return await fs.readFile(path.join(briefingsDir, seqFormat), "utf-8");
    }
  } catch (error) {}
  return "";
}

function buildAssembleVariables(
  proposition: PropositionData,
  capabilityIds: string[],
  briefingContent: string,
  paths: PathTemplates
): Record<string, any> {
  return {
    paths,
    proposition_id: proposition.proposition_id,
    proposition_proposition: proposition.proposition,
    proposition_qualifier: proposition.qualifier,
    proposition_tech_keyword: proposition.tech_keyword,
    proposition_content_weight: proposition.content_weight,
    proposition_weight_reasoning: proposition.weight_reasoning,
    capability_ids: capabilityIds.map((id) => `- ${id}`).join("\n"),
    generic_core: proposition.generic_core
      .map((g) => `- ${g.layer}: ${g.capabilities.join(", ")}`)
      .join("\n"),
    specialization: proposition.specialization
      .map((s) => `- ${s.layer}: ${s.capabilities.join(", ")}`)
      .join("\n"),
    briefing: briefingContent || "⚠️ Briefing 内容缺失，请检查阶段一是否完成",
  };
}

function buildBriefingAssembleVariables(
  propositionId: string,
  propositionName: string,
  capabilityIds: string[],
  paths: PathTemplates
): Record<string, any> {
  return {
    paths,
    proposition_id: propositionId,
    proposition_name: propositionName,
    capability_ids: capabilityIds.map((id) => `- ${id}`).join("\n"),
  };
}

function buildLearningLadderVariables(
  propositionId: string,
  propositionName: string,
  capabilityIds: string[],
  capabilityGraph: CapabilityData[],
  paths: PathTemplates
): Record<string, any> {
  const relevantCapabilities = capabilityGraph.filter((cap) =>
    capabilityIds.includes(cap.id)
  );
  const dependencyEdges = relevantCapabilities
    .filter((cap) => cap.dependencies.length > 0)
    .flatMap((cap) =>
      cap.dependencies
        .filter((dep) => capabilityIds.includes(dep))
        .map((dep) => `${dep} → ${cap.id}`)
    );

  const capabilityDetails = relevantCapabilities
    .map(
      (cap) => `
### ${cap.id} - ${cap.name}
- 技术层: ${cap.layer}
- 描述: ${cap.description}
- 扇出度: ${cap.fanout.ratio}（${cap.fanout.level}）
- 依赖: ${cap.dependencies.length > 0 ? cap.dependencies.join(", ") : "无"}
`
    )
    .join("\n");

  return {
    paths,
    proposition_id: propositionId,
    proposition_name: propositionName,
    capability_ids: capabilityIds.map((id) => `- ${id}`).join("\n"),
    dependency_edges: dependencyEdges.length > 0
      ? dependencyEdges.map((e) => `- ${e}`).join("\n")
      : "- 无依赖关系（所有能力可并行学习）",
    capability_details: capabilityDetails,
  };
}

// ============ 主工具类 ============

export class GetTemplateTool extends BaseTool {
  readonly name = "get_template";
  readonly description =
    "Get self-contained agent task template. Reads from .meta/ to provide complete execution instructions.";

  getInputSchema(): ToolDefinition["inputSchema"] {
    return {
      type: "object",
      properties: {
        template_type: {
          type: "string",
          description:
            'Template type: "capability-research", "assemble", "briefing-assemble", "learning-ladder"',
          enum: [
            "capability-research",
            "assemble",
            "briefing-assemble",
            "learning-ladder",
          ],
        },
        workDir: {
          type: "string",
          description:
            "Pipeline output root directory (absolute path, required)",
        },
        capability_id: {
          type: "string",
          description:
            'Capability ID for capability-research (e.g., "A1")',
        },
        capability_name: {
          type: "string",
          description:
            "Capability name for capability-research (optional, auto-derived from .meta/capability-graph.json if omitted)",
        },
        seq: {
          type: "string",
          description:
            'Proposition sequence number for assemble/briefing-assemble/learning-ladder (e.g., "01")',
        },
        short_name: {
          type: "string",
          description:
            'Proposition short name for assemble/briefing-assemble/learning-ladder (e.g., "长列表渲染", auto-derived if omitted)',
        },
      },
      required: ["template_type", "workDir"],
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const { template_type, ...params } = args as any;

    // ── Layer 0: 前置校验（必须在数据加载前执行，避免 path.join(undefined) 抛底层错误） ──
    if (!template_type) {
      return { error: "缺少必填参数: template_type" };
    }
    if (!params.workDir) {
      return { error: "缺少必填参数: workDir" };
    }

    // Layer 1: 参数解析（基础校验：workDir 等）
    // Layer 2: 数据加载（先加载数据，再自动推导缺失参数）
    const capabilities = await loadCapabilityGraph(params.workDir);
    const decompositions = await loadPropositions(params.workDir);

    // 自动推导 capability_name（capability-research 模板需要）
    if (template_type === "capability-research" && params.capability_id && !params.capability_name) {
      const cap = capabilities.find((c) => c.id === params.capability_id);
      if (cap) {
        params.capability_name = cap.name;
      }
    }

    // 自动推导完成后，执行完整参数校验
    const validation = validateParams(template_type, params);
    if (!validation.valid) {
      return {
        error: `Missing required parameters for ${template_type}: ${validation.missing.join(
          ", "
        )}`,
        template_type,
        missing: validation.missing,
      };
    }

    // 对于 assemble/briefing-assemble/learning-ladder，自动推导 short_name
    if (["assemble", "briefing-assemble", "learning-ladder"].includes(template_type)) {
      const proposition = decompositions.find(
        (d) => d.proposition_id === `P${parseInt(params.seq, 10)}`
      );
      if (proposition && !params.short_name) {
        // 从命题名称中提取 short_name（按"："或":"分割）
        params.short_name = proposition.proposition.split("：")[0].split(":")[0].trim();
      }
    }

    // 路径解析（在数据加载后，确保 short_name 已推导）
    const paths = resolvePaths(template_type, params);

    // Layer 3: 模板加载
    let template: string;
    try {
      template = await loadTemplate(template_type);
    } catch (error) {
      return {
        error: `Failed to load template: ${template_type}`,
        template_type,
      };
    }

    // Layer 4: 变量替换
    let variables: Record<string, any>;

    switch (template_type) {
      case "capability-research": {
        const capability = capabilities.find(
          (c) => c.id === params.capability_id
        );
        if (!capability) {
          return {
            error: `Capability not found: ${params.capability_id}`,
            template_type,
          };
        }
        variables = buildCapabilityVariables(capability, paths);
        break;
      }

      case "assemble": {
        const proposition = decompositions.find(
          (d) => d.proposition_id === `P${parseInt(params.seq, 10)}`
        );
        if (!proposition) {
          return {
            error: `Proposition not found for seq: ${params.seq}`,
            template_type,
          };
        }
        const capabilityIds = await loadPropositionCapabilities(
          params.workDir,
          proposition.proposition_id
        );
        const briefingContent = await loadBriefingContent(
          params.workDir,
          params.seq,
          params.short_name  // 已在 Layer 2 中自动推导
        );
        variables = buildAssembleVariables(proposition, capabilityIds, briefingContent, paths);
        break;
      }

      case "briefing-assemble": {
        const proposition = decompositions.find(
          (d) => d.proposition_id === `P${parseInt(params.seq, 10)}`
        );
        if (!proposition) {
          return {
            error: `Proposition not found for seq: ${params.seq}`,
            template_type,
          };
        }
        const capabilityIds = await loadPropositionCapabilities(
          params.workDir,
          proposition.proposition_id
        );
        variables = buildBriefingAssembleVariables(
          proposition.proposition_id,
          proposition.proposition,
          capabilityIds,
          paths
        );
        break;
      }

      case "learning-ladder": {
        const proposition = decompositions.find(
          (d) => d.proposition_id === `P${parseInt(params.seq, 10)}`
        );
        if (!proposition) {
          return {
            error: `Proposition not found for seq: ${params.seq}`,
            template_type,
          };
        }
        const capabilityIds = await loadPropositionCapabilities(
          params.workDir,
          proposition.proposition_id
        );
        variables = buildLearningLadderVariables(
          proposition.proposition_id,
          proposition.proposition,
          capabilityIds,
          capabilities,
          paths
        );
        break;
      }

      default:
        return {
          error: `Unknown template type: ${template_type}`,
          template_type,
        };
    }

    // 替换变量
    const result = replaceVariables(template, variables);

    return {
      template_type,
      template: result,
      params,
      paths,
      data_loaded: {
        capabilities_count: capabilities.length,
        propositions_count: decompositions.length,
      },
    };
  }
}
