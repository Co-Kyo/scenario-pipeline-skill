/**
 * 3 pipeline stages static definitions.
 *
 * Each stage groups multiple steps and checkpoints, and has associated views.
 * Used by Sidebar for navigation grouping and by App to determine default view.
 */

export interface StageDefinition {
  /** Stage identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Step range [start, end] inclusive. */
  steps: [number, number];
  /** Checkpoint IDs belonging to this stage. */
  checkpointIds: string[];
  /** View IDs available in this stage. */
  views: { id: string; label: string; icon: string }[];
  /** Description of the stage. */
  description: string;
}

export const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    id: 'pre-stage',
    name: '前置阶段',
    steps: [0, 1],
    checkpointIds: ['z', 'x'],
    views: [
      { id: 'pre-stage-propositions', label: '命题清单', icon: '📋' },
      { id: 'pre-stage-dag', label: '依赖关系图', icon: '🔗' },
      { id: 'pre-stage-partition', label: '分区摘要', icon: '🗺️' },
    ],
    description: '头脑风暴与分区：生成命题清单、能力雏形、依赖关系 DAG 和分区策略。',
  },
  {
    id: 'pre-processing',
    name: '前处理阶段',
    steps: [2, 4],
    checkpointIds: ['a', 'b'],
    views: [
      { id: 'pre-processing-sources', label: '信源统计', icon: '📡' },
      { id: 'pre-processing-graph', label: '能力图谱', icon: '🕸️' },
      { id: 'pre-processing-matrix', label: '评估矩阵', icon: '📐' },
      { id: 'pre-processing-pool', label: '命题池', icon: '🏊' },
    ],
    description: '扫描、能力图谱构建与评估入池：信源覆盖度统计、能力拓扑可视化、评估散点图。',
  },
  {
    id: 'post-processing',
    name: '后处理阶段',
    steps: [5, 9],
    checkpointIds: ['c', 'd', 'f', 'g', 'h'],
    views: [
      { id: 'overview', label: '总览', icon: '📊' },
      { id: 'learning-path', label: '学习路径', icon: '🗺️' },
      { id: 'heatmap', label: '能力热力图', icon: '🔥' },
      { id: 'layers', label: '技术层分布', icon: '🏗️' },
      { id: 'matrix', label: '难度矩阵', icon: '📐' },
      { id: 'eval', label: '评估分析', icon: '📈' },
      { id: 'batches', label: '执行批次', icon: '⚡' },
    ],
    description: '研究、Briefing、命题组装、学习阶梯与看板：7 视图渐进呈现完整备考知识看板。',
  },
];

/**
 * Get a stage definition by ID.
 */
export function getStageById(id: string): StageDefinition | undefined {
  return STAGE_DEFINITIONS.find((s) => s.id === id);
}

/**
 * Get the stage that contains a given step number.
 */
export function getStageByStep(step: number): StageDefinition | undefined {
  return STAGE_DEFINITIONS.find((s) => step >= s.steps[0] && step <= s.steps[1]);
}

/**
 * Get all view IDs across all stages.
 */
export function getAllViewIds(): string[] {
  return STAGE_DEFINITIONS.flatMap((s) => s.views.map((v) => v.id));
}

/**
 * Determine the default view based on the current step.
 * Returns the first view of the stage corresponding to the current step.
 */
export function getDefaultView(currentStep: number): string {
  const stage = getStageByStep(currentStep);
  if (stage && stage.views.length > 0) {
    return stage.views[0].id;
  }
  return 'overview';
}
