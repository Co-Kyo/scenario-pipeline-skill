import React, { useMemo } from 'react';
import type { PostProcessingData } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { ChartContainer } from '../shared/ChartContainer';
import { mapToLayerDist } from '../../utils/data-mappers';
import { truncateCapName, getCapTagBorderColor } from '../../utils/chart-helpers';

interface LayerDistViewProps {
  data: PostProcessingData;
}

/**
 * LayerDistView — ④ 技术层分布.
 *
 * Migrated from dashboard-template.html renderLayers() (L302-319).
 *
 * Groups capabilities by tech layer (6 layers), with color dots and
 * capability tags showing reuse count in parentheses.
 */
export const LayerDistView: React.FC<LayerDistViewProps> = ({ data }) => {
  const layerGroups = useMemo(() => mapToLayerDist(data.analytics), [data]);

  if (layerGroups.length === 0) {
    return (
      <ChartContainer title="技术层分布 — 知识领域地图" description="原子能力按技术层分类">
        <EmptyState message="技术层数据待生成" icon="🏗️" />
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="技术层分布 — 知识领域地图"
      description="36个原子能力按技术层分类，颜色标记每个能力被多少命题共享（括号内为复用次数）。"
    >
      <div className="space-y-3.5">
        {layerGroups.map((group) => (
          <div key={group.layer}>
            {/* Layer header */}
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: group.color }}
              />
              <span className="text-sm font-semibold">{group.layer}</span>
              <span className="text-2xs text-text2 bg-surface2 px-1.5 py-0.5 rounded-full">
                {group.caps.length} 能力
              </span>
            </div>
            {/* Capability tags */}
            <div className="flex flex-wrap gap-1.5 pl-4">
              {group.caps.map((cap) => (
                <span
                  key={cap.id}
                  className="text-2xs px-2 py-1 rounded bg-surface2 border cursor-pointer transition-all hover:text-accent2"
                  style={{ borderColor: getCapTagBorderColor(cap.count) }}
                  title={`${cap.name} — ${cap.count}命题`}
                >
                  {truncateCapName(cap.name, 16)}
                  <span className="text-text2 ml-1">({cap.count})</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ChartContainer>
  );
};
