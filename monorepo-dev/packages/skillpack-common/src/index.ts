// ============================================================
// skillpack-common — Runtime helpers: graph walker, validation, template resolution
// ============================================================

import type {
  ScheduleGraph,
  WorkNode,
  EdgeDef,
  AgentWork,
  BatchWork,
  MapWork,
  BarrierDef,
  StepDefinition,
  FileRef,
  ResolvedStep,
  ResolvedPipeline,
} from 'skillpack-types';

// ---------------------------------------------------------------
// Template resolution
// ---------------------------------------------------------------

export function resolveBuildTimeVars(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (vars[key] !== undefined) return vars[key];
    throw new Error(`Unresolved build-time variable: {{${key}}}`);
  });
}

export function resolveRuntimeVars(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (vars[key] !== undefined) return vars[key];
    return `{${key}}`;
  });
}

export function resolveFileRef(
  ref: FileRef,
  buildVars: Record<string, string>,
): string {
  return resolveBuildTimeVars(ref.path, buildVars);
}

// ---------------------------------------------------------------
// Validation
// ---------------------------------------------------------------

export interface ValidationError {
  stepId: string;
  field: string;
  message: string;
}

export function validateStep(step: StepDefinition): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!step.id) {
    errors.push({ stepId: '(unknown)', field: 'id', message: 'Step id is required' });
  }
  if (!step.title) {
    errors.push({ stepId: step.id, field: 'title', message: 'Title is required' });
  }
  if (!step.description) {
    errors.push({ stepId: step.id, field: 'description', message: 'Description is required' });
  }

  if (!step.schedule) {
    errors.push({ stepId: step.id, field: 'schedule', message: 'Schedule graph is required' });
  } else {
    if (!step.schedule.nodes || step.schedule.nodes.length === 0) {
      errors.push({ stepId: step.id, field: 'schedule.nodes', message: 'At least one node required' });
    }
    if (!step.schedule.entry) {
      errors.push({ stepId: step.id, field: 'schedule.entry', message: 'Entry node id required' });
    }
    // Validate entry node exists
    const nodeIds = new Set(step.schedule.nodes.map(n => n.id));
    if (step.schedule.entry && !nodeIds.has(step.schedule.entry)) {
      errors.push({ stepId: step.id, field: 'schedule.entry', message: `Entry "${step.schedule.entry}" not found in nodes` });
    }
    // Validate edges reference existing nodes
    if (step.schedule.edges) {
      for (const e of step.schedule.edges) {
        if (!nodeIds.has(e.from)) {
          errors.push({ stepId: step.id, field: 'schedule.edges', message: `Edge from "${e.from}" — node not found` });
        }
        if (!nodeIds.has(e.to)) {
          errors.push({ stepId: step.id, field: 'schedule.edges', message: `Edge to "${e.to}" — node not found` });
        }
      }
    }
  }

  if (!step.writes || step.writes.length === 0) {
    errors.push({ stepId: step.id, field: 'writes', message: 'At least one output file required' });
  }

  if (step.barrier) {
    if (!step.barrier.clarifyPrompt) {
      errors.push({ stepId: step.id, field: 'barrier.clarifyPrompt', message: 'Barrier must have a clarify prompt' });
    }
    if (!step.barrier.checkItems || step.barrier.checkItems.length === 0) {
      errors.push({ stepId: step.id, field: 'barrier.checkItems', message: 'Barrier must have at least one check item' });
    }
  }

  return errors;
}

export function validateBarrierContinuity(steps: StepDefinition[]): ValidationError[] {
  const errors: ValidationError[] = [];
  let lastBarrierIndex = -1;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].barrier) lastBarrierIndex = i;
  }
  for (let i = 0; i <= lastBarrierIndex; i++) {
    if (!steps[i].barrier) {
      errors.push({
        stepId: steps[i].id,
        field: 'barrier',
        message: `Step "${steps[i].id}" at index ${i} is before the last barrier (index ${lastBarrierIndex}) but has no barrier defined`,
      });
    }
  }
  return errors;
}

