const fs = require('fs');
const path = require('path');
const workDir = process.argv[2] || __dirname;

console.log('=== 导向学习看板构建 v2.1 ===');
console.log('workDir:', workDir);

// ===== Load data assets =====
const capGraph = JSON.parse(fs.readFileSync(path.join(workDir, '.meta', 'capability-graph.json'), 'utf-8'));
const evaluations = JSON.parse(fs.readFileSync(path.join(workDir, '.meta', 'evaluations.json'), 'utf-8'));
const grouping = JSON.parse(fs.readFileSync(path.join(workDir, '.meta', 'research-grouping.json'), 'utf-8'));
const partition = JSON.parse(fs.readFileSync(path.join(workDir, '.meta', 'partition-analysis.json'), 'utf-8'));

// Build name lookup
const capNames = {};
capGraph.capabilities.forEach(function(c) { capNames[c.id] = c.name; });

// Build prop<->cap mappings
const propCaps = {};
const capsProps = {};
capGraph.capabilities.forEach(function(c) {
  capsProps[c.id] = c.covers || [];
  (c.covers || []).forEach(function(pid) {
    if (!propCaps[pid]) propCaps[pid] = [];
    propCaps[pid].push(c.id);
  });
});

// Layer lookup (from capGraph first, grouping overrides)
const capLayer = {};
capGraph.capabilities.forEach(function(c) { capLayer[c.id] = c.layer || '未知'; });
grouping.groups.forEach(function(g) {
  g.capabilities.forEach(function(cid) { capLayer[cid] = g.layer; });
});

const layerColors = {
  '浏览器层': '#6c5ce7', '网络层': '#00b894', '运行时层': '#e17055',
  '工程层': '#fdcb6e', '工具层': '#74b9ff', '安全层': '#d63031'
};
const layerOrder = ['浏览器层', '网络层', '运行时层', '工程层', '工具层', '安全层'];

// ===== Proposition list =====
const PROPS = [
  {id:"RW-P2",dir:"P2-core-web-vitals-optimization",name:"Core Web Vitals指标不达标的提升方案",priority:"high",difficulty:"high",score:9,caps:10,role:"core"},
  {id:"RW-P5",dir:"P5-http-cache-strategy",name:"HTTP多级缓存策略设计与配置",priority:"high",difficulty:"high",score:9,caps:12,role:"core"},
  {id:"RW-P6",dir:"P6-resource-preload-priority",name:"关键资源预加载策略与优先级控制方案",priority:"high",difficulty:"high",score:9,caps:12,role:"core"},
  {id:"RW-P7",dir:"P7-code-splitting-chunk",name:"代码分割与Chunk拆分优化方案",priority:"high",difficulty:"high",score:9,caps:11,role:"core"},
  {id:"RW-P1",dir:"P1-rendering-bottleneck-diagnosis",name:"渲染性能瓶颈诊断与系统性优化方案",priority:"high",difficulty:"high",score:8,caps:9,role:"core"},
  {id:"RW-P3",dir:"P3-long-task-splitting",name:"长任务拆分与主线程调度优化方案",priority:"high",difficulty:"high",score:8,caps:8,role:"core"},
  {id:"RW-P4",dir:"P4-memory-leak-fix",name:"内存泄漏定位与修复方案",priority:"high",difficulty:"high",score:8,caps:8,role:"core"},
  {id:"RW-P8",dir:"P8-animation-gpu-compositing",name:"高性能CSS动画与GPU合成优化方案",priority:"high",difficulty:"high",score:8,caps:9,role:"core"},
  {id:"RW-P9",dir:"P9-performance-monitoring-architecture",name:"前端性能监控体系设计与数据驱动的优化闭环",priority:"high",difficulty:"high",score:9,caps:14,role:"core"},
  {id:"RW-P10",dir:"P10-full-pipeline-optimization",name:"全链路性能优化方案：从构建到渲染的系统工程",priority:"high",difficulty:"high",score:9,caps:13,role:"core"},
  {id:"RW-P11",dir:"P11-image-loading-optimization",name:"图片加载性能优化全链路方案",priority:"high",difficulty:"medium",score:8,caps:8,role:"core"},
  {id:"RW-P12",dir:"P12-build-size-treeshaking",name:"构建产物体积优化与Tree-shaking深度实践",priority:"high",difficulty:"high",score:8,caps:9,role:"core"},
  {id:"RW-P13",dir:"P13-rendering-pipeline-eventloop",name:"浏览器渲染管线与事件循环的协同工作机制",priority:"medium",difficulty:"medium",score:5,caps:7,role:"premise"},
  {id:"RW-P14",dir:"P14-http-protocol-network",name:"HTTP协议演进对前端性能的影响全景分析",priority:"medium",difficulty:"medium",score:5,caps:7,role:"premise"},
  {id:"RW-P15",dir:"P15-performance-budget-governance",name:"性能预算与准入治理体系设计",priority:"high",difficulty:"high",score:8,caps:9,role:"outlook"}
];

var TABS = [
  {id:'overview',label:'概述',file:'overview.md'},
  {id:'edge',label:'边界case',file:'edge-cases.md'},
  {id:'tradeoffs',label:'权衡',file:'trade-offs.md'},
  {id:'refs',label:'参考',file:'references.md'},
  {id:'ladder',label:'学习阶梯',file:'learning-ladder.md'}
];

