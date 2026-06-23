import React, { useMemo } from 'react';
import type { PostProcessingData } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { ChartContainer } from '../shared/ChartContainer';
import { mapToHeatmapGrid } from '../../utils/data-mappers';
import { generateHeatmapGridTemplate, getHeatmapColor, getHeatmapTextColor, truncateCapName, formatPropId } from '../../utils/chart-helpers';

interface HeatmapViewProps {
  data: PostProcessingData;
  onPropSelect: (propId: string) => void;
}

/**
 * HeatmapView — ③ 能力热力图.
 *
 * Migrated from dashboard-template.html renderHeatmap() (L282-299).
 *
 * CSS Grid matrix: rows = capabilities (by reuse frequency), columns = propositions.
 * Fill color intensity = reuse count. Hover scales cell up.
 */
export const HeatmapView: React.FC<HeatmapViewProps> = ({ data, onPropSelect }) => {
  const grid = useMemo(() => mapToHeatmapGrid(data.analytics, 22), [data]);
  const propositions = data.propositions;

  if (grid.length === 0 || propositions.length === 0) {
    return (
      <ChartContainer title="能力热力图 — 命题×能力覆盖矩阵" description="行=原子能力，列=命题。颜色越深表示该命题涉及此能力。">
        <EmptyState message="热力图数据待生成（需要完整分析数据）" icon="🔥" />
      </ChartContainer>
    );
  }

  const gridTemplate = generateHeatmapGridTemplate(propositions.length);

  return (
    <ChartContainer
      title="能力热力图 — 命题×能力覆盖矩阵"
      description="行=原子能力（按复用频次排序），列=命题。颜色越深表示该命题涉及此能力。括号内为复用次数。悬停/点击可跳转。"
    >
      <div className="overflow-x-auto mt-2">
        <div className="grid gap-0.5 text-2xs" style={{ gridTemplateColumns: gridTemplate }}>
          {/* Empty top-left corner */}
          <div className="p-1" />
          {/* Proposition headers */}
          {propositions.map((p) => (
            <div
              key={p.id}
              onClick={() => onPropSelect(p.id)}
              className="text-center font-semibold text-2xs text-text2 bg-surface2 rounded py-2 cursor-pointer hover:text-accent2"
              style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
              title={p.name}
            >
              {formatPropId(p.id)}
            </div>
          ))}
          {/* Capability rows */}
          {grid.map((row) => (
            <React.Fragment key={row.capId}>
              <div
                className="p-1.5 text-left font-medium text-2xs bg-surface2 rounded truncate"
                title={`${row.capName} — ${row.count}个命题`}
              >
                {truncateCapName(row.capName)}
              </div>
              {row.propCells.map((cell, idx) => (
                <div
                  key={`${row.capId}-${idx}`}
                  onClick={cell.filled ? () => onPropSelect(propositions[idx]?.id ?? '') : undefined}
                  className={`p-1 text-center rounded transition-all flex items-center justify-center min-h-[28px] ${cell.filled ? 'cursor-pointer font-bold hover:scale-125 hover:z-10' : ''}`}
                  style={{
                    background: cell.filled ? getHeatmapColor(row.count) : 'transparent',
                    color: cell.filled ? getHeatmapTextColor(row.count) : 'inherit',
                  }}
                  title={cell.filled ? `${propositions[idx]?.name} → ${row.capName}` : ''}
                >
                  {cell.filled ? '●' : ''}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-2 text-2xs text-text2">
        <span>● <span className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(108,92,231,.12)', color: '#a29bfe' }}>1命题</span></span>
        <span>● <span className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(108,92,231,.32)', color: '#a29bfe' }}>2命题</span></span>
        <span>● <span className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(108,92,231,.55)', color: '#fff' }}>3命题</span></span>
        <span>● <span className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(108,92,231,.8)', color: '#fff' }}>4+命题</span></span>
      </div>
    </ChartContainer>
  );
};
