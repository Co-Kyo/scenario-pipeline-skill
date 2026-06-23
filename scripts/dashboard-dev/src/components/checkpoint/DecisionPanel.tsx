import React, { useMemo } from 'react';
import type { DecisionPanelData, DecisionMoment } from '../../types/pipeline-data';
import { designTokens } from '../../data/design-tokens';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';

/**
 * DecisionPanel — Decision support panel for the 3 core decision moments.
 *
 * Displays:
 * - Artifact summary (key metrics)
 * - Quality assessment (score, issues, suggestions)
 * - Decision options (confirm / adjust / redo)
 * - Impact analysis (next step, risks)
 *
 * Design: Dark theme, card-based layout, color-coded by decision moment.
 */

interface DecisionPanelProps {
  panel: DecisionPanelData;
}

/** Color mapping for each decision moment. */
const MOMENT_COLORS: Record<DecisionMoment, { accent: string; bg: string; icon: string }> = {
  demand: {
    accent: designTokens.colors.accent,
    bg: 'rgba(108, 92, 231, 0.08)',
    icon: '🎯',
  },
  capability: {
    accent: designTokens.colors.green,
    bg: 'rgba(0, 184, 148, 0.08)',
    icon: '🧩',
  },
  output: {
    accent: designTokens.colors.blue,
    bg: 'rgba(116, 185, 255, 0.08)',
    icon: '📦',
  },
};

/** Score level labels. */
function getScoreLevel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: '优秀', color: designTokens.colors.green };
  if (score >= 75) return { label: '良好', color: designTokens.colors.accent2 };
  if (score >= 60) return { label: '一般', color: designTokens.colors.yellow };
  return { label: '需关注', color: designTokens.colors.red };
}

export const DecisionPanel: React.FC<DecisionPanelProps> = ({ panel }) => {
  const momentConfig = MOMENT_COLORS[panel.decisionMoment];
  const scoreLevel = useMemo(() => getScoreLevel(panel.quality.score), [panel.quality.score]);

  return (
    <section
      className="mb-4 p-4 rounded-xl2 animate-fade-in border"
      style={{
        borderColor: momentConfig.accent,
        background: momentConfig.bg,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{momentConfig.icon}</span>
        <div>
          <h3 className="text-base font-bold" style={{ color: momentConfig.accent }}>
            {panel.title}
          </h3>
          <div className="text-2xs text-text2">
            决策时刻 · {panel.decisionMoment === 'demand' ? '需求确认' :
              panel.decisionMoment === 'capability' ? '能力确认' : '产出确认'}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="text-right">
            <div className="text-2xs text-text2">质量评分</div>
            <div className="text-lg font-bold" style={{ color: scoreLevel.color }}>
              {panel.quality.score}
            </div>
          </div>
          <Badge
            type="priority"
            value={scoreLevel.label}
            className="ml-1"
          />
        </div>
      </div>

      {/* Artifact Summary */}
      <div className="mb-4">
        <div className="text-2xs text-text2 uppercase tracking-wide mb-2">📊 产物摘要</div>
        <div className="grid grid-cols-3 gap-2">
          {panel.summary.map((item, idx) => (
            <Card key={idx} variant="stat" className="text-center">
              <div className="text-lg font-bold" style={{ color: momentConfig.accent }}>
                {item.value}
              </div>
              <div className="text-2xs text-text2">{item.label}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Quality Assessment */}
      <div className="mb-4">
        <div className="text-2xs text-text2 uppercase tracking-wide mb-2">🔍 质量评估</div>
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ background: designTokens.colors.surface2 }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${panel.quality.score}%`,
                background: `linear-gradient(90deg, ${momentConfig.accent}, ${scoreLevel.color})`,
              }}
            />
          </div>
          <span className="text-xs font-mono" style={{ color: scoreLevel.color, minWidth: '36px' }}>
            {panel.quality.score}%
          </span>
        </div>

        {/* Issues */}
        {panel.quality.issues.length > 0 && (
          <div className="mb-2">
            {panel.quality.issues.map((issue, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-text2 mb-1">
                <span style={{ color: designTokens.colors.yellow }}>⚠</span>
                <span>{issue}</span>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions */}
        <div>
          {panel.quality.suggestions.map((sug, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-text2 mb-1">
              <span style={{ color: designTokens.colors.green }}>→</span>
              <span>{sug}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Decision Options */}
      <div className="mb-4">
        <div className="text-2xs text-text2 uppercase tracking-wide mb-2">🤔 决策选项</div>
        <div className="flex gap-2 flex-wrap">
          {panel.options.map((opt) => {
            const isPrimary = opt.id === 'confirm';
            return (
              <div
                key={opt.id}
                className="px-3 py-2 rounded-lg border text-xs cursor-default transition-all"
                style={{
                  borderColor: isPrimary ? momentConfig.accent : designTokens.colors.border,
                  background: isPrimary ? momentConfig.bg : 'transparent',
                  color: isPrimary ? momentConfig.accent : designTokens.colors.text,
                }}
                title={opt.description}
              >
                <div className="font-semibold">{opt.label}</div>
                <div className="text-2xs text-text2 mt-0.5">{opt.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Impact Analysis */}
      <div>
        <div className="text-2xs text-text2 uppercase tracking-wide mb-2">📈 影响分析</div>
        <div className="bg-surface2 rounded-lg p-3">
          <div className="flex items-start gap-2 text-xs mb-2">
            <span style={{ color: momentConfig.accent }}>→</span>
            <span className="text-text">
              <span className="text-text2">后续步骤：</span>{panel.impact.nextStep}
            </span>
          </div>
          {panel.impact.risks.length > 0 && (
            <div>
              {panel.impact.risks.map((risk, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-text2 mb-1">
                  <span style={{ color: designTokens.colors.red }}>!</span>
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation hint */}
      <div className="mt-3 pt-2 border-t border-border flex items-center gap-3">
        <span className="text-xs cursor-default" style={{ color: momentConfig.accent }}>
          ✓ 在对话中确认「{panel.options[0]?.label || '确认继续'}」
        </span>
        <span className="text-xs text-text2 cursor-default">
          ✏ 在对话中反馈调整意见
        </span>
      </div>
    </section>
  );
};
