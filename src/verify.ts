import type {
    SourceFailRule,
    SourceVerifyRule,
} from 'skillnomad';

export const verify = {
    file: (ref: string, description: string): SourceVerifyRule => ({
        type: 'file-exists',
        ref,
        description,
    }),
    json: (ref: string, description: string): SourceVerifyRule => ({
        type: 'json-parse',
        ref,
        description,
    }),
    schema: (ref: string, description: string): SourceVerifyRule => ({
        type: 'schema',
        ref,
        description,
    }),
    field: (ref: string, description: string): SourceVerifyRule => ({
        type: 'field',
        ref,
        description,
    }),
    count: (description: string): SourceVerifyRule => ({
        type: 'count',
        description,
    }),
    command: (description: string): SourceVerifyRule => ({
        type: 'command',
        description,
    }),
};

export const fail = {
    retry: (on: string, then: string): SourceFailRule => ({
        on,
        behavior: 'retry',
        then,
    }),
    degrade: (on: string, then: string): SourceFailRule => ({
        on,
        behavior: 'degrade',
        then,
    }),
    skip: (on: string, then: string): SourceFailRule => ({
        on,
        behavior: 'skip',
        then,
    }),
    halt: (on: string, then: string): SourceFailRule => ({
        on,
        behavior: 'halt',
        then,
    }),
    checkpoint: (on: string, then: string): SourceFailRule => ({
        on,
        behavior: 'checkpoint',
        then,
    }),
};
