import React, { useMemo, useState } from 'react';
import type { PreProcessingData } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { ChartContainer } from '../shared/ChartContainer';
import { mapToCapabilityGraph } from '../../utils/data-mappers';
import { calculateCircularLayout, calculateEdgePath } from '../../utils/chart-helpers';
import { designTokens } from '../../data/design-tokens';

interface CapabilityGraphProps {
  data: PreProcessingData;
}

/**
 * CapabilityGraph — P1-4 capability graph visualization.
 *
 * Renders an SVG with:
 * - Nodes = capabilities, colored by tech layer
 * - Edges = shared propositions (dependency graph)
 * - Hub capabilities (shared by ≥3 propositions) highlighted with a ring
 * - Hover highlights connected edges
 *
 * Uses a circular layout for deterministic positioning.
 */
export const CapabilityGraph: React.FC<CapabilityGraphProps> = ({ data }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    return mapToCapabilityGraph(data.capabilityGraph, data.researchGrouping);
  }, [data]);

  if (nodes.length === 0) {
    return (
      <ChartContainer title="能力图谱" description="节点=能力，边=共享命题，按技术层着色">
        <EmptyState message="capability-graph.json 待生成" icon="🕸️" />
      </ChartContainer>
    );
  }

  const width = 680;
  const height = 420;
  const radius = 150;
  const positions = calculateCircularLayout(
    nodes.map((n) => n.id),
    radius,
    width / 2,
    height / 2,
  );

  const connectedEdges = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const connected = new Set<string>();
    edges.forEach((e, idx) => {
      if (e.source === hoveredNode || e.target === hoveredNode) {
        connected.add(`edge-${idx}`);
      }
    });
    return connected;
  }, [hoveredNode, edges]);

  return (
    <ChartContainer
      title="能力图谱"
      description={`${nodes.length}能力节点 · ${edges.length}依赖边 · 按技术层着色，枢纽能力高亮`}
    >
      <div className="overflow-x-auto">
        <svg width={width} height={height} style={{ maxWidth: '100%' }}>
          {/* Edges */}
          {edges.map((edge, idx) => {
            const from = positions[edge.source];
            const to = positions[edge.target];
            if (!from || !to) return null;
            const isHighlighted = connectedEdges.has(`edge-${idx}`);
            return (
              <path
                key={`edge-${idx}`}
                d={calculateEdgePath(from.x, from.y, to.x, to.y)}
                fill="none"
                stroke={isHighlighted ? designTokens.colors.accent2 : designTokens.colors.border}
                strokeWidth={isHighlighted ? 2 : 1}
                opacity={hoveredNode && !isHighlighted ? 0.3 : 1}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;
            const isHovered = hoveredNode === node.id;
            return (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                {node.isHub && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={18}
                    fill="none"
                    stroke={designTokens.colors.yellow}
                    strokeWidth={2}
                    strokeDasharray="3,2"
                  />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={12}
                  fill={node.color}
                  stroke={isHovered ? designTokens.colors.accent2 : designTokens.colors.surface}
                  strokeWidth={isHovered ? 3 : 2}
                  opacity={hoveredNode && !isHovered ? 0.4 : 1}
                />
                <text
                  x={pos.x}
                  y={pos.y + 3}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={7}
                  fontWeight="bold"
                >
                  {node.id.replace('A', '')}
                </text>
                {isHovered && (
                  <text
                    x={pos.x}
                    y={pos.y - 18}
                    textAnchor="middle"
                    fill={designTokens.colors.text}
                    fontSize={9}
                  >
                    {node.name.slice(0, 16)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tech layer legend */}
      <div className="flex gap-2 mt-2 text-2xs text-text2 flex-wrap">
        {designTokens.layerOrder.map((layer) => (
          <span key={layer} className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: designTokens.techLayers[layer] }}
            />
            {layer}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-dashed" style={{ borderColor: designTokens.colors.yellow }} />
          枢纽 (≥3命题)
        </span>
      </div>
    </ChartContainer>
  );
};
