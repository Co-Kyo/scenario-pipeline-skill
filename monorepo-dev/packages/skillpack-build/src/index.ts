// ============================================================
// skillpack-build — Resolver + Markdown generator
//
// renderSchedule 不再 switch(mode)，
// 而是遍历 ScheduleGraph，按节点 kind 逐个渲染
// ============================================================

import type {
  StepDefinition,
  ResolvedStep,
  ResolvedPipeline,
  ScheduleGraph,
  WorkNode,
  AgentWork,
  BatchWork,
  MapWork,
  PipelineDefinition,
} from 'skillpack-types';
import {
  resolveStepOrder,
  validateStep,
  validateBarrierContinuity,
  validateDependencyRefs,
} from 'skillpack-common';
import * as fs from 'node:fs';
import * as path from 'node:path';

export { resolveStepOrder };
export { validateStep, validateBarrierContinuity, validateDependencyRefs };

// ---------------------------------------------------------------
// Config: skillpack.config.ts 的类型 + 辅助函数
// ---------------------------------------------------------------

export interface SkillpackConfig {
  /** 链接到 skill 定义文件的路径（如 ./skill.ts） */
  skill: string;
  /** 输出目录（相对于 cwd） */
  outputDir: string;
  /** 可选的 meta 覆盖项 */
  meta?: Partial<{ name: string; description: string }>;
}

/** 创建 skillpack 配置（纯类型辅助，返回传入的对象） */
export function defineConfig(config: SkillpackConfig): SkillpackConfig {
  return config;
}

// ---------------------------------------------------------------
// Graph-based Markdown renderer
// ---------------------------------------------------------------

function renderAgentNode(node: AgentWork, depth: number): string {
  const indent = '  '.repeat(depth);
  let md = `${indent}- Agent：\`${node.label}\` — ${node.role}\n`;
  if (node.timeout) md += `${indent}  超时：${node.timeout} min\n`;
  md += `${indent}  Task：\n\`\`\`\n${node.task.slice(0, 250)}${node.task.length > 250 ? '...' : ''}\n\`\`\`\n`;
  return md;
}

function renderBatchNode(node: BatchWork, depth: number): string {
  const indent = '  '.repeat(depth);
  let md = `${indent}批量并行 — ${node.label}\n`;
  md += `${indent}分支数：${node.branches.length}\n\n`;

  for (let i = 0; i < node.branches.length; i++) {
    const branch = node.branches[i];
    md += `${indent}分支 ${i + 1}：`;
    if (branch.kind === 'agent') {
      md += `\`${branch.label}\` — ${branch.role}\n`;
      if (branch.timeout) md += `${indent}  超时：${branch.timeout} min\n`;
    }
  }

  if (node.gate) {
    md += `\n${indent}🛑 质量门禁\n`;
    md += `${indent}- 规则：${node.gate.rule}\n`;
    md += `${indent}- 通过 → ${node.gate.onPass === 'converge' ? '启动收敛者' : '跳过'}\n`;
    md += `${indent}- 失败 → ${node.gate.onFail === 'halt' ? '停止' : '降级继续'}\n`;
  }

  if (node.converge) {
    md += `\n${indent}收敛者：\`${node.converge.label}\` — ${node.converge.role}\n`;
    md += `${indent}超时：${node.converge.timeout ?? 5} min\n`;
    md += `${indent}Task：\n\`\`\`\n${node.converge.task.slice(0, 250)}${node.converge.task.length > 250 ? '...' : ''}\n\`\`\`\n`;
  }

  return md;
}

function renderMapNode(node: MapWork, depth: number): string {
  const indent = '  '.repeat(depth);
  const slotNote = node.slotOccupancy && node.slotOccupancy > 1
    ? `（每个条目占 ${node.slotOccupancy} 个槽位）`
    : '';
  let md = `${indent}滚动窗口 — ${node.label}\n`;
  md += `${indent}- 最大并发槽位：${node.maxConcurrency} ${slotNote}\n`;
  md += `${indent}- 数据来源：${node.itemFrom}\n\n`;

  if (node.worker.kind === 'agent') {
    md += `${indent}Worker：\`${node.worker.label}\` — ${node.worker.role}\n`;
    if (node.worker.timeout) md += `${indent}超时：${node.worker.timeout} min\n`;
    md += `${indent}Task 模板：\n\`\`\`\n${node.worker.task.slice(0, 250)}${node.worker.task.length > 250 ? '...' : ''}\n\`\`\`\n`;
  }

  return md;
}