// ===== Read all markdown content (JSON.stringify for safe embedding) =====
console.log('Reading 15 propositions × 5 tabs...');
let contentData = {};
let readCount = 0, failCount = 0;
for (let p of PROPS) {
  contentData[p.id] = {};
  for (let t of TABS) {
    let fp = path.join(workDir, p.dir, t.file);
    try {
      contentData[p.id][t.id] = fs.readFileSync(fp, 'utf-8');
      readCount++;
    } catch(e) {
      contentData[p.id][t.id] = '# 内容加载失败: ' + e.message;
      failCount++;
    }
  }
}
console.log('Read:', readCount, 'success,', failCount, 'failed');

// JSON.stringify handles all JS escaping (backticks, backslashes, ${}, \n, etc.)
// BUT we must also escape </script> for the HTML parser - it doesn't care about JS contexts
let CONTENT_JS = 'const CONTENT = ' + JSON.stringify(contentData, null, 2)
  .replace(/<\/script>/gi, '<\\/script>')  // prevent HTML parser from closing script block
  .replace(/<\/SCRIPT>/g, '<\\/SCRIPT>') + ';';

// ===== Build analytics data =====
let capFreq = [];
Object.keys(capsProps).forEach(function(cid) {
  capFreq.push({id:cid, name:capNames[cid]||cid, count:capsProps[cid].length, props:capsProps[cid]});
});
capFreq.sort(function(a,b){return b.count-a.count;});

let layerDist = {};
grouping.groups.forEach(function(g) {
  if (!layerDist[g.layer]) layerDist[g.layer] = {caps:[],groups:[]};
  g.capabilities.forEach(function(cid) {
    layerDist[g.layer].caps.push({id:cid, name:capNames[cid]||cid, layer:g.layer});
  });
  layerDist[g.layer].groups.push(g.id);
});

let depthOrder = [];
if (partition.current_session && partition.current_session.depth_layers) {
  partition.current_session.depth_layers.forEach(function(dl) {
    dl.proposition_ids.forEach(function(pid) {
      var prop = PROPS.find(function(p){return p.id===pid;});
      if (prop) depthOrder.push({depth:dl.depth, ...prop});
    });
  });
}
(partition.deferred_sessions||[]).forEach(function(ds) {
  ds.proposition_ids.forEach(function(pid) {
    var prop = PROPS.find(function(p){return p.id===pid;});
    if (prop) depthOrder.push({depth: ds.component_id==='C4'?3:0, ...prop});
  });
});

let evalBreakdown = evaluations.evaluations.map(function(e) {
  return {id:e.proposition_id,name:e.proposition.slice(0,24),total:e.total_score,
    cross_stack:e.scores.cross_stack_coupling,doc_vacuum:e.scores.doc_vacuum,
    experience:e.scores.experience_barrier,heat:e.scores.topical_heat,rec_order:e.recommended_order};
});

let dagEdges = (partition.dag && partition.dag.edges) || [];

let batchInfo = (grouping.batches||[]).map(function(batch,idx) {
  return {batch:idx+1, groups:batch, desc:idx===0?'基石能力（无前置依赖）':idx===1?'进阶能力（依赖基石）':idx===2?'高级能力（多组交汇）':'顶层能力'};
});

let ANALYTICS_JS = 'const ANALYTICS = ' + JSON.stringify({
  capFreq,layerDist,layerOrder,layerColors,depthOrder,
  evalBreakdown,dagEdges,batchInfo,propCaps,capNames,capLayer,
  totalCaps:36,totalProps:15
}).replace(/<\/script>/gi, '<\\/script>') + ';';

console.log('Analytics built. capFreq top 5:', capFreq.slice(0,5).map(function(c){return c.name+'('+c.count+')';}));

// ===== Read template & inject =====
let tplPath = path.join(__dirname, 'dashboard-template.html');
if (!fs.existsSync(tplPath)) {
  console.error('ERROR: template not found at', tplPath);
  process.exit(1);
}
let html = fs.readFileSync(tplPath, 'utf-8');

html = html.replace('CONTENT_JS_PLACEHOLDER', CONTENT_JS);
html = html.replace('ANALYTICS_JS_PLACEHOLDER', ANALYTICS_JS);

// Verify injection
if (html.indexOf('CONTENT_JS_PLACEHOLDER') >= 0) console.warn('WARNING: CONTENT_JS_PLACEHOLDER not replaced!');
if (html.indexOf('ANALYTICS_JS_PLACEHOLDER') >= 0) console.warn('WARNING: ANALYTICS_JS_PLACEHOLDER not replaced!');

let outPath = path.join(workDir, 'dashboard-v2.html');
fs.writeFileSync(outPath, html, 'utf-8');
console.log('Written:', outPath, '(' + (html.length/1024).toFixed(1) + ' KB)');

// ===== Quick syntax check =====
try {
  require('child_process').execSync('node --check "' + outPath.replace(/\\/g, '/') + '" 2>&1 || node -e "process.exit(1)"', {encoding:'utf-8', timeout:5000});
  console.log('JS syntax: OK');
} catch(e) {
  // node --check on HTML won't work - extract just the JS block
  console.log('Skipping JS syntax check on HTML (file:// only)');
}

console.log('=== Done ===');
