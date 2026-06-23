import React from 'react';

type CardVariant = 'stat' | 'insight' | 'content';

interface CardProps {
  variant?: CardVariant;
  title?: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

/**
 * Card — generic card container.
 *
 * Variants:
 * - stat: compact stat card (number + label)
 * - insight: insight card with icon, title, and text
 * - content: general content card with padding
 *
 * Evolved from dashboard-template.html .stat-card / .insight-card.
 */
export const Card: React.FC<CardProps> = ({
  variant = 'content',
  title,
  icon,
  children,
  className = '',
  style,
  onClick,
}) => {
  const baseClass = 'bg-surface border border-border rounded-xl2 transition-all';
  const variantClass = {
    stat: 'px-4 py-2 text-center min-w-[80px]',
    insight: 'p-3',
    content: 'p-3',
  }[variant];

  const clickableClass = onClick ? 'cursor-pointer hover:border-accent hover:shadow-lg' : '';

  return (
    <div
      className={`${baseClass} ${variantClass} ${clickableClass} ${className}`}
      style={style}
      onClick={onClick}
    >
      {icon && <div className="text-xl mb-1">{icon}</div>}
      {title && <div className="text-xs font-semibold mb-1">{title}</div>}
      {children}
    </div>
  );
};
