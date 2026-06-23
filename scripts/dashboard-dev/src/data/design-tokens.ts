/**
 * Design tokens — evolved from dashboard-template.html CSS variables.
 *
 * These tokens are the single source of truth for colors, typography, spacing,
 * and tech-layer palettes. Tailwind config references these values, and components
 * can import them directly for inline styles (e.g., SVG fills).
 *
 * Source: dashboard-template.html :root CSS variables + architecture doc §8.3.
 */

export const designTokens = {
  /** Core color palette — maps 1:1 to dashboard-template.html CSS variables. */
  colors: {
    bg: '#0a0a0f',
    surface: '#12121a',
    surface2: '#1a1a25',
    border: '#2a2a3a',
    text: '#e8e8f0',
    text2: '#8888a0',
    accent: '#6c5ce7',
    accent2: '#a29bfe',
    green: '#00b894',
    yellow: '#fdcb6e',
    red: '#e17055',
    blue: '#74b9ff',
    orange: '#fab1a0',
  },

  /** Tech layer color mapping — used in CapabilityGraph, LayerDist, Heatmap, etc. */
  techLayers: {
    '浏览器层': '#6c5ce7',
    '网络层': '#00b894',
    '运行时层': '#e17055',
    '工程层': '#fdcb6e',
    '工具层': '#74b9ff',
    '安全层': '#d63031',
  } as Record<string, string>,

  /** Canonical ordering of tech layers for consistent display. */
  layerOrder: ['浏览器层', '网络层', '运行时层', '工程层', '工具层', '安全层'],

  /** Priority badge colors. */
  priorityColors: {
    high: '#e17055',
    medium: '#fdcb6e',
  } as Record<string, string>,

  /** Role badge colors. */
  roleColors: {
    core: '#74b9ff',
    premise: '#00b894',
    outlook: '#6c5ce7',
  } as Record<string, string>,

  /** Heatmap intensity colors (by reuse count). */
  heatColors: {
    heat1: 'rgba(108, 92, 231, 0.12)',
    heat2: 'rgba(108, 92, 231, 0.32)',
    heat3: 'rgba(108, 92, 231, 0.55)',
    heat4plus: 'rgba(108, 92, 231, 0.8)',
  },

  /** Evaluation segment colors. */
  evalSegmentColors: {
    cross_stack: '#6c5ce7',
    doc_vacuum: '#74b9ff',
    experience: '#fab1a0',
    heat: '#00b894',
  } as Record<string, string>,

  /** Typography scale. */
  fontSize: {
    xs: '10px',
    sm: '12px',
    base: '13px',
    md: '14px',
    lg: '15px',
    xl: '18px',
    '2xl': '22px',
    '3xl': '24px',
  },

  /** Spacing scale (in px). */
  spacing: {
    xs: 4,
    sm: 6,
    md: 8,
    base: 10,
    lg: 12,
    xl: 14,
    '2xl': 16,
    '3xl': 20,
    '4xl': 24,
  },

  /** Border radius. */
  borderRadius: {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 10,
    '2xl': 12,
  },
} as const;

/**
 * Get the color for a tech layer by name.
 * Falls back to a neutral gray if the layer is not in the standard set.
 */
export function getLayerColor(layer: string): string {
  return designTokens.techLayers[layer] ?? '#666666';
}

/**
 * Get the color for a priority level.
 */
export function getPriorityColor(priority: string): string {
  return designTokens.priorityColors[priority] ?? designTokens.colors.text2;
}

/**
 * Get the color for a proposition role.
 */
export function getRoleColor(role: string): string {
  return designTokens.roleColors[role] ?? designTokens.colors.accent;
}

/**
 * Get the heatmap CSS class based on reuse count.
 * Maps to the original dashboard-template.html heat-1/2/3/4plus classes.
 */
export function getHeatClass(count: number): string {
  if (count >= 4) return 'heat4plus';
  if (count === 3) return 'heat3';
  if (count === 2) return 'heat2';
  return 'heat1';
}

/**
 * Get the heatmap background color based on reuse count.
 */
export function getHeatColor(count: number): string {
  if (count >= 4) return designTokens.heatColors.heat4plus;
  if (count === 3) return designTokens.heatColors.heat3;
  if (count === 2) return designTokens.heatColors.heat2;
  return designTokens.heatColors.heat1;
}
