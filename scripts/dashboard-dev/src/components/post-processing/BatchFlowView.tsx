import React, { useMemo } from 'react';
import type { PostProcessingData } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { ChartContainer } from '../shared/ChartContainer';
import { mapToBatchInfo } from '../../utils/data-mappers';

interface BatchFlowViewProps {
  data: PostProcessingData;
}

/**
 * BatchFlowView — ⑦ 执行批次.
 *
 * Migrated from dashboard-template.html renderBatches() (L364-376).
 *
 * Shows batch flow: 基石 → 进阶 → 高级 → 顶层, with arrows connecting batches.
 * Each batch displays its group tags.
 */
export const BatchFlowView: React.FC<BatchFlowViewProps> = ({ data }) => {
  const batches = useMemo(() => mapToBatchInfo(data.analytics), [data]);

  if (batches.length === 0) {
    return (
      <ChartContainer title="执行批次 — 并行化分解" description="能力研究阶段的分组并行策略">
        <EmptyState message="批次数据待生成" icon="⚡" />
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="执行批次 — 并行化分解"
      description="能力研究阶段的分组并行策略。同批次内可并行执行，跨批次串行。基于依赖关系图计算最小批次序列。"
    >
      <div className="flex items-start gap-0 mt-2 overflow-x-auto pb-2">
        {batches.map((batch, idx) => (
          <React.Fragment key={batch.batch}>
            <div className="min-w-[170px] bg-surface border border-border rounded-xl2 p-3 flex-shrink-0">
              <div className="text-2xs font-bold text-accent2 uppercase tracking-wide mb-1">
                批次 {batch.batch}
              </div>
              <div className="text-2xs text-text2 mb-2">{batch.desc}</div>
              <div className="flex flex-col gap-1">
                {batch.groups.map((g) => (
                  <div
                    key={g}
                    className="text-3xs px-2 py-1 rounded bg-surface2 border border-border"
                  >
                    {g}
                  </div>
                ))}
              </div>
            </div>
            {idx < batches.length - 1 && (
              <div className="text-xl text-border px-1.5 flex-shrink-0 self-center">→</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </ChartContainer>
  );
};
