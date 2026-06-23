import React, { useMemo } from 'react';
import type { PostProcessingData } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { ChartContainer } from '../shared/ChartContainer';
import { mapToDepthOrder } from '../../utils/data-mappers';
import { formatDifficulty } from '../../utils/chart-helpers';
import { designTokens, getRoleColor } from '../../data/design-tokens';

interface LearningPathViewProps {
  data: PostProcessingData;
  onPropSelect: (propId: string) => void;
}

/**
 * LearningPathView — ② 学习路径 DAG (P1-6).
 *
 * Migrated from dashboard-template.html renderPath() (L259-279).
 *
 * Shows propositions arranged by topological depth (DAG layers).
 * Same-depth propositions are displayed horizontally (parallel learning).
 * Cards are clickable to navigate to proposition detail.
 */
export const LearningPathView: React.FC<LearningPathViewProps> = ({ data, onPropSelect }) => {
  const depthGroups = useMemo(() => mapToDepthOrder(data.analytics), [data]);

  if (depthGroups.length === 0) {
    return (
      <ChartContainer title="学习路径 — DAG拓扑排序" description="基于命题依赖关系的拓扑排序，自下而上逐层推进">
        <EmptyState message="学习路径数据待生成（需要 partition-analysis.json + 完整分析数据）" icon="🗺️" />
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="学习路径 — DAG拓扑排序"
      description="基于命题依赖关系的拓扑排序，自下而上逐层推进。同层命题可并行学习。点击卡片查看完整命题内容。"
    >
      <div className="py-4">
        {depthGroups.map((group, idx) => (
          <div key={group.depth}>
            <div className="flex items-start mb-3">
              {/* Depth label */}
              <div className="w-16 flex-shrink-0 text-right pr-2">
                <div className="text-xl font-bold text-accent2">{group.depth + 1}</div>
                <div className="text-2xs text-text2">{group.label}</div>
              </div>
              {/* Cards */}
              <div className="flex-1 flex gap-2 flex-wrap">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onPropSelect(item.id)}
                    className="bg-surface border border-border rounded-xl2 px-3 py-2.5 cursor-pointer transition-all min-w-[150px] max-w-[230px] flex-1"
                    style={{ borderLeft: `3px solid ${getRoleColor(item.role)}` }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = designTokens.colors.accent2;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(108,92,231,.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = designTokens.colors.border;
                      e.currentTarget.style.transform = '';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <div className="text-xs font-semibold mb-1 leading-tight">{item.name}</div>
                    <div className="flex gap-1 flex-wrap">
                      <span className="text-2xs text-text2 bg-surface2 px-1.5 py-0.5 rounded">{item.caps} 能力</span>
                      <span className="text-2xs text-text2 bg-surface2 px-1.5 py-0.5 rounded">{formatDifficulty(item.difficulty)}</span>
                      <span className="text-2xs text-text2 bg-surface2 px-1.5 py-0.5 rounded">评分 {item.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Arrow between layers */}
            {idx < depthGroups.length - 1 && (
              <div className="text-center text-border text-lg mb-1 ml-16">↓</div>
            )}
          </div>
        ))}
      </div>
    </ChartContainer>
  );
};