export function validateDependencyRefs(steps: StepDefinition[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const ids = new Set(steps.map(s => s.id));
  for (const step of steps) {
    for (const dep of step.dependsOn) {
      if (!ids.has(dep)) {
        errors.push({
          stepId: step.id,
          field: 'dependsOn',
          message: `Depends on "${dep}" which is not a defined step`,
        });
      }
    }
  }
  return errors;
}

// ---------------------------------------------------------------
// Dependency resolver (topological sort)
// ---------------------------------------------------------------

export function resolveStepOrder(steps: StepDefinition[]): ResolvedPipeline {
  const idToStep = new Map(steps.map(s => [s.id, s]));
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const step of steps) {
    adj.set(step.id, []);
    inDegree.set(step.id, 0);
  }
  for (const step of steps) {
    for (const dep of step.dependsOn) {
      adj.get(dep)?.push(step.id);
      inDegree.set(step.id, (inDegree.get(step.id) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const step of steps) {
    if ((inDegree.get(step.id) ?? 0) === 0) queue.push(step.id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    for (const neighbor of adj.get(node) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  if (order.length !== steps.length) {
    const missing = steps.filter(s => !order.includes(s.id)).map(s => s.id);
    throw new Error(`Circular dependency detected among steps: ${missing.join(', ')}`);
  }

  const stepOrder: Record<string, number> = {};
  const resolvedSteps: ResolvedStep[] = [];

  for (let seq = 0; seq < order.length; seq++) {
    const id = order[seq];
    stepOrder[id] = seq;
    const step = idToStep.get(id)!;
    const buildVars = { stepSeq: String(seq).padStart(2, '0'), stepId: id };

    resolvedSteps.push({
      ...step,
      seq,
      resolvedReads: step.reads.map(r => resolveFileRef(r, buildVars)),
      resolvedWrites: step.writes.map(r => resolveFileRef(r, buildVars)),
    });
  }

  return { name: 'untitled', description: '', steps: resolvedSteps, stepOrder };
}

// ---------------------------------------------------------------
// Graph walker（替代旧的 mode-based 策略函数）
// ---------------------------------------------------------------

/** 遍历调度图，对每个节点执行回调 */
export function walkGraph(
  graph: ScheduleGraph,
  visit: (node: WorkNode, depth: number) => void,
): void {
  const visited = new Set<string>();

  function dfs(nodeId: string, depth: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return;

    visit(node, depth);

    // Recurse into children
    if (node.kind === 'batch') {
      for (const branch of node.branches) {
        if (!visited.has(branch.id)) dfs(branch.id, depth + 1);
      }
    }
    if (node.kind === 'map') {
      if (!visited.has(node.worker.id)) dfs(node.worker.id, depth + 1);
    }

    // Follow edges
    for (const e of graph.edges) {
      if (e.from === nodeId) dfs(e.to, depth + 1);
    }
  }

  dfs(graph.entry, 0);
}

/** 获取图中所有 agent 节点的扁平列表 */
export function collectAgents(graph: ScheduleGraph): AgentWork[] {
  const agents: AgentWork[] = [];
  walkGraph(graph, (node) => {
    if (node.kind === 'agent') agents.push(node);
    if (node.kind === 'batch' && node.converge) agents.push(node.converge);
  });
  return agents;
}

/** 描述图的拓扑结构（用于预览） */
export function describeGraph(graph: ScheduleGraph): string {
  const lines: string[] = [];
  walkGraph(graph, (node, depth) => {
    const indent = '  '.repeat(depth);
    switch (node.kind) {
      case 'agent':
        lines.push(`${indent}▪ ${node.label} [agent]`);
        break;
      case 'batch':
        lines.push(`${indent}▤ ${node.label} [batch: ${node.branches.length} branches]`);
        if (node.converge) lines.push(`${indent}  ↳ converge: ${node.converge.label}`);
        if (node.gate) lines.push(`${indent}  ↳ gate: ${node.gate.rule}`);
        break;
      case 'map':
        lines.push(`${indent}▦ ${node.label} [map: max ${node.maxConcurrency} concurrent]`);
        break;
    }
  });
  return lines.join('\n');
}

// ---------------------------------------------------------------
// 运行时执行函数（stub — 平台适配时实现）
// ---------------------------------------------------------------

export async function executeGraph(
  graph: ScheduleGraph,
  context: { workDir: string; topic: string },
): Promise<void> {
  console.log(`[executeGraph] Entry: ${graph.entry}`);
  console.log(`[executeGraph] Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}`);

  // BFS topological execution
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }
  for (const e of graph.edges) {
    adj.get(e.from)?.push(e.to);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const node of graph.nodes) {
    if ((inDegree.get(node.id) ?? 0) === 0) queue.push(node.id);
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) continue;

    console.log(`  ▶ ${node.label} [${node.kind}]`);

    if (node.kind === 'agent') {
      console.log(`    agent: ${node.role}`);
    } else if (node.kind === 'batch') {
      console.log(`    spawning ${node.branches.length} branches...`);
      for (const branch of node.branches) {
        console.log(`      - ${branch.label}`);
      }
      if (node.converge) console.log(`    converge: ${node.converge.label}`);
    } else if (node.kind === 'map') {
      console.log(`    mapping: max ${node.maxConcurrency} concurrent`);
    }

    for (const neighbor of adj.get(nodeId) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }
}

export async function executeBarrier(
  barrier: BarrierDef,
): Promise<'continue' | 'rollback' | 'modify'> {
  console.log(`\n=== Barrier ===`);
  for (const item of barrier.checkItems) {
    console.log(`  📋 ${item}`);
  }
  console.log(`Prompt: ${barrier.clarifyPrompt}`);
  console.log(`(non-interactive mode → continuing)\n`);
  return 'continue';
}
