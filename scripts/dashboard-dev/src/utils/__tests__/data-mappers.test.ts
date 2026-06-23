import { describe, it, expect } from 'vitest';
import {
  mapToHeatmapGrid,
  mapToDepthOrder,
  mapToEvalBreakdown,
  mapToLayerDist,
  mapToBatchInfo,
  mapToMatrixPoints,
  mapToPoolRows,
  mapToInsights,
} from '../data-mappers';
import type { AnalyticsData } from '../../types/pipeline-data';

/**
 * Unit tests for data-mappers pure functions.
 *
 * These tests verify that the transformation functions correctly convert
 * PipelineData/AnalyticsData into view-specific structures, and handle
 * null/empty inputs gracefully without throwing.
 *
 * Style: Given-When-Then (BDD).
 */

// ============================================================================
// Test fixtures
// ============================================================================

const mockAnalytics: AnalyticsData = {
  capFreq: [
    { id: 'A01', name: '浏览器渲染管线', count: 5, props: ['RW-P1', 'RW-P2', 'RW-P3', 'RW-P8', 'RW-P10'] },
    { id: 'A02', name: 'HTTP缓存机制', count: 3, props: ['RW-P5', 'RW-P10', 'RW-P14'] },
    { id: 'A03', name: '事件循环机制', count: 2, props: ['RW-P3', 'RW-P13'] },
    { id: 'A04', name: '内存管理', count: 1, props: ['RW-P4'] },
  ],
  layerDist: {
    '浏览器层': {
      caps: [{ id: 'A01', name: '浏览器渲染管线', layer: '浏览器层' }],
      groups: ['G1'],
    },
    '网络层': {
      caps: [{ id: 'A02', name: 'HTTP缓存机制', layer: '网络层' }],
      groups: ['G2'],
    },
  },
  layerOrder: ['浏览器层', '网络层'],
  layerColors: { '浏览器层': '#6c5ce7', '网络层': '#00b894' },
  depthOrder: [
    { depth: 0, id: 'RW-P13', name: '浏览器渲染管线', priority: 'medium', difficulty: 'medium', score: 5, caps: 7, role: 'premise' },
    { depth: 1, id: 'RW-P1', name: '渲染性能瓶颈', priority: 'high', difficulty: 'high', score: 8, caps: 9, role: 'core' },
    { depth: 1, id: 'RW-P2', name: 'Core Web Vitals', priority: 'high', difficulty: 'high', score: 9, caps: 10, role: 'core' },
    { depth: 2, id: 'RW-P5', name: 'HTTP缓存策略', priority: 'high', difficulty: 'high', score: 9, caps: 12, role: 'core' },
  ],
  evalBreakdown: [
    { id: 'RW-P1', name: '渲染性能瓶颈', total: 8, cross_stack: 2, doc_vacuum: 3, experience: 2, heat: 1, rec_order: 1 },
    { id: 'RW-P2', name: 'Core Web Vitals', total: 9, cross_stack: 3, doc_vacuum: 2, experience: 2, heat: 2, rec_order: 2 },
  ],
  dagEdges: [{ from: 'RW-P13', to: 'RW-P1' }],
  batchInfo: [
    { batch: 1, groups: ['G1'], desc: '基石能力' },
    { batch: 2, groups: ['G2'], desc: '进阶能力' },
  ],
  propCaps: {
    'RW-P1': ['A01', 'A03'],
    'RW-P2': ['A01'],
    'RW-P5': ['A02'],
  },
  capNames: { A01: '浏览器渲染管线', A02: 'HTTP缓存机制', A03: '事件循环机制', A04: '内存管理' },
  capLayer: { A01: '浏览器层', A02: '网络层', A03: '运行时层', A04: '运行时层' },
  totalCaps: 4,
  totalProps: 3,
};

// ============================================================================
// mapToHeatmapGrid
// ============================================================================

