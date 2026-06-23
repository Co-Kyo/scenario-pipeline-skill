import React, { useMemo, useState, useCallback } from 'react';
import { usePipelineData } from './hooks/usePipelineData';
import { useViewState } from './hooks/useViewState';
import { Header } from './components/layout/Header';
import { ProgressTimeline } from './components/layout/ProgressTimeline';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { CheckpointSection } from './components/checkpoint/CheckpointSection';
import { PreStageView } from './components/pre-stage/PreStageView';
import { PreProcessingView } from './components/pre-processing/PreProcessingView';
import { PostProcessingView } from './components/post-processing/PostProcessingView';
import { PropositionDetail } from './components/post-processing/PropositionDetail';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

interface AppProps {
  /** Raw data injected from window.__PIPELINE_DATA__ (may be null in skeleton state). */
  data: unknown;
}

/**
 * Root application component.
 *
 * Layout structure (from PRD §5.1):
 * ┌─────────────────────────────────────────┐
 * │  Header: 标题 + 统计卡片                  │
 * ├─────────────────────────────────────────┤
 * │  ProgressTimeline (sticky, 9 checkpoints) │
 * ├──────────┬──────────────────────────────┤
 * │  Sidebar │  Main content area            │
 * │          │  (checkpoint section + views)  │
 * ├──────────┴──────────────────────────────┤
 * │  Footer: 管线状态 + 生成时间               │
 * └─────────────────────────────────────────┘
 */
export const App: React.FC<AppProps> = ({ data }) => {
  const pipelineData = usePipelineData(data);
  const viewState = useViewState();
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);

  const handleCheckpointClick = useCallback((id: string) => {
    viewState.setCurrentCheckpoint(id);
    const el = document.getElementById(`checkpoint-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [viewState]);

  const handleViewChange = useCallback((view: string) => {
    viewState.setCurrentView(view);
    setSelectedPropId(null);
  }, [viewState]);

  const handlePropSelect = useCallback((propId: string) => {
    setSelectedPropId(propId);
  }, []);

  const handlePropBack = useCallback(() => {
    setSelectedPropId(null);
  }, []);

  const currentCheckpoint = useMemo(() => {
    if (!pipelineData) return null;
    const cp = pipelineData.checkpoints.find(
      (c) => c.id === viewState.currentCheckpoint,
    );
    return cp ?? pipelineData.checkpoints.find((c) => c.status === 'current') ?? null;
  }, [pipelineData, viewState.currentCheckpoint]);

  const mainContent = useMemo(() => {
    if (!pipelineData) {
      return (
        <div className="flex items-center justify-center h-96 text-text2">
          <p>管线数据待加载...</p>
        </div>
      );
    }

    // If a proposition is selected, show detail view
    if (selectedPropId && pipelineData.postProcessing) {
      const prop = pipelineData.postProcessing.propositions.find(
        (p) => p.id === selectedPropId,
      );
      if (prop) {
        return <PropositionDetail proposition={prop} onBack={handlePropBack} />;
      }
    }

    const view = viewState.currentView;
    if (view.startsWith('pre-stage')) {
      return <PreStageView data={pipelineData.preStage} />;
    }
    if (view.startsWith('pre-processing')) {
      return <PreProcessingView data={pipelineData.preProcessing} />;
    }
    if (view.startsWith('post-processing') || view === 'overview' || view === 'learning-path' ||
        view === 'heatmap' || view === 'layers' || view === 'matrix' ||
        view === 'eval' || view === 'batches') {
      return (
        <PostProcessingView
          data={pipelineData.postProcessing}
          completedSteps={pipelineData.progress.completedSteps}
          currentView={view}
          onViewChange={handleViewChange}
          onPropSelect={handlePropSelect}
        />
      );
    }
    // Default: show current stage view based on progress
    const lastStep = pipelineData.progress.completedSteps.length > 0
      ? pipelineData.progress.completedSteps[pipelineData.progress.completedSteps.length - 1]
      : -1;
    if (lastStep <= 1) {
      return <PreStageView data={pipelineData.preStage} />;
    }
    if (lastStep <= 4) {
      return <PreProcessingView data={pipelineData.preProcessing} />;
    }
    return (
      <PostProcessingView
        data={pipelineData.postProcessing}
        completedSteps={pipelineData.progress.completedSteps}
        currentView="overview"
        onViewChange={handleViewChange}
        onPropSelect={handlePropSelect}
      />
    );
  // handleViewChange is intentionally included: it's passed as a prop to PostProcessingView.
  // When viewState changes, we need to re-render with the updated callback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineData, viewState.currentView, selectedPropId, handlePropBack, handleViewChange, handlePropSelect]);

  return (
    <div className="min-h-screen bg-bg text-text">
      <Header data={pipelineData} />
      <ProgressTimeline
        checkpoints={pipelineData?.checkpoints ?? []}
        currentCheckpoint={pipelineData?.progress.currentCheckpoint ?? null}
        onCheckpointClick={handleCheckpointClick}
      />
      <div className="flex gap-0 px-6 pb-6 min-h-[calc(100vh-180px)]">
        <Sidebar
          data={pipelineData}
          currentView={viewState.currentView}
          onViewChange={handleViewChange}
          sidebarExpanded={viewState.sidebarExpanded}
          onToggleExpand={() => viewState.setSidebarExpanded(!viewState.sidebarExpanded)}
          onPropSelect={handlePropSelect}
          searchQuery={viewState.searchQuery}
          onSearchChange={viewState.setSearchQuery}
        />
        <main className="flex-1 min-w-0 pl-4">
          {currentCheckpoint && (
            <CheckpointSection
              checkpoint={currentCheckpoint}
              contextData={pipelineData}
            />
          )}
          <ErrorBoundary fallbackTitle="视图渲染错误">
            {mainContent}
          </ErrorBoundary>
        </main>
      </div>
      <Footer data={pipelineData} />
    </div>
  );
};

export default App;
