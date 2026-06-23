import React from 'react';
import type { PreProcessingData } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { SourceStats } from './SourceStats';
import { CapabilityGraph } from './CapabilityGraph';
import { EvaluationMatrix } from './EvaluationMatrix';
import { PropositionPool } from './PropositionPool';

interface PreProcessingViewProps {
  data: PreProcessingData | null;
}

/**
 * PreProcessingView — container for the pre-processing phase (Steps 2-4, Checkpoints ⓐⓑ).
 *
 * Composes four sub-views:
 * 1. SourceStats — source material statistics (T0-T3 tier distribution, coverage)
 * 2. CapabilityGraph — capability graph visualization (nodes=caps, edges=shared props)
 * 3. EvaluationMatrix — evaluation matrix scatter plot (difficulty × score)
 * 4. PropositionPool — proposition pool table
 *
 * When data is null, renders EmptyState.
 */
export const PreProcessingView: React.FC<PreProcessingViewProps> = ({ data }) => {
  if (!data) {
    return <EmptyState message="前处理阶段数据待生成" icon="🔬" />;
  }

  const hasAny =
    data.rawMaterials !== null ||
    data.capabilityGraph !== null ||
    data.evaluations !== null ||
    data.researchGrouping !== null;

  if (!hasAny) {
    return <EmptyState message="前处理阶段数据待生成" icon="🔬" />;
  }

  return (
    <div className="space-y-4">
      <SourceStats data={data.rawMaterials} />
      <CapabilityGraph data={data} />
      <EvaluationMatrix data={data} />
      <PropositionPool data={data} />
    </div>
  );
};