describe('mapToHeatmapGrid', () => {
  it('Given valid analytics data, When mapping to heatmap grid, Then returns correct rows with fill states', () => {
    // When
    const grid = mapToHeatmapGrid(mockAnalytics, 22);

    // Then
    expect(grid).toHaveLength(4); // 4 capabilities
    expect(grid[0].capId).toBe('A01');
    expect(grid[0].count).toBe(5);

    // Check fill states for first capability (A01 is in RW-P1 and RW-P2)
    const a01P1Cell = grid[0].propCells.find((c) => c.propId === 'RW-P1');
    expect(a01P1Cell?.filled).toBe(true);
    const a01P5Cell = grid[0].propCells.find((c) => c.propId === 'RW-P5');
    expect(a01P5Cell?.filled).toBe(false);
  });

  it('Given null analytics data, When mapping to heatmap grid, Then returns empty array', () => {
    // Given
    const data = null;

    // When
    const grid = mapToHeatmapGrid(data);

    // Then
    expect(grid).toEqual([]);
  });

  it('Given analytics with empty capFreq, When mapping to heatmap grid, Then returns empty array', () => {
    // Given
    const data: AnalyticsData = { ...mockAnalytics, capFreq: [] };

    // When
    const grid = mapToHeatmapGrid(data);

    // Then
    expect(grid).toEqual([]);
  });

  it('Given maxRows limit, When mapping to heatmap grid, Then returns at most maxRows rows', () => {
    // When
    const grid = mapToHeatmapGrid(mockAnalytics, 2);

    // Then
    expect(grid).toHaveLength(2); // Limited to 2 rows
  });
});

// ============================================================================
// mapToDepthOrder
// ============================================================================

describe('mapToDepthOrder', () => {
  it('Given valid analytics data, When mapping to depth order, Then returns groups sorted by depth', () => {
    // When
    const groups = mapToDepthOrder(mockAnalytics);

    // Then
    expect(groups).toHaveLength(3); // 3 depth levels (0, 1, 2)
    expect(groups[0].depth).toBe(0);
    expect(groups[0].items).toHaveLength(1); // 1 prop at depth 0
    expect(groups[1].depth).toBe(1);
    expect(groups[1].items).toHaveLength(2); // 2 props at depth 1
    expect(groups[2].depth).toBe(2);
    expect(groups[2].items).toHaveLength(1); // 1 prop at depth 2
  });

  it('Given null analytics data, When mapping to depth order, Then returns empty array', () => {
    // When
    const groups = mapToDepthOrder(null);

    // Then
    expect(groups).toEqual([]);
  });

  it('Given analytics with empty depthOrder, When mapping, Then returns empty array', () => {
    // Given
    const data: AnalyticsData = { ...mockAnalytics, depthOrder: [] };

    // When
    const groups = mapToDepthOrder(data);

    // Then
    expect(groups).toEqual([]);
  });

  it('Given depth order with custom depth labels, When mapping, Then labels are assigned correctly', () => {
    // When
    const groups = mapToDepthOrder(mockAnalytics);

    // Then
    expect(groups[0].label).toBe('前置基础');
    expect(groups[1].label).toBe('第一梯队：核心入口');
    expect(groups[2].label).toBe('第二梯队：深度优化');
  });
});

// ============================================================================
// mapToEvalBreakdown
// ============================================================================

