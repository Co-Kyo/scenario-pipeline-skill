import type { StepDefinition, TaskDef } from 'skillpack-types';
import { task, seq, parallel, mapNode, branch, createSkill } from 'skillpack-types';
import { buildPipeline } from 'skillpack-build';

const t1: TaskDef = {
  id: 'brainstorm',
  label: 'Brainstorm',
  type: 'agent',
  body: 'Brainstorm research topics for the given theme',
  timeout: 3,
};

const t2: TaskDef = {
  id: 'search',
  label: 'Search',
  type: 'agent',
  body: 'Search for relevant resources',
  timeout: 5,
};

const t3: TaskDef = {
  id: 'docs-analysis',
  label: 'Docs Analysis',
  type: 'agent',
  body: 'Analyze official documentation',
  timeout: 5,
};

const t4: TaskDef = {
  id: 'practice-analysis',
  label: 'Practice Analysis',
  type: 'agent',
  body: 'Analyze best practices and common pitfalls',
  timeout: 5,
};

const t5: TaskDef = {
  id: 'converge',
  label: 'Integrate Findings',
  type: 'agent',
  body: 'Merge findings from all branches, deduplicate, and prioritize',
  timeout: 5,
};

const t6: TaskDef = {
  id: 'worker',
  label: 'Report Worker',
  type: 'agent',
  body: 'Generate a report chapter for the given category',
  timeout: 5,
};

const t7: TaskDef = {
  id: 'reduce-step',
  label: 'Reduce Report',
  type: 'agent',
  body: 'Combine all chapter reports into a final document',
  timeout: 5,
};

const t8: TaskDef = {
  id: 'then-task',
  label: 'Then Task',
  type: 'agent',
  body: 'Execute main path processing',
  timeout: 3,
};

const t9: TaskDef = {
  id: 'else-task',
  label: 'Else Task',
  type: 'agent',
  body: 'Execute fallback alternative processing',
  timeout: 3,
};

const stepSeq: StepDefinition = {
  id: 'research',
  title: 'Topic Research',
  description: 'Research a topic via brainstorm then search',
  dependsOn: [],
  graph: seq('research-seq', 'Topic Research Sequence', [
    task(t1),
    task(t2),
  ]),
  reads: [
    { path: 'assets/topic-parse/schemas.md', description: 'Research brief schema' },
  ],
  writes: [
    { path: '{workDir}/.meta/research-brief.json', description: 'Research framework' },
  ],
};

const stepParallel: StepDefinition = {
  id: 'multi-dim-analysis',
  title: 'Multi-dimensional Analysis',
  description: 'Analyze from multiple dimensions in parallel',
  dependsOn: ['research'],
  graph: parallel('analysis-parallel', 'Parallel Analysis', [
    task(t3),
    task(t4),
  ], { converge: t5, gate: { rule: 'at most 1 failure', onPass: 'converge', onFail: 'degrade' } }),
  reads: [
    { path: '{workDir}/.meta/research-brief.json', description: 'Research framework', required: true },
  ],
  writes: [
    { path: '{workDir}/.meta/consolidated-findings.json', description: 'Merged findings' },
  ],
};

const stepMap: StepDefinition = {
  id: 'report-gen',
  title: 'Report Generation',
  description: 'Generate reports per category via map',
  dependsOn: ['multi-dim-analysis'],
  graph: mapNode('report-map', 'Report Generation', '{workDir}/.meta/organized.json#categories', task(t6), 3, t7),
  reads: [
    { path: '{workDir}/.meta/consolidated-findings.json', description: 'Merged findings' },
  ],
  writes: [
    { path: '{workDir}/.meta/report/{chapter}.md', description: 'Report chapter' },
  ],
};

const stepBranch: StepDefinition = {
  id: 'decide',
  title: 'Quality Decision',
  description: 'Branch based on quality assessment',
  dependsOn: ['report-gen'],
  graph: branch('quality-branch', 'Quality Gate', 'findings count > 0', task(t8), task(t9)),
  reads: [
    { path: '{workDir}/.meta/report/{chapter}.md', description: 'Report chapter' },
  ],
  writes: [
    { path: '{workDir}/.meta/decision.json', description: 'Decision outcome' },
  ],
};

const steps: StepDefinition[] = [stepSeq, stepParallel, stepMap, stepBranch];

buildPipeline(steps, './output', { name: 'demo-v2', description: 'v2 demo pipeline' });
