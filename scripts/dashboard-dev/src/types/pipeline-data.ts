/**
 * PipelineData — Complete TypeScript type definitions for the
 * scenario-pipeline long-chain HTML dashboard system.
 *
 * These types map 1:1 to the .meta/*.json schemas and the PipelineData
 * structure defined in the architecture document §3.4.
 *
 * Design principle: every nullable field uses `T | null` (not optional `?`),
 * so the React components can uniformly check `data === null` to render EmptyState.
 */

// ============================================================================
// Meta & Progress
// ============================================================================

export interface PipelineMeta {
  /** The source article/topic being processed. */
  topic: string;
  /** Target experience level, e.g. "L2 (3-5年)". */
  targetLevel: string;
  /** ISO timestamp of dashboard generation. */
  generatedAt: string;
  /** Current pipeline step number (0-9). */
  currentStep: number;
  /** Current checkpoint symbol, e.g. "ⓐ". Null if pipeline hasn't started. */
  currentCheckpoint: string | null;
  /** Skill version string. */
  skillVersion: string;
}

export interface PipelineProgress {
  /** Array of completed step numbers, e.g. [0, 1, 2, 3]. */
  completedSteps: number[];
  /** Array of completed checkpoint symbols, e.g. ['ⓩ', 'ⓧ']. */
  completedCheckpoints: string[];
  /** Current checkpoint symbol or null. */
  currentCheckpoint: string | null;
  /** Total steps in the pipeline (10). */
  totalSteps: number;
  /** Total checkpoints in the pipeline (9). */
  totalCheckpoints: number;
}

// ============================================================================
// Pre-stage data (Steps 0-1, Checkpoints ⓩⓧ)
// ============================================================================

export interface RequirementWeb {
  generated_at: string;
  context: RequirementContext;
  strategy: RequirementStrategy;
  propositions: RequirementProposition[];
  dependencies: Record<string, string[]>;
  capability_web: Record<string, CapabilityWebNode>;
  scope: RequirementScope;
}

export interface RequirementContext {
  topic?: string;
  target_level?: string;
  years_hint?: string;
  source_text?: string;
  [key: string]: unknown;
}

export interface RequirementStrategy {
  core_ratio?: number;
  premise_ratio?: number;
  outlook_ratio?: number;
  [key: string]: unknown;
}

export interface RequirementProposition {
  id: string;
  name: string;
  role: 'core' | 'premise' | 'outlook';
  depth?: number;
  [key: string]: unknown;
}

export interface CapabilityWebNode {
  id?: string;
  name?: string;
  layer?: string;
  props?: string[];
  [key: string]: unknown;
}

export interface RequirementScope {
  total_propositions?: number;
  total_capabilities?: number;
  [key: string]: unknown;
}

export interface PartitionAnalysis {
  generated_at: string;
  total_propositions: number;
  dag: PartitionDAG;
  components: PartitionComponent[];
  current_session: PartitionSession;
  deferred_sessions: PartitionSession[];
  partition_stats: PartitionStats;
}

export interface PartitionDAG {
  nodes: string[];
  edges: DagEdge[];
}

export interface DagEdge {
  from: string;
  to: string;
  type?: string;
}

export interface PartitionComponent {
  id: string;
  size: number;
  propositions: string[];
}

export interface PartitionSession {
  component_id?: string;
  proposition_ids: string[];
  depth_layers?: DepthLayer[];
  [key: string]: unknown;
}

export interface DepthLayer {
  depth: number;
  proposition_ids: string[];
}

export interface PartitionStats {
  total_components?: number;
  max_depth?: number;
  communities?: number;
  modularity?: number;
  [key: string]: unknown;
}

export interface PreStageData {
  requirement: RequirementWeb | null;
  partition: PartitionAnalysis | null;
}

// ============================================================================
// Pre-processing data (Steps 2-4, Checkpoints ⓐⓑ)
// ============================================================================

export interface RawMaterialsIndex {
  scan_summary?: ScanSummary;
  tier_distribution?: TierDistribution;
  materials?: RawMaterial[];
  by_role?: Record<string, number>;
  [key: string]: unknown;
}

