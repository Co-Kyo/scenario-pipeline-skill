import React, { useMemo } from 'react';
import type { PostProcessingData } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { ChartContainer } from '../shared/ChartContainer';
import { Card } from '../shared/Card';
import { Table } from '../shared/Table';
import { Badge } from '../shared/Badge';
import { mapToInsights, mapToPoolRows } from '../../utils/data-mappers';

interface OverviewViewProps {
  data: PostProcessingData;
  onPropSelect: (propId: string) => void;
}

/**
 * OverviewView — ① 总览视图.
 *
 * Migrated from dashboard-template.html renderOverview() (L235-256).
 *
 * Shows:
 * - 4 insight cards (推荐起点/高难度集中区/技术层覆盖/学习策略)
 * - Proposition overview table with priority/difficulty/score/caps/order
 */
export const OverviewView: React.FC<OverviewViewProps> = ({ data, onPropSelect }) => {
  const insights = useMemo(
    () => mapToInsights(data.analytics, data.propositions.length),
    [data],
  );

  const poolRows = useMemo(
    () => mapToPoolRows(
      data.propositions.map((p) => ({
        id: p.id,
        name: p.name,
        priority: p.priority,
        difficulty: p.difficulty,
        score: p.score,
        caps: p.caps,
        role: p.role,
      })),
      data.analytics?.evalBreakdown ?? null,
    ),
    [data],
  );

  if (data.propositions.length === 0 && !data.analytics) {
    return <EmptyState message="后处理数据待生成" icon="📊" />;
  }

  return (
    <div>
      {/* Insight cards */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
          {insights.map((insight, idx) => (
            <Card key={idx} variant="insight">
              <div className="text-xl mb-1">{insight.icon}</div>
              <div className="text-xs font-semibold mb-1">{insight.title}</div>
              <div className="text-2xs text-text2 leading-relaxed">{insight.text}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Proposition table */}
      <ChartContainer title="命题总览" description={`${poolRows.length}命题 · 按推荐顺序排列`}>
        <Table
          columns={[
            { key: 'recOrder', label: '#', sortable: true, width: '40px', render: (row) => row.recOrder ?? '-' },
            {
              key: 'name',
              label: '命题',
              sortable: true,
              render: (row) => (
                <span className="flex items-center gap-1.5">
                  <strong>{row.name}</strong>
                  <Badge type="role" value={row.role} />
                </span>
              ),
            },
            { key: 'priority', label: '优先级', sortable: true, render: (row) => <Badge type="priority" value={row.priority} /> },
            { key: 'difficulty', label: '难度', sortable: true },
            { key: 'score', label: '评分', sortable: true },
            { key: 'caps', label: '能力数', sortable: true },
          ]}
          data={poolRows}
          onRowClick={(row) => onPropSelect(row.id)}
        />
      </ChartContainer>
    </div>
  );
};
