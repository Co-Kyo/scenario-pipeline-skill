import type {
  AnalyticsData,
  CapFreq,
  LayerDist,
  DepthOrderItem,
  EvalBreakdown,
  BatchInfo,
  DagEdge,
  PartitionAnalysis,
  Evaluations,
  CapabilityGraph,
  ResearchGrouping,
} from '../types/pipeline-data';

/**
 * Data Mappers — Pure functions that transform PipelineData into
 * view-specific data structures.
 *
 * These functions are the bridge between the raw PipelineData (injected by
 * build-dashboard.js) and the React view components. They handle:
 * - Sorting, grouping, and aggregation
 * - Null safety (return empty arrays/objects when data is missing)
 * - Format conversion for specific chart types
 *
 * All functions are pure (no side effects) and can be unit-tested with Vitest.
 */

// ============================================================================
// Heatmap Grid Mapper (HeatmapView)
// ============================================================================

export interface HeatmapGridCell {
  capId: string;
  capName: string;
  count: number;
  propCells: { propId: string; filled: boolean }[];
}

/**
 * Map analytics data to a heatmap grid structure.
 * Returns rows (capabilities) × columns (propositions) with fill state.
 *
 * @param data - AnalyticsData or null
 * @param maxRows - Maximum number of capability rows (default 22)
 * @returns Array of heatmap rows, each containing capability info and cell states
 */
export function mapToHeatmapGrid(
  data: AnalyticsData | null,
  maxRows: number = 22,
): HeatmapGridCell[] {
  if (!data || !data.capFreq || data.capFreq.length === 0) {
    return [];
  }

  const topCaps = data.capFreq.slice(0, maxRows);

  return topCaps.map((cap: CapFreq) => {
    const propCells = data.propCaps
      ? Object.keys(data.propCaps).map((propId) => ({
          propId,
          filled: (data.propCaps[propId] || []).includes(cap.id),
        }))
      : [];

    return {
      capId: cap.id,
      capName: cap.name,
      count: cap.count,
      propCells,
    };
  });
}

// ============================================================================
// Depth Order Mapper (LearningPathView)
// ============================================================================

export interface DepthOrderGroup {
  depth: number;
  label: string;
  items: DepthOrderItem[];
}

const DEPTH_LABELS: Record<number, string> = {
  0: '前置基础',
  1: '第一梯队：核心入口',
  2: '第二梯队：深度优化',
  3: '顶层视野',
};

/**
 * Map analytics data to depth-ordered groups for the learning path DAG.
 * Groups propositions by their topological depth.
 *
 * @param data - AnalyticsData or null
 * @returns Array of depth groups, sorted by depth ascending
 */
export function mapToDepthOrder(data: AnalyticsData | null): DepthOrderGroup[] {
  if (!data || !data.depthOrder || data.depthOrder.length === 0) {
    return [];
  }

  const groups: Record<number, DepthOrderItem[]> = {};
  data.depthOrder.forEach((item: DepthOrderItem) => {
    if (!groups[item.depth]) {
      groups[item.depth] = [];
    }
    groups[item.depth].push(item);
  });

  return Object.keys(groups)
    .map(Number)
    .sort((a: number, b: number) => a - b)
    .map((depth: number) => ({
      depth,
      label: DEPTH_LABELS[depth] ?? `Layer ${depth}`,
      items: groups[depth],
    }));
}

// ============================================================================
// Eval Breakdown Mapper (EvalAnalysisView)
// ============================================================================

export interface EvalBreakdownRow {
  id: string;
  name: string;
  total: number;
  segments: { key: string; label: string; value: number; pct: number }[];
}

const EVAL_DIMENSIONS = [
  { key: 'cross_stack', label: 'C', max: 4 },
  { key: 'doc_vacuum', label: 'D', max: 4 },
  { key: 'experience', label: 'E', max: 4 },
  { key: 'heat', label: 'H', max: 4 },
];

/**
 * Map analytics data to eval breakdown rows for the stacked bar chart.
 * Sorts by total score descending.
 *
 * @param data - AnalyticsData or null
 * @returns Array of eval breakdown rows, sorted by total descending
 */
