import type { SourceStep } from 'skillnomad';
import { initialize } from './initialize/step.ts';
import { intentAnchor } from './intent-anchor/step.ts';
import { brainstorm } from './brainstorm/step.ts';
import { partition } from './partition/step.ts';
import { scan } from './scan/step.ts';
import { capabilityGraph } from './capability-graph/step.ts';
import { evaluatePool } from './evaluate-pool/step.ts';
import { capabilityResearch } from './capability-research/step.ts';
import { briefingAssemble } from './briefing-assemble/step.ts';
import { assemble } from './assemble/step.ts';
import { learningLadder } from './learning-ladder/step.ts';

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
