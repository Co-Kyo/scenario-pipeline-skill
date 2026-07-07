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
  ControlNode,
  TaskNode,
  SeqNode,
  ParallelNode,
  MapNode,
  BranchNode,
  LoopNode,
  TaskDef,
  PipelineDefinition,
  PipelineState,
  PipelineStateManager,
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

/** 递归渲染 ControlNode 树 */
function renderControlTree(node: ControlNode, depth: number): string {
  const indent = '  '.repeat(depth);

  switch (node.kind) {
    case 'task': {
      const t = node.task;
      let md = `${indent}- Task：\`${t.label}\` [${t.type}]\n`;
      if (t.timeout) md += `${indent}  超时：${t.timeout} min\n`;
      if (t.tools && t.tools.length > 0) {
        md += `${indent}  工具：${t.tools.join(', ')}\n`;
      }
      md += `${indent}  Body：\n\`\`\`\n${t.body.slice(0, 250)}${t.body.length > 250 ? '...' : ''}\n\`\`\`\n`;
      return md;
    }
    case 'seq': {
      let md = `${indent}▸ 顺序执行：${node.label}（${node.nodes.length} 步）\n\n`;
      for (let i = 0; i < node.nodes.length; i++) {
        md += `${indent}  第 ${i + 1} 步：\n`;
        md += renderControlTree(node.nodes[i], depth + 2);
        md += '\n';
      }
      return md;
    }
    case 'parallel': {
      let md = `${indent}▤ 并行分支：${node.label}（${node.branches.length} 条分支）\n\n`;
      for (let i = 0; i < node.branches.length; i++) {
        md += `${indent}  分支 ${i + 1}：\n`;
        md += renderControlTree(node.branches[i], depth + 2);
        md += '\n';
      }
      if (node.gate) {
        md += `${indent}  🛑 质量门禁\n`;
        md += `${indent}    - 规则：${node.gate.rule}\n`;
        md += `${indent}    - 通过 → ${node.gate.onPass === 'converge' ? '启动收敛者' : '跳过'}\n`;
        md += `${indent}    - 失败 → ${node.gate.onFail === 'halt' ? '停止' : '降级继续'}\n`;
      }
      if (node.converge) {
        md += `${indent}  收敛者：\`${node.converge.label}\` [${node.converge.type}]\n`;
        md += `${indent}    超时：${node.converge.timeout ?? 5} min\n`;
        md += `${indent}    Body：\n\`\`\`\n${node.converge.body.slice(0, 250)}${node.converge.body.length > 250 ? '...' : ''}\n\`\`\`\n`;
      }
      return md;
    }
    case 'map': {
      const slotNote = node.slotOccupancy && node.slotOccupancy > 1
        ? `（每个条目占 ${node.slotOccupancy} 个槽位）`
        : '';
      let md = `${indent}▦ 滚动窗口：${node.label}\n`;
      md += `${indent}  - 最大并发：${node.maxConcurrency} ${slotNote}\n`;
      md += `${indent}  - 数据来源：${node.items}\n\n`;
      md += `${indent}  Worker：\n`;
      md += renderControlTree(node.worker, depth + 2);
      md += '\n';
      if (node.reduce) {
        md += `${indent}  Reduce：\`${node.reduce.label}\` [${node.reduce.type}]\n`;
        md += `${indent}    超时：${node.reduce.timeout ?? 5} min\n`;
        md += `${indent}    Body：\n\`\`\`\n${node.reduce.body.slice(0, 250)}${node.reduce.body.length > 250 ? '...' : ''}\n\`\`\`\n`;
      }
      return md;
    }
    case 'branch': {
      let md = `${indent}◇ 条件分支：${node.label}\n`;
      md += `${indent}  条件：${node.condition}\n\n`;
      md += `${indent}  Then：\n`;
      md += renderControlTree(node.then, depth + 2);
      md += '\n';
      if (node.else) {
        md += `${indent}  Else：\n`;
        md += renderControlTree(node.else, depth + 2);
        md += '\n';
      }
      return md;
    }
    case 'loop': {
      let md = `${indent}↻ 循环：${node.label}\n`;
      md += `${indent}  终止条件：${node.until}\n`;
      if (node.maxIterations) md += `${indent}  最大迭代：${node.maxIterations}\n`;
      md += `\n${indent}  循环体：\n`;
      md += renderControlTree(node.body, depth + 2);
      return md;
    }
  }
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

  // 调度策略（ControlNode tree）
  md += `\n## 调度策略\n\n`;
  md += renderControlTree(step.graph, 0);

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

export function renderPipelineState(state: PipelineState): string {
  let md = '## 管道状态\n\n';
  md += '| 步骤 | 状态 | 重试次数 |\n';
  md += '|------|------|---------|\n';
  for (const [stepId, stepState] of Object.entries(state.steps)) {
    const icon = stepState.status === 'completed' ? '✅' : stepState.status === 'failed' ? '❌' : stepState.status === 'running' ? '🔄' : '⏳';
    md += '| ' + stepId + ' | ' + icon + ' ' + stepState.status + ' | ' + stepState.runAttempt + ' |\n';
  }
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
