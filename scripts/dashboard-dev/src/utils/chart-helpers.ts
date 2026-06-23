import { designTokens, getHeatColor } from '../data/design-tokens';

/**
 * Chart Helpers — Utility functions for SVG and CSS Grid chart rendering.
 *
 * These functions handle coordinate calculations, layout generation,
 * and color mapping for the various chart components (DAG, heatmap,
 * scatter matrix, bar charts).
 */

// ============================================================================
// SVG Coordinate Utilities
// ============================================================================

/**
 * Calculate node positions for a layered DAG layout.
 * Nodes are arranged in horizontal layers, with nodes in the same layer
 * stacked vertically.
 *
 * @param layers - Array of layers, each containing node IDs
 * @param width - SVG width in pixels
 * @param height - SVG height in pixels
 * @param layerGap - Horizontal gap between layers
 * @param nodeGap - Vertical gap between nodes in the same layer
 * @returns Map of nodeId → {x, y} position
 */
export function calculateLayeredLayout(
  layers: string[][],
  _width: number,
  height: number,
  layerGap: number = 200,
  nodeGap: number = 60,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const startX = 60;
  const startY = 40;

  layers.forEach((layer, layerIdx) => {
    const layerX = startX + layerIdx * layerGap;
    const layerHeight = (layer.length - 1) * nodeGap;
    const layerStartY = startY + (height - layerHeight) / 2;

    layer.forEach((nodeId, nodeIdx) => {
      positions[nodeId] = {
        x: layerX,
        y: layerStartY + nodeIdx * nodeGap,
      };
    });
  });

  return positions;
}

/**
 * Calculate a simple force-directed layout position for graph nodes.
 * Uses a circular layout as a simple deterministic fallback.
 *
 * @param nodeIds - Array of node IDs
 * @param radius - Circle radius
 * @param centerX - Center X
 * @param centerY - Center Y
 * @returns Map of nodeId → {x, y}
 */
export function calculateCircularLayout(
  nodeIds: string[],
  radius: number,
  centerX: number,
  centerY: number,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const angleStep = (2 * Math.PI) / Math.max(nodeIds.length, 1);

  nodeIds.forEach((id, idx) => {
    const angle = idx * angleStep - Math.PI / 2;
    positions[id] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  return positions;
}

/**
 * Calculate SVG path for a curved edge between two points.
 * Uses a cubic bezier curve for smooth visualization.
 *
 * @param x1 - Start X
 * @param y1 - Start Y
 * @param x2 - End X
 * @param y2 - End Y
 * @returns SVG path string
 */
export function calculateEdgePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const dx = x2 - x1;
  const midX = x1 + dx * 0.5;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

// ============================================================================
// CSS Grid Utilities
// ============================================================================

/**
 * Generate a CSS Grid template-columns string for the heatmap.
 * First column is wider (capability name), remaining columns are equal width.
 *
 * @param propCount - Number of proposition columns
 * @param labelWidth - Width of the label column in px (default 110)
 * @param cellWidth - Minimum width of each cell in px (default 36)
 * @returns CSS grid-template-columns value
 */
export function generateHeatmapGridTemplate(
  propCount: number,
  labelWidth: number = 110,
  cellWidth: number = 36,
): string {
  const propCols = Array(propCount).fill(`minmax(${cellWidth}px, 1fr)`).join(' ');
  return `${labelWidth}px ${propCols}`;
}

/**
 * Generate a CSS Grid template for batch flow columns.
 *
 * @param batchCount - Number of batches
 * @param minWidth - Minimum width per batch column
 * @returns CSS grid-template-columns value
 */
export function generateBatchGridTemplate(
  batchCount: number,
  minWidth: number = 170,
): string {
  return Array(batchCount).fill(`minmax(${minWidth}px, 1fr)`).join(' auto ');
}

// ============================================================================
// Color Mapping Utilities
// ============================================================================

/**
 * Get the background color for a heatmap cell based on reuse count.
 * Uses the accent color with varying opacity.
 *
 * @param count - Reuse count (number of propositions sharing this capability)
 * @returns CSS color string
 */
export function getHeatmapColor(count: number): string {
  return getHeatColor(count);
}

/**
 * Get the text color for a heatmap cell based on reuse count.
 * Darker backgrounds need white text.
 *
 * @param count - Reuse count
 * @returns CSS color string
 */
export function getHeatmapTextColor(count: number): string {
  if (count >= 3) {
    return '#ffffff';
  }
  return designTokens.colors.accent2;
}

/**
 * Get the border color for a layer capability tag based on reuse count.
 * Hub capabilities (>=3) get yellow border, moderately shared (>=2) get accent2.
 *
 * @param count - Reuse count
 * @returns CSS color string
 */
export function getCapTagBorderColor(count: number): string {
  if (count >= 3) return designTokens.colors.yellow;
  if (count >= 2) return designTokens.colors.accent2;
  return designTokens.colors.border;
}

/**
 * Get the fill color for a matrix scatter point based on role.
 *
 * @param role - Proposition role ('core', 'premise', 'outlook')
 * @returns CSS color string
 */
export function getMatrixPointColor(role: string): string {
  switch (role) {
    case 'core':
      return designTokens.colors.blue;
    case 'premise':
      return designTokens.colors.green;
    case 'outlook':
      return designTokens.colors.yellow;
    default:
      return designTokens.colors.accent;
  }
}

/**
 * Get the color for an evaluation bar segment.
 *
 * @param segmentKey - One of 'cross_stack', 'doc_vacuum', 'experience', 'heat'
 * @returns CSS color string
 */
export function getEvalSegmentColor(segmentKey: string): string {
  return designTokens.evalSegmentColors[segmentKey] ?? designTokens.colors.accent;
}

// ============================================================================
// Text Formatting Utilities
// ============================================================================

/**
 * Truncate a capability name for display in tight spaces.
 * Removes parenthetical content and truncates to maxLen.
 *
 * @param name - Full capability name
 * @param maxLen - Maximum length (default 14)
 * @returns Truncated name
 */
export function truncateCapName(name: string, maxLen: number = 14): string {
  const cleaned = name.replace(/[（(].*?[）)]/g, '');
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

/**
 * Format a proposition ID for compact display.
 * "RW-P1" → "P1"
 *
 * @param propId - Full proposition ID
 * @returns Short ID
 */
export function formatPropId(propId: string): string {
  return propId.replace('RW-', '');
}

/**
 * Format difficulty for display.
 *
 * @param difficulty - 'high' | 'medium' | 'low'
 * @returns Display string
 */
export function formatDifficulty(difficulty: string): string {
  if (difficulty === 'high') return '⚡高难';
  if (difficulty === 'medium') return '○中难';
  return '低难';
}

// ============================================================================
// Statistics Utilities
// ============================================================================

/**
 * Calculate hub capability count (capabilities shared by >= 3 propositions).
 *
 * @param capFreq - Array of capability frequency objects
 * @returns Number of hub capabilities
 */
export function countHubCapabilities(capFreq: { count: number }[] | null): number {
  if (!capFreq) return 0;
  return capFreq.filter((c) => c.count >= 3).length;
}

/**
 * Calculate average score from propositions.
 *
 * @param props - Array of proposition objects with score field
 * @returns Average score rounded to 1 decimal
 */
export function calculateAverageScore(props: { score: number }[] | null): number {
  if (!props || props.length === 0) return 0;
  const sum = props.reduce((s, p) => s + p.score, 0);
  return Math.round((sum / props.length) * 10) / 10;
}
