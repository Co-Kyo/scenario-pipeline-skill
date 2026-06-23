import React, { useMemo } from 'react';
import type { CheckpointInfo } from '../../types/pipeline-data';
import { designTokens } from '../../data/design-tokens';

interface ProgressTimelineProps {
  checkpoints: CheckpointInfo[];
  currentCheckpoint: string | null;
  onCheckpointClick: (id: string) => void;
}

/**
 * ProgressTimeline — P0 core component.
 *
 * Renders 9 checkpoints (ⓩ-ⓗ) as a horizontal timeline, sticky at the top.
 *
 * States:
 * - completed: ✓ symbol + accent2 highlight color
 * - current: pulsing animation + accent color
 * - pending: gray (text2) color
 *
 * Features:
 * - Click scrolls to corresponding checkpoint section
 * - Hover shows tooltip with checkpoint name and stage
 * - Narrow screens: horizontal scroll
 *
 * Evolved from PRD §5.1 layout and P0-2 requirements.
 */
export const ProgressTimeline: React.FC<ProgressTimelineProps> = ({
  checkpoints,
  onCheckpointClick,
}) => {
  const stageColors = useMemo(() => ({
    '前置': designTokens.colors.accent,
    '前处理': designTokens.colors.green,
    '后处理': designTokens.colors.blue,
  }), []);

  if (checkpoints.length === 0) {
    return (
      <div className="sticky top-0 z-50 bg-bg border-b border-border px-6 py-3">
        <div className="text-text2 text-sm">进度时间线待加载...</div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50 bg-bg border-b border-border px-6 py-3 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {checkpoints.map((cp, idx) => {
          const isCompleted = cp.status === 'completed';
          const isCurrent = cp.status === 'current';
          const isPending = cp.status === 'pending';
          const stageColor = stageColors[cp.stage as keyof typeof stageColors] ?? designTokens.colors.accent;

          return (
            <React.Fragment key={cp.id}>
              {/* Checkpoint node */}
              <button
                onClick={() => onCheckpointClick(cp.id)}
                className="group relative flex flex-col items-center cursor-pointer transition-all"
                title={`${cp.name} · ${cp.stage} · Step ${cp.step}`}
                aria-label={`检查点 ${cp.symbol} ${cp.name}`}
              >
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-base font-bold
                    transition-all duration-200 border-2
                    ${isCompleted ? 'border-transparent' : ''}
                    ${isCurrent ? 'border-transparent animate-pulse-slow' : ''}
                    ${isPending ? 'border-border opacity-50' : ''}
                  `}
                  style={{
                    background: isCompleted
                      ? designTokens.colors.accent2
                      : isCurrent
                        ? designTokens.colors.accent
                        : designTokens.colors.surface2,
                    color: isCompleted || isCurrent ? '#fff' : designTokens.colors.text2,
                    boxShadow: isCurrent ? `0 0 12px ${designTokens.colors.accent}80` : 'none',
                  }}
                >
                  {isCompleted ? '✓' : cp.symbol}
                </div>
                {/* Tooltip on hover */}
                <div className="absolute top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 bg-surface border border-border rounded-md px-2 py-1 text-xs">
                  <span className="font-semibold" style={{ color: stageColor }}>{cp.stage}</span>
                  {' · '}
                  <span>{cp.name}</span>
                  <span className="text-text2 ml-1">(Step {cp.step})</span>
                </div>
              </button>
              {/* Connector line */}
              {idx < checkpoints.length - 1 && (
                <div
                  className="h-0.5 w-8 flex-shrink-0"
                  style={{
                    background: isCompleted
                      ? designTokens.colors.accent2
                      : designTokens.colors.border,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* Stage labels */}
      <div className="flex gap-1 mt-2 text-2xs text-text2 min-w-max">
        <span className="mr-2" style={{ color: designTokens.colors.accent }}>前置</span>
        <span className="mx-8" style={{ color: designTokens.colors.green }}>前处理</span>
        <span className="ml-16" style={{ color: designTokens.colors.blue }}>后处理</span>
      </div>
    </div>
  );
};
