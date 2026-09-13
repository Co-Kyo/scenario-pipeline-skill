import type {
    NextAction,
    SourceAction,
    SourceFlow,
} from 'skillnomad';

export function agentAction(
    verb: NextAction,
    id: string,
    label: string,
    content: string,
    timeout = 5,
): SourceAction {
    return {
        id,
        label,
        verb,
        actor: 'agent',
        content,
        timeout,
    };
}

export function doAction(
    verb: NextAction,
    id: string,
    label: string,
    content: string,
    timeout = 5,
): SourceFlow {
    return {
        kind: 'do',
        task: agentAction(verb, id, label, content, timeout),
    };
}
