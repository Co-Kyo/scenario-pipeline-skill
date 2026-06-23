import React, { useMemo, useState } from 'react';
import type { PostProcessingData } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { ChartContainer } from '../shared/ChartContainer';
import { mapToMatrixPoints } from '../../utils/data-mappers';
import { formatPropId, getMatrixPointColor } from '../../utils/chart-helpers';
import { designTokens } from '../../data/design-tokens';

interface DifficultyMatrixViewProps {
  data: PostProcessingData;
  onPropSelect: (propId: string) => void;
}

/**
 * DifficultyMatrixView — ⑤ 难度矩阵.
 *
 * Migrated from dashboard-template.html renderMatrix() (L322-343).
 *
 * 2D scatter plot: X = difficulty (high → right), Y = priority (high → top).
 * Points colored by role. Four quadrant labels. Hover shows proposition name.
 */
export const DifficultyMatrixView: React.FC<DifficultyMatrixViewProps> = ({ data, onPropSelect }) => {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  const points = useMemo(() => {
    return mapToMatrixPoints(
      data.propositions.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        priority: p.priority,
        difficulty: p.difficulty,
        score: p.score,
      })),
    );
  }, [data]);

  if (points.length === 0) {
    return (
      <ChartContainer title="难度-重要性矩阵" description="X轴=难度，Y轴=优先级。四象限分布。">
        <EmptyState message="命题数据待生成" icon="📐" />
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="难度-重要性矩阵"
      description="X轴=难度，Y轴=优先级（反向：上=high）。圆圈颜色=命题角色。悬停查看名称，点击跳转。"
    >
      <div
        className="relative w-full border border-border rounded-xl2 bg-surface p-5"
        style={{ height: '360px' }}
      >
        {/* Quadrant dividers */}
        <div className="absolute border border-dashed rounded" style={{ borderColor: 'rgba(136,136,170,.3)', top: '30px', left: '20px', right: '50%', bottom: '50%' }}>
          <span className="absolute top-1 left-2 text-2xs text-text2 font-semibold">优先攻克</span>
        </div>
        <div className="absolute border border-dashed rounded" style={{ borderColor: 'rgba(136,136,170,.3)', top: '30px', right: '20px', left: '50%', bottom: '50%' }}>
          <span className="absolute top-1 right-2 text-2xs text-text2 font-semibold">核心战场</span>
        </div>
        <div className="absolute border border-dashed rounded" style={{ borderColor: 'rgba(136,136,170,.3)', bottom: '30px', left: '20px', right: '50%', top: '50%' }}>
          <span className="absolute bottom-1 left-2 text-2xs text-text2 font-semibold">快速收获</span>
        </div>
        <div className="absolute border border-dashed rounded" style={{ borderColor: 'rgba(136,136,170,.3)', bottom: '30px', right: '20px', left: '50%', top: '50%' }}>
          <span className="absolute bottom-1 right-2 text-2xs text-text2 font-semibold">长期投入</span>
        </div>

        {/* Axis labels */}
        <span className="absolute text-2xs text-text2 font-semibold" style={{ top: '50%', left: '6px', transform: 'translateY(-50%) rotate(-90deg)' }}>优先级 ↑</span>
        <span className="absolute text-2xs text-text2 font-semibold" style={{ bottom: '6px', left: '50%', transform: 'translateX(-50%)' }}>难度 →</span>

        {/* Scatter points */}
        {points.map((p) => (
          <div
            key={p.id}
            onMouseEnter={() => setHoveredPoint(p.id)}
            onMouseLeave={() => setHoveredPoint(null)}
            onClick={() => onPropSelect(p.id)}
            className="absolute rounded-full cursor-pointer transition-all z-10"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: '10px',
              height: '10px',
              background: getMatrixPointColor(p.role),
              transform: hoveredPoint === p.id ? 'scale(1.8)' : 'scale(1)',
              boxShadow: hoveredPoint === p.id ? '0 0 12px rgba(108,92,231,.5)' : 'none',
            }}
          >
            {hoveredPoint === p.id && (
              <span
                className="absolute text-2xs text-text2 whitespace-nowrap pointer-events-none"
                style={{ top: '-4px', left: '50%', transform: 'translate(-50%, -100%)', background: designTokens.colors.bg, padding: '2px 4px', borderRadius: '3px', border: `1px solid ${designTokens.colors.border}` }}
              >
                {formatPropId(p.id)}: {p.name.slice(0, 16)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-2 text-2xs text-text2">
        <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: designTokens.colors.blue }} />core</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: designTokens.colors.green }} />premise</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: designTokens.colors.yellow }} />outlook</span>
      </div>
    </ChartContainer>
  );
};
