'use strict';

/**
 * Checkpoint definitions — shared between Node.js build scripts.
 *
 * This is the JavaScript equivalent of dashboard-dev/src/data/checkpoints.ts.
 * It must be kept in sync with the TypeScript version.
 *
 * 9 pipeline checkpoints (ⓩ-ⓗ) mapped to steps and stages.
 */

var CHECKPOINT_DEFINITIONS = [
  {
    id: 'z',
    symbol: 'ⓩ',
    name: '需求确认',
    stage: '前置',
    step: 0,
    artifacts: ['requirement-web.json'],
    description: '头脑风暴完成，命题清单与能力雏形已生成。用户确认需求范围是否符合预期。',
  },
  {
    id: 'x',
    symbol: 'ⓧ',
    name: '分区确认',
    stage: '前置',
    step: 1,
    artifacts: ['partition-analysis.json', 'execution-plan.md'],
    description: '分区完成，依赖关系 DAG 与连通分量已计算。用户确认分区策略与 Session 分配。',
  },
  {
    id: 'a',
    symbol: 'ⓐ',
    name: '扫描完成',
    stage: '前处理',
    step: 2,
    artifacts: ['.raw-materials/index.json'],
    description: '信源扫描完成，T0-T3 tier 分布已统计。用户确认信源覆盖度是否充分。',
  },
  {
    id: 'b',
    symbol: 'ⓑ',
    name: '能力图谱确认',
    stage: '前处理',
    step: 3,
    artifacts: ['capability-graph.json', 'evaluations.json'],
    description: '能力图谱构建与评估入池完成。用户确认能力覆盖是否合理、命题取舍是否得当。',
  },
  {
    id: 'c',
    symbol: 'ⓒ',
    name: '能力研究完成',
    stage: '后处理',
    step: 5,
    artifacts: ['capabilities/*.md'],
    description: '36 篇能力研究文档已生成。用户确认能力研究质量。',
  },
  {
    id: 'd',
    symbol: 'ⓓ',
    name: 'Briefing 完成',
    stage: '后处理',
    step: 6,
    artifacts: ['briefings/*.md'],
    description: 'Briefing 文档已生成。用户确认 briefing 内容。',
  },
  {
    id: 'f',
    symbol: 'ⓕ',
    name: '命题组装完成',
    stage: '后处理',
    step: 7,
    artifacts: ['overview/edge/trade/exp/refs'],
    description: '15 个命题的 5 Tab 内容已组装完成。用户确认命题详情质量。',
  },
  {
    id: 'g',
    symbol: 'ⓖ',
    name: '学习阶梯完成',
    stage: '后处理',
    step: 8,
    artifacts: ['learning-ladder.md'],
    description: '学习阶梯已生成。用户确认学习路径拓扑排序。',
  },
  {
    id: 'h',
    symbol: 'ⓗ',
    name: '看板生成完成',
    stage: '后处理',
    step: 9,
    artifacts: ['dashboard.html'],
    description: '完整看板已生成。管线全部完成。',
  },
];

module.exports = {
  CHECKPOINT_DEFINITIONS: CHECKPOINT_DEFINITIONS,
  CHECKPOINT_SYMBOLS: CHECKPOINT_DEFINITIONS.map(function (c) { return c.symbol; }),
  CHECKPOINT_IDS: CHECKPOINT_DEFINITIONS.map(function (c) { return c.id; }),
};