export function mapToEvalBreakdown(data: AnalyticsData | null): EvalBreakdownRow[] {
  if (!data || !data.evalBreakdown || data.evalBreakdown.length === 0) {
    return [];
  }

  const totalMax = EVAL_DIMENSIONS.reduce((sum, d) => sum + d.max, 0);

  const sorted = [...data.evalBreakdown].sort(
    (a: EvalBreakdown, b: EvalBreakdown) => b.total - a.total,
  );

  return sorted.map((eb: EvalBreakdown) => ({
    id: eb.id,
    name: eb.name,
    total: eb.total,
    segments: EVAL_DIMENSIONS.map((dim) => ({
      key: dim.key,
      label: dim.label,
      value: eb[dim.key as keyof EvalBreakdown] as number,
      pct: Math.round(((eb[dim.key as keyof EvalBreakdown] as number) / totalMax) * 100),
    })),
  }));
}

// ============================================================================
// Layer Distribution Mapper (LayerDistView)
// ============================================================================

export interface LayerDistGroup {
  layer: string;
  color: string;
  caps: { id: string; name: string; layer: string; count: number }[];
  groupCount: number;
}

/**
 * Map analytics data to layer distribution groups.
 * Each group contains capabilities belonging to a tech layer, with reuse counts.
 *
 * @param data - AnalyticsData or null
 * @returns Array of layer groups in canonical layer order
 */
export function mapToLayerDist(data: AnalyticsData | null): LayerDistGroup[] {
  if (!data || !data.layerDist || !data.layerOrder) {
    return [];
  }

  return data.layerOrder
    .filter((layer: string) => data.layerDist[layer])
    .map((layer: string) => {
      const dist = data.layerDist[layer] as LayerDist;
      const color = data.layerColors?.[layer] ?? '#666666';
      const caps = (dist.caps || []).map((cap) => {
        const freq = data.capFreq?.find((f: CapFreq) => f.id === cap.id);
        return {
          id: cap.id,
          name: cap.name,
          layer: cap.layer,
          count: freq?.count ?? 0,
        };
      });
      return {
        layer,
        color,
        caps,
        groupCount: dist.groups?.length ?? 0,
      };
    });
}

// ============================================================================
// Batch Info Mapper (BatchFlowView)
// ============================================================================

/**
 * Map analytics data to batch info for the execution batch flow view.
 * Returns batches in order with their group tags.
 *
 * @param data - AnalyticsData or null
 * @returns Array of batch info objects
 */
export function mapToBatchInfo(data: AnalyticsData | null): BatchInfo[] {
  if (!data || !data.batchInfo || data.batchInfo.length === 0) {
    return [];
  }
  return data.batchInfo;
}

// ============================================================================
// Difficulty Matrix Mapper (DifficultyMatrixView)
// ============================================================================

export interface MatrixPoint {
  id: string;
  name: string;
  role: string;
  priority: string;
  difficulty: string;
  score: number;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
}

/**
 * Map propositions to difficulty matrix scatter points.
 * X = difficulty (high → right, medium → left), Y = priority (high → top, medium → bottom).
 * Includes slight jitter to prevent overlapping points.
 *
 * @param props - Array of proposition-like objects with id, name, role, priority, difficulty, score
 * @returns Array of scatter points with x/y percentages
 */
export function mapToMatrixPoints(
  props: { id: string; name: string; role: string; priority: string; difficulty: string; score: number }[] | null,
): MatrixPoint[] {
  if (!props || props.length === 0) {
    return [];
  }

  const jitterRange = 3;
  return props.map((p, i: number) => {
    const x = p.difficulty === 'high' ? 0.7 : 0.3;
    const y = p.priority === 'high' ? 0.25 : 0.7;
    const jx = ((i * 7) % jitterRange - jitterRange / 2) / 100;
    const jy = ((i * 11) % jitterRange - jitterRange / 2) / 100;
    return {
      id: p.id,
      name: p.name,
      role: p.role,
      priority: p.priority,
      difficulty: p.difficulty,
      score: p.score,
      x: (jx + x) * 100,
      y: (jy + y) * 100,
    };
  });
}

// ============================================================================
// DAG Edges Mapper (DependencyDAG, LearningPathView)
// ============================================================================

/**
 * Extract DAG edges from partition analysis data.
 *
 * @param partition - PartitionAnalysis or null
 * @returns Array of DAG edges
 */
export function mapToDagEdges(partition: PartitionAnalysis | null): DagEdge[] {
  if (!partition || !partition.dag || !partition.dag.edges) {
    return [];
  }
  return partition.dag.edges;
}

