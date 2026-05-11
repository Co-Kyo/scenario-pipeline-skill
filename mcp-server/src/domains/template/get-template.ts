import { BaseTool, ToolDefinition } from "../../core/base-tool.js";
import { resolvePaths, validateParams } from "./path-config.js";

export class GetTemplateTool extends BaseTool {
  readonly name = "get_template";
  readonly description = "Get agent task template for capability research";

  private templates: Record<string, string> = {
    "capability-research": `你是 {{capability_name}} 的深度研究员。

## 任务
研究原子能力 "{{capability_name}}"（ID: {{capability_id}}），产出两个文件：
1. 能力知识库主文件（{{paths.capability_file}}）
2. 结构化摘要 JSON（{{paths.capability_summary}}）

## 信源
{{urls}}

## 执行步骤
1. 获取并阅读官方文档内容（禁止凭记忆生成）
2. 按照 processes/capability-research.md 中的 Step 1-8 执行研究
3. 产出主文件和摘要 JSON
4. 将产出保存到指定位置`,

    "assemble": `你是 {{proposition}} 的组装专家。

## 任务
为命题 "{{proposition}}" 组装 {{file_type}} 文件。

## 输入
- 命题文本：{{proposition}}
- 分词结果：{{decomposition}}
- Briefing 内容：{{briefing}}

## 执行步骤
1. 按照 processes/assemble.md 中的 Step 1-6 执行组装
2. 产出 {{file_type}} 文件
3. 将产出保存到 {{paths.proposition_dir}}/ 目录`,

    "briefing-assemble": `你是 {{proposition}} 的 Briefing 组装专家。

## 任务
为命题 "{{proposition}}" 组装 Briefing 文档。

## 输入
- 命题文本：{{proposition}}
- 能力ID列表：{{capability_ids}}
- 能力摘要：{{summary_files}}

## 执行步骤
1. 按照 processes/briefing-assemble.md 执行组装
2. 产出 Briefing 文档
3. 将产出保存到 {{paths.briefing}}`,

    "learning-ladder": `你是 {{proposition}} 的学习阶梯生成专家。

## 任务
为命题 "{{proposition}}" 生成学习阶梯文档。

## 输入
- 命题文本：{{proposition}}
- 能力依赖图：{{capability_graph}}
- 能力摘要：{{summaries}}
- 命题产出文件：{{proposition_files}}

## 执行步骤
1. 按照 processes/learning-ladder.md 执行生成
2. 产出学习阶梯文档
3. 将产出保存到 {{paths.proposition_learning_ladder}}`
  };

  getInputSchema(): ToolDefinition["inputSchema"] {
    return {
      type: "object",
      properties: {
        template_type: {
          type: "string",
          description: 'Template type: "capability-research", "assemble", "briefing-assemble", "learning-ladder"',
          enum: ["capability-research", "assemble", "briefing-assemble", "learning-ladder"],
        },
        params: {
          type: "object",
          description: "Template parameters",
          properties: {
            workDir: {
              type: "string",
              description: "Pipeline output root directory (absolute path, required)",
            },
            seq: {
              type: "string",
              description: "Proposition sequence number, e.g. '01', '02'",
            },
            short_name: {
              type: "string",
              description: "Proposition short name in Chinese, e.g. '长列表渲染'",
            },
            capability_id: {
              type: "string",
              description: "Capability ID, e.g. 'A1'",
            },
            capability_name: {
              type: "string",
              description: "Capability name in Chinese, e.g. '浏览器渲染管线'",
            },
            urls: {
              type: "array",
              description: "Reference URLs for capability research",
              items: { type: "string" },
            },
            proposition: {
              type: "string",
              description: "Proposition text",
            },
            decomposition: {
              type: "string",
              description: "Architecture decomposition result",
            },
            briefing: {
              type: "string",
              description: "Briefing content",
            },
            file_type: {
              type: "string",
              description: 'File type for assembly: "markdown" or "experiment"',
              enum: ["markdown", "experiment"],
            },
            capability_ids: {
              type: "string",
              description: "Comma-separated capability IDs for briefing assembly",
            },
            summary_files: {
              type: "string",
              description: "Capability summary files content",
            },
            capability_graph: {
              type: "string",
              description: "Capability dependency graph JSON",
            },
            summaries: {
              type: "string",
              description: "Capability summaries for learning ladder",
            },
            proposition_files: {
              type: "string",
              description: "Proposition output files for learning ladder",
            },
          },
          required: ["workDir"],
        },
      },
      required: ["template_type"],
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const { template_type, params = {} } = args;

    const template = this.templates[template_type];
    if (!template) {
      return {
        error: `Template not found: ${template_type}`,
        template_type,
      };
    }

    // 校验参数完整性
    const validation = validateParams(template_type, params);
    if (!validation.valid) {
      return {
        error: `Missing required parameters for ${template_type}: ${validation.missing.join(", ")}`,
        template_type,
        missing: validation.missing,
      };
    }

    // 解析路径
    const paths = resolvePaths(template_type, params);

    // 合并 paths 到替换上下文
    const context: Record<string, any> = { ...params, paths };

    // 替换模板中的占位符
    let result = template;

    // 先处理嵌套对象占位符 {{paths.xxx}}
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        for (const [subKey, subValue] of Object.entries(value as Record<string, any>)) {
          const pattern = `{{${key}.${subKey}}}`;
          result = result.split(pattern).join(String(subValue));
        }
      }
    }

    // 再替换所有 {{key}} 格式的占位符
    for (const [key, value] of Object.entries(context)) {
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

    return {
      template_type,
      template: result,
      params,
      paths,
    };
  }
}
