import React, { useMemo } from 'react';
import type { PreProcessingData } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { ChartContainer } from '../shared/ChartContainer';
import { Table } from '../shared/Table';
import { Badge } from '../shared/Badge';
import { mapToPoolRows } from '../../utils/data-mappers';

interface PropositionPoolProps {
  data: PreProcessingData;
  onPropSelect?: (propId: string) => void;
}

/**
 * PropositionPool — proposition pool table.
 *
 * Shows: #, proposition name, priority, difficulty, score, caps count, role, recommended order.
 * Rows are clickable to navigate to proposition detail.
 */
export const PropositionPool: React.FC<PropositionPoolProps> = ({ data, onPropSelect }) => {
  const rows = useMemo(() => {
    if (!data.evaluations) return [];

    // Build props from evaluations
    const props = data.evaluations.evaluations.map((ev) => ({
      id: ev.proposition_id,
      name: ev.proposition,
      priority: 'high' as const,
      difficulty: 'high' as const,
      score: ev.total_score,
      caps: 0,
      role: 'core' as const,
    }));

    const evalBreakdown = data.evaluations.evaluations.map((ev) => ({
      id: ev.proposition_id,
      name: ev.proposition.slice(0, 24),
      total: ev.total_score,
      cross_stack: ev.scores.cross_stack_coupling,
      doc_vacuum: ev.scores.doc_vacuum,
      experience: ev.scores.experience_barrier,
      heat: ev.scores.topical_heat,
      rec_order: ev.recommended_order,
    }));

    return mapToPoolRows(props, evalBreakdown);
  }, [data]);

  if (rows.length === 0) {
    return (
      <ChartContainer title="命题池" description="命题优先级、难度、评分与能力数">
        <EmptyState message="evaluations.json 待生成" icon="🏊" />
      </ChartContainer>
    );
  }

  return (
    <ChartContainer title="命题池" description={`${rows.length}命题 · 按推荐顺序排列`}>
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
          {
            key: 'priority',
            label: '优先级',
            sortable: true,
            render: (row) => <Badge type="priority" value={row.priority} />,
          },
          { key: 'difficulty', label: '难度', sortable: true },
          { key: 'score', label: '评分', sortable: true },
          { key: 'caps', label: '能力数', sortable: true },
        ]}
        data={rows}
        onRowClick={(row) => onPropSelect?.(row.id)}
      />
    </ChartContainer>
  );
};