// ============================================================================
// Proposition Pool Mapper (PropositionPool, OverviewView)
// ============================================================================

export interface PoolRow {
  [key: string]: unknown;
  id: string;
  name: string;
  priority: string;
  difficulty: string;
  score: number;
  caps: number;
  role: string;
  recOrder: number | null;
}

/**
 * Map propositions and evaluations to a unified pool table structure.
 * Merges proposition metadata with evaluation recommended order.
 *
 * @param props - Proposition-like array (from PROPS or postProcessing.propositions)
 * @param evalBreakdown - Eval breakdown array from analytics (optional)
 * @returns Array of pool rows sorted by recommended order
 */
export function mapToPoolRows(
  props: { id: string; name: string; priority: string; difficulty: string; score: number; caps: number; role: string }[] | null,
  evalBreakdown: EvalBreakdown[] | null,
): PoolRow[] {
  if (!props || props.length === 0) {
    return [];
  }

  return props.map((p) => {
    const eb = evalBreakdown?.find((e) => e.id === p.id);
    return {
      id: p.id,
      name: p.name,
      priority: p.priority,
      difficulty: p.difficulty,
      score: p.score,
      caps: p.caps,
      role: p.role,
      recOrder: eb?.rec_order ?? null,
    };
  });
}

// ============================================================================
// Insights Mapper (OverviewView)
// ============================================================================

export interface InsightCard {
  icon: string;
  title: string;
  text: string;
  highlight?: string;
}

/**
 * Generate insight cards for the overview view.
 * Computes key metrics from analytics data.
 *
 * @param data - AnalyticsData or null
 * @param totalProps - Total number of propositions
 * @returns Array of 4 insight cards
 */
export function mapToInsights(
  data: AnalyticsData | null,
  totalProps: number,
): InsightCard[] {
  if (!data) {
    return [];
  }

  const hubCap = data.capFreq?.[0];

  return [
    {
      icon: '🎯',
      title: '推荐起点',
      text: `从 ${hubCap?.name ?? ''} 开始，它被 ${hubCap?.count ?? 0} 个命题共享，是体系核心枢纽`,
      highlight: hubCap?.name,
    },
    {
      icon: '🔥',
      title: '高难度集中区',
      text: `${totalProps}/${totalProps} 命题为高难度，集中在渲染管线、网络协议、监控架构方向`,
    },
    {
      icon: '🏗️',
      title: '技术层覆盖',
      text: `跨越 ${data.layerOrder?.length ?? 0} 个技术层，浏览器层和运行时层是核心战场`,
    },
    {
      icon: '📋',
      title: '学习策略',
      text: '核心命题分批拓扑排序执行，同层可并行。从基础概念→深度优化→工程实践',
    },
  ];
}

// ============================================================================
// Source Stats Mapper (SourceStats)
// ============================================================================

export interface SourceStatsData {
  totalMaterials: number;
  totalUrls: number;
  coverage: number;
  tierDistribution: { tier: string; count: number }[];
  byRole: { role: string; count: number }[];
}

/**
 * Map raw materials index to source stats for the pre-processing view.
 *
 * @param rawMaterials - RawMaterialsIndex or null
 * @returns Source stats data or null
 */
export function mapToSourceStats(
  rawMaterials: { scan_summary?: { total_materials?: number; total_urls?: number; coverage?: number }; tier_distribution?: Record<string, number | undefined>; by_role?: Record<string, number> } | null,
): SourceStatsData | null {
  if (!rawMaterials) {
    return null;
  }

  const summary = rawMaterials.scan_summary ?? {};
  const tierDist = rawMaterials.tier_distribution ?? {};
  const byRole = rawMaterials.by_role ?? {};

  return {
    totalMaterials: summary.total_materials ?? 0,
    totalUrls: summary.total_urls ?? 0,
    coverage: summary.coverage ?? 0,
    tierDistribution: Object.entries(tierDist)
      .filter(([, v]) => v !== undefined)
      .map(([tier, count]) => ({ tier, count: count as number }))
      .sort((a, b) => a.tier.localeCompare(b.tier)),
    byRole: Object.entries(byRole).map(([role, count]) => ({ role, count })),
  };
}

// ============================================================================
// Capability Graph Mapper (CapabilityGraph component)
// ============================================================================

