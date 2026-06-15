#!/usr/bin/env python3
"""生成整合看板 HTML（内容内嵌版）。

把所有阅读产出（overview / edge-cases / trade-offs / references / learning-ladder）
内嵌在单一 HTML 页面中。实验保持外链。
"""
import json, os, sys, re, html as html_mod
from datetime import datetime, timezone, timedelta

# ── Minimal Markdown → HTML ──────────────────────────────────────────
def md_to_html(text):
    lines = text.split('\n'); out = []; i = 0
    in_ul = False; in_ol = False; in_table = False; th_done = False

    def close_list():
        nonlocal in_ul, in_ol
        if in_ul: out.append('</ul>'); in_ul = False
        if in_ol: out.append('</ol>'); in_ol = False

    def close_table():
        nonlocal in_table, th_done
        if in_table: out.append('</tbody></table>'); in_table = False; th_done = False

    def inl(t):
        t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
        t = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img src="\2" alt="\1" style="max-width:100%">', t)
        t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2" target="_blank">\1</a>', t)
        t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
        t = re.sub(r'__(.+?)__', r'<strong>\1</strong>', t)
        t = re.sub(r'\*(.+?)\*', r'<em>\1</em>', t)
        t = re.sub(r'_(.+?)_', r'<em>\1</em>', t)
        return t

    while i < len(lines):
        line = lines[i]
        if line.strip().startswith('```'):
            close_list(); close_table()
            code_lines = []; i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(html_mod.escape(lines[i])); i += 1
            i += 1
            out.append('<pre><code>' + ''.join(code_lines) + '</code></pre>'); continue
        if re.match(r'^(\*{3,}|-{3,}|_{3,})\s*$', line.strip()):
            close_list(); close_table(); out.append('<hr>'); i += 1; continue
        m = re.match(r'^(#{1,6})\s+(.+)', line)
        if m:
            close_list(); close_table()
            out.append('<h%d>%s</h%d>' % (len(m.group(1)), inl(m.group(2)), len(m.group(1))))
            i += 1; continue
        if '|' in line and line.strip().startswith('|'):
            if not in_table:
                close_list(); in_table = True; th_done = False; out.append('<table><thead>')
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if re.match(r'^[\s|:-]+$', line.strip()):
                out.append('</thead><tbody>'); th_done = True; i += 1; continue
            tag = 'td' if th_done else 'th'
            out.append('<tr>' + ''.join('<%s>%s</%s>' % (tag, inl(c), tag) for c in cells) + '</tr>')
            i += 1; continue
        else:
            close_table()
        if line.strip().startswith('>'):
            close_list()
            out.append('<blockquote>' + inl(line.strip()[1:].strip()) + '</blockquote>')
            i += 1; continue
        m = re.match(r'^(\s*)([-*+])\s+(.+)', line)
        if m:
            close_table()
            if not in_ul: close_list(); out.append('<ul>'); in_ul = True
            out.append('<li>' + inl(m.group(3)) + '</li>'); i += 1; continue
        m = re.match(r'^(\s*)\d+[.)]\s+(.+)', line)
        if m:
            close_table()
            if not in_ol: close_list(); out.append('<ol>'); in_ol = True
            out.append('<li>' + inl(m.group(2)) + '</li>'); i += 1; continue
        if not line.strip():
            close_list(); i += 1; continue
        close_list()
        para = []
        while i < len(lines) and lines[i].strip() and \
              not lines[i].strip().startswith('#') and \
              not lines[i].strip().startswith('```') and \
              not (lines[i].strip().startswith('|') and '|' in lines[i]) and \
              not re.match(r'^(\*{3,}|-{3,}|_{3,})', lines[i].strip()):
            para.append(lines[i]); i += 1
        if para: out.append('<p>' + inl(' '.join(para)) + '</p>')
    close_list(); close_table()
    return '\n'.join(out)


