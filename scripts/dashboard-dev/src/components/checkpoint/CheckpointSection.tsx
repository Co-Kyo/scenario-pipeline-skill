import React, { useMemo } from 'react';
import type { CheckpointSectionProps, PipelineData, DecisionMoment } from '../../types/pipeline-data';
import { designTokens } from '../../data/design-tokens';
import { Badge } from '../shared/Badge';
import { DecisionPanel } from './DecisionPanel';

/**
 * Map checkpoint IDs to their decision moment.
 * ⓩⓧ → demand, ⓐⓑ → capability, ⓒⓓⓕⓖⓗ → output.
 */
const CHECKPOINT_DECISION_MAP: Record<string, DecisionMoment> = {
  z: 'demand',
  x: 'demand',
  a: 'capability',
  b: 'capability',
  c: 'output',
  d: 'output',
  f: 'output',
  g: 'output',
  h: 'output',
};

/**
 * CheckpointSection — P0-7 checkpoint summary block.
 *
 * Displayed for the current checkpoint, showing:
 * - Checkpoint symbol, name, and stage
 * - Location (stage + step)
 * - Artifact list
 * - Summary statistics (contextual to the checkpoint)
 * - Context data snapshot (mini visualization)
 * - Confirmation prompt (purely visual — "在对话中确认继续 →")
 * - DecisionPanel at 3 core decision moments (demand, capability, output)
 *
 * Style varies by status:
 * - completed: muted/gray border
 * - current: accent border + highlight
 * - pending: dashed border, low opacity
 */
export const CheckpointSection: React.FC<CheckpointSectionProps> = ({ checkpoint, contextData }) => {
  const status = checkpoint.status;

  const borderColor = useMemo(() => {
    switch (status) {
      case 'completed':
        return designTokens.colors.green;
      case 'current':
        return designTokens.colors.accent;
      case 'pending':
        return designTokens.colors.border;
      default:
        return designTokens.colors.border;
    }
  }, [status]);

  const summary = useMemo(() => buildCheckpointSummary(checkpoint, contextData), [checkpoint, contextData]);

  // Find matching decision panel for this checkpoint
  const decisionPanel = useMemo(() => {
    if (!contextData || !contextData.decisionPanels) return null;
    const moment = CHECKPOINT_DECISION_MAP[checkpoint.id];
    if (!moment) return null;
    return contextData.decisionPanels.find((p) => p.decisionMoment === moment) ?? null;
  }, [checkpoint.id, contextData]);

  return (
    <section
      id={`checkpoint-${checkpoint.id}`}
      className="mb-4 p-4 bg-surface border rounded-xl2 animate-fade-in"
      style={{ borderColor }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl" style={{ color: borderColor }}>{checkpoint.symbol}</span>
        <div>
          <h2 className="text-base font-bold">{checkpoint.name}</h2>
          <div className="text-2xs text-text2">
            📍 {checkpoint.stage}阶段 · Step {checkpoint.step}
          </div>
        </div>
        <div className="ml-auto">
          <Badge
            type="priority"
            value={status === 'completed' ? '已完成' : status === 'current' ? '进行中' : '待执行'}
          />
        </div>
      </div>

      {/* Artifacts */}
      <div className="mb-3">
        <div className="text-2xs text-text2 uppercase tracking-wide mb-1">📦 产物</div>
        <div className="flex gap-2 flex-wrap">
          {checkpoint.artifacts.map((art) => (
            <code
              key={art}
              className="text-2xs bg-surface2 px-2 py-0.5 rounded"
              style={{ fontFamily: 'SF Mono, Consolas, monospace' }}
            >
              {art}
            </code>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="mb-3">
          <div className="text-2xs text-text2 uppercase tracking-wide mb-1">📊 摘要</div>
          <div className="text-xs text-text">{summary}</div>
        </div>
      )}

      {/* Description */}
      <div className="mb-3 text-xs text-text2">{checkpoint.description}</div>

      {/* Confirmation prompt — purely visual, not a functional button */}
      {status === 'current' && !decisionPanel && (
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <span className="text-xs text-accent2 cursor-default" title="在 agent 对话中确认继续">
            ✓ 在对话中确认继续 →
          </span>
          <span className="text-xs text-text2 cursor-default" title="在 agent 对话中提出调整">
            ✏ 需要调整
          </span>
        </div>
      )}

      {/* Decision Panel — shown at 3 core decision moments */}
      {decisionPanel && (
        <DecisionPanel panel={decisionPanel} />
      )}
    </section>
  );
};

/**
 * Build a contextual summary string for a checkpoint based on available data.
 */
function buildCheckpointSummary(
  checkpoint: { id: string; step: number },
  data: PipelineData | null,
): string | null {
  if (!data) return null;

  switch (checkpoint.id) {
    case 'z': {
      const req = data.preStage.requirement;
      if (!req) return null;
      const propCount = req.propositions?.length ?? 0;
      const capCount = req.capability_web ? Object.keys(req.capability_web).length : 0;
      return `${propCount}命题已生成 · ${capCount}能力雏形 · 策略比例: core/premise/outlook`;
    }
    case 'x': {
      const part = data.preStage.partition;
      if (!part) return null;
      const compCount = part.components?.length ?? 0;
      const maxDepth = part.partition_stats?.max_depth ?? 0;
      return `${part.total_propositions}命题已分区 · ${compCount}连通分量 · 拓扑深度${maxDepth}层`;
    }
    case 'a': {
      const rm = data.preProcessing.rawMaterials;
      if (!rm) return null;
      const total = rm.scan_summary?.total_materials ?? 0;
      return `${total}篇信源材料已扫描 · T0-T3 tier 分布已统计`;
    }
    case 'b': {
      const cg = data.preProcessing.capabilityGraph;
      const ev = data.preProcessing.evaluations;
      if (!cg) return null;
      const capCount = cg.total_capabilities ?? 0;
      const evalCount = ev?.evaluations?.length ?? 0;
      return `${capCount}原子能力 · ${evalCount}命题已评估 · 6技术层`;
    }
    case 'c': {
      const caps = data.postProcessing?.capabilities ?? [];
      return caps.length > 0 ? `${caps.length}篇能力研究文档已生成` : null;
    }
    case 'd':
      return 'Briefing 文档已生成';
    case 'f': {
      const props = data.postProcessing?.propositions ?? [];
      return props.length > 0 ? `${props.length}命题 × 6 Tab 内容已组装` : null;
    }
    case 'g': {
      const ll = data.postProcessing?.learningLadder ?? null;
      return ll ? `学习阶梯已生成 · ${ll.total_depths}层拓扑深度` : null;
    }
    case 'h':
      return '完整看板已生成 · 管线全部完成';
    default:
      return null;
  }
}