describe('mapToEvalBreakdown', () => {
  it('Given valid analytics data, When mapping to eval breakdown, Then returns rows sorted by total descending', () => {
    // When
    const rows = mapToEvalBreakdown(mockAnalytics);

    // Then
    expect(rows).toHaveLength(2);
    expect(rows[0].total).toBeGreaterThanOrEqual(rows[1].total);
    expect(rows[0].id).toBe('RW-P2'); // total=9
    expect(rows[1].id).toBe('RW-P1'); // total=8
  });

  it('Given null analytics data, When mapping to eval breakdown, Then returns empty array', () => {
    // When
    const rows = mapToEvalBreakdown(null);

    // Then
    expect(rows).toEqual([]);
  });

  it('Given valid data, When mapping, Then segments have correct percentage values', () => {
    // When
    const rows = mapToEvalBreakdown(mockAnalytics);

    // Then
    const firstRow = rows[0];
    expect(firstRow.segments).toHaveLength(4); // 4 dimensions
    const totalPct = firstRow.segments.reduce((sum, s) => sum + s.pct, 0);
    expect(totalPct).toBeGreaterThan(0);
    expect(totalPct).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// mapToLayerDist
// ============================================================================

describe('mapToLayerDist', () => {
  it('Given valid analytics data, When mapping to layer dist, Then returns groups in canonical order', () => {
    // When
    const groups = mapToLayerDist(mockAnalytics);

    // Then
    expect(groups).toHaveLength(2);
    expect(groups[0].layer).toBe('浏览器层');
    expect(groups[1].layer).toBe('网络层');
    expect(groups[0].caps).toHaveLength(1);
  });

  it('Given null analytics data, When mapping to layer dist, Then returns empty array', () => {
    // When
    const groups = mapToLayerDist(null);

    // Then
    expect(groups).toEqual([]);
  });
});

// ============================================================================
// mapToBatchInfo
// ============================================================================

describe('mapToBatchInfo', () => {
  it('Given valid analytics data, When mapping to batch info, Then returns batches in order', () => {
    // When
    const batches = mapToBatchInfo(mockAnalytics);

    // Then
    expect(batches).toHaveLength(2);
    expect(batches[0].batch).toBe(1);
    expect(batches[1].batch).toBe(2);
  });

  it('Given null analytics data, When mapping to batch info, Then returns empty array', () => {
    // When
    const batches = mapToBatchInfo(null);

    // Then
    expect(batches).toEqual([]);
  });
});

// ============================================================================
// mapToMatrixPoints
// ============================================================================

describe('mapToMatrixPoints', () => {
  const mockProps = [
    { id: 'RW-P1', name: 'Test Prop 1', role: 'core', priority: 'high', difficulty: 'high', score: 8 },
    { id: 'RW-P2', name: 'Test Prop 2', role: 'premise', priority: 'medium', difficulty: 'medium', score: 5 },
  ];

  it('Given valid props, When mapping to matrix points, Then returns points with x/y percentages', () => {
    // When
    const points = mapToMatrixPoints(mockProps);

    // Then
    expect(points).toHaveLength(2);
    expect(points[0].x).toBeGreaterThan(0);
    expect(points[0].x).toBeLessThanOrEqual(100);
    expect(points[0].y).toBeGreaterThan(0);
    expect(points[0].y).toBeLessThanOrEqual(100);
  });

  it('Given null props, When mapping to matrix points, Then returns empty array', () => {
    // When
    const points = mapToMatrixPoints(null);

    // Then
    expect(points).toEqual([]);
  });

  it('Given high difficulty prop, When mapping, Then x is in right half (high difficulty → right)', () => {
    // When
    const points = mapToMatrixPoints([mockProps[0]]);

    // Then
    expect(points[0].x).toBeGreaterThan(50);
  });

  it('Given medium difficulty prop, When mapping, Then x is in left half', () => {
    // When
    const points = mapToMatrixPoints([mockProps[1]]);

    // Then
    expect(points[0].x).toBeLessThan(50);
  });
});

// ============================================================================
// mapToPoolRows
// ============================================================================

describe('mapToPoolRows', () => {
  const mockProps = [
    { id: 'RW-P1', name: 'Prop 1', priority: 'high', difficulty: 'high', score: 8, caps: 9, role: 'core' },
  ];

  it('Given valid props and eval breakdown, When mapping, Then returns rows with recOrder', () => {
    // Given
    const evalBreakdown = [
      { id: 'RW-P1', name: 'Prop 1', total: 8, cross_stack: 2, doc_vacuum: 3, experience: 2, heat: 1, rec_order: 1 },
    ];

    // When
    const rows = mapToPoolRows(mockProps, evalBreakdown);

    // Then
    expect(rows).toHaveLength(1);
    expect(rows[0].recOrder).toBe(1);
  });

  it('Given null props, When mapping, Then returns empty array', () => {
    // When
    const rows = mapToPoolRows(null, null);

    // Then
    expect(rows).toEqual([]);
  });

  it('Given props without matching eval, When mapping, Then recOrder is null', () => {
    // When
    const rows = mapToPoolRows(mockProps, []);

    // Then
    expect(rows[0].recOrder).toBeNull();
  });
});

// ============================================================================
// mapToInsights
// ============================================================================

describe('mapToInsights', () => {
  it('Given valid analytics and prop count, When mapping, Then returns 4 insight cards', () => {
    // When
    const insights = mapToInsights(mockAnalytics, 3);

    // Then
    expect(insights).toHaveLength(4);
    expect(insights[0].icon).toBeDefined();
    expect(insights[0].title).toBeDefined();
    expect(insights[0].text).toBeDefined();
  });

  it('Given null analytics, When mapping, Then returns empty array', () => {
    // When
    const insights = mapToInsights(null, 0);

    // Then
    expect(insights).toEqual([]);
  });
});