# ── Build JS code as standalone string (no escaping issues) ──────────
def build_js(props_data, analytics_html):
    # Use JSON.parse to safely handle JSON with special chars (like semicolons in strings)
    props_js = json.dumps(props_data, ensure_ascii=False)
    ah_js = json.dumps(analytics_html, ensure_ascii=False)

    lines = []
    # Use template literals + JSON.parse to safely embed JSON with special chars
    lines.append('const P = JSON.parse(`%s`);' % props_js.replace('`', '\\`').replace('$', '\\$'))
    lines.append('const AH = `%s`;' % ah_js.replace('`', '\\`').replace('$', '\\$'))

    lines.append("""
function filterSidebar(q){
  q=q.toLowerCase();
  document.querySelectorAll('.sidebar-item[data-pid]').forEach(function(el){
    el.style.display=el.textContent.toLowerCase().indexOf(q)>=0?'':'none';
  });
}

function showAnalytics(){
  document.getElementById('landingView').style.display='none';
  document.getElementById('propView').style.display='none';
  document.getElementById('analyticsView').style.display='';
  document.getElementById('analyticsView').innerHTML=AH;
  document.querySelectorAll('.sidebar-item').forEach(function(el){el.classList.remove('active')});
  var btn=document.querySelector('.sidebar-item[data-action="analytics"]');
  if(btn)btn.classList.add('active');
}

function showProposition(pid){
  var p=P[pid];if(!p)return;
  document.getElementById('landingView').style.display='none';
  document.getElementById('analyticsView').style.display='none';
  var pv=document.getElementById('propView');pv.style.display='';
  document.querySelectorAll('.sidebar-item').forEach(function(el){el.classList.remove('active')});
  var si=document.querySelector('.sidebar-item[data-pid="'+pid+'"]');
  if(si)si.classList.add('active');
  var tabs=[
    {id:'overview',l:'\U0001f4c4 \u6982\u8FF0',k:'overview'},
    {id:'edge',l:'\u26a1 \u8FB9\u754Ccase',k:'edge_cases'},
    {id:'tradeoffs',l:'\u2696\ufe0f \u6743\u8861',k:'tradeoffs'},
    {id:'refs',l:'\U0001f4da \u53C2\u8003',k:'references'},
    {id:'ladder',l:'\U0001fa9c \u5B66\u4E60\u9636\u68AF',k:'ladder'}
  ];
  var h='<h2>'+p.name+'</h2>';
  h+='<div style="margin-bottom:16px">';
  h+='<span class="badge badge-'+p.priority+'">'+p.priority+'</span> ';
  h+='<span class="badge badge-'+p.role+'">'+p.role+'</span> ';
  h+='<span style="color:var(--text2);font-size:13px">\u8BC4\u5206 '+p.score+' \u00b7 \u80FD\u529B '+p.cap_count+'</span>';
  if(p.has_experiment)h+=' <a href="'+p.dir+'/experiment/src/index.html" target="_blank" class="badge badge-core" style="text-decoration:none">\U0001f9ea \u6253\u5F00\u5B9E\u9A8C</a>';
  h+='</div><div class="prop-tabs">';
  tabs.forEach(function(t,i){
    h+='<div class="prop-tab'+(i===0?' active':'')+'" data-tab="'+t.id+'" onclick="switchPropTab(this)">'+t.l+'</div>';
  });
  h+='</div>';
  tabs.forEach(function(t,i){
    h+='<div class="prop-tab-content'+(i===0?' active':'')+'" id="ptab-'+t.id+'">'+(p.content[t.k]||'<p style="color:var(--text2)">\u6682\u65E0\u5185\u5BB9</p>')+'</div>';
  });
  pv.innerHTML=h;
  pv.scrollIntoView({behavior:'smooth',block:'start'});
}

function switchPropTab(el){
  var tid=el.getAttribute('data-tab');
  var container=el.parentElement.parentElement;
  container.querySelectorAll('.prop-tab').forEach(function(t){t.classList.remove('active')});
  el.classList.add('active');
  container.querySelectorAll('.prop-tab-content').forEach(function(c){c.classList.remove('active')});
  var target=document.getElementById('ptab-'+tid);
  if(target)target.classList.add('active');
}""")
    return '\n'.join(lines)


