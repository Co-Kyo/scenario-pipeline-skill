import React from 'react';
import { designTokens } from '../../data/design-tokens';

type BadgeType = 'priority' | 'role' | 'layer';

interface BadgeProps {
  type: BadgeType;
  value: string;
  className?: string;
}

/**
 * Badge — small colored label for priority, role, or tech layer.
 *
 * Types:
 * - priority: high (red) / medium (yellow)
 * - role: core (blue) / premise (green) / outlook (accent)
 * - layer: 6 tech layer colors
 *
 * Evolved from dashboard-template.html .badge classes.
 */
export const Badge: React.FC<BadgeProps> = ({ type, value, className = '' }) => {
  const color = getBadgeColor(type, value);

  const isDark = ['high', 'core', 'premise', 'outlook', '安全层'].includes(value);

  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-2xs font-semibold uppercase ${className}`}
      style={{
        background: color,
        color: isDark ? '#fff' : '#000',
      }}
    >
      {value}
    </span>
  );
};

/**
 * Get the color for a badge based on type and value.
 */
function getBadgeColor(type: BadgeType, value: string): string {
  switch (type) {
    case 'priority':
      return designTokens.priorityColors[value] ?? designTokens.colors.text2;
    case 'role':
      return designTokens.roleColors[value] ?? designTokens.colors.accent;
    case 'layer':
      return designTokens.techLayers[value] ?? '#666666';
    default:
      return designTokens.colors.accent;
  }
}
