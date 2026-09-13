import type {
    SourceCheckpoint,
    SourcePolicies,
} from 'skillnomad';

export const policies: SourcePolicies = {
    contextIsolation: true,
    reuseByFileExistence: true,
    checkpointRequired: true,
    traceFields: [
        'year_inference_trace',
        'source_tier',
        'dependencies_trace',
        'merge_trace',
        'split_trace',
        'priority_trace',
        '筛选_trace',
    ],
    runtimeTrace: {
        enabled: true,
        logDir: '{workDir}/.meta/run',
        eventTypes: [
            'step_start',
            'step_end',
            'file_written',
            'validation_failed',
            'validation_passed',
            'retry',
            'degrade',
            'fallback',
            'self_corrected',
            'reuse_skipped',
            'barrier_rejected',
            'barrier_confirmed',
            'user_modified',
            'task_timeout',
            'task_failed',
            'judgment_passed',
            'judgment_failed',
            'judgment_stuck',
        ],
    },
};

export function barrier(
    checkItems: string[],
    clarifyPrompt: string,
): SourceCheckpoint {
    return {
        checkItems,
        clarifyPrompt,
        onConfirm: 'continue',
        onReject: 'rollback',
    };
}
