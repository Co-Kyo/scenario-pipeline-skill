import { BaseTool, ToolDefinition } from "./base.js";

export class GetTemplateTool extends BaseTool {
  readonly name = "get_template";
  readonly description = "Get agent task template for capability research";

  private templates: Record<string, string> = {
    "capability-research": `你是 {{capability_name}} 的深度研究员。

## 任务
研究原子能力 "{{capability_name}}"（ID: {{capability_id}}），产出两个文件：
1. 能力知识库主文件（capabilities/{{capability_id}}-{{capability_name}}.md）
2. 结构化摘要 JSON（.meta/summaries/{{capability_id}}-{{capability_name}}.json）

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
3. 将产出保存到 workflow/research/<序号>-<命题简称>/ 目录`,

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
3. 将产出保存到 .meta/briefings/<命题简称>.md`,

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
3. 将产出保存到 <序号>-<命题简称>/learning-ladder.md`
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
          description: "Template parameters (capability_id, capability_name, urls, etc.)",
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

    // 替换模板中的占位符
    let result = template;
    
    // 替换所有 {{key}} 格式的占位符
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      } else if (Array.isArray(value)) {
        // 处理数组类型（如 urls）
        const arrayStr = value.map((item: any) => 
          typeof item === 'object' ? `- ${item.url} (${item.title})` : `- ${item}`
        ).join('\n');
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), arrayStr);
      } else if (typeof value === 'object' && value !== null) {
        // 处理对象类型（如 capability_graph, summaries 等）
        const objStr = JSON.stringify(value, null, 2);
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), objStr);
      }
    }

    return {
      template_type,
      template: result,
      params,
    };
  }
}
