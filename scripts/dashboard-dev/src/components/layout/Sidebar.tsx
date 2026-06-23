import React, { useMemo, useState } from 'react';
import type { SidebarProps, DecisionMoment } from '../../types/pipeline-data';
import { STAGE_DEFINITIONS } from '../../data/stages';
import { getPriorityColor, designTokens } from '../../data/design-tokens';

/**
 * Decision moment definitions for sidebar status display.
 */
interface DecisionMomentDef {
  id: DecisionMoment;
  label: string;
  icon: string;
  color: string;
  minStep: number;
  confirmStep: number;
}

const DECISION_MOMENTS: DecisionMomentDef[] = [
  { id: 'demand', label: '需求确认', icon: '🎯', color: designTokens.colors.accent, minStep: 0, confirmStep: 2 },
  { id: 'capability', label: '能力确认', icon: '🧩', color: designTokens.colors.green, minStep: 2, confirmStep: 5 },
  { id: 'output', label: '产出确认', icon: '📦', color: designTokens.colors.blue, minStep: 5, confirmStep: 9 },
];

type DecisionStatus = 'confirmed' | 'current' | 'pending';

function getDecisionStatus(moment: DecisionMomentDef, currentStep: number): DecisionStatus {
  if (currentStep >= moment.confirmStep) return 'confirmed';
  if (currentStep >= moment.minStep) return 'current';
  return 'pending';
}

/**
 * Sidebar — 3-stage grouped navigation.
 *
 * Features:
 * - Groups navigation by 3 stages (前置/前处理/后处理)
 * - Current stage/view highlighted
 * - Expandable/collapsible stage sections
 * - Decision moment status indicators (confirmed/current/pending)
 * - Proposition search box (filters sidebar proposition list)
 * - Proposition list grouped by role (core/premise/outlook)
 *
 * Evolved from dashboard-template.html .sidebar.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  data,
  currentView,
  onViewChange,
  sidebarExpanded,
  onToggleExpand,
  onPropSelect,
  searchQuery,
  onSearchChange,
}) => {
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
    'pre-stage': true,
    'pre-processing': true,
    'post-processing': true,
  });

  const propositions = data?.postProcessing?.propositions ?? [];
  const currentStep = data?.meta?.currentStep ?? -1;

  const filteredProps = useMemo(() => {
    if (!searchQuery) return propositions;
    const q = searchQuery.toLowerCase();
    return propositions.filter(
      (p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
    );
  }, [propositions, searchQuery]);

  const groupedProps = useMemo(() => {
    const groups: Record<string, typeof filteredProps> = { core: [], premise: [], outlook: [] };
    filteredProps.forEach((p) => {
      const role = p.role in groups ? p.role : 'core';
      groups[role].push(p);
    });
    return groups;
  }, [filteredProps]);

  const toggleStage = (stageId: string) => {
    setExpandedStages((prev) => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const roleLabels: Record<string, string> = {
    core: '核心命题',
    premise: '前置基础',
    outlook: '进阶展望',
  };

  if (!sidebarExpanded) {
    return (
      <aside className="w-12 flex-shrink-0">
        <button
          onClick={onToggleExpand}
          className="w-full p-2 text-text2 hover:text-text"
          aria-label="展开侧边栏"
        >
          →
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-surface border border-border rounded-xl2 p-3 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto self-start">
      {/* Search box */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="搜索命题..."
        className="w-full px-3 py-1.5 bg-surface2 border border-border rounded-lg text-text text-xs mb-2 focus:outline-none focus:border-accent"
      />

      {/* Stage navigation */}
      {STAGE_DEFINITIONS.map((stage) => {
        const isExpanded = expandedStages[stage.id];
        const hasActiveView = stage.views.some((v) => v.id === currentView);

        return (
          <div key={stage.id} className="mb-2">
            <button
              onClick={() => toggleStage(stage.id)}
              className={`flex items-center gap-1 w-full text-left text-2xs text-text2 uppercase tracking-wide hover:text-text py-1 ${hasActiveView ? 'text-accent2' : ''}`}
            >
              <span className="text-2xs">{isExpanded ? '▾' : '▸'}</span>
              {stage.name}
            </button>
            {isExpanded && (
              <div className="ml-2">
                {stage.views.map((view) => (
                  <button
                    key={view.id}
                    onClick={() => onViewChange(view.id)}
                    className={`block w-full text-left px-2.5 py-1.5 rounded-md text-xs cursor-pointer mb-0.5 transition-all ${
                      currentView === view.id
                        ? 'bg-accent text-white'
                        : 'text-text hover:bg-surface2'
                    }`}
                  >
                    {view.icon} {view.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Decision moments status */}
      <div className="mt-3 mb-2">
        <div className="text-2xs text-text2 uppercase tracking-wide mb-2">决策时刻</div>
        {DECISION_MOMENTS.map((dm) => {
          const dmStatus = getDecisionStatus(dm, currentStep);
          return (
            <div
              key={dm.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md mb-1 text-xs"
            >
              {/* Status indicator */}
              <span
                className="flex-shrink-0 flex items-center justify-center w-4 h-4"
                title={
                  dmStatus === 'confirmed' ? '已确认' :
                  dmStatus === 'current' ? '当前决策' : '未到达'
                }
              >
                {dmStatus === 'confirmed' ? (
                  <span className="text-xs" style={{ color: dm.color }}>✓</span>
                ) : dmStatus === 'current' ? (
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: dm.color }}
                  />
                ) : (
                  <span className="w-2 h-2 rounded-full" style={{ background: designTokens.colors.border }} />
                )}
              </span>
              <span className="mr-1">{dm.icon}</span>
              <span
                className={
                  dmStatus === 'confirmed' ? 'font-semibold' :
                  dmStatus === 'current' ? '' : 'text-text2'
                }
                style={dmStatus === 'confirmed' ? { color: dm.color } :
                       dmStatus === 'current' ? { color: dm.color } : {}}
              >
                {dm.label}
              </span>
              {dmStatus === 'confirmed' && (
                <span className="ml-auto text-2xs" style={{ color: dm.color }}>已完成</span>
              )}
              {dmStatus === 'current' && (
                <span className="ml-auto text-2xs text-text2">进行中</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Proposition list (only in post-processing stage) */}
      {propositions.length > 0 && (
        <div className="mt-3">
          <div className="text-2xs text-text2 uppercase tracking-wide mb-1">命题列表</div>
          {(['core', 'premise', 'outlook'] as const).map((role) => {
            const props = groupedProps[role];
            if (!props || props.length === 0) return null;
            return (
              <div key={role} className="mb-2">
                <div className="text-2xs text-text2 px-1 mb-1">{roleLabels[role]}</div>
                {props.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onPropSelect(p.id)}
                    className="flex items-center gap-1.5 w-full text-left px-2.5 py-1.5 rounded-md text-xs cursor-pointer mb-0.5 hover:bg-surface2 transition-all text-text"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: getPriorityColor(p.priority) }}
                    />
                    <span className="truncate" title={p.name}>{p.name}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Collapse button */}
      <button
        onClick={onToggleExpand}
        className="w-full text-2xs text-text2 hover:text-text mt-2 text-center"
      >
        ← 收起
      </button>
    </aside>
  );
};