/** 递归渲染 schedule 图 */
function renderGraph(graph: ScheduleGraph): string {
  let md = `### 调度图\n\n`;
  md += `入口节点：\`${graph.entry}\`\n`;
  md += `节点数：${graph.nodes.length}，边数：${graph.edges.length}\n\n`;

  // 按拓扑顺序渲染（从 entry 开始，沿 edges 行走）
  const visited = new Set<string>();
  const order: WorkNode[] = [];

  function dfs(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // 先渲染子节点
    if (node.kind === 'batch') {
      for (const b of node.branches) dfs(b.id);
    }
    if (node.kind === 'map' && node.worker) {
      dfs(node.worker.id);
    }

    order.push(node);

    // 沿边遍历
    for (const e of graph.edges) {
      if (e.from === nodeId) dfs(e.to);
    }
  }

  dfs(graph.entry);

  for (const node of order) {
    md += `\n---\n\n`;
    switch (node.kind) {
      case 'agent':
        md += `**${node.label}**（单 Agent）\n\n`;
        md += renderAgentNode(node, 0);
        break;
      case 'batch':
        md += `**${node.label}**（批量并行）\n\n`;
        md += renderBatchNode(node, 0);
        break;
      case 'map':
        md += `**${node.label}**（滚动窗口 / Map）\n\n`;
        md += renderMapNode(node, 0);
        break;
    }
  }

  // 条件路由
  const conditionalEdges = graph.edges.filter(e => e.condition);
  if (conditionalEdges.length > 0) {
    md += `\n---\n\n**条件路由：**\n\n`;
    md += `| 来源 | 目标 | 条件 |\n`;
    md += `|------|------|------|\n`;
    for (const e of conditionalEdges) {
      md += `| \`${e.from}\` | \`${e.to}\` | ${e.condition} |\n`;
    }
  }

  return md;
}

// ---------------------------------------------------------------
// Barrier render
// ---------------------------------------------------------------

function renderBarrier(step: ResolvedStep): string {
  if (!step.barrier) return '';
  const seqStr = String(step.seq);
  let md = `\n## Barrier ${seqStr}\n\n`;
  md += `**检查项：**\n`;
  for (const item of step.barrier.checkItems) {
    md += `- ${item}\n`;
  }
  md += '\n**`clarify` 提示：**\n> ' + step.barrier.clarifyPrompt + '\n\n';
  md += `| 决策 | 行为 |\n`;
  md += `|------|------|\n`;
  md += `| 确认 | ${step.barrier.onConfirm} |\n`;
  md += `| 拒绝 | ${step.barrier.onReject} |\n`;
  return md;
}

// ---------------------------------------------------------------
// Full step render
// ---------------------------------------------------------------

/** Render a single resolved step to a complete Markdown process file */
export function renderStep(step: ResolvedStep): string {
  const seqStr = String(step.seq).padStart(2, '0');

  let md = `# Step ${seqStr}: ${step.title}\n\n`;
  md += `${step.description}\n\n`;
  md += `**关键产出**：${step.writes.map(w => `\`${w.path}\``).join(', ')}\n\n`;
  md += `---\n\n`;

  // File references
  md += `## 文件引用\n\n`;
  md += `| 变量 | 文件 | 说明 |\n`;
  md += `|------|------|------|\n`;
  for (const ref of step.reads) {
    md += `| \`${path.basename(ref.path)}\` | \`${ref.path}\` | ${ref.description} |\n`;
  }
  for (const ref of step.writes) {
    md += `| \`${path.basename(ref.path)}\` | \`${ref.path}\` | ${ref.description} |\n`;
  }

  // Dependencies
  md += `\n## 依赖\n\n`;
  md += `前置步骤：${step.dependsOn.length > 0 ? step.dependsOn.map(d => `\`${d}\``).join(', ') : '无'}\n`;

  // Schedule (graph-based)
  md += `\n## 调度策略\n\n`;
  md += renderGraph(step.schedule);

  // Incremental reuse
  if (step.reuse && step.reuse.length > 0) {
    md += `\n## 增量复用\n\n`;
    md += `| 检查项 | 条件 | 行为 |\n`;
    md += `|--------|------|------|\n`;
    for (const rule of step.reuse) {
      md += `| ${rule.skipDescription} | \`${rule.checkFile}\` 存在 | 跳过该任务 |\n`;
    }
  }

  // Degrade
  if (step.degrade) {
    md += `\n## 降级协议\n\n`;
    md += `- 最大重试次数：${step.degrade.maxRetries}\n`;
    md += `- 降级后行为：${step.degrade.onDegrade === 'continue' ? '继续' : '停止'}\n`;
    if (step.degrade.fallbackTask) {
      md += `- 降级 Task：\n\`\`\`\n${step.degrade.fallbackTask}\n\`\`\`\n`;
    }
  }

  // Barrier
  md += renderBarrier(step);

  // Plugins
  if (step.plugins && step.plugins.length > 0) {
    md += `\n## 插件加载\n\n`;
    for (const plugin of step.plugins) {
      md += `- \`${plugin}\`：条件性加载\n`;
    }
  }

  md += `\n---\n`;
  md += `*Generated by skillpack-build v0.1.0 | Step ${seqStr} — ${step.id}*`;

  return md;
}