export interface ScanSummary {
  total_materials?: number;
  total_urls?: number;
  coverage?: number;
  [key: string]: unknown;
}

export interface TierDistribution {
  T0?: number;
  T1?: number;
  T2?: number;
  T3?: number;
  [key: string]: number | undefined;
}

export interface RawMaterial {
  url?: string;
  title?: string;
  tier?: string;
  role?: string;
  [key: string]: unknown;
}

export interface CapabilityGraph {
  generated_at: string;
  total_capabilities: number;
  total_propositions: number;
  dependency_graph: Record<string, string[]>;
  highgrounds: Highground[];
  learning_path: string[];
  capabilities: GraphCapability[];
}

export interface Highground {
  id: string;
  name: string;
  layer?: string;
  [key: string]: unknown;
}

export interface GraphCapability {
  id: string;
  name: string;
  layer?: string;
  covers?: string[];
  [key: string]: unknown;
}

export interface Evaluations {
  generated_at: string;
  evaluations: Evaluation[];
  summary: EvalSummary;
}

export interface Evaluation {
  proposition_id: string;
  proposition: string;
  total_score: number;
  scores: EvalScores;
  recommended_order: number;
  [key: string]: unknown;
}

export interface EvalScores {
  cross_stack_coupling: number;
  doc_vacuum: number;
  experience_barrier: number;
  topical_heat: number;
  [key: string]: number;
}

export interface EvalSummary {
  average_score?: number;
  high_priority_count?: number;
  total_evaluated?: number;
  [key: string]: unknown;
}

export interface ResearchGrouping {
  groups: ResearchGroup[];
  batches: string[][];
}

export interface ResearchGroup {
  id: string;
  layer: string;
  capabilities: string[];
  [key: string]: unknown;
}

export interface PreProcessingData {
  rawMaterials: RawMaterialsIndex | null;
  capabilityGraph: CapabilityGraph | null;
  evaluations: Evaluations | null;
  researchGrouping: ResearchGrouping | null;
}

// ============================================================================
// Post-processing data (Steps 5-9, Checkpoints ⓒ-ⓗ)
// ============================================================================

export interface CapabilitySummary {
  id: string;
  name: string;
  layer: string;
  summary: string;
  propCount: number;
  [key: string]: unknown;
}

export interface PropositionContent {
  id: string;
  name: string;
  dir: string;
  priority: 'high' | 'medium';
  difficulty: 'high' | 'medium' | 'low';
  score: number;
  caps: number;
  role: 'core' | 'premise' | 'outlook';
  content: Record<string, string>;
}

export interface LearningLadder {
  depth_layers: DepthLayer[];
  total_depths: number;
  [key: string]: unknown;
}

export interface AnalyticsData {
  capFreq: CapFreq[];
  layerDist: Record<string, LayerDist>;
  layerOrder: string[];
  layerColors: Record<string, string>;
  depthOrder: DepthOrderItem[];
  evalBreakdown: EvalBreakdown[];
  dagEdges: DagEdge[];
  batchInfo: BatchInfo[];
  propCaps: Record<string, string[]>;
  capNames: Record<string, string>;
  capLayer: Record<string, string>;
  totalCaps: number;
  totalProps: number;
}

export interface CapFreq {
  id: string;
  name: string;
  count: number;
  props: string[];
}

export interface LayerDist {
  caps: { id: string; name: string; layer: string }[];
  groups: string[];
}

export interface DepthOrderItem {
  depth: number;
  id: string;
  name: string;
  priority: string;
  difficulty: string;
  score: number;
  caps: number;
  role: string;
  dir?: string;
}

export interface EvalBreakdown {
  id: string;
  name: string;
  total: number;
  cross_stack: number;
  doc_vacuum: number;
  experience: number;
  heat: number;
  rec_order: number;
}

export interface BatchInfo {
  batch: number;
  groups: string[];
  desc: string;
}

export interface PostProcessingData {
  capabilities: CapabilitySummary[];
  propositions: PropositionContent[];
  learningLadder: LearningLadder | null;
  analytics: AnalyticsData | null;
}

