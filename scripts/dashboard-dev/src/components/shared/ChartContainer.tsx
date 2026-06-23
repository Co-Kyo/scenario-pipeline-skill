import React from 'react';

interface ChartContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  legend?: React.ReactNode;
  className?: string;
}

/**
 * ChartContainer — wrapper for chart views.
 *
 * Provides consistent title, description, content area, and optional legend slot
 * for all chart-based views (heatmap, matrix, eval bars, etc.).
 */
export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  children,
  legend,
  className = '',
}) => {
  return (
    <div className={`py-4 ${className}`}>
      <h2 className="text-lg font-bold text-accent2 mb-2">{title}</h2>
      {description && (
        <p className="text-text2 text-xs mb-3">{description}</p>
      )}
      {children}
      {legend && (
        <div className="mt-2 flex gap-3 text-2xs text-text2 flex-wrap">
          {legend}
        </div>
      )}
    </div>
  );
};
