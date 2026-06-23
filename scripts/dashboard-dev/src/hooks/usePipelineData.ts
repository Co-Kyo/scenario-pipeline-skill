import { useMemo } from 'react';
import type { PipelineData } from '../types/pipeline-data';

/**
 * Hook: usePipelineData
 *
 * Reads the raw data injected via window.__PIPELINE_DATA__ and returns
 * a type-safe PipelineData object. Returns null when no data is available
 * (skeleton/empty state), which causes all view components to render EmptyState.
 *
 * The raw data may be:
 * - null (dev mode or empty workDir)
 * - A valid PipelineData object (injected by build-dashboard.js)
 * - A partially valid object (early pipeline steps with null fields)
 *
 * This hook performs validation and returns null if the data is structurally invalid.
 */
export function usePipelineData(rawData: unknown): PipelineData | null {
  return useMemo(() => {
    if (rawData === null || rawData === undefined) {
      return null;
    }

    // Basic structural validation — ensure required top-level fields exist
    const obj = rawData as Record<string, unknown>;
    if (typeof obj !== 'object' || obj === null) {
      return null;
    }

    // If the object has a 'meta' field, treat it as a valid PipelineData
    if (!('meta' in obj) || !('progress' in obj)) {
      return null;
    }

    // Ensure decisionPanels defaults to empty array for backward compatibility
    if (!('decisionPanels' in obj)) {
      (obj as Record<string, unknown>).decisionPanels = [];
    }

    return rawData as PipelineData;
  }, [rawData]);
}
