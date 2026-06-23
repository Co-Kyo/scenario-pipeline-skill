import { useState, useCallback, useEffect } from 'react';
import { getDefaultView } from '../data/stages';

/**
 * Hook: useViewState
 *
 * Manages the dashboard's view state:
 * - currentView: which view is currently displayed (e.g., 'overview', 'pre-stage-propositions')
 * - currentCheckpoint: which checkpoint is focused (id like 'z', 'x', 'a', etc.)
 * - sidebarExpanded: whether the sidebar is expanded
 * - selectedPropId: currently selected proposition for detail view
 * - scrollPosition: saved scroll position for returning from detail view
 * - searchQuery: sidebar search filter text
 *
 * State persists across re-renders but not across page reloads (no localStorage in v1).
 */
export function useViewState() {
  const [currentView, setCurrentView] = useState<string>('overview');
  const [currentCheckpoint, setCurrentCheckpoint] = useState<string | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Update default view when step changes (read from window data if available)
  useEffect(() => {
    const data = (window as unknown as { __PIPELINE_DATA__?: { meta?: { currentStep?: number } } }).__PIPELINE_DATA__;
    if (data?.meta?.currentStep !== undefined) {
      const defaultView = getDefaultView(data.meta.currentStep);
      setCurrentView(defaultView);
    }
  }, []);

  const handleViewChange = useCallback((view: string) => {
    setCurrentView(view);
    setSelectedPropId(null);
  }, []);

  const handlePropSelect = useCallback((propId: string) => {
    setScrollPosition(window.scrollY);
    setSelectedPropId(propId);
  }, []);

  const handlePropBack = useCallback(() => {
    setSelectedPropId(null);
    // Restore scroll position after returning from detail view
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollPosition, behavior: 'instant' });
    });
  }, [scrollPosition]);

  const handleCheckpointClick = useCallback((id: string) => {
    setCurrentCheckpoint(id);
    const el = document.getElementById(`checkpoint-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return {
    currentView,
    setCurrentView: handleViewChange,
    currentCheckpoint,
    setCurrentCheckpoint,
    sidebarExpanded,
    setSidebarExpanded,
    selectedPropId,
    setSelectedPropId: handlePropSelect,
    clearSelectedProp: handlePropBack,
    scrollPosition,
    setScrollPosition,
    searchQuery,
    setSearchQuery,
    onCheckpointClick: handleCheckpointClick,
  };
}
