import React, { useMemo } from 'react';
import type { RequirementWeb } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { Badge } from '../shared/Badge';
import { ChartContainer } from '../shared/ChartContainer';
import { designTokens } from '../../data/design-tokens';

interface PropositionListProps {
  data: RequirementWeb | null;
}

/**
 * PropositionList — proposition list grouped by role (core/premise/outlook).
 *
 * Shows proposition id, name, and capability_web 雏形 for each proposition.
 * Evolved from dashboard-template.html renderSidebar() grouping logic.
 */
export const PropositionList: React.FC<PropositionListProps> = ({ data }) => {
  const grouped = useMemo(() => {
    if (!data || !data.propositions) return { core: [], premise: [], outlook: [] };
    const groups: { core: typeof data.propositions; premise: typeof data.propositions; outlook: typeof data.propositions } = {
      core: [],
      premise: [],
      outlook: [],
    };
    data.propositions.forEach((p) => {
      const role = p.role in groups ? p.role : 'core';
      (groups as Record<string, typeof data.propositions>)[role].push(p);
    });
    return groups;
  }, [data]);

  const capWeb = data?.capability_web ?? {};
  const capCount = Object.keys(capWeb).length;

  const roleLabels: Record<string, string> = {
    core: '核心命题',
    premise: '前置基础',
    outlook: '进阶展望',
  };

  if (!data) {
    return (
      <ChartContainer title="命题清单" description="命题清单与能力雏形">
        <EmptyState message="requirement-web.json 待生成" icon="📋" />
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="命题清单"
      description={`${data.propositions?.length ?? 0}命题 · ${capCount}能力雏形 · 按角色分组`}
    >
      <div className="space-y-3">
        {(['core', 'premise', 'outlook'] as const).map((role) => {
          const props = grouped[role];
          if (!props || props.length === 0) return null;
          return (
            <div key={role}>
              <div className="flex items-center gap-2 mb-1">
                <Badge type="role" value={role} />
                <span className="text-xs text-text2">{roleLabels[role]} ({props.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {props.map((p) => (
                  <div
                    key={p.id}
                    className="bg-surface border border-border rounded-lg px-3 py-2 text-xs"
                    style={{ borderLeft: `3px solid ${designTokens.roleColors[role]}` }}
                  >
                    <div className="font-semibold mb-0.5">{p.id}</div>
                    <div className="text-text2 text-2xs">{p.name}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Capability web 雏形 */}
      {capCount > 0 && (
        <div className="mt-4">
          <div className="text-2xs text-text2 uppercase tracking-wide mb-1">能力雏形 (capability_web)</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(capWeb).map(([capId, node]) => (
              <span
                key={capId}
                className="text-2xs bg-surface2 border border-border rounded px-2 py-1"
                title={node?.name ?? capId}
              >
                {node?.name ?? capId}
                {node?.layer && (
                  <span
                    className="ml-1 inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: designTokens.techLayers[node.layer] ?? '#666' }}
                  />
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </ChartContainer>
  );
};