# ── HTML template (built as list to avoid % formatting issues) ───────
def build_html(parts):
    """parts is a dict with keys matching the template."""
    return """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>""" + parts['title'] + """</title>
<style>
:root{--bg:#0a0a0f;--surface:#12121a;--surface2:#1a1a25;--border:#2a2a3a;--text:#e8e8f0;--text2:#8888a0;--accent:#6c5ce7;--accent2:#a29bfe;--green:#00b894;--yellow:#fdcb6e;--red:#e17055;--blue:#74b9ff}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.6}
h1{font-size:28px;font-weight:700;margin-bottom:8px}
.subtitle{color:var(--text2);font-size:14px;margin-bottom:32px}
h2{font-size:22px;font-weight:700;margin:32px 0 16px;color:var(--accent2)}
h3{font-size:18px;font-weight:600;margin:24px 0 12px}
h4{font-size:15px;font-weight:600;margin:16px 0 8px}
p{margin:8px 0}
a{color:var(--accent2);text-decoration:none}a:hover{text-decoration:underline}
code{background:var(--surface2);padding:2px 6px;border-radius:4px;font-size:13px;font-family:'SF Mono','Fira Code',monospace}
pre{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px;overflow-x:auto;margin:12px 0}
pre code{background:none;padding:0}
blockquote{border-left:3px solid var(--accent);padding:8px 16px;margin:12px 0;color:var(--text2);background:var(--surface);border-radius:0 8px 8px 0}
table{width:100%;border-collapse:collapse;font-size:14px;margin:12px 0}
th{text-align:left;padding:10px 14px;background:var(--surface2);color:var(--text2);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
td{padding:10px 14px;border-top:1px solid var(--border)}tr:hover{background:var(--surface2)}
ul,ol{margin:8px 0 8px 24px}li{margin:4px 0}
hr{border:none;border-top:1px solid var(--border);margin:24px 0}
img{max-width:100%;border-radius:8px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px}
.stat-value{font-size:28px;font-weight:700;color:var(--accent2)}
.stat-label{font-size:12px;color:var(--text2);margin-top:4px}
.layout{display:flex;gap:0;min-height:calc(100vh - 200px)}
.sidebar{width:280px;flex-shrink:0;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;position:sticky;top:24px;max-height:calc(100vh - 48px);overflow-y:auto}
.sidebar h3{font-size:14px;color:var(--text2);margin:16px 0 8px;text-transform:uppercase;letter-spacing:.5px}
.sidebar-item{display:block;padding:8px 12px;border-radius:6px;color:var(--text);font-size:13px;cursor:pointer;transition:all .15s;text-decoration:none;margin-bottom:2px}
.sidebar-item:hover{background:var(--surface2);text-decoration:none}
.sidebar-item.active{background:var(--accent);color:#fff}
.sidebar-item .seq{color:var(--text2);font-size:11px;margin-right:6px}
.sidebar-item.active .seq{color:rgba(255,255,255,.7)}
.content{flex:1;min-width:0;padding-left:24px}
.prop-tabs{display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:20px;flex-wrap:wrap}
.prop-tab{padding:8px 16px;cursor:pointer;color:var(--text2);font-size:13px;font-weight:500;border-bottom:2px solid transparent;transition:all .15s}
.prop-tab:hover{color:var(--text)}.prop-tab.active{color:var(--accent2);border-bottom-color:var(--accent)}
.prop-tab-content{display:none}.prop-tab-content.active{display:block}
.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}
.badge-high{background:rgba(225,112,85,.15);color:var(--red)}
.badge-medium{background:rgba(253,203,110,.15);color:var(--yellow)}
.badge-core{background:rgba(108,92,231,.15);color:var(--accent2)}
.badge-premise{background:rgba(116,185,255,.15);color:var(--blue)}
.badge-outlook{background:rgba(253,203,110,.15);color:var(--yellow)}
.overview-table{width:100%;border-collapse:collapse;font-size:14px}
.overview-table th{text-align:left;padding:12px;background:var(--surface2);color:var(--text2);font-size:12px;text-transform:uppercase}
.overview-table td{padding:12px;border-top:1px solid var(--border)}
.overview-table tr:hover{background:var(--surface2);cursor:pointer}
.chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}
.chart-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px}
.chart-title{font-size:14px;font-weight:600;margin-bottom:12px}
.bar-row{display:flex;align-items:center;margin-bottom:6px}
.bar-label{width:100px;font-size:12px;color:var(--text2);flex-shrink:0}
.bar-track{flex:1;height:20px;background:var(--surface2);border-radius:4px;overflow:hidden}
.bar-fill{height:100%;border-radius:4px;display:flex;align-items:center;padding-left:6px;font-size:11px;font-weight:600;color:#fff;min-width:20px}
.bar-fill.purple{background:var(--accent)}.bar-fill.green{background:var(--green)}
.bar-fill.yellow{background:var(--yellow);color:#333}.bar-fill.red{background:var(--red)}
.bar-fill.blue{background:var(--blue);color:#333}
.search-box{width:100%;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;margin-bottom:12px}
.search-box:focus{outline:none;border-color:var(--accent)}
@media(max-width:900px){.layout{flex-direction:column}.sidebar{width:100%;position:static;max-height:none}.content{padding-left:0;padding-top:16px}}
</style>
</head>
<body>
<div class="container">
<h1>""" + parts['header'] + """</h1>
<div class="subtitle">""" + parts['subtitle'] + """</div>
<div class="stats">""" + parts['stats'] + """</div>
</div>
<div class="layout">
<div class="sidebar">
<input type="text" class="search-box" placeholder="\u641C\u7D22\u547D\u9898..." oninput="filterSidebar(this.value)">
<h3>\u547D\u9898\u5217\u8868</h3>
""" + parts['sidebar'] + """
<h3>\u6570\u636E\u5206\u6790</h3>
<a class="sidebar-item" data-action="analytics" onclick="showAnalytics()">\U0001f4c8 \u7EDF\u8BA1\u603B\u89C8</a>
</div>
<div class="content" id="mainContent">
<div id="landingView">
<h2>\u547D\u9898\u603B\u89C8</h2>
<table class="overview-table"><thead><tr><th>#</th><th>\u547D\u9898</th><th>\u89D2\u8272</th><th>\u4F18\u5148\u7EA7</th><th>\u96BE\u5EA6</th><th>\u8BC4\u5206</th><th>\u80FD\u529B\u6570</th><th>\u5B9E\u9A8C</th></tr></thead><tbody>
""" + parts['overview_rows'] + """
</tbody></table>
""" + parts['charts'] + """
</div>
<div id="propView" style="display:none"></div>
<div id="analyticsView" style="display:none"></div>
</div>
</div>
<script>
""" + parts['js'] + """
</script>
</body></html>"""


