import React, { useState, useMemo } from 'react';
import type { PostProcessingData, PropositionContent } from '../../types/pipeline-data';
import { EmptyState } from '../shared/EmptyState';
import { OverviewView } from './OverviewView';
import { LearningPathView } from './LearningPathView';
import { HeatmapView } from './HeatmapView';
import { LayerDistView } from './LayerDistView';
import { DifficultyMatrixView } from './DifficultyMatrixView';
import { EvalAnalysisView } from './EvalAnalysisView';
import { BatchFlowView } from './BatchFlowView';
import { PropositionDetail } from './PropositionDetail';

interface PostProcessingViewProps {
  data: PostProcessingData;
  completedSteps: number[];
  currentView: string;
  onViewChange: (view: string) => void;
  onPropSelect: (propId: string) => void;
}

/**
 * PostProcessingView — container for the post-processing phase (Steps 5-9).
 *
 * Features:
 * - 7-view tab navigation (演进自现有 dashboard-v2.html)
 * - Progressive rendering: tabs become available as steps complete
 * - Proposition detail overlay when a proposition is selected
 *
 * Tab availability logic (based on completedSteps):
 * - overview: always available (if any post-processing data exists)
 * - learning-path: available after step 8 (learning-ladder)
 * - heatmap/layers/matrix/eval/batches: available after step 9 (full analytics)
 */
export const PostProcessingView: React.FC<PostProcessingViewProps> = ({
  data,
  completedSteps,
  currentView,
  onViewChange,
  onPropSelect,
}) => {
  const [selectedProp, setSelectedProp] = useState<PropositionContent | null>(null);

  const tabs = useMemo(() => {
    const maxStep = completedSteps.length > 0
      ? completedSteps[completedSteps.length - 1]
      : -1;
    return [
      { id: 'overview', label: '总览', icon: '📊', available: data.propositions.length > 0 || data.analytics !== null },
      { id: 'learning-path', label: '学习路径', icon: '🗺️', available: maxStep >= 8 || data.learningLadder !== null },
      { id: 'heatmap', label: '能力热力图', icon: '🔥', available: data.analytics !== null },
      { id: 'layers', label: '技术层分布', icon: '🏗️', available: data.analytics !== null },
      { id: 'matrix', label: '难度矩阵', icon: '📐', available: data.analytics !== null },
      { id: 'eval', label: '评估分析', icon: '📈', available: data.analytics !== null },
      { id: 'batches', label: '执行批次', icon: '⚡', available: data.analytics !== null },
    ];
  }, [completedSteps, data]);

  if (data.propositions.length === 0 && data.analytics === null && data.capabilities.length === 0) {
    return <EmptyState message="后处理阶段数据待生成" icon="📦" />;
  }

  // If a proposition is selected, show detail view
  if (selectedProp) {
    return (
      <PropositionDetail
        proposition={selectedProp}
        onBack={() => setSelectedProp(null)}
      />
    );
  }

  const handlePropSelect = (propId: string) => {
    const prop = data.propositions.find((p) => p.id === propId);
    if (prop) {
      setSelectedProp(prop);
      onPropSelect(propId);
    }
  };

  const activeView = tabs.find((t) => t.id === currentView && t.available)
    ? currentView
    : tabs.find((t) => t.available)?.id ?? 'overview';

  return (
    <div>
      {/* Tab navigation */}
      <div className="flex gap-0 border-b-2 border-border mb-4 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => tab.available && onViewChange(tab.id)}
            disabled={!tab.available}
            className={`px-4 py-2 text-xs font-medium border-b-2 mb-[-2px] transition-all ${
              activeView === tab.id
                ? 'text-accent2 border-accent'
                : tab.available
                  ? 'text-text2 hover:text-text border-transparent'
                  : 'text-text2 opacity-40 cursor-not-allowed border-transparent'
            }`}
          >
            {tab.icon} {tab.label}
            {!tab.available && <span className="ml-1 text-2xs">🔒</span>}
          </button>
        ))}
      </div>

      {/* View content */}
      <div className="animate-fade-in">
        {activeView === 'overview' && (
          <OverviewView data={data} onPropSelect={handlePropSelect} />
        )}
        {activeView === 'learning-path' && (
          <LearningPathView data={data} onPropSelect={handlePropSelect} />
        )}
        {activeView === 'heatmap' && (
          <HeatmapView data={data} onPropSelect={handlePropSelect} />
        )}
        {activeView === 'layers' && (
          <LayerDistView data={data} />
        )}
        {activeView === 'matrix' && (
          <DifficultyMatrixView data={data} onPropSelect={handlePropSelect} />
        )}
        {activeView === 'eval' && (
          <EvalAnalysisView data={data} onPropSelect={handlePropSelect} />
        )}
        {activeView === 'batches' && (
          <BatchFlowView data={data} />
        )}
      </div>
    </div>
  );
};
