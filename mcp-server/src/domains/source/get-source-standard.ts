/**
 * get_source_standard — 信源分级标准查询工具
 *
 * 返回统一的 tier 定义 + 评估标准 + 分类规则。
 * 所有 process 文档中的 tier 描述应引用此工具的返回值，而非各自定义。
 */

import { BaseTool, ToolDefinition } from "../../core/base-tool.js";

/** 信源分级标准（只读） */
export const SOURCE_STANDARD = {
  $schema: "source-standard-v1",
  summary: "信源分级标准 — 用于 scan、capability-extract 等阶段的域名分级和内容评估",

  /** ⚠️ 以下是各 tier 的语义定义。T0 实际域名列表请通过 MCP get_t0_sources 获取。 */
  tiers: {
    T0: {
      name: "官方文档与规范",
      description:
        "Web 标准组织、浏览器厂商官方文档、框架官方文档、规范原文。最高可信度，作为事实来源。",
      trust_level: 1.0,
      examples: [
        "developer.mozilla.org",
        "w3c.github.io",
        "whatwg.org",
        "vuejs.org",
        "react.dev",
      ],
      criteria: [
        "域名属于 T0 内置映射或官方认证的技术文档站点",
        "内容为技术规范、API 参考、框架官方教程",
        "无需经过内容评估，直接采用",
      ],
    },
    T1: {
      name: "大厂技术博客与官方文章",
      description:
        "知名技术公司官方博客或技术平台上的高质量文章。高可信度，作为补充验证和工程实践参考。",
      trust_level: 0.8,
      examples: [
        "engineering.fb.com",
        "netflixtechblog.com",
        "developers.cloudflare.com",
        "web.dev",
      ],
      criteria: [
        "有明确公司/组织背景的作者或团队",
        "文章具有技术深度，包含原理分析和代码示例",
        "内容时效性在 2 年内",
        "篇幅 > 500 字实质内容",
      ],
    },
    T2: {
      name: "优质社区内容",
      description:
        "技术社区中有深度、有实践参考价值的高质量分享。中等可信度，作为热点判断和工程经验参考。",
      trust_level: 0.5,
      examples: [
        "juejin.cn",
        "segmentfault.com",
        "stackoverflow.com",
        "medium.com",
      ],
      criteria: [
        "内容有原创性，非简单翻译或抄袭拼凑",
        "有具体的技术分析、性能数据或项目背景",
        "时效性在 1 年内（前端领域建议 6 个月内）",
        "篇幅 > 500 字实质内容",
      ],
    },
    T3: {
      name: "一般社区与聚合内容",
      description:
        "个人博客、低质转载、AI 生成内容、教程聚合站。参考价值有限，仅用于了解话题热度和广度。",
      trust_level: 0.2,
      examples: [
        "cnblogs.com",
        "csdn.net",
        "v2ex.com",
        "nowcoder.com",
      ],
      criteria: [
        "内容可能有原创性不足、转载来源不明确等问题",
        "纯入门科普或过于浅显的技术笔记",
        "时效性要求较宽松，但因转载可能存在信息滞后",
        "降级为 T3 或直接丢弃（由具体流程判定）",
      ],
    },
  },

  /** 未知域名内容评估标准 */
  unknown_evaluation: {
    description:
      "classify_sources 返回 unknown 的域名，需通过 web_fetch 获取内容后按以下维度评估",
    dimensions: [
      {
        name: "篇幅",
        passing: "> 500 字实质内容（非代码、非模板填充）",
        failing: "< 200 字或纯标题党、无正文",
      },
      {
        name: "专业度",
        passing: "有技术深度，包含代码示例、原理分析或性能数据",
        failing: "纯入门科普、AI 模板生成、抄袭拼凑痕迹明显",
      },
      {
        name: "时效性",
        passing: "前端领域近 1 年，其他领域近 2 年内",
        failing: "过时内容，技术栈版本已多次迭代",
      },
      {
        name: "来源可信",
        passing: "有明确作者署名、公司/组织背景",
        failing: "匿名、无来源标注、内容农场特征",
      },
    ],
    verdict: {
      pass: "达到全部或大部分维度 → 调 register_source 注册到动态池",
      fail: "多数维度不达标 → 丢弃或标记为 T3 最低参考",
    },
  },

  /** 分类规则 */
  classification_rules: {
    blacklist_policy:
      "命中 blacklist 的域名直接标记为 T3（最低级），不参与内容评估。blacklist 中的域名不进入动态池。",
    t0_builtin_override:
      "T0 内置信源直接返回 T0 分级，不进入 unknown 评估流程。T0 列表在 MCP 服务端硬编码，不可通过 register_source 修改。",
    dynamic_pool_merge:
      "register_source 注册的域名写入 pool 后立即生效。后续 classify_sources 调用自动命中动态池。同一域名重复注册会覆盖 tier 和 reason。",
    cross_scan_persistence:
      "动态池持久化在 {workDir}/.meta/sources/dynamic-sources.json 中，每次 scan 独立积累。跨 scan 共享机制待设计。",
  },
};

export class GetSourceStandardTool extends BaseTool {
  readonly name = "get_source_standard";
  readonly description =
    "Get the source classification standard: tier definitions, evaluation criteria, and classification rules. Call this at the start of any process that needs to classify source quality.";

  getInputSchema(): ToolDefinition["inputSchema"] {
    return {
      type: "object",
      properties: {},
      required: [],
    };
  }

  async execute(_args: Record<string, any>): Promise<any> {
    return SOURCE_STANDARD;
  }
}