// ---------------------------------------------------------------
// SKILL.md render
// ---------------------------------------------------------------

/** 从 pipeline 生成 SKILL.md */
export function renderSkillMd(
  pipeline: ResolvedPipeline,
  meta: { name: string; description: string },
): string {
  const steps = pipeline.steps;
  const entryNode = steps[0];

  let md = `---\n`;
  md += `name: ${meta.name}\n`;
  md += `description: "${meta.description}"\n`;
  md += `---\n\n`;
  md += `# ${meta.name}\n\n`;
  md += `${meta.description}\n\n`;

  // 调用方式
  md += `## 调用方式\n\n`;
  md += `使用自然语言显式调用：\n\n`;
  md += `| 场景 | 推荐句式 |\n`;
  md += `|------|----------|\n`;
  md += `| 完整流程 | "使用 ${meta.name}，对 <场景描述> 进行完整处理" |\n`;
  md += `| 指定步骤 | "使用 ${meta.name}，从 ${steps[Math.min(1, steps.length - 1)].id} 开始处理 <场景>" |\n\n`;

  // 流程总览
  md += `## 流程总览\n\n`;
  md += `> ⚠️ 每步只读该步文件，严禁提前加载后续步骤。\n\n`;

  // 流程箭头图
  const flowArrows = steps.map(s => `${s.id}`).join(' → ');
  md += `\`\`\`\n${flowArrows}\n\`\`\`\n\n`;

  // 步骤详情表
  md += `### 步骤详情\n\n`;
  md += `| # | 步骤 | 核心目的 | 关键产出 |\n`;
  md += `|---|------|----------|----------|\n`;
  for (const step of steps) {
    const seq = String(step.seq).padStart(2, '0');
    const outputs = step.writes.map(w => `\`${path.basename(w.path)}\``).join(', ');
    md += `| ${seq} | ${step.title} | ${step.description} | ${outputs} |\n`;
  }

  // 执行协议
  md += `\n## 执行\n\n`;
  md += `执行 Step N 时引用 Step N+1 文件内容即为违规。\n`;
  md += `每步只读 processes/ 中对应文件 + assets/ 中该步声明的文件。\n`;

  md += `\n---\n`;
  md += `*Generated by skillpack-build v0.1.0*`;

  return md;
}

// ---------------------------------------------------------------
// Pipeline render
// ---------------------------------------------------------------

export function renderPipeline(
  pipeline: ResolvedPipeline,
  outputDir: string,
  meta: { name: string; description: string },
): string[] {
  const filePaths: string[] = [];
  const processesDir = path.join(outputDir, 'processes');

  if (!fs.existsSync(processesDir)) {
    fs.mkdirSync(processesDir, { recursive: true });
  }

  // Render step files → processes/
  for (const step of pipeline.steps) {
    const seqStr = String(step.seq).padStart(2, '0');
    const fileName = `${seqStr}-${step.id}.md`;
    const filePath = path.join(processesDir, fileName);
    const content = renderStep(step);
    fs.writeFileSync(filePath, content, 'utf-8');
    filePaths.push(filePath);
    console.log(`  ✓ processes/${fileName}`);
  }

  // Render SKILL.md
  const skillContent = renderSkillMd(pipeline, meta);
  const skillPath = path.join(outputDir, 'SKILL.md');
  fs.writeFileSync(skillPath, skillContent, 'utf-8');
  filePaths.push(skillPath);
  console.log(`  ✓ SKILL.md`);

  return filePaths;
}

// ---------------------------------------------------------------
// Build
// ---------------------------------------------------------------

export function buildPipeline(
  steps: StepDefinition[],
  outputDir: string,
  meta?: { name: string; description: string },
): { pipeline: ResolvedPipeline; files: string[] } {
  const errors = [
    ...steps.flatMap(validateStep),
    ...validateDependencyRefs(steps),
    ...validateBarrierContinuity(steps),
  ];

  if (errors.length > 0) {
    console.error('Validation errors:');
    for (const err of errors) {
      console.error(`  ❌ [${err.stepId}] ${err.field}: ${err.message}`);
    }
    throw new Error(`Validation failed with ${errors.length} error(s)`);
  }

  console.log('Validation passed ✓');

  const pipeline = resolveStepOrder(steps);
  const effectiveMeta = meta ?? { name: pipeline.name || 'untitled', description: '' };

  console.log(`\nStep order resolved:`);
  for (const step of pipeline.steps) {
    console.log(`  ${String(step.seq).padStart(2, '0')}: ${step.id} — ${step.title}`);
  }

  console.log(`\nRendering to ${outputDir}:`);
  const files = renderPipeline(pipeline, outputDir, effectiveMeta);

  console.log(`\nDone. ${files.length} files written.`);
  return { pipeline, files };
}
