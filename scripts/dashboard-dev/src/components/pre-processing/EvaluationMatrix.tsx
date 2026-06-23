import React, { useMemo, useState } from 'react';
import type { PreProcessingData } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { ChartContainer } from '../shared/ChartContainer';
import { mapToEvalMatrix } from '../../utils/data-mappers';
import { designTokens, getRoleColor } from '../../data/design-tokens';

interface EvaluationMatrixProps {
  data: PreProcessingData;
}

/**
 * EvaluationMatrix — P1-5 evaluation matrix scatter plot.
 *
 * X-axis = difficulty (high → right, medium → left)
 * Y-axis = total score (higher → top)
 * Points colored by role (core/premise/outlook)
 * Four quadrant labels
 * Hover shows proposition name and score breakdown
 */
export const EvaluationMatrix: React.FC<EvaluationMatrixProps> = ({ data }) => {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  const points = useMemo(() => {
    if (!data.evaluations || !data.evaluations.evaluations) return [];
    // Build props metadata from requirement-web or capability-graph
    const propsMeta: { id: string; name: string; role: string; difficulty: string }[] = [];
    const req = data.evaluations;
    req.evaluations.forEach((ev) => {
      propsMeta.push({
        id: ev.proposition_id,
        name: ev.proposition,
        role: 'core',
        difficulty: 'high',
      });
    });
    return mapToEvalMatrix(data.evaluations, propsMeta);
  }, [data]);

  if (points.length === 0) {
    return (
      <ChartContainer title="评估矩阵" description="X=难度，Y=评分，按角色着色，四象限">
        <EmptyState message="evaluations.json 待生成" icon="📐" />
      </ChartContainer>
    );
  }

  const width = 680;
  const height = 360;
  const padding = { top: 30, right: 20, bottom: 30, left: 40 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  return (
    <ChartContainer
      title="评估矩阵"
      description="X=难度，Y=评分，按角色着色，悬停显示评分细分"
    >
      <div className="overflow-x-auto">
        <svg width={width} height={height} style={{ maxWidth: '100%' }}>
          {/* Quadrant dividers */}
          <line
            x1={padding.left + plotW / 2}
            y1={padding.top}
            x2={padding.left + plotW / 2}
            y2={padding.top + plotH}
            stroke={designTokens.colors.border}
            strokeDasharray="4,4"
          />
          <line
            x1={padding.left}
            y1={padding.top + plotH / 2}
            x2={padding.left + plotW}
            y2={padding.top + plotH / 2}
            stroke={designTokens.colors.border}
            strokeDasharray="4,4"
          />

          {/* Quadrant labels */}
          <text x={padding.left + 8} y={padding.top + 14} fill={designTokens.colors.text2} fontSize={9} fontWeight="600">
            高分·低难
          </text>
          <text x={padding.left + plotW - 70} y={padding.top + 14} fill={designTokens.colors.text2} fontSize={9} fontWeight="600">
            高分·高难
          </text>
          <text x={padding.left + 8} y={padding.top + plotH - 6} fill={designTokens.colors.text2} fontSize={9} fontWeight="600">
            低分·低难
          </text>
          <text x={padding.left + plotW - 70} y={padding.top + plotH - 6} fill={designTokens.colors.text2} fontSize={9} fontWeight="600">
            低分·高难
          </text>

          {/* Axis labels */}
          <text x={padding.left + plotW / 2} y={height - 6} fill={designTokens.colors.text2} fontSize={10} fontWeight="600" textAnchor="middle">
            难度 →
          </text>
          <text x={10} y={padding.top + plotH / 2} fill={designTokens.colors.text2} fontSize={10} fontWeight="600" textAnchor="middle" transform={`rotate(-90, 10, ${padding.top + plotH / 2})`}>
            评分 ↑
          </text>

          {/* Scatter points */}
          {points.map((p) => {
            const cx = padding.left + (p.x / 100) * plotW;
            const cy = padding.top + (p.y / 100) * plotH;
            const color = getRoleColor(p.role);
            const isHovered = hoveredPoint === p.id;
            return (
              <g
                key={p.id}
                onMouseEnter={() => setHoveredPoint(p.id)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 8 : 5}
                  fill={color}
                  stroke={designTokens.colors.surface}
                  strokeWidth={1.5}
                  opacity={hoveredPoint && !isHovered ? 0.3 : 1}
                  style={{ transition: 'r 0.2s' }}
                />
                {isHovered && (
                  <g>
                    <rect
                      x={cx - 80}
                      y={cy - 50}
                      width={160}
                      height={40}
                      fill={designTokens.colors.bg}
                      stroke={designTokens.colors.border}
                      rx={4}
                    />
                    <text x={cx} y={cy - 35} fill={designTokens.colors.text} fontSize={9} textAnchor="middle" fontWeight="600">
                      {p.id}: {p.name.slice(0, 14)}
                    </text>
                    <text x={cx} y={cy - 22} fill={designTokens.colors.text2} fontSize={8} textAnchor="middle">
                      总分{p.score} · C{p.scores.cross_stack} D{p.scores.doc_vacuum} E{p.scores.experience} H{p.scores.heat}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
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
