#!/usr/bin/env python3
"""评估命题优先级与难度。

用法:
    python evaluate-propositions.py <workDir>

读取: .meta/requirement-web.json, .meta/capability-graph.json
写入: .meta/evaluations.json
"""
import json, os, sys
from datetime import datetime, timezone, timedelta

def main():
    if len(sys.argv) < 2:
        print(f'Usage: {sys.argv[0]} <workDir>')
        sys.exit(1)
    workDir = sys.argv[1]

    with open(os.path.join(workDir, '.meta', 'requirement-web.json'), 'r', encoding='utf-8') as f:
        req = json.load(f)
    with open(os.path.join(workDir, '.meta', 'capability-graph.json'), 'r', encoding='utf-8') as f:
        cg = json.load(f)

    cap_map = {c['id']: c for c in cg['capabilities']}
    dep_graph = cg.get('dependency_graph', {})

    def max_dep_depth(cap_ids):
        depths = {}
        def depth(cid, visited):
            if cid in visited:
                return 0
            visited.add(cid)
            deps = dep_graph.get(cid, [])
            if not deps:
                depths[cid] = 0
                return 0
            d = 1 + max(depth(d, visited) for d in deps)
            depths[cid] = d
            return d
        for cid in cap_ids:
            depth(cid, set())
        return max(depths.values()) if depths else 0

    def get_layers(cap_ids):
        layers = set()
        for cid in cap_ids:
            c = cap_map.get(cid)
            if c:
                layers.add(c['layer'])
        return layers

    evaluations = []
    for p in req['propositions']:
        pid = p['id']
        name = p['name']
        cap_ids = p.get('capability_ids', [])
        role = p.get('level_weight', {}).get('role', 'unknown')
        layers = get_layers(cap_ids)
        num_layers = len(layers)
        dep_depth = max_dep_depth(cap_ids)

        cross_stack = 3 if num_layers >= 4 else (2 if num_layers >= 2 else 1)
        doc_vacuum = 2 if role == 'core' else (1 if role == 'premise' else 2)
        exp_barrier = 3 if (dep_depth >= 3 or num_layers >= 4) else (2 if (dep_depth >= 2 or num_layers >= 3) else 1)
        topical_heat = 2 if role in ('core', 'outlook') else 1
        total = cross_stack + doc_vacuum + exp_barrier + topical_heat

        scores = [cross_stack, doc_vacuum, exp_barrier, topical_heat]
        if all(s >= 2 for s in scores):
            scores[2] = max(1, scores[2] - 1)
            total = sum(scores)

        if total >= 6:
            priority = 'high'
        elif total == 5:
            priority = 'medium'
        else:
            priority = 'high' if role == 'core' else 'rejected'

        if dep_depth <= 1:
            difficulty = 'low'
        elif dep_depth == 2:
            difficulty = 'medium'
        else:
            difficulty = 'high'

        evaluations.append({
            'proposition_id': pid,
            'proposition': name,
            'scores': {
                'cross_stack_coupling': cross_stack,
                'doc_vacuum': doc_vacuum,
                'experience_barrier': exp_barrier,
                'topical_heat': topical_heat
            },
            'total_score': total,
            'priority': priority,
            'priority_trace': f'总分{total}（跨栈{cross_stack}+文档{doc_vacuum}+经验{exp_barrier}+热度{topical_heat}），L2阈值≥6→{priority}',
            'reasoning': f'涉及{num_layers}个技术层（{", ".join(sorted(layers))}），依赖链深度{dep_depth}',
            'difficulty': difficulty if priority == 'high' else None,
            'difficulty_reason': f'依赖链深度{dep_depth}层' if priority == 'high' else None,
            'recommended_order': 0,
            'prerequisite_of': []
        })

    evaluations.sort(key=lambda x: (-{'high': 2, 'medium': 1, 'rejected': 0}.get(x['priority'], 0), -x['total_score']))
    order = 1
    for e in evaluations:
        if e['priority'] != 'rejected':
            e['recommended_order'] = order
            order += 1

    summary = {
        'high': sum(1 for e in evaluations if e['priority'] == 'high'),
        'medium': sum(1 for e in evaluations if e['priority'] == 'medium'),
        'rejected': sum(1 for e in evaluations if e['priority'] == 'rejected')
    }

    now = datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds')
    output = {'generated_at': now, 'evaluations': evaluations, 'summary': summary}

    with open(os.path.join(workDir, '.meta', 'evaluations.json'), 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f'High: {summary["high"]}, Medium: {summary["medium"]}, Rejected: {summary["rejected"]}')

if __name__ == '__main__':
    main()
