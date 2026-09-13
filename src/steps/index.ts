import type { SourceStep } from 'skillnomad';
import { initialize } from './initialize.js';
import { intentAnchor } from './intent-anchor.js';
import { brainstorm } from './brainstorm.js';
import { partition } from './partition.js';
import { scan } from './scan.js';
import { capabilityGraph } from './capability-graph.js';
import { evaluatePool } from './evaluate-pool.js';
import { capabilityResearch } from './capability-research.js';
import { briefingAssemble } from './briefing-assemble.js';
import { assemble } from './assemble.js';
import { learningLadder } from './learning-ladder.js';

export const steps: SourceStep[] = [
    initialize,
    intentAnchor,
    brainstorm,
    partition,
    scan,
    capabilityGraph,
    evaluatePool,
    capabilityResearch,
    briefingAssemble,
    assemble,
    learningLadder,
];
