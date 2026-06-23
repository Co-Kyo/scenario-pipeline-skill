import React, { useMemo } from 'react';
import type { PostProcessingData } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { ChartContainer } from '../shared/ChartContainer';
import { mapToEvalBreakdown } from '../../utils/data-mappers';
import { designTokens } from '../../data/design-tokens';

interface EvalAnalysisViewProps {
  data: PostProcessingData;
  onPropSelect: (propId: string) => void;
}

/**
 * EvalAnalysisView — ⑥ 评估分析.
 *
 * Migrated from dashboard-template.html renderEval() (L346-361).
 *
 * Stacked bar chart showing 4-dimension scores (cross_stack/doc_vacuum/experience/heat)
 * for each proposition, sorted by total score descending.
 */
export const EvalAnalysisView: React.FC<EvalAnalysisViewProps> = ({ data, onPropSelect }) => {
  const rows = useMemo(() => mapToEvalBreakdown(data.analytics), [data]);

  if (rows.length === 0) {
    return (
      <ChartContainer title="评估分析 — 命题评分拆解" description="堆叠条展示每道命题的4维度评分组成">
        <EmptyState message="评估数据待生成" icon="📈" />
      </ChartContainer>
    );
  }

  const segmentColors: Record<string, string> = {
    cross_stack: designTokens.colors.accent,
    doc_vacuum: designTokens.colors.blue,
    experience: designTokens.colors.orange,
    heat: designTokens.colors.green,
  };

  const segmentLabels: Record<string, string> = {
    cross_stack: 'C=跨栈耦合',
    doc_vacuum: 'D=文档真空',
    experience: 'E=经验壁垒',
    heat: 'H=热度',
  };

  return (
    <ChartContainer
      title="评估分析 — 命题评分拆解"
      description="堆叠条展示每道命题的4维度评分组成。按总分降序排列。点击命题名查看详情。"
    >
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2">
            <span
              onClick={() => onPropSelect(row.id)}
              className="w-32 text-2xs truncate flex-shrink-0 cursor-pointer text-accent2 hover:underline"
              title={row.name}
            >
              {row.name}
            </span>
            <div className="flex-1 h-4.5 bg-surface2 rounded overflow-hidden flex" style={{ height: '18px' }}>
              {row.segments.map((seg) => (
                <div
                  key={seg.key}
                  className="h-full flex items-center justify-center text-3xs font-semibold text-white transition-all"
                  style={{
                    width: `${seg.pct}%`,
                    background: segmentColors[seg.key],
                  }}
                  title={`${segmentLabels[seg.key]}: ${seg.value}`}
                >
                  {seg.pct > 8 && seg.label}
                </div>
              ))}
            </div>
            <span className="w-6 text-xs font-bold text-right flex-shrink-0">{row.total}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-3.5 mt-2.5 text-2xs text-text2 flex-wrap">
        {Object.entries(segmentLabels).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: segmentColors[key] }}
            />
            {label}
          </span>
        ))}
      </div>
    </ChartContainer>
  );
};
