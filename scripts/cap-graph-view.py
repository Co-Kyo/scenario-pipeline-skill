"""
capability-graph-view 生成器
从 capability-graph.json 生成独立 HTML 可视化页面，无外部依赖。

用法：python cap-graph-view.py <input.json> [output.html]
"""
import json, sys

HTML_TEMPLATE = r'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>能力图谱</title>
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
.v.t1{color:#f0883e}.v.t2{color:#58a6ff}.v.t3{color:#3fb950}
#net{width:100%;height:600px;background:#161b22;border:1px solid #21262d;border-radius:8px;position:relative;overflow:hidden}
#net svg{width:100%;height:100%}
.nlbl{font-size:9px;fill:#c9d1d9;pointer-events:none;text-anchor:middle}
.lnk{stroke:#30363d;stroke-opacity:.5}
.lgd{position:absolute;top:10px;right:10px;background:rgba(22,27,34,.92);border:1px solid #21262d;border-radius:6px;padding:10px 12px;font-size:11px}
.lgdi{display:flex;align-items:center;gap:7px;margin:3px 0}
.lgd-d{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.br{display:flex;align-items:center;margin:2px 0;font-size:12px;cursor:pointer}
.br:hover .bl{color:#58a6ff}
.bl{width:240px;text-align:right;padding-right:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#c9d1d9;flex-shrink:0}
.bt{flex:1;height:20px;background:#21262d;border-radius:3px;overflow:hidden}
.bf{height:100%;border-radius:3px;transition:width .5s;display:flex;align-items:center;padding-left:7px;font-size:10px;font-weight:500;color:#fff;min-width:24px}
.bf.t1{background:linear-gradient(90deg,#f0883e,#da3633)}.bf.t2{background:linear-gradient(90deg,#58a6ff,#1f6feb)}.bf.t3{background:linear-gradient(90deg,#3fb950,#238636)}.bf.na{background:#30363d}
.bv{width:50px;text-align:right;color:#8b949e;font-size:10px;flex-shrink:0;padding-left:6px}
.pn{background:#161b22;border:1px solid #30363d;border-radius:6px;padding:7px 10px;font-size:11px;cursor:pointer;transition:all .2s;white-space:nowrap}
.pn:hover{border-color:#58a6ff;background:#1c2333}
.pn.t1{border-left:3px solid #f0883e}.pn.t2{border-left:3px solid #58a6ff}.pn.t3{border-left:3px solid #3fb950}
.pn .pi{font-weight:600;color:#58a6ff}.pn .pn2{color:#c9d1d9;margin-left:3px}
.pa{color:#30363d;font-size:14px}
.lgr{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
.lc{background:#161b22;border:1px solid #21262d;border-radius:8px;padding:12px}
.lc .ln{font-size:12px;font-weight:600;margin-bottom:6px}
.lc .lcnt{font-size:22px;font-weight:700;color:#58a6ff}
.lc .lcs{font-size:10px;color:#8b949e;margin-top:5px;line-height:1.5}
.tip{position:fixed;background:#1c2333;border:1px solid #30363d;border-radius:7px;padding:10px 14px;font-size:11px;pointer-events:none;z-index:100;max-width:360px;box-shadow:0 4px 12px rgba(0,0,0,.4);display:none}
.tip b{color:#58a6ff;display:block;margin-bottom:4px;font-size:13px}
.det{display:none;padding:0 28px 20px}
.detb{background:#161b22;border:1px solid #21262d;border-radius:8px;padding:16px 20px}
.detb h3{font-size:15px;margin-bottom:10px;color:#58a6ff}
.detb .d{color:#8b949e;line-height:1.6;margin-bottom:10px;font-size:13px}
.detb .tags{display:flex;flex-wrap:wrap;gap:5px}
.detb .tag{background:#21262d;border-radius:10px;padding:2px 9px;font-size:10px;color:#8b949e}
.detb .refs{margin-top:10px}
.detb .refs a{color:#58a6ff;text-decoration:none;font-size:11px;display:block;margin:2px 0}
.detb .refs a:hover{text-decoration:underline}
.detb .dep{color:#8b949e;font-size:11px;margin-bottom:8px}
</style>
</head>
<body>
<div class="hdr">
  <h1>🔗 能力图谱</h1>
  <span class="hdr-sub"></span>
  <span class="m hdr-time"></span>
</div>
<div class="tabs" id="tabs">
  <div class="tab on" data-p="overview">📊 概览</div>
  <div class="tab" data-p="network">🕸️ 依赖网络</div>
  <div class="tab" data-p="fanout">📈 扇出度</div>
  <div class="tab" data-p="path">🛤️ 学习路径</div>
  <div class="tab" data-p="layers">🧱 技术层</div>
</div>
<div class="pnl on" id="p-overview">
  <div class="stats" id="stats"></div>
  <div id="hgtbl"></div>
</div>
<div class="pnl" id="p-network"><div id="net"><div class="lgd" id="lgd"></div></div></div>
<div class="pnl" id="p-fanout"><div id="bars"></div></div>
<div class="pnl" id="p-path">
  <div style="margin-bottom:10px;color:#8b949e;font-size:12px">一级(橙) → 二级(蓝) → 三级(绿)，按战略高地优先+依赖拓扑排序</div>
  <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center" id="lpath"></div>
</div>
<div class="pnl" id="p-layers"><div class="lgr" id="lgrid"></div></div>
<div class="det" id="det"><div class="detb" id="detb"></div></div>
<div class="tip" id="tip"></div>
<script>
const D=__JSON_DATA__;
const CM={},HM={};
D.capabilities.forEach(function(c){CM[c.id]=c});
D.highgrounds.forEach(function(h){HM[h.capability_id]=h});
function tc(t){return t==='一级'?'#f0883e':t==='二级'?'#58a6ff':t==='三级'?'#3fb950':'#30363d'}
function tcl(t){return t==='一级'?'t1':t==='二级'?'t2':t==='三级'?'t3':'na'}
function tcs(t){return t==='一级'?'#f0883e':t==='二级'?'#58a6ff':t==='三级'?'#3fb950':'#484f58'}
function showDet(id){
  var c=CM[id];if(!c)return;var h=HM[id]||{};
  var rf=[...(c.references?.t0||[]),...(c.references?.t1||[]),...(c.references?.t2||[]),...(c.references?.anti_crawl||[])];
  var tier=h.tier||'none';
  document.getElementById('detb').innerHTML=
    '<h3>'+c.id+' — '+c.name+'</h3>'+
    '<div class="d">'+c.description+'</div>'+
    '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px">'+
    '<span style="color:#8b949e">层: <b style="color:'+tcs(tier)+'">'+c.layer+'</b></span>'+
    '<span style="color:#8b949e">扇出: <b style="color:#c9d1d9">'+c.fanout.ratio+'</b></span>'+
    '<span style="color:#8b949e">耦合: <b style="color:#c9d1d9">'+c.coupling+'</b></span>'+
    '<span style="color:#8b949e">等级: <b style="color:'+tc(tier)+'">'+(h.tier||'—')+'</b></span></div>'+
    (c.dependencies.length?'<div class="dep">前置依赖: '+c.dependencies.join(', ')+(c.dependencies_trace?'<br><span style="color:#6e7681">'+c.dependencies_trace+'</span>':'')+'</div>':'')+
    '<div class="tags">'+(c.tags||[]).map(function(t){return '<span class="tag">'+t+'</span>'}).join('')+'</div>'+
    (rf.length?'<div class="refs"><div style="color:#8b949e;font-size:11px;margin-bottom:3px">参考:</div>'+
    rf.map(function(r){return '<a href="'+r.url+'" target="_blank">['+(r.source||'scan')+'] '+(r.title||r.url.slice(0,60))+'</a>'}).join('')+'</div>':'');
  document.getElementById('det').style.display='block';
  document.getElementById('det').scrollIntoView({behavior:'smooth',block:'nearest'});
}
document.getElementById('tabs').addEventListener('click',function(e){
  var t=e.target.closest('.tab');if(!t)return;
  document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('on')});
  document.querySelectorAll('.pnl').forEach(function(x){x.classList.remove('on')});
  t.classList.add('on');
  document.getElementById('p-'+t.dataset.p).classList.add('on');
  document.getElementById('det').style.display='none';
  if(t.dataset.p==='network'&&!window._nr){renderNet();window._nr=1}
});
// Overview
(function(){
  var t1=D.highgrounds.filter(function(h){return h.tier==='一级'}).length;
  var t2=D.highgrounds.filter(function(h){return h.tier==='二级'}).length;
  var t3=D.highgrounds.filter(function(h){return h.tier==='三级'}).length;
  var af=(D.capabilities.reduce(function(s,c){return s+c.fanout.count},0)/D.capabilities.length).toFixed(1);
  var ly={};D.capabilities.forEach(function(c){ly[c.layer]=1});
  var cs=[['原子能力',D.capabilities.length,''],['覆盖命题',D.total_propositions,''],
    ['一级高地',t1,'t1'],['二级高地',t2,'t2'],['三级营地',t3,'t3'],
    ['平均扇出',af,''],['技术层',Object.keys(ly).length,'']];
  var sh='';cs.forEach(function(c){sh+='<div class="sc"><div class="l">'+c[0]+'</div><div class="v '+c[2]+'">'+c[1]+'</div></div>'});
  document.getElementById('stats').innerHTML=sh;
  document.querySelector('.hdr-sub').textContent=D.capabilities.length+' 能力 · '+D.total_propositions+' 命题';
  document.querySelector('.hdr-time').textContent='generated: '+(D.generated_at||'');
  var th='<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:10px"><thead><tr>'+
    '<th style="text-align:left;padding:10px 12px;border-bottom:2px solid #21262d;color:#8b949e">等级</th>'+
    '<th style="text-align:left;padding:10px 12px;border-bottom:2px solid #21262d;color:#8b949e">ID</th>'+
    '<th style="text-align:left;padding:10px 12px;border-bottom:2px solid #21262d;color:#8b949e">能力名称</th>'+
    '<th style="text-align:left;padding:10px 12px;border-bottom:2px solid #21262d;color:#8b949e">技术层</th>'+
    '<th style="text-align:left;padding:10px 12px;border-bottom:2px solid #21262d;color:#8b949e">扇出度</th>'+
    '<th style="text-align:right;padding:10px 12px;border-bottom:2px solid #21262d;color:#8b949e">战略价值</th></tr></thead><tbody>';
  D.highgrounds.slice().sort(function(a,b){return b.strategic_value-a.strategic_value}).forEach(function(x){
    var c=CM[x.capability_id]||{};
    th+='<tr style="cursor:pointer;border-bottom:1px solid #21262d" onmouseenter="showDet(\''+x.capability_id+'\')">'+
      '<td style="padding:10px 12px"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:'+tc(x.tier)+';margin-right:6px;vertical-align:middle"></span><span style="color:'+tc(x.tier)+'">'+x.tier+'</span></td>'+
      '<td style="padding:10px 12px;font-weight:600;color:#58a6ff">'+x.capability_id+'</td>'+
      '<td style="padding:10px 12px;color:#c9d1d9">'+x.capability_name+'</td>'+
      '<td style="padding:10px 12px;color:#8b949e">'+(c.layer||'')+'</td>'+
      '<td style="padding:10px 12px;color:#8b949e">'+x.fanout_ratio+'</td>'+
      '<td style="padding:10px 12px;text-align:right;color:#c9d1d9">'+x.strategic_value+'</td></tr>';
  });
  th+='</tbody></table>';
  document.getElementById('hgtbl').innerHTML=th;
})();
// Network
function renderNet(){
  var el=document.getElementById('net'),W=el.clientWidth,H=el.clientHeight;
  var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width',W);svg.setAttribute('height',H);el.appendChild(svg);
  var defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
  var mk=document.createElementNS('http://www.w3.org/2000/svg','marker');
  mk.setAttribute('id','arr');mk.setAttribute('viewBox','0 0 10 10');
  mk.setAttribute('refX','22');mk.setAttribute('refY','5');
  mk.setAttribute('markerWidth','5');mk.setAttribute('markerHeight','5');
  mk.setAttribute('orient','auto');
  var mp=document.createElementNS('http://www.w3.org/2000/svg','path');
  mp.setAttribute('d','M0,0 L10,5 L0,10 Z');mp.setAttribute('fill','#30363d');
  mk.appendChild(mp);defs.appendChild(mk);svg.appendChild(defs);
  var nodes=D.capabilities.map(function(c){return{id:c.id,name:c.name,layer:c.layer,
    fanout:c.fanout.count,coupling:c.coupling,
    tier:(HM[c.id]||{}).tier||'none',covers:c.covers,
    x:W/2+(Math.random()-.5)*300,y:H/2+(Math.random()-.5)*300,vx:0,vy:0}});
  var nodeMap={};nodes.forEach(function(n){nodeMap[n.id]=n});
  var links=[];
  D.capabilities.forEach(function(c){(c.dependencies||[]).forEach(function(d){if(nodeMap[d])links.push({s:nodeMap[d],t:nodeMap[c.id]})})});
  var R=function(n){return 5+n.fanout*2.2};
  for(var i=0;i<300;i++){
    var alpha=Math.max(0.001,1-i/300);
    nodes.forEach(function(n){n.vx+=(W/2-n.x)*0.01*alpha;n.vy+=(H/2-n.y)*0.01*alpha});
    for(var a=0;a<nodes.length;a++)for(var b=a+1;b<nodes.length;b++){
      var dx=nodes[b].x-nodes[a].x,dy=nodes[b].y-nodes[a].y;
      var d2=dx*dx+dy*dy||1,f=-200/d2*alpha;
      nodes[a].vx+=dx*f;nodes[a].vy+=dy*f;nodes[b].vx-=dx*f;nodes[b].vy-=dy*f;
    }
    links.forEach(function(l){
      var dx=l.t.x-l.s.x,dy=l.t.y-l.s.y,d=Math.sqrt(dx*dx+dy*dy)||1,f=(d-80)*0.01*alpha;
      l.s.vx+=dx/d*f;l.s.vy+=dy/d*f;l.t.vx-=dx/d*f;l.t.vy-=dy/d*f;
    });
    nodes.forEach(function(n){n.vx*=0.6;n.vy*=0.6;n.x+=n.vx;n.y+=n.vy;
      n.x=Math.max(30,Math.min(W-30,n.x));n.y=Math.max(30,Math.min(H-30,n.y))});
  }
  links.forEach(function(l){
    var line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('class','lnk');line.setAttribute('marker-end','url(#arr)');
    line.setAttribute('x1',l.s.x);line.setAttribute('y1',l.s.y);
    line.setAttribute('x2',l.t.x);line.setAttribute('y2',l.t.y);svg.appendChild(line);
  });
  nodes.forEach(function(n){
    var g=document.createElementNS('http://www.w3.org/2000/svg','g');g.style.cursor='pointer';
    var c=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx',n.x);c.setAttribute('cy',n.y);c.setAttribute('r',R(n));
    c.setAttribute('fill',tc(n.tier));c.setAttribute('stroke','#0d1117');c.setAttribute('stroke-width','1.5');
    g.appendChild(c);
    var t=document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('class','nlbl');t.setAttribute('x',n.x);t.setAttribute('y',n.y+R(n)+12);
    t.textContent=n.id;g.appendChild(t);
    g.addEventListener('click',function(){showDet(n.id)});
    g.addEventListener('mouseenter',function(e){
      var tip=document.getElementById('tip');
      tip.innerHTML='<b>'+n.id+' '+n.name+'</b>层:'+n.layer+' 扇出:'+n.fanout+'/'+D.total_propositions+' 耦合:'+n.coupling+'<br>覆盖:'+n.covers.join(', ');
      tip.style.display='block';tip.style.left=(e.clientX+12)+'px';tip.style.top=(e.clientY-10)+'px';
    });
    g.addEventListener('mouseleave',function(){document.getElementById('tip').style.display='none'});
    svg.appendChild(g);
  });
  document.getElementById('lgd').innerHTML=
    '<div class="lgdi"><div class="lgd-d" style="background:#f0883e"></div>一级高地</div>'+
    '<div class="lgdi"><div class="lgd-d" style="background:#58a6ff"></div>二级高地</div>'+
    '<div class="lgdi"><div class="lgd-d" style="background:#3fb950"></div>三级营地</div>'+
    '<div style="margin-top:5px;color:#6e7681;font-size:10px">节点大小=扇出度</div>';
}
// Fanout
(function(){
  var mx=Math.max.apply(null,D.capabilities.map(function(c){return c.fanout.count}));
  var h='';
  D.capabilities.slice().sort(function(a,b){return b.fanout.count-a.fanout.count}).forEach(function(c){
    var tier=(HM[c.id]||{}).tier||'none';
    var pct=(c.fanout.count/mx*100).toFixed(0);
    h+='<div class="br" onclick="showDet(\''+c.id+'\')">'+
      '<div class="bl" title="'+c.id+' '+c.name+'">'+c.id+' '+c.name+'</div>'+
      '<div class="bt"><div class="bf '+tcl(tier)+'" style="width:'+pct+'%">'+c.fanout.count+'</div></div>'+
      '<div class="bv">'+c.fanout.ratio+'</div></div>';
  });
  document.getElementById('bars').innerHTML=h;
})();
// Path
(function(){
  var h='';
  (D.learning_path||[]).forEach(function(id,i){
    var c=CM[id];if(!c)return;
    var tier=(HM[id]||{}).tier||'none';
    h+='<div class="pn '+tcl(tier)+'" onclick="showDet(\''+id+'\')" title="'+c.name+' · 扇出'+c.fanout.ratio+'">'+
      '<span class="pi">'+id+'</span><span class="pn2">'+c.name+'</span></div>';
    if(i<(D.learning_path||[]).length-1)h+='<span class="pa">→</span>';
  });
  document.getElementById('lpath').innerHTML=h;
})();
// Layers
(function(){
  var L={};D.capabilities.forEach(function(c){(L[c.layer]=L[c.layer]||[]).push(c)});
  var LC={'浏览器层':'#f0883e','JS引擎层':'#da3633','协议层':'#58a6ff','框架层':'#bc8cff','工程层':'#3fb950','工具层':'#8b949e'};
  var h='';
  Object.entries(L).sort(function(a,b){return b[1].length-a[1].length}).forEach(function(kv){
    var l=kv[0],cs=kv[1],color=LC[l]||'#58a6ff';
    h+='<div class="lc"><div class="ln" style="color:'+color+'">'+l+'</div>'+
      '<div class="lcnt">'+cs.length+'</div>'+
      '<div class="lcs">'+cs.map(function(c){return c.id+' '+c.name+' (扇出'+c.fanout.count+')'}).join('<br>')+'</div></div>';
  });
  document.getElementById('lgrid').innerHTML=h;
})();
</script>
</body>
</html>'''


def generate_view(json_path, html_path=None):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if not html_path:
        html_path = json_path.replace('.json', '-view.html')

    json_str = json.dumps(data, ensure_ascii=False)
    html = HTML_TEMPLATE.replace('__JSON_DATA__', json_str)

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)

    return html_path, len(html)


if __name__ == '__main__':
    json_path = sys.argv[1] if len(sys.argv) > 1 else input('JSON path: ').strip()
    html_path = sys.argv[2] if len(sys.argv) > 2 else None
    out, size = generate_view(json_path, html_path)
    print(f'Generated: {out} ({size} bytes)')
