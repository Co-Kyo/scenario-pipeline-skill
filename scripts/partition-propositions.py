#!/usr/bin/env python3
"""命题依赖分析、连通分量检测、Session分区。

用法:
    python partition-propositions.py <workDir>

读取: .meta/requirement-web.json
写入: .meta/partition-analysis.json, execution-plan.md, .meta/checkpoints/barrier-1.md
"""
import json, os, sys
from collections import deque
from datetime import datetime, timezone, timedelta

def main():
    if len(sys.argv) < 2:
        print(f'Usage: {sys.argv[0]} <workDir>')
        sys.exit(1)
    workDir = sys.argv[1]

    with open(os.path.join(workDir, '.meta', 'requirement-web.json'), 'r', encoding='utf-8') as f:
        req = json.load(f)

    props = req['propositions']
    prop_map = {p['id']: p for p in props}
    deps_raw = req.get('dependencies', {})

    # DAG edges (shared_capabilities >= 3)
    edges = []
    for prop_a, rels in deps_raw.items():
        for rel in rels:
            prop_b = rel['proposition']
            sc = len(rel.get('shared_capabilities', []))
            if sc >= 3:
                edges.append({'from': prop_a, 'to': prop_b, 'weight': round(sc / 15.0, 2), 'type': 'related'})

    # Connected components
    all_nodes = [p['id'] for p in props]
    graph = {n: set() for n in all_nodes}
    for e in edges:
        graph.setdefault(e['from'], set()).add(e['to'])
        graph.setdefault(e['to'], set()).add(e['from'])

    visited = set()
    components = []
    for n in all_nodes:
        if n in visited:
            continue
        q = deque([n])
        comp = []
        while q:
            cur = q.popleft()
            if cur in visited:
                continue
            visited.add(cur)
            comp.append(cur)
            for nb in graph.get(cur, set()):
                if nb not in visited:
                    q.append(nb)
        components.append(sorted(comp))

    # Topological depth
    depths = {}
    for p in props:
        role = p['level_weight']['role']
        if role == 'premise':
            depths[p['id']] = 0
        elif role == 'outlook':
            depths[p['id']] = 3
        else:
            has_premise_dep = False
            for rel in deps_raw.get(p['id'], []):
                rp = prop_map.get(rel['proposition'])
                if rp and rp['level_weight']['role'] == 'premise' and len(rel.get('shared_capabilities', [])) >= 2:
                    has_premise_dep = True
                    break
            has_core_dep = False
            for rel in deps_raw.get(p['id'], []):
                rp = prop_map.get(rel['proposition'])
                if rp and rp['level_weight']['role'] == 'core' and len(rel.get('shared_capabilities', [])) >= 5:
                    has_core_dep = True
                    break
            if has_premise_dep:
                depths[p['id']] = 1
            elif has_core_dep:
                depths[p['id']] = 2
            else:
                depths[p['id']] = 1

    # Session split: largest core-containing component = S1
    best_comp = max(components, key=lambda c: sum(1 for p in c if p in prop_map and prop_map[p]['level_weight']['role'] == 'core'))
    current_ids = set(best_comp)
    deferred_ids = set()
    for comp in components:
        if comp != best_comp:
            deferred_ids.update(comp)

    # Scan batches by depth
    current_by_depth = {}
    for pid in current_ids:
        d = depths.get(pid, 0)
        current_by_depth.setdefault(d, []).append(pid)

    scan_batches = []
    for d in sorted(current_by_depth.keys()):
        pids = sorted(current_by_depth[d])
        scan_batches.append({
            'batch_id': f'S1-B{len(scan_batches)+1}',
            'proposition_ids': pids,
            'parallelizable': len(pids) >= 2,
            'depth': d
        })

    # Component data
    comp_data = []
    for i, comp in enumerate(components):
        is_cur = any(p in current_ids for p in comp)
        cl = {}
        for pid in comp:
            d = depths[pid]
            cl.setdefault(d, []).append(pid)
        dls = [{'depth': d, 'node_ids': sorted(cl[d]), 'parallelizable': len(cl[d]) >= 2} for d in sorted(cl.keys())]
        comp_data.append({
            'component_id': f'C{i+1}',
            'node_ids': comp,
            'session_id': 'S1' if is_cur else f'S{i+1}',
            'depth_layers': dls
        })

    def_sessions = []
    for i, comp in enumerate(components):
        if any(p in deferred_ids for p in comp):
            def_sessions.append({
                'session_id': f'S{i+1}',
                'component_ids': [f'C{i+1}'],
                'proposition_ids': comp,
                'reason': '与主链路无直接依赖，可独立执行'
            })

    now = datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds')
    partition = {
        'generated_at': now,
        'total_propositions': len(props),
        'dag': {
            'nodes': [{'id': p['id'], 'name': p['name'], 'depth': depths[p['id']], 'role': p['level_weight']['role'], 'component_id': 'C1' if p['id'] in current_ids else 'C2'} for p in props],
            'edges': edges
        },
        'components': comp_data,
        'current_session': {
            'session_id': 'S1',
            'component_ids': [c['component_id'] for c in comp_data if c['session_id'] == 'S1'],
            'proposition_ids': sorted(current_ids),
            'execution_order': [{'depth': d, 'proposition_ids': sorted(current_by_depth[d])} for d in sorted(current_by_depth.keys())],
            'scan_batches': scan_batches
        },
        'deferred_sessions': def_sessions,
        'partition_stats': {
            'method': 'connected_components + topological_depth',
            'num_components': len(components),
            'num_batches': len(scan_batches)
        }
    }

    with open(os.path.join(workDir, '.meta', 'partition-analysis.json'), 'w', encoding='utf-8') as f:
        json.dump(partition, f, ensure_ascii=False, indent=2)

    # Checkpoint
    os.makedirs(os.path.join(workDir, '.meta', 'checkpoints'), exist_ok=True)
    with open(os.path.join(workDir, '.meta', 'checkpoints', 'barrier-1.md'), 'w', encoding='utf-8') as f:
        f.write(f'# barrier-1: Partition确认\n\n- 时间：{now}\n- 阶段：Step 1 分区完成\n- 成分量：{len(components)}，本次S1：{len(current_ids)}命题\n')

    print(f'Components: {len(components)}, S1: {len(current_ids)} props, Deferred: {len(deferred_ids)} props')
    print(f'Batches: {len(scan_batches)}')

if __name__ == '__main__':
    main()
