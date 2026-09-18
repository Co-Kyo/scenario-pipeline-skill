import type { SourceStep } from 'skillnomad';
import { initialize } from './initialize/step.js';
import { intentAnchor } from './intent-anchor/step.js';
import { brainstorm } from './brainstorm/step.js';
import { partition } from './partition/step.js';
import { scan } from './scan/step.js';
import { capabilityGraph } from './capability-graph/step.js';
import { evaluatePool } from './evaluate-pool/step.js';
import { capabilityResearch } from './capability-research/step.js';
import { briefingAssemble } from './briefing-assemble/step.js';
import { assemble } from './assemble/step.js';
import { learningLadder } from './learning-ladder/step.js';

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
