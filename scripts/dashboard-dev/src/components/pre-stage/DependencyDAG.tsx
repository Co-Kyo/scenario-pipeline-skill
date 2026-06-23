import React, { useMemo } from 'react';
import type { PreStageData } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { ChartContainer } from '../shared/ChartContainer';
import { designTokens, getRoleColor } from '../../data/design-tokens';
import { calculateCircularLayout, calculateEdgePath } from '../../utils/chart-helpers';

interface DependencyDAGProps {
  data: PreStageData;
}

/**
 * DependencyDAG — dependency relationship DAG visualization.
 *
 * Renders an SVG with nodes (propositions) and edges (dependencies).
 * Nodes are colored by role (core/premise/outlook).
 * Hub nodes (in-degree >= 2) are highlighted with a ring.
 *
 * Layout: circular for simplicity and deterministic positioning.
 */
export const DependencyDAG: React.FC<DependencyDAGProps> = ({ data }) => {
  const { nodes, edges, hubNodeIds } = useMemo(() => {
    if (!data.requirement || !data.requirement.dependencies) {
      return { nodes: [], edges: [], hubNodeIds: new Set<string>() };
    }

    const deps = data.requirement.dependencies;
    const allNodeIds = new Set<string>();
    const edgeList: { from: string; to: string }[] = [];

    // Build edges and collect all node IDs
    // dependencies format: { "RW-P1": [{proposition: "RW-P2", shared_capabilities: [...]}, ...] }
    Object.entries(deps).forEach(([from, targets]) => {
      allNodeIds.add(from);
      (targets as Array<string | { proposition?: string }>).forEach((target) => {
        const to = typeof target === 'string' ? target : (target.proposition ?? '');
        if (to) {
          allNodeIds.add(to);
          edgeList.push({ from, to });
        }
      });
    });

    // Calculate in-degree to find hub nodes
    const inDegree: Record<string, number> = {};
    edgeList.forEach((e) => {
      inDegree[e.to] = (inDegree[e.to] || 0) + 1;
    });
    const hubs = new Set(
      Object.entries(inDegree).filter(([, deg]) => deg >= 2).map(([id]) => id),
    );

    // Build node objects with role info
    const nodeList = Array.from(allNodeIds).map((id) => {
      const prop = data.requirement!.propositions?.find((p) => p.id === id);
      return {
        id,
        name: prop?.name ?? id,
        role: prop?.role ?? 'core',
      };
    });

    return { nodes: nodeList, edges: edgeList, hubNodeIds: hubs };
  }, [data]);

  if (nodes.length === 0) {
    return (
      <ChartContainer title="依赖关系图 (DAG)" description="命题间依赖关系的有向无环图">
        <EmptyState message="依赖关系数据待生成" icon="🔗" />
      </ChartContainer>
    );
  }

  const width = 680;
  const height = Math.max(300, nodes.length * 30 + 80);
  const radius = Math.min(width, height) / 2 - 60;
  const positions = calculateCircularLayout(
    nodes.map((n) => n.id),
    radius,
    width / 2,
    height / 2,
  );

  return (
    <ChartContainer
      title="依赖关系图 (DAG)"
      description={`${nodes.length}节点 · ${edges.length}依赖边 · ${hubNodeIds.size}枢纽节点`}
    >
      <div className="overflow-x-auto">
        <svg width={width} height={height} style={{ maxWidth: '100%' }}>
          {/* Edges */}
          {edges.map((edge, idx) => {
            const from = positions[edge.from];
            const to = positions[edge.to];
            if (!from || !to) return null;
            return (
              <path
                key={`edge-${idx}`}
                d={calculateEdgePath(from.x, from.y, to.x, to.y)}
                fill="none"
                stroke={designTokens.colors.border}
                strokeWidth={1.5}
                markerEnd="url(#arrowhead)"
              />
            );
          })}

          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill={designTokens.colors.text2} />
            </marker>
          </defs>

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;
            const color = getRoleColor(node.role);
            const isHub = hubNodeIds.has(node.id);
            return (
              <g key={node.id}>
                {isHub && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={22}
                    fill="none"
                    stroke={designTokens.colors.yellow}
                    strokeWidth={2}
                    strokeDasharray="3,2"
                  />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={16}
                  fill={color}
                  stroke={designTokens.colors.surface}
                  strokeWidth={2}
                />
                <text
                  x={pos.x}
                  y={pos.y + 3}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={9}
                  fontWeight="bold"
                >
                  {node.id.replace('RW-P', 'P')}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 30}
                  textAnchor="middle"
                  fill={designTokens.colors.text2}
                  fontSize={8}
                >
                  {node.name.slice(0, 12)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-2 text-2xs text-text2 flex-wrap">
        <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: designTokens.colors.blue }} />core</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: designTokens.colors.green }} />premise</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: designTokens.colors.accent }} />outlook</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-dashed mr-1" style={{ borderColor: designTokens.colors.yellow }} />枢纽 (入度≥2)</span>
      </div>
    </ChartContainer>
  );
};
