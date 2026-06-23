import React, { useMemo } from 'react';
import type { PartitionAnalysis } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { ChartContainer } from '../shared/ChartContainer';
import { Card } from '../shared/Card';

interface PartitionSummaryProps {
  data: PartitionAnalysis | null;
}

/**
 * PartitionSummary — partition analysis summary.
 *
 * Shows:
 * - Connected components count
 * - Topological depth
 * - Community detection / modularity
 * - Session distribution (current session + deferred sessions)
 *
 * Evolved from PRD §5.2 分区摘要 layout.
 */
export const PartitionSummary: React.FC<PartitionSummaryProps> = ({ data }) => {
  const stats = useMemo(() => {
    if (!data) return null;
    return {
      components: data.components?.length ?? 0,
      maxDepth: data.partition_stats?.max_depth ?? 0,
      communities: data.partition_stats?.communities ?? 0,
      modularity: data.partition_stats?.modularity ?? 0,
      totalProps: data.total_propositions ?? 0,
    };
  }, [data]);

  const sessions = useMemo(() => {
    if (!data) return [];
    const result = [];
    if (data.current_session) {
      result.push({
        id: 'current',
        label: 'Session 1 (本次)',
        propCount: data.current_session.proposition_ids?.length ?? 0,
        componentId: data.current_session.component_id ?? '',
        depthLayers: data.current_session.depth_layers ?? [],
      });
    }
    if (data.deferred_sessions) {
      data.deferred_sessions.forEach((ds, idx) => {
        result.push({
          id: `deferred-${idx}`,
          label: `Session ${idx + 2} (排期)`,
          propCount: ds.proposition_ids?.length ?? 0,
          componentId: ds.component_id ?? '',
          depthLayers: ds.depth_layers ?? [],
        });
      });
    }
    return result;
  }, [data]);

  if (!data) {
    return (
      <ChartContainer title="分区摘要" description="连通分量、拓扑深度、社区发现与 Session 分布">
        <EmptyState message="partition-analysis.json 待生成" icon="🗺️" />
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="分区摘要"
      description="连通分量、拓扑深度、社区发现与 Session 分布"
    >
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <Card variant="stat">
          <div className="text-xl font-bold text-accent2">{stats?.components ?? 0}</div>
          <div className="text-2xs text-text2">连通分量</div>
        </Card>
        <Card variant="stat">
          <div className="text-xl font-bold text-accent2">{stats?.maxDepth ?? 0}</div>
          <div className="text-2xs text-text2">拓扑深度</div>
        </Card>
        <Card variant="stat">
          <div className="text-xl font-bold text-accent2">{stats?.communities ?? 0}</div>
          <div className="text-2xs text-text2">社区数</div>
        </Card>
        <Card variant="stat">
          <div className="text-xl font-bold text-accent2">{stats?.modularity?.toFixed(2) ?? '0.00'}</div>
          <div className="text-2xs text-text2">模块度</div>
        </Card>
      </div>

      {/* Session distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sessions.map((session) => (
          <Card key={session.id} variant="content">
            <div className="text-xs font-semibold mb-1">{session.label}</div>
            <div className="text-2xs text-text2 mb-2">
              {session.propCount}命题
              {session.componentId && ` · ${session.componentId}`}
            </div>
            {session.depthLayers.length > 0 && (
              <div className="space-y-0.5">
                {session.depthLayers.map((dl) => (
                  <div key={dl.depth} className="text-2xs text-text2">
                    Depth{dl.depth}: {dl.proposition_ids.join(', ')}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </ChartContainer>
  );
};