export interface GraphNode {
  id: string;
  name: string;
  layer: string;
  color: string;
  isHub: boolean;
  connectionCount: number;
}

export interface GraphEdgeData {
  source: string;
  target: string;
}

/**
 * Map capability graph data to nodes and edges for the force-directed graph.
 * Identifies hub capabilities (shared by >= 3 propositions).
 *
 * @param capGraph - CapabilityGraph or null
 * @param grouping - ResearchGrouping or null (for layer override)
 * @returns Object with nodes and edges arrays
 */
export function mapToCapabilityGraph(
  capGraph: CapabilityGraph | null,
  grouping: ResearchGrouping | null,
): { nodes: GraphNode[]; edges: GraphEdgeData[] } {
  if (!capGraph || !capGraph.capabilities) {
    return { nodes: [], edges: [] };
  }

  // Build prop<->cap mapping
  const capsProps: Record<string, string[]> = {};
  capGraph.capabilities.forEach((cap) => {
    const covers = cap.covers ?? [];
    capsProps[cap.id] = covers;
  });

  // Build layer lookup (grouping overrides capGraph)
  const capLayer: Record<string, string> = {};
  capGraph.capabilities.forEach((cap) => {
    capLayer[cap.id] = cap.layer ?? '未知';
  });
  if (grouping?.groups) {
    grouping.groups.forEach((g) => {
      g.capabilities.forEach((cid) => {
        capLayer[cid] = g.layer;
      });
    });
  }

  // Layer colors
  const layerColors: Record<string, string> = {
    '浏览器层': '#6c5ce7',
    '网络层': '#00b894',
    '运行时层': '#e17055',
    '工程层': '#fdcb6e',
    '工具层': '#74b9ff',
    '安全层': '#d63031',
  };

  const nodes: GraphNode[] = capGraph.capabilities.map((cap) => {
    const connectionCount = capsProps[cap.id]?.length ?? 0;
    const layer = capLayer[cap.id] ?? '未知';
    return {
      id: cap.id,
      name: cap.name,
      layer,
      color: layerColors[layer] ?? '#666666',
      isHub: connectionCount >= 3,
      connectionCount,
    };
  });

  // Build edges from dependency graph
  const edges: GraphEdgeData[] = [];
  if (capGraph.dependency_graph) {
    Object.entries(capGraph.dependency_graph).forEach(([source, targets]) => {
      (targets as string[]).forEach((target) => {
        edges.push({ source, target });
      });
    });
  }

  return { nodes, edges };
}

// ============================================================================
// Evaluation Matrix Mapper (EvaluationMatrix component)
// ============================================================================

export interface EvalMatrixPoint {
  id: string;
  name: string;
  role: string;
  difficulty: string;
  score: number;
  x: number; // 0-100 percentage (difficulty)
  y: number; // 0-100 percentage (score)
  scores: { cross_stack: number; doc_vacuum: number; experience: number; heat: number };
}

/**
 * Map evaluations data to scatter points for the evaluation matrix.
 * X = difficulty (inferred from score), Y = total score.
 *
 * @param evaluations - Evaluations or null
 * @param props - Proposition metadata for role/difficulty info
 * @returns Array of scatter points
 */
export function mapToEvalMatrix(
  evaluations: Evaluations | null,
  props: { id: string; name: string; role: string; difficulty: string }[] | null,
): EvalMatrixPoint[] {
  if (!evaluations || !evaluations.evaluations || !props) {
    return [];
  }

  return evaluations.evaluations.map((ev) => {
    const prop = props.find((p) => p.id === ev.proposition_id);
    const difficulty = prop?.difficulty ?? 'medium';
    // X: high difficulty → right (70%), medium → left (30%)
    const x = difficulty === 'high' ? 70 : 30;
    // Y: higher score → top (inverted, 10=100%, 0=0%)
    const y = 100 - (ev.total_score / 10) * 100;
    return {
      id: ev.proposition_id,
      name: ev.proposition,
      role: prop?.role ?? 'core',
      difficulty,
      score: ev.total_score,
      x,
      y,
      scores: {
        cross_stack: ev.scores.cross_stack_coupling,
        doc_vacuum: ev.scores.doc_vacuum,
        experience: ev.scores.experience_barrier,
        heat: ev.scores.topical_heat,
      },
    };
  });
}