// ============================================================================
// Checkpoints
// ============================================================================

export type CheckpointStatus = 'completed' | 'current' | 'pending';

export interface CheckpointInfo {
  /** Short id: 'z', 'x', 'a', 'b', 'c', 'd', 'f', 'g', 'h'. */
  id: string;
  /** Unicode circled symbol: 'ⓩ', 'ⓧ', 'ⓐ', etc. */
  symbol: string;
  /** Human-readable name, e.g. '需求确认'. */
  name: string;
  /** Stage: '前置' | '前处理' | '后处理'. */
  stage: string;
  /** Step number (0-9). */
  step: number;
  /** List of artifact file names produced at this checkpoint. */
  artifacts: string[];
  /** Description of the checkpoint. */
  description: string;
  /** Status: completed, current, or pending. */
  status: CheckpointStatus;
}

// ============================================================================
// Top-level PipelineData
// ============================================================================

export interface PipelineData {
  meta: PipelineMeta;
  progress: PipelineProgress;
  preStage: PreStageData;
  preProcessing: PreProcessingData;
  postProcessing: PostProcessingData;
  checkpoints: CheckpointInfo[];
  /** Decision panels for the 3 core decision moments. */
  decisionPanels: DecisionPanelData[];
}

// ============================================================================
// React Component Props (shared generics)
// ============================================================================

/**
 * Standard props for view components that receive nullable data.
 * When data is null, the component should render EmptyState.
 */
export interface ViewProps<T> {
  data: T | null;
}

/**
 * ProgressTimeline component props.
 */
export interface ProgressTimelineProps {
  checkpoints: CheckpointInfo[];
  currentCheckpoint: string | null;
  onCheckpointClick: (id: string) => void;
}

/**
 * Sidebar component props.
 */
export interface SidebarProps {
  data: PipelineData | null;
  currentView: string;
  onViewChange: (view: string) => void;
  sidebarExpanded: boolean;
  onToggleExpand: () => void;
  onPropSelect: (propId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

/**
 * PropositionDetail component props.
 */
export interface PropositionDetailProps {
  proposition: PropositionContent;
  onBack: () => void;
}

/**
 * CheckpointSection component props.
 */
export interface CheckpointSectionProps {
  checkpoint: CheckpointInfo;
  contextData: PipelineData | null;
}

/**
 * Build options for the build script CLI.
 */
export interface BuildOptions {
  step: number | null;
  verbose: boolean;
  legacy: boolean;
  shellPath: string | null;
}

// ============================================================================
// Decision Panel (decision-center dashboard)
// ============================================================================

/** The 3 core decision moments in the pipeline. */
export type DecisionMoment = 'demand' | 'capability' | 'output';

export interface DecisionPanelData {
  /** Which decision moment this panel represents. */
  decisionMoment: DecisionMoment;
  /** Panel title, e.g. "需求确认决策面板". */
  title: string;
  /** Key-value summary of the artifacts produced. */
  summary: { label: string; value: string | number }[];
  /** Quality assessment. */
  quality: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  /** Decision options for the user. */
  options: {
    id: string;
    label: string;
    description: string;
  }[];
  /** Impact analysis of the decision. */
  impact: {
    nextStep: string;
    risks: string[];
  };
}

/**
 * Result of loading a single file.
 */
export interface LoadResult {
  data: unknown;
  exists: boolean;
  error: string | null;
}

/**
 * Raw data loaded from the filesystem, before transformation.
 */
export interface RawData {
  requirement: LoadResult;
  partition: LoadResult;
  rawMaterials: LoadResult;
  capabilityGraph: LoadResult;
  evaluations: LoadResult;
  researchGrouping: LoadResult;
  propositionFiles: PropositionFile[];
  capabilitySummaries: CapabilityFileSummary[];
}

export interface PropositionFile {
  propId: string;
  propDir: string;
  tabs: Record<string, string>;
}

export interface CapabilityFileSummary {
  id: string;
  name: string;
  layer: string;
  summary: string;
}
