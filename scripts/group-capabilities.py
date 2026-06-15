#!/usr/bin/env python3
"""按技术层分组能力，生成研究批次与执行顺序。

用法:
    python group-capabilities.py <workDir> [--cap N]

读取: .meta/capability-graph.json
写入: .meta/research-grouping.json
"""
import json, os, sys
from collections import defaultdict

def main():
    if len(sys.argv) < 2:
        print(f'Usage: {sys.argv[0]} <workDir> [--cap N]')
        sys.exit(1)
    workDir = sys.argv[1]
    cap_size = 5
    if '--cap' in sys.argv:
        cap_size = int(sys.argv[sys.argv.index('--cap') + 1])

    with open(os.path.join(workDir, '.meta', 'capability-graph.json'), 'r', encoding='utf-8') as f:
        cg = json.load(f)

    caps = cg['capabilities']
    dep_graph = cg.get('dependency_graph', {})

    # Group by layer
    layer_groups = defaultdict(list)
    for c in caps:
        layer_groups[c['layer']].append(c['id'])

    # Split into sub-groups of CAP size
    groups = []
    for layer, ids in sorted(layer_groups.items(), key=lambda x: -len(x[1])):
        for i in range(0, len(ids), cap_size):
            sub = ids[i:i+cap_size]
            groups.append({
                'id': f'{layer[:2]}_{len(groups)+1}',
                'layer': layer,
                'capabilities': sub,
                'depends_on': []
            })

    # Cross-group dependencies
    for g in groups:
        g_cap_set = set(g['capabilities'])
        for cid in g['capabilities']:
            for d in dep_graph.get(cid, []):
                for other in groups:
                    if d in other['capabilities'] and other['id'] != g['id']:
                        if other['id'] not in g['depends_on']:
                            g['depends_on'].append(other['id'])

    # Execution batches (topological sort)
    in_degree = {g['id']: 0 for g in groups}
    for g in groups:
        for dep in g['depends_on']:
            in_degree[g['id']] += 1

    batches = []
    remaining = [g['id'] for g in groups]
    completed = set()
    while remaining:
        batch = [gid for gid in remaining if all(d in completed for d in next(g['depends_on'] for g in groups if g['id'] == gid))]
        if not batch:
            print('WARNING: Circular dependency detected, breaking')
            batch = remaining[:1]
        batches.append(batch)
        completed.update(batch)
        remaining = [gid for gid in remaining if gid not in completed]

    output = {
        'groups': groups,
        'batches': batches,
        'total_capabilities': len(caps),
        'total_groups': len(groups)
    }

    with open(os.path.join(workDir, '.meta', 'research-grouping.json'), 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f'Groups: {len(groups)}, Batches: {len(batches)}, Capabilities: {len(caps)}')

if __name__ == '__main__':
    main()
