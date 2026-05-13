/**
 * 路径模板配置 — 单一事实来源 (SSoT)
 *
 * 所有管线产出路径的生成规则在此集中定义。
 * 任何需要路径的地方，必须通过 resolvePaths() 获取，禁止自行拼接。
 *
 * 参数：
 *   workDir  — 管线产出根目录（绝对路径）
 *   seq      — 命题序号，格式：01, 02, 03...
 *   short_name — 命题中文简称，如"长列表渲染"
 */

export interface PathParams {
  workDir: string;
  seq?: string;
  short_name?: string;
  capability_id?: string;
  capability_name?: string;
}

export interface PathTemplates {
  /** 总览导航 README */
  readme: string;
  /** 全局学习阶梯 */
  learning_ladder: string;
  /** 能力知识库主文件 */
  capability_file: string;
  /** 能力结构化摘要 */
  capability_summary: string;
  /** 命题目录根 */
  proposition_dir: string;
  /** 命题内各文件 */
  proposition_overview: string;
  proposition_edge_cases: string;
  proposition_trade_offs: string;
  proposition_references: string;
  proposition_experiment: string;
  proposition_learning_ladder: string;
  /** Briefing 中间产物 */
  briefing: string;
  /** 管线内部数据 */
  meta_capability_graph: string;
  meta_candidates: string;
  meta_decompositions: string;
  meta_evaluations: string;
  meta_summaries_dir: string;
  meta_briefings_dir: string;
  meta_pipeline_state: string;
  /** 能力知识库 README */
  capabilities_readme: string;
}

/**
 * 根据任务类型解析出所有相关路径。
 *
 * @param taskType 任务类型
 * @param params   路径参数（workDir 必填，其余按任务类型选填）
 * @returns 解析后的路径对象
 * @throws 缺少必填参数时抛出错误
 */
export function resolvePaths(
  taskType: string,
  params: PathParams
): PathTemplates {
  const { workDir, seq, short_name, capability_id, capability_name } = params;

  if (!workDir) {
    throw new Error("resolvePaths: workDir is required");
  }

  // 去掉尾部斜杠
  const root = workDir.replace(/\/+$/, "");

  // ── L1 路径规则（固定模式，不含推理） ──

  // .meta 目录
  const metaDir = `${root}/.meta`;

  // capabilities 目录
  const capDir = `${root}/capabilities`;

  // 命题目录（需要 seq + short_name）
  const propDir =
    seq && short_name
      ? `${root}/${seq}-${short_name}`
      : `${root}/<seq>-<short_name>`;

  // 能力文件路径（需要 capability_id + capability_name）
  const capId = capability_id || "<capability_id>";
  const capName = capability_name || "<capability_name>";

  const basePaths: PathTemplates = {
    // 顶层
    readme: `${root}/README.md`,
    learning_ladder: `${root}/learning-ladder.md`,

    // 能力知识库
    capability_file: `${capDir}/${capId}-${capName}.md`,
    capability_summary: `${metaDir}/summaries/${capId}-${capName}.json`,

    // 命题目录
    proposition_dir: propDir,
    proposition_overview: `${propDir}/overview.md`,
    proposition_edge_cases: `${propDir}/edge-cases.md`,
    proposition_trade_offs: `${propDir}/trade-offs.md`,
    proposition_references: `${propDir}/references.md`,
    proposition_experiment: `${propDir}/experiment/`,
    proposition_learning_ladder: `${propDir}/learning-ladder.md`,

    // Briefing
    briefing: `${metaDir}/briefings/${seq || "<seq>"}-${short_name || "<short_name>"}.md`,

    // 管线内部数据
    meta_capability_graph: `${metaDir}/capability-graph.json`,
    meta_candidates: `${metaDir}/candidates.md`,
    meta_decompositions: `${metaDir}/decompositions.json`,
    meta_evaluations: `${metaDir}/evaluations.json`,
    meta_summaries_dir: `${metaDir}/summaries/`,
    meta_briefings_dir: `${metaDir}/briefings/`,
    meta_pipeline_state: `${metaDir}/pipeline-state.json`,

    // 能力知识库 README
    capabilities_readme: `${capDir}/README.md`,
  };

  return basePaths;
}

/**
 * 获取指定任务类型所需的必填参数列表。
 * 供调用方校验使用。
 */
export function getRequiredParams(taskType: string): string[] {
  const base = ["workDir"];

  switch (taskType) {
    case "capability-research":
      return [...base, "capability_id", "capability_name"];
    case "assemble":
    case "briefing-assemble":
    case "learning-ladder":
      return [...base, "seq"];  // short_name 可从 decompositions.json 自动推导
    default:
      return base;
  }
}

/**
 * 校验参数是否完整，返回缺失参数列表。
 */
export function validateParams(
  taskType: string,
  params: PathParams
): { valid: boolean; missing: string[] } {
  const required = getRequiredParams(taskType);
  const missing = required.filter(
    (key) => !(key in params) || !params[key as keyof PathParams]
  );
  return { valid: missing.length === 0, missing };
}
