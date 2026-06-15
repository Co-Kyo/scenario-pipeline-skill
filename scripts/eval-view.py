"""
eval-view 生成器
从 evaluations.json + requirement-web.json 生成独立 HTML 可视化页面，无外部依赖。

用法：python eval-view.py <evaluations.json> <requirement-web.json> [output.html]
"""
import json, sys

HTML_TEMPLATE = r'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>命题评估</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Segoe UI','PingFang SC',sans-serif;background:#0d1117;color:#c9d1d9;overflow-x:hidden}
.hdr{padding:20px 28px;border-bottom:1px solid #21262d;display:flex;align-items:center;gap:14px}
.hdr h1{font-size:18px;font-weight:600}
.hdr .m{color:#8b949e;font-size:12px;margin-left:auto}
.tabs{display:flex;gap:0;border-bottom:1px solid #21262d;padding:0 28px}
.tab{padding:11px 18px;cursor:pointer;color:#8b949e;font-size:13px;border-bottom:2px solid transparent;transition:all .2s;user-select:none}
.tab:hover{color:#c9d1d9}
.tab.on{color:#58a6ff;border-bottom-color:#58a6ff;font-weight:500}
.pnl{display:none;padding:20px 28px}.pnl.on{display:block}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}
.sc{background:#161b22;border:1px solid #21262d;border-radius:8px;padding:14px}
.sc .l{font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:.5px}
.sc .v{font-size:26px;font-weight:700;margin-top:3px}
/* Table */
.tbl{width:100%;border-collapse:collapse;font-size:12px}
.tbl th{text-align:left;padding:10px 12px;background:#161b22;border-bottom:2px solid #21262d;color:#8b949e;font-weight:600;position:sticky;top:0;z-index:1;cursor:pointer;user-select:none}
.tbl th:hover{color:#58a6ff}
.tbl th.sorted-asc::after{content:' ↑';color:#58a6ff}
.tbl th.sorted-desc::after{content:' ↓';color:#58a6ff}
.tbl td{padding:10px 12px;border-bottom:1px solid #21262d;vertical-align:middle}
.tbl tr:hover{background:#161b22}
.tbl tr.rejected{opacity:.45}
.tier{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;vertical-align:middle}
.tier-h{background:#f0883e}.tier-m{background:#58a6ff}.tier-r{background:#484f58}
.pid{font-weight:600;color:#58a6ff}
.pname{max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.score-bar{display:flex;gap:2px;align-items:center}
.sb{width:28px;height:18px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#fff}
.sb-1{background:#238636}.sb-2{background:#58a6ff}.sb-3{background:#da3633}
.total{font-weight:700;font-size:14px}
.total-h{color:#f0883e}.total-m{color:#58a6ff}.total-r{color:#484f58}
.pri{padding:3px 8px;border-radius:10px;font-size:10px;font-weight:500}
.pri-high{background:rgba(240,136,62,.15);color:#f0883e}
.pri-medium{background:rgba(88,166,255,.15);color:#58a6ff}
.pri-rejected{background:rgba(72,79,88,.15);color:#484f58}
.diff{padding:3px 8px;border-radius:10px;font-size:10px;font-weight:500}
.diff-low{background:rgba(63,185,80,.15);color:#3fb950}
.diff-medium{background:rgba(210,153,34,.15);color:#d29922}
.diff-high{background:rgba(218,54,51,.15);color:#da3633}
.diff-none{color:#484f58}
.order{font-weight:700;color:#58a6ff;font-size:14px}
/* Filter bar */
.fbar{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center}
.fbtn{padding:6px 14px;border-radius:16px;font-size:12px;cursor:pointer;border:1px solid #30363d;background:#161b22;color:#8b949e;transition:all .2s;user-select:none}
.fbtn:hover{border-color:#58a6ff;color:#c9d1d9}
.fbtn.on{background:rgba(88,166,255,.15);border-color:#58a6ff;color:#58a6ff}
.fbtn .cnt{font-weight:700;margin-left:4px}
/* Radar */
.radar-wrap{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin-top:16px}
.rcard{background:#161b22;border:1px solid #21262d;border-radius:8px;padding:16px;width:320px}
.rcard h4{font-size:13px;margin-bottom:10px;color:#58a6ff}
.rcard .rd-row{display:flex;align-items:center;gap:8px;margin:5px 0;font-size:12px}
.rcard .rd-label{width:60px;color:#8b949e;text-align:right;flex-shrink:0}
.rcard .rd-bar{flex:1;height:14px;background:#21262d;border-radius:3px;overflow:hidden}
.rcard .rd-fill{height:100%;border-radius:3px}
.rcard .rd-val{width:20px;font-weight:600;font-size:11px}
/* Detail panel */
.det{display:none;position:fixed;bottom:0;left:0;right:0;background:#161b22;border-top:1px solid #30363d;padding:16px 28px;z-index:100;max-height:40vh;overflow-y:auto}
.det.on{display:block}
.det-close{position:absolute;top:10px;right:16px;cursor:pointer;color:#484f58;font-size:18px}
.det-close:hover{color:#c9d1d9}
.det h3{font-size:15px;color:#58a6ff;margin-bottom:6px}
.det .dd{font-size:12px;color:#8b949e;line-height:1.6;margin-bottom:10px}
.det .dg{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px}
.det .dc{background:#0d1117;border:1px solid #21262d;border-radius:6px;padding:8px 12px}
.det .dc .dk{font-size:10px;color:#8b949e;text-transform:uppercase}
.det .dc .dv{font-size:15px;font-weight:600;margin-top:2px}
.det .dtrace{font-size:11px;color:#6e7681;border-top:1px solid #21262d;padding-top:8px;margin-top:8px}
</style>
</head>
<body>
<div class="hdr">
  <h1>📋 命题评估</h1>
  <span class="m hdr-time"></span>
</div>
<div class="tabs" id="tabs">
  <div class="tab on" data-p="table">📊 评估表</div>
  <div class="tab" data-p="radar">🎯 四维雷达</div>
  <div class="tab" data-p="order">🛤️ 学习顺序</div>
</div>
<div class="pnl on" id="p-table">
  <div class="stats" id="stats"></div>
  <div class="fbar" id="fbar"></div>
  <div style="overflow-x:auto"><table class="tbl" id="tbl"><thead><tr>
    <th data-col="order">#</th><th data-col="id">命题</th><th data-col="cross">跨栈</th><th data-col="doc">文档</th><th data-col="exp">经验</th><th data-col="heat">热度</th><th data-col="total">总分</th><th data-col="priority">优先级</th><th data-col="difficulty">难度</th>
  </tr></thead><tbody id="tbody"></tbody></table></div>
</div>
<div class="pnl" id="p-radar"><div class="radar-wrap" id="radar"></div></div>
<div class="pnl" id="p-order"><div id="orderlist"></div></div>
<div class="det" id="det"><span class="det-close" id="detclose">×</span><div id="detinner"></div></div>
<script>
const E=__EVALS__;
const R=__REQ__;
const pm=R.propositions||[];
const pMap={};pm.forEach(function(p){pMap[p.id]=p});
const evs=E.evaluations||[];
// Stats
(function(){
  var h=evs.filter(function(e){return e.priority==='high'}).length;
  var m=evs.filter(function(e){return e.priority==='medium'}).length;
  var r=evs.filter(function(e){return e.priority==='rejected'}).length;
  var avg=(evs.reduce(function(s,e){return s+e.total_score},0)/evs.length).toFixed(1);
  var dl={};evs.forEach(function(e){if(e.difficulty){dl[e.difficulty]=(dl[e.difficulty]||0)+1}});
  var cs=[['命题总数',evs.length,''],['入池 high',h,''],['待确认 medium',m,''],['排除 rejected',r,''],['平均分',avg,''],['🟢 low',dl.low||0,''],['🟡 medium',dl.medium||0,''],['🔴 high',dl.high||0,'']];
  var sh='';cs.forEach(function(c){sh+='<div class="sc"><div class="l">'+c[0]+'</div><div class="v '+c[2]+'">'+c[1]+'</div></div>'});
  document.getElementById('stats').innerHTML=sh;
  document.querySelector('.hdr-time').textContent='generated: '+(E.generated_at||'')+' · '+evs.length+' propositions';
})();
// Filter bar
var activeFilter='all';
function renderFbar(){
  var counts={all:evs.length,high:0,medium:0,rejected:0};
  evs.forEach(function(e){counts[e.priority]=(counts[e.priority]||0)+1});
  var html='<div class="fbtn '+(activeFilter==='all'?'on':'')+'" data-f="all">全部<span class="cnt">'+counts.all+'</span></div>';
  html+='<div class="fbtn '+(activeFilter==='high'?'on':'')+'" data-f="high">✅ high<span class="cnt">'+counts.high+'</span></div>';
  html+='<div class="fbtn '+(activeFilter==='medium'?'on':'')+'" data-f="medium">⏳ medium<span class="cnt">'+(counts.medium||0)+'</span></div>';
  html+='<div class="fbtn '+(activeFilter==='rejected'?'on':'')+'" data-f="rejected">❌ rejected<span class="cnt">'+(counts.rejected||0)+'</span></div>';
  document.getElementById('fbar').innerHTML=html;
}
renderFbar();
document.getElementById('fbar').addEventListener('click',function(e){
  var btn=e.target.closest('.fbtn');if(!btn)return;
  activeFilter=btn.dataset.f;renderFbar();renderTable();
});
// Table
var sortCol='order',sortDir='asc';
function renderTable(){
  var sorted=evs.slice();
  if(sortCol==='order'||sortCol==='total'||sortCol==='cross'||sortCol==='doc'||sortCol==='exp'||sortCol==='heat'){
    var key=sortCol==='order'?'recommended_order':sortCol==='total'?'total_score':sortCol==='cross'?'cross_stack_coupling':sortCol==='doc'?'doc_vacuum':sortCol==='exp'?'experience_barrier':'topical_heat';
    sorted.sort(function(a,b){
      var va=sortCol==='order'?a.recommended_order:a.scores[key]||0;
      var vb=sortCol==='order'?b.recommended_order:b.scores[key]||0;
      if(sortCol==='total'){va=a.total_score;vb=b.total_score}
      if(sortCol==='id'){va=a.proposition_id;vb=b.proposition_id;return sortDir==='asc'?va.localeCompare(vb):vb.localeCompare(va)}
      return sortDir==='asc'?va-vb:vb-va;
    });
  } else if(sortCol==='id'){
    sorted.sort(function(a,b){return sortDir==='asc'?a.proposition_id.localeCompare(b.proposition_id):b.proposition_id.localeCompare(a.proposition_id)});
  } else if(sortCol==='priority'){
    var pw={high:3,medium:2,rejected:1};
    sorted.sort(function(a,b){return sortDir==='asc'?pw[a.priority]-pw[b.priority]:pw[b.priority]-pw[a.priority]});
  } else if(sortCol==='difficulty'){
    var dw={high:3,medium:2,low:1};
    sorted.sort(function(a,b){var da=dw[a.difficulty]||0,db=dw[b.difficulty]||0;return sortDir==='asc'?da-db:db-da});
  }
  if(activeFilter!=='all')sorted=sorted.filter(function(e){return e.priority===activeFilter});
  var html='';
  sorted.forEach(function(e){
    var s=e.scores;
    var rc=e.priority==='high'?'':e.priority==='medium'?'':'rejected';
    var tc=e.priority==='high'?'total-h':e.priority==='medium'?'total-m':'total-r';
    var d=e.difficulty||'none';
    html+='<tr class="'+rc+'" data-id="'+e.proposition_id+'" style="cursor:pointer">';
    html+='<td class="order">'+(e.recommended_order||'—')+'</td>';
    html+='<td><span class="tier tier-'+(e.priority==='high'?'h':e.priority==='medium'?'m':'r')+'"></span><span class="pid">'+e.proposition_id+'</span></td>';
    html+='<td class="pname" title="'+e.proposition+'">'+e.proposition+'</td>';
    html+='<td><div class="score-bar"><div class="sb sb-'+s.cross_stack_coupling+'">'+s.cross_stack_coupling+'</div></div></td>';
    html+='<td><div class="score-bar"><div class="sb sb-'+s.doc_vacuum+'">'+s.doc_vacuum+'</div></div></td>';
    html+='<td><div class="score-bar"><div class="sb sb-'+s.experience_barrier+'">'+s.experience_barrier+'</div></div></td>';
    html+='<td><div class="score-bar"><div class="sb sb-'+s.topical_heat+'">'+s.topical_heat+'</div></div></td>';
    html+='<td><span class="total '+tc+'">'+e.total_score+'</span></td>';
    html+='<td><span class="pri pri-'+e.priority+'">'+e.priority+'</span></td>';
    html+='<td><span class="diff diff-'+d+'">'+(d==='none'?'—':d)+'</span></td>';
    html+='</tr>';
  });
  document.getElementById('tbody').innerHTML=html;
}
renderTable();
// Sort
document.querySelectorAll('.tbl th').forEach(function(th){
  th.addEventListener('click',function(){
    var col=th.dataset.col;if(!col)return;
    if(sortCol===col){sortDir=sortDir==='asc'?'desc':'asc'}else{sortCol=col;sortDir='asc'}
    document.querySelectorAll('.tbl th').forEach(function(x){x.classList.remove('sorted-asc','sorted-desc')});
    th.classList.add(sortDir==='asc'?'sorted-asc':'sorted-desc');
    renderTable();
  });
});
// Row click → detail
document.getElementById('tbody').addEventListener('click',function(e){
  var tr=e.target.closest('tr');if(!tr)return;
  var id=tr.dataset.id;showDetail(id);
});
function showDetail(id){
  var ev=evs.find(function(e){return e.proposition_id===id});if(!ev)return;
  var pr=pMap[id]||{};
  var s=ev.scores;
  var html='<h3>'+ev.proposition_id+' — '+ev.proposition+'</h3>';
  html+='<div class="dd">'+(pr.description||'')+'</div>';
  html+='<div class="dg">';
  html+='<div class="dc"><div class="dk">跨栈耦合</div><div class="dv" style="color:'+(s.cross_stack_coupling>=3?'#da3633':s.cross_stack_coupling>=2?'#58a6ff':'#3fb950')+'">'+s.cross_stack_coupling+'/3</div></div>';
  html+='<div class="dc"><div class="dk">文档真空</div><div class="dv" style="color:'+(s.doc_vacuum>=3?'#da3633':s.doc_vacuum>=2?'#58a6ff':'#3fb950')+'">'+s.doc_vacuum+'/3</div></div>';
  html+='<div class="dc"><div class="dk">经验壁垒</div><div class="dv" style="color:'+(s.experience_barrier>=3?'#da3633':s.experience_barrier>=2?'#58a6ff':'#3fb950')+'">'+s.experience_barrier+'/3</div></div>';
  html+='<div class="dc"><div class="dk">时事热度</div><div class="dv" style="color:'+(s.topical_heat>=3?'#da3633':s.topical_heat>=2?'#58a6ff':'#3fb950')+'">'+s.topical_heat+'/3</div></div>';
  html+='<div class="dc"><div class="dk">总分</div><div class="dv" style="color:'+(ev.total_score>=8?'#f0883e':ev.total_score>=6?'#58a6ff':'#484f58')+'">'+ev.total_score+'/12</div></div>';
  html+='<div class="dc"><div class="dk">优先级</div><div class="dv"><span class="pri pri-'+ev.priority+'">'+ev.priority+'</span></div></div>';
  html+='<div class="dc"><div class="dk">难度</div><div class="dv"><span class="diff diff-'+(ev.difficulty||'none')+'">'+(ev.difficulty||'—')+'</span></div></div>';
  html+='</div>';
  html+='<div class="dtrace">评分依据：'+ev.priority_trace+'</div>';
  if(ev.difficulty_reason)html+='<div class="dtrace">难度依据：'+ev.difficulty_reason+'</div>';
  if(ev.reasoning)html+='<div class="dtrace">分析：'+ev.reasoning+'</div>';
  document.getElementById('detinner').innerHTML=html;
  document.getElementById('det').classList.add('on');
}
document.getElementById('detclose').addEventListener('click',function(){document.getElementById('det').classList.remove('on')});
// Tabs
document.getElementById('tabs').addEventListener('click',function(e){
  var t=e.target.closest('.tab');if(!t)return;
  document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('on')});
  document.querySelectorAll('.pnl').forEach(function(x){x.classList.remove('on')});
  t.classList.add('on');
  document.getElementById('p-'+t.dataset.p).classList.add('on');
  document.getElementById('det').classList.remove('on');
});
// Radar
(function(){
  var dims=['cross_stack_coupling','doc_vacuum','experience_barrier','topical_heat'];
  var dimNames=['跨栈耦合','文档真空','经验壁垒','时事热度'];
  var dimColors=['#f0883e','#58a6ff','#da3633','#3fb950'];
  var html='';
  evs.forEach(function(ev){
    if(ev.priority==='rejected')return;
    var s=ev.scores;
    html+='<div class="rcard"><h4>'+ev.proposition_id+' '+ev.proposition.slice(0,25)+'</h4>';
    dims.forEach(function(d,i){
      var val=s[d];var pct=(val/3*100).toFixed(0);
      html+='<div class="rd-row"><div class="rd-label">'+dimNames[i]+'</div><div class="rd-bar"><div class="rd-fill" style="width:'+pct+'%;background:'+dimColors[i]+'"></div></div><div class="rd-val">'+val+'</div></div>';
    });
    html+='<div style="text-align:right;font-size:11px;color:#8b949e;margin-top:6px">总分 '+ev.total_score+'/12</div></div>';
  });
  document.getElementById('radar').innerHTML=html;
})();
// Learning order
(function(){
  var sorted=evs.filter(function(e){return e.priority!=='rejected'}).sort(function(a,b){return a.recommended_order-b.recommended_order});
  var html='<div style="margin-bottom:10px;color:#8b949e;font-size:12px">按推荐学习顺序排列：🟢 low → 🟡 medium → 🔴 high</div>';
  sorted.forEach(function(ev){
    var d=ev.difficulty||'none';
    html+='<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#161b22;border:1px solid #21262d;border-radius:6px;margin:4px 0;cursor:pointer" onclick="showDetail(\''+ev.proposition_id+'\')">';
    html+='<span class="order">'+ev.recommended_order+'</span>';
    html+='<span class="diff diff-'+d+'">'+(d==='none'?'—':d)+'</span>';
    html+='<span class="pid">'+ev.proposition_id+'</span>';
    html+='<span style="flex:1;font-size:12px;color:#c9d1d9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+ev.proposition+'</span>';
    html+='<span class="total total-'+(ev.priority==='high'?'h':'m')+'">'+ev.total_score+'</span>';
    html+='</div>';
  });
  document.getElementById('orderlist').innerHTML=html;
})();
</script>
</body>
</html>'''


def generate_view(evals_path, req_path, html_path=None):
    with open(evals_path, 'r', encoding='utf-8') as f:
        evals = json.load(f)
    with open(req_path, 'r', encoding='utf-8') as f:
        req = json.load(f)

    if not html_path:
        html_path = evals_path.replace('.json', '-view.html')

    evals_str = json.dumps(evals, ensure_ascii=False)
    req_str = json.dumps(req, ensure_ascii=False)
    html = HTML_TEMPLATE.replace('__EVALS__', evals_str).replace('__REQ__', req_str)

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)

    return html_path, len(html)


if __name__ == '__main__':
    evals_path = sys.argv[1] if len(sys.argv) > 1 else input('evaluations.json path: ').strip()
    req_path = sys.argv[2] if len(sys.argv) > 2 else input('requirement-web.json path: ').strip()
    html_path = sys.argv[3] if len(sys.argv) > 3 else None
    out, size = generate_view(evals_path, req_path, html_path)
    print(f'Generated: {out} ({size} bytes)')