# ── Main ─────────────────────────────────────────────────────────────
def main():
    if len(sys.argv) < 2:
        print('Usage: gen-dashboard.py <workDir>'); sys.exit(1)
    workDir = sys.argv[1]

    with open(os.path.join(workDir, '.meta', 'evaluations.json'), 'r', encoding='utf-8') as f:
        evals = json.load(f)
    with open(os.path.join(workDir, '.meta', 'capability-graph.json'), 'r', encoding='utf-8') as f:
        cg = json.load(f)
    with open(os.path.join(workDir, '.meta', 'requirement-web.json'), 'r', encoding='utf-8') as f:
        req = json.load(f)

    prop_meta = {p['id']: p for p in req.get('propositions', [])}
    prop_dirs = sorted([d for d in os.listdir(workDir) if d.startswith('P') and os.path.isdir(os.path.join(workDir, d))])
    pid_to_dir = {}
    for d in prop_dirs:
        pid_to_dir['RW-' + d.split('-')[0]] = d

    total_caps = len(cg['capabilities'])
    total_props = len(prop_dirs)
    high_c = evals['summary'].get('high', 0)
    med_c = evals['summary'].get('medium', 0)
    rej_c = evals['summary'].get('rejected', 0)

    layer_counts = {}
    for c in cg['capabilities']:
        ly = c.get('layer', 'unknown')
        layer_counts[ly] = layer_counts.get(ly, 0) + 1

    rows = []
    for e in evals['evaluations']:
        pid = e['proposition_id']
        seq = pid.replace('RW-', '')
        dname = pid_to_dir.get(pid, '')
        pm = prop_meta.get(pid, {})
        caps = pm.get('capability_ids', [])
        role = pm.get('level_weight', {}).get('role', '-')
        level = pm.get('level_weight', {}).get('level', '-')
        name = e.get('proposition', pm.get('name', pid))
        bd = os.path.join(workDir, dname) if dname else ''

        def read_md(rel):
            fp = os.path.join(bd, rel) if bd else ''
            if fp and os.path.exists(fp):
                with open(fp, 'r', encoding='utf-8') as f: return f.read()
            return ''

        ov = read_md('overview.md')
        ec = read_md('edge-cases.md')
        to = read_md('trade-offs.md')
        rf = read_md('references.md')
        lb = read_md('learning-ladder.md')
        has_exp = os.path.exists(os.path.join(bd, 'experiment', 'src', 'index.html')) if bd else False

        rows.append({
            'pid': pid, 'seq': seq, 'name': name, 'dir': dname,
            'role': role, 'level': level,
            'priority': e.get('priority', '-'), 'difficulty': e.get('difficulty', '-'),
            'score': e.get('total_score', 0), 'order': e.get('recommended_order', 0),
            'caps': caps, 'cap_count': len(caps),
            'has_experiment': has_exp,
            'content': {'overview': ov, 'edge_cases': ec, 'tradeoffs': to, 'references': rf, 'ladder': lb}
        })

    rows.sort(key=lambda x: (x['order'] if x['order'] else 999, x['pid']))
    now = datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M')
    cols = ['purple', 'blue', 'green', 'yellow', 'red']

    # ── Props data for JS ─────────────────────────────────────────────
    props_data = {}
    for r in rows:
        ch = {}
        for k, md in r['content'].items():
            ch[k] = md_to_html(md) if md else ''
        props_data[r['pid']] = {
            'id': r['pid'], 'name': r['name'], 'dir': r['dir'],
            'role': r['role'], 'level': r['level'], 'priority': r['priority'],
            'difficulty': r.get('difficulty'), 'score': r['score'],
            'caps': r['caps'], 'cap_count': r['cap_count'],
            'has_experiment': r['has_experiment'], 'content': ch,
        }

    # ── Analytics HTML ────────────────────────────────────────────────
    mx = max(high_c, med_c, rej_c, 1)
    mxl = max(layer_counts.values()) if layer_counts else 1
    mxc = max((r['cap_count'] for r in rows), default=1)

    ah = ['<h2>\U0001f4c8 \u6570\u636E\u5206\u6790</h2><div class="chart-grid">']
    ah.append('<div class="chart-card"><div class="chart-title">\u4F18\u5148\u7EA7\u5206\u5E03</div>')
    for label, key, col in [('\u9AD8\u4F18\u5148\u7EA7', high_c, 'red'), ('\u4E2D\u4F18\u5148\u7EA7', med_c, 'yellow'), ('\u672A\u5165\u6C60', rej_c, 'purple')]:
        pct = int(key/mx*100)
        ah.append('<div class="bar-row"><div class="bar-label">%s</div><div class="bar-track"><div class="bar-fill %s" style="width:%d%%">%d</div></div></div>' % (label, col, pct, key))
    ah.append('</div><div class="chart-card"><div class="chart-title">\u80FD\u529B\u5C42\u7EA7\u5206\u5E03</div>')
    for idx, (ly, cnt) in enumerate(sorted(layer_counts.items(), key=lambda x: -x[1])):
        pct = int(cnt/mxl*100)
        ah.append('<div class="bar-row"><div class="bar-label">%s</div><div class="bar-track"><div class="bar-fill %s" style="width:%d%%">%d</div></div></div>' % (html_mod.escape(ly), cols[idx%5], pct, cnt))
    ah.append('</div></div><div class="chart-grid"><div class="chart-card"><div class="chart-title">\u547D\u9898\u80FD\u529B\u6570\u91CF</div>')
    for r in rows:
        pct = int(r['cap_count']/mxc*100)
        ah.append('<div class="bar-row"><div class="bar-label" style="width:60px;font-size:11px">%s</div><div class="bar-track" style="height:16px"><div class="bar-fill blue" style="width:%d%%;font-size:10px">%d</div></div></div>' % (r['seq'], pct, r['cap_count']))
    ah.append('</div><div class="chart-card"><div class="chart-title">\u89D2\u8272\u5206\u5E03</div>')
    rc = {}
    for r in rows: rc[r['role']] = rc.get(r['role'], 0) + 1
    mxr = max(rc.values()) if rc else 1
    rcl = {'core': 'purple', 'premise': 'blue', 'outlook': 'yellow'}
    for rl, cnt in sorted(rc.items(), key=lambda x: -x[1]):
        pct = int(cnt/mxr*100)
        ah.append('<div class="bar-row"><div class="bar-label">%s</div><div class="bar-track"><div class="bar-fill %s" style="width:%d%%">%d</div></div></div>' % (html_mod.escape(rl), rcl.get(rl, 'purple'), pct, cnt))
    ah.append('</div></div>')
    analytics_html = ''.join(ah)

    # ── Sidebar & overview rows ──────────────────────────────────────
    sidebar_items = []
    overview_rows = []
    for i, r in enumerate(rows):
        pc = 'badge-' + r['priority'] if r['priority'] != 'rejected' else ''
        rc2 = 'badge-' + r['role'] if r['role'] in ('core', 'premise', 'outlook') else ''
        exp = ('<a href="%s/experiment/src/index.html" target="_blank">\U0001f9ea</a>' % r['dir']) if r['has_experiment'] else '-'
        sidebar_items.append('<a class="sidebar-item" data-pid="%s" onclick="showProposition(\'%s\')"><span class="seq">%s</span>%s <span class="badge %s">%s</span></a>' % (r['pid'], r['pid'], r['seq'], html_mod.escape(r['name']), pc, r['priority']))
        overview_rows.append('<tr onclick="showProposition(\'%s\')"><td>%d</td><td><strong>%s</strong></td><td><span class="badge %s">%s</span></td><td><span class="badge %s">%s</span></td><td>%s</td><td>%d</td><td>%d</td><td>%s</td></tr>' % (r['pid'], i+1, html_mod.escape(r['name']), rc2, r['role'], pc, r['priority'], r['difficulty'] or '-', r['score'], r['cap_count'], exp))

    # ── Charts on landing view ──────────────────────────────────────
    landing_charts = '<div class="chart-grid"><div class="chart-card"><div class="chart-title">\u4F18\u5148\u7EA7\u5206\u5E03</div>'
    for label, key, col in [('\u9AD8\u4F18\u5148\u7EA7', high_c, 'red'), ('\u4E2D\u4F18\u5148\u7EA7', med_c, 'yellow'), ('\u672A\u5165\u6C60', rej_c, 'purple')]:
        pct = int(key/mx*100)
        landing_charts += '<div class="bar-row"><div class="bar-label">%s</div><div class="bar-track"><div class="bar-fill %s" style="width:%d%%">%d</div></div></div>' % (label, col, pct, key)
    landing_charts += '</div><div class="chart-card"><div class="chart-title">\u80FD\u529B\u5C42\u7EA7\u5206\u5E03</div>'
    for idx, (ly, cnt) in enumerate(sorted(layer_counts.items(), key=lambda x: -x[1])):
        pct = int(cnt/mxl*100)
        landing_charts += '<div class="bar-row"><div class="bar-label">%s</div><div class="bar-track"><div class="bar-fill %s" style="width:%d%%">%d</div></div></div>' % (html_mod.escape(ly), cols[idx%5], pct, cnt)
    landing_charts += '</div></div>'

    # ── Stats cards ───────────────────────────────────────────────────
    stats = ''
    stats += '<div class="stat-card"><div class="stat-value">%d</div><div class="stat-label">\u603B\u547D\u9898\u6570</div></div>' % total_props
    stats += '<div class="stat-card"><div class="stat-value">%d</div><div class="stat-label">\u539F\u5B50\u80FD\u529B</div></div>' % total_caps
    stats += '<div class="stat-card"><div class="stat-value" style="color:var(--red)">%d</div><div class="stat-label">\u9AD8\u4F18\u5148\u7EA7</div></div>' % high_c
    stats += '<div class="stat-card"><div class="stat-value" style="color:var(--yellow)">%d</div><div class="stat-label">\u4E2D\u4F18\u5148\u7EA7</div></div>' % med_c
    stats += '<div class="stat-card"><div class="stat-value" style="color:var(--text2)">%d</div><div class="stat-label">\u672A\u5165\u6C60</div></div>' % rej_c

    # ── Assemble ─────────────────────────────────────────────────────
    js_code = build_js(props_data, analytics_html)
    rocket = '\U0001f680'
    dot = '\u00b7'

    parts = {
        'title': '\u6027\u80FD\u573A\u666F\u5206\u6790\u9898 - \u6574\u5408\u770B\u677F',
        'header': rocket + ' \u6027\u80FD\u573A\u666F\u5206\u6790\u9898 ' + dot + ' \u6574\u5408\u770B\u677F',
        'subtitle': '前端性能场景 L2 (3-5年) ' + dot + ' {} 命题 '.format(total_props) + dot + ' {} 能力 '.format(total_caps) + dot + ' 生成于 {}'.format(now),
        'stats': stats,
        'sidebar': ''.join(sidebar_items),
        'overview_rows': ''.join(overview_rows),
        'charts': landing_charts,
        'js': js_code,
    }

    html = build_html(parts)
    out_path = os.path.join(workDir, 'dashboard.html')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print('dashboard.html written (%s bytes)' % '{:,}'.format(os.path.getsize(out_path)))

if __name__ == '__main__':
    main()
