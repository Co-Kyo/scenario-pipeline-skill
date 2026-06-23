import React, { useMemo } from 'react';
import type { RawMaterialsIndex } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { ChartContainer } from '../shared/ChartContainer';
import { mapToSourceStats } from '../../utils/data-mappers';
import { designTokens } from '../../data/design-tokens';

interface SourceStatsProps {
  data: RawMaterialsIndex | null;
}

/**
 * SourceStats — source material statistics.
 *
 * Shows T0-T3 tier distribution as a horizontal bar chart,
 * scan coverage percentage, and total material count.
 */
export const SourceStats: React.FC<SourceStatsProps> = ({ data }) => {
  const stats = useMemo(() => mapToSourceStats(data), [data]);

  if (!stats) {
    return (
      <ChartContainer title="信源统计" description="信源扫描覆盖度与 T0-T3 tier 分布">
        <EmptyState message=".raw-materials/index.json 待生成" icon="📡" />
      </ChartContainer>
    );
  }

  const maxTierCount = Math.max(...stats.tierDistribution.map((t) => t.count), 1);
  const tierColors: Record<string, string> = {
    T0: designTokens.colors.accent,
    T1: designTokens.colors.blue,
    T2: designTokens.colors.green,
    T3: designTokens.colors.text2,
  };

  return (
    <ChartContainer
      title="信源统计"
      description={`${stats.totalMaterials}篇材料 · ${stats.totalUrls}个URL · 覆盖度${stats.coverage}%`}
    >
      {/* Tier distribution bar chart */}
      <div className="space-y-1.5">
        {stats.tierDistribution.map((tier) => (
          <div key={tier.tier} className="flex items-center gap-2">
            <span className="text-2xs text-text2 w-8 text-right">{tier.tier}</span>
            <div className="flex-1 h-5 bg-surface2 rounded overflow-hidden">
              <div
                className="h-full rounded flex items-center justify-end px-1.5 text-2xs text-white font-semibold transition-all"
                style={{
                  width: `${(tier.count / maxTierCount) * 100}%`,
                  background: tierColors[tier.tier] ?? designTokens.colors.accent,
                  minWidth: tier.count > 0 ? '24px' : '0',
                }}
              >
                {tier.count > 0 && tier.count}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* By role stats */}
      {stats.byRole.length > 0 && (
        <div className="mt-3">
          <div className="text-2xs text-text2 uppercase tracking-wide mb-1">按角色分布</div>
          <div className="flex gap-3 flex-wrap">
            {stats.byRole.map((r) => (
              <span key={r.role} className="text-2xs bg-surface2 px-2 py-1 rounded">
                {r.role}: {r.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </ChartContainer>
  );
};
