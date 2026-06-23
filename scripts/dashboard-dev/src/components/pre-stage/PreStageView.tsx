import React from 'react';
import type { PreStageData } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { PropositionList } from './PropositionList';
import { DependencyDAG } from './DependencyDAG';
import { PartitionSummary } from './PartitionSummary';

interface PreStageViewProps {
  data: PreStageData | null;
}

/**
 * PreStageView — container for the pre-stage phase (Steps 0-1, Checkpoints ⓩⓧ).
 *
 * Composes three sub-views:
 * 1. PropositionList — proposition list grouped by role, showing capability_web 雏形
 * 2. DependencyDAG — dependency DAG visualization
 * 3. PartitionSummary — partition summary (components, depth, communities, sessions)
 *
 * When data is null, renders EmptyState.
 */
export const PreStageView: React.FC<PreStageViewProps> = ({ data }) => {
  if (!data) {
    return <EmptyState message="前置阶段数据待生成" icon="🧠" />;
  }

  const hasRequirement = data.requirement !== null;
  const hasPartition = data.partition !== null;

  if (!hasRequirement && !hasPartition) {
    return <EmptyState message="前置阶段数据待生成" icon="🧠" />;
  }

  return (
    <div className="space-y-4">
      <PropositionList data={data.requirement} />
      <DependencyDAG data={data} />
      <PartitionSummary data={data.partition} />
    </div>
  );
};
