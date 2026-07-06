// ============================================================
// skillpack-types — Core primitives for defining LLM skill pipelines
//
// 设计哲学（类比 LangGraph）：
//   - 用户的 schedule 是一个有向图（nodes + edges），不是封闭枚举
//   - skillpack 提供 AgentWork / BatchWork / MapWork 三种节点类型
//   - 辅助函数 agent() / batch() / mapWork() / edge() 是语法糖
//   - 用户可以自由构造任意图结构，skillpack 不做模式限制
// ============================================================

// ---------------------------------------------------------------
// Schedule — 开放的图结构
// ---------------------------------------------------------------

/** 调度图：由节点和边构成的有向图 */
export interface ScheduleGraph {
  nodes: WorkNode[];
  edges: EdgeDef[];
  /** 入口节点 id */
  entry: string;
}

/** 边定义 */
export interface EdgeDef {
  from: string;
  to: string;
  /** 可选的条件表达式（条件路由） */
  condition?: string;
}

// ---------------------------------------------------------------
// 节点类型（用户可扩展）
// ---------------------------------------------------------------

export type WorkNode = AgentWork | BatchWork | MapWork;

/** 单个 Agent 节点 */
export interface AgentWork {
  kind: 'agent';
  id: string;
  label: string;
  role: string;
  task: string;
  reads?: string[];
  timeout?: number;
  retryCount?: number;
}

/** 批量并行节点（扇出 + 可选收敛） */
export interface BatchWork {
  kind: 'batch';
  id: string;
  label: string;
  branches: WorkNode[];
  converge?: AgentWork;
  gate?: QualityGateDef;
}

/** Map 节点（对每个条目执行同一 worker） */
export interface MapWork {
  kind: 'map';
  id: string;
  label: string;
  /** 数据来源路径 */
  itemFrom: string;
  /** 对每个条目执行的 worker 子图 */
  worker: WorkNode;
  /** 最大并发数 */
  maxConcurrency: number;
  /** 每个条目占用的槽位数（如 1 命题 = 2 agent 则 slotOccupancy=2） */
  slotOccupancy?: number;
}

// ---------------------------------------------------------------
// 辅助函数（LangGraph 风格的 builder）
// ---------------------------------------------------------------

/** 创建一个 Agent 节点 */
export function agent(config: Omit<AgentWork, 'kind'>): AgentWork {
  return { kind: 'agent', ...config };
}

/** 创建一个批量并行节点 */
export function batch(
  id: string,
  label: string,
  branches: WorkNode[],
  config?: { converge?: AgentWork; gate?: QualityGateDef },
): BatchWork {
  return {
    kind: 'batch',
    id,
    label,
    branches,
    converge: config?.converge,
    gate: config?.gate,
  };
}

/** 创建一个 Map 节点（类似 rollingWindow） */
export function mapWork(
  id: string,
  label: string,
  itemFrom: string,
  worker: WorkNode,
  maxConcurrency: number = 5,
): MapWork {
  return { kind: 'map', id, label, itemFrom, worker, maxConcurrency };
}

/** 创建一条边 */
export function edge(from: string, to: string, condition?: string): EdgeDef {
  return { from, to, condition };
}

// ---------------------------------------------------------------
// Agent 定义（子节点 Agent 的公共结构）
// ---------------------------------------------------------------

export interface QualityGateDef {
  rule: string;
  onPass: 'converge' | 'skip';
  onFail: 'degrade' | 'halt' | 'userChoice';
  prompt?: string;
}

// ---------------------------------------------------------------
// 文件引用
// ---------------------------------------------------------------

export interface FileRef {
  path: string;
  description: string;
  schema?: string;
  required?: boolean;
}

// ---------------------------------------------------------------
// Barrier（检查点）
// ---------------------------------------------------------------

export interface BarrierDef {
  checkItems: string[];
  clarifyPrompt: string;
  onConfirm: 'continue' | string;
  onReject: 'rollback' | 'modify';
  recordPath?: string;
}

// ---------------------------------------------------------------
// 生命周期钩子
// ---------------------------------------------------------------

export interface ReuseRule {
  checkFile: string;
  skipDescription: string;
}

export interface DegradeProtocol {
  maxRetries: number;
  onDegrade: 'continue' | 'halt';
  fallbackTask?: string;
}

// ---------------------------------------------------------------
// Step 定义
// ---------------------------------------------------------------

export interface StepDefinition {
  id: string;
  title: string;
  description: string;
  dependsOn: string[];
  /** 调度图 — 用户自由构造，不限于预定义模式 */
  schedule: ScheduleGraph;
  reads: FileRef[];
  writes: FileRef[];
  barrier?: BarrierDef;
  reuse?: ReuseRule[];
  degrade?: DegradeProtocol;
  plugins?: string[];
}

// ---------------------------------------------------------------
// Skill 定义（Vue 3 createApp 类比）
// ---------------------------------------------------------------

/** Skill 定义 — 用户通过 createSkill() 生成 */
export interface SkillDefinition {
  name: string;
  title: string;
  description: string;
  steps: StepDefinition[];
}

/** 创建 Skill 定义（纯类型辅助，返回传入的对象） */
export function createSkill(config: SkillDefinition): SkillDefinition {
  return config;
}

// ---------------------------------------------------------------
// Pipeline 定义
// ---------------------------------------------------------------

export interface PipelineDefinition {
  name: string;
  description: string;
  steps: StepDefinition[];
}

// ---------------------------------------------------------------
// 模板变量
// ---------------------------------------------------------------

export type BuildTimeVar =
  | '{{stepSeq}}'
  | '{{stepId}}'
  | '{{shortName}}'

export type RuntimeVar =
  | '{workDir}'
  | '{topic}'
  | '{seq}'
  | '{shortName}'
  | '{capabilityId}'
  | '{dimension}'
  | '{batchId}'
  | '{agentLabel}'

// ---------------------------------------------------------------
// 解析器产出
// ---------------------------------------------------------------

export interface ResolvedStep extends StepDefinition {
  seq: number;
  resolvedReads: string[];
  resolvedWrites: string[];
}

export interface ResolvedPipeline {
  name: string;
  description: string;
  steps: ResolvedStep[];
  stepOrder: Record<string, number>;
}
