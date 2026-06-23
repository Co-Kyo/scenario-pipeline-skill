import React, { useState } from 'react';
import type { PropositionDetailProps } from '../../types/pipeline-data';
import { Badge } from '../shared/Badge';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';
import { getLayerColor } from '../../data/design-tokens';

/**
 * PropositionDetail — P1-7 proposition detail view.
 *
 * Migrated from dashboard-template.html loadProp() (L379-430) + switchPropTab() (L432-437).
 *
 * Features:
 * - Back button (returns to list, preserves scroll position)
 * - Proposition title with role/priority badges
 * - Capability tags with layer color coding
 * - 6 Tab navigation: overview / edge-cases / trade-offs / experiment / refs / learning-ladder
 * - Tab content rendered with MarkdownRenderer (inline marked.js)
 * - Tab switching without page refresh
 */

const PROP_TABS: { id: string; label: string }[] = [
  { id: 'overview', label: '概述' },
  { id: 'edge-cases', label: '边界case' },
  { id: 'trade-offs', label: '权衡' },
  { id: 'experiment', label: '实验' },
  { id: 'refs', label: '参考' },
  { id: 'learning-ladder', label: '学习阶梯' },
];

export const PropositionDetail: React.FC<PropositionDetailProps> = ({ proposition, onBack }) => {
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Get available tabs (those with content)
  const availableTabs = PROP_TABS.filter(
    (tab) => proposition.content && proposition.content[tab.id],
  );
  const tabs = availableTabs.length > 0 ? availableTabs : PROP_TABS;

  const currentContent = proposition.content?.[activeTab] ?? '# 内容加载失败\n\n该 Tab 的内容尚未生成。';

  // Get capability info from analytics (if available via window data)
  const propCaps: string[] = [];
  const capNames: Record<string, string> = {};
  const capLayer: Record<string, string> = {};
  const capFreq: { id: string; count: number }[] = [];

  // Try to read from window data
  const windowData = (window as unknown as { __PIPELINE_DATA__?: { postProcessing?: { analytics?: { propCaps?: Record<string, string[]>; capNames?: Record<string, string>; capLayer?: Record<string, string>; capFreq?: { id: string; count: number }[] } } } }).__PIPELINE_DATA__;
  const analytics = windowData?.postProcessing?.analytics;
  if (analytics) {
    const caps = analytics.propCaps?.[proposition.id] ?? [];
    caps.forEach((cid) => propCaps.push(cid));
    Object.assign(capNames, analytics.capNames ?? {});
    Object.assign(capLayer, analytics.capLayer ?? {});
    if (analytics.capFreq) {
      analytics.capFreq.forEach((f) => capFreq.push(f));
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Navigation bar */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={onBack}
          className="text-xs text-accent2 cursor-pointer hover:underline py-1"
        >
          ← 返回
        </button>
        <span className="text-lg font-bold text-text">{proposition.name}</span>
        <div className="ml-auto flex gap-1.5">
          <Badge type="role" value={proposition.role} />
          <Badge type="priority" value={proposition.priority} />
        </div>
      </div>

      {/* Capability tags */}
      {propCaps.length > 0 && (
        <div className="flex flex-wrap gap-1 my-1.5 mb-3">
          {propCaps.map((cid) => {
            const name = capNames[cid] ?? cid;
            const freq = capFreq.find((f) => f.id === cid);
            const isShared = freq && freq.count >= 3;
            const layer = capLayer[cid] ?? '';
            const layerColor = getLayerColor(layer);
            return (
              <span
                key={cid}
                className={`text-2xs px-2 py-1 rounded bg-surface2 border cursor-pointer transition-all hover:text-accent2 ${isShared ? 'border-yellow text-yellow' : 'border-border'}`}
                style={{ borderLeft: `2px solid ${layerColor}` }}
                title={`${layer} — ${freq?.count ?? 0}命题`}
              >
                {name}
              </span>
            );
          })}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border mb-3.5 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === tab.id
                ? 'text-accent2 border-accent'
                : 'text-text2 border-transparent hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        <MarkdownRenderer content={currentContent} />
      </div>
    </div>
  );
};
