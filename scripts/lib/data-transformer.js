'use strict';

/**
 * Data Transformer — Converts RawData (from data-loader) into PipelineData.
 *
 * This module implements the core transformation logic:
 * 1. Progress inference: determine completedSteps and checkpoint status from file existence + --step param
 * 2. Analytics construction: build capFreq, layerDist, depthOrder, evalBreakdown, etc.
 *    (migrated from build-dashboard-v2.js L94-141)
 * 3. PipelineData assembly: combine all parts into the final structure
 *
 * Zero third-party dependencies — Node.js built-in modules only.
 */

var { CHECKPOINT_DEFINITIONS } = require('./checkpoint-defs');

/**
 * Layer colors and order — must match design-tokens.ts exactly.
 */
var LAYER_COLORS = {
  '浏览器层': '#6c5ce7',
  '网络层': '#00b894',
  '运行时层': '#e17055',
  '工程层': '#fdcb6e',
  '工具层': '#74b9ff',
  '安全层': '#d63031',
};

var LAYER_ORDER = ['浏览器层', '网络层', '运行时层', '工程层', '工具层', '安全层'];

/**
 * Proposition list — built from requirement-web.json or evaluations.json.
 * This is the equivalent of the PROPS array in build-dashboard-v2.js.
 *
 * @param {object} rawData - RawData from data-loader
 * @returns {Array} Proposition objects with {id, name, priority, difficulty, score, caps, role, dir}
 */
function buildProps(rawData) {
  // Try to build from evaluations + requirement-web
  var props = [];

  // Get proposition names and roles from requirement-web
  var reqProps = {};
  if (rawData.requirement.exists && rawData.requirement.data) {
    var req = rawData.requirement.data;
    if (req.propositions) {
      req.propositions.forEach(function (p) {
        reqProps[p.id] = {
          name: p.name,
          role: p.role || 'core',
          priority: p.priority || 'high',
          difficulty: p.difficulty || 'high',
        };
      });
    }
  }

  // Get evaluation data
  var evals = {};
  if (rawData.evaluations.exists && rawData.evaluations.data) {
    rawData.evaluations.data.evaluations.forEach(function (e) {
      evals[e.proposition_id] = e;
    });
  }

  // Get prop<->cap mapping and caps count from capability-graph
  var propCaps = {};
  var propCapsCount = {};
  if (rawData.capabilityGraph.exists && rawData.capabilityGraph.data) {
    rawData.capabilityGraph.data.capabilities.forEach(function (cap) {
      var covers = cap.covers || [];
      covers.forEach(function (pid) {
        if (!propCaps[pid]) propCaps[pid] = [];
        propCaps[pid].push(cap.id);
        propCapsCount[pid] = (propCapsCount[pid] || 0) + 1;
      });
    });
  }

  // Get dir from proposition files
  var propDirs = {};
  if (rawData.propositionFiles) {
    rawData.propositionFiles.forEach(function (pf) {
      propDirs[pf.propId] = pf.propDir;
    });
  }

  // Build unified props array
  // Primary source: evaluations (has scores), fallback: requirement-web
  var allPropIds = Object.keys(Object.assign({}, evals, reqProps));

  allPropIds.forEach(function (pid) {
    var reqInfo = reqProps[pid] || {};
    var evalInfo = evals[pid] || {};
    props.push({
      id: pid,
      name: reqInfo.name || evalInfo.proposition || pid,
      dir: propDirs[pid] || '',
      priority: reqInfo.priority || evalInfo.priority || 'high',
      difficulty: reqInfo.difficulty || evalInfo.difficulty || 'high',
      score: evalInfo.total_score || 0,
      caps: propCapsCount[pid] || 0,
      role: reqInfo.role || evalInfo.role || 'core',
    });
  });

  // Sort by evaluation recommended order, fallback by score
  props.sort(function (a, b) {
    var ea = evals[a.id];
    var eb = evals[b.id];
    var oa = ea ? ea.recommended_order : 999;
    var ob = eb ? eb.recommended_order : 999;
    if (oa !== ob) return oa - ob;
    return b.score - a.score;
  });

  return props;
}

/**
 * Build analytics data from raw data.
 * Migrated from build-dashboard-v2.js L94-141.
 *
 * @param {object} rawData - RawData from data-loader
 * @param {Array} props - Proposition array (from buildProps)
 * @returns {object|null} AnalyticsData or null if insufficient data
 */
function buildAnalytics(rawData, props) {
  // Need at least capability-graph to build analytics
  if (!rawData.capabilityGraph.exists || !rawData.capabilityGraph.data) {
    return null;
  }

  var capGraph = rawData.capabilityGraph.data;
  var grouping = rawData.researchGrouping.exists ? rawData.researchGrouping.data : null;
  var evaluations = rawData.evaluations.exists ? rawData.evaluations.data : null;
  var partition = rawData.partition.exists ? rawData.partition.data : null;

  // Build name lookup
  var capNames = {};
  capGraph.capabilities.forEach(function (c) {
    capNames[c.id] = c.name;
  });

  // Build prop<->cap mappings (L18-27 of build-dashboard-v2.js)
  var propCaps = {};
  var capsProps = {};
  capGraph.capabilities.forEach(function (c) {
    capsProps[c.id] = c.covers || [];
    (c.covers || []).forEach(function (pid) {
      if (!propCaps[pid]) propCaps[pid] = [];
      propCaps[pid].push(c.id);
    });
  });

  // Build capFreq (L95-99)
  var capFreq = [];
  Object.keys(capsProps).forEach(function (cid) {
    capFreq.push({
      id: cid,
      name: capNames[cid] || cid,
      count: capsProps[cid].length,
      props: capsProps[cid],
    });
  });
  capFreq.sort(function (a, b) { return b.count - a.count; });

  // Build capLayer (L29-34)
  var capLayer = {};
  capGraph.capabilities.forEach(function (c) {
    capLayer[c.id] = c.layer || '未知';
  });
  if (grouping && grouping.groups) {
    grouping.groups.forEach(function (g) {
      g.capabilities.forEach(function (cid) {
        capLayer[cid] = g.layer;
      });
    });
  }

  // Build layerDist (L101-108)
  var layerDist = {};
  if (grouping && grouping.groups) {
    grouping.groups.forEach(function (g) {
      if (!layerDist[g.layer]) layerDist[g.layer] = { caps: [], groups: [] };
      g.capabilities.forEach(function (cid) {
        layerDist[g.layer].caps.push({ id: cid, name: capNames[cid] || cid, layer: g.layer });
      });
      layerDist[g.layer].groups.push(g.id);
    });
  }

  // Build depthOrder (L110-124)
  var depthOrder = [];
  if (partition && partition.current_session && partition.current_session.depth_layers) {
    partition.current_session.depth_layers.forEach(function (dl) {
      dl.proposition_ids.forEach(function (pid) {
        var prop = props.find(function (p) { return p.id === pid; });
        if (prop) depthOrder.push(Object.assign({ depth: dl.depth }, prop));
      });
    });
  }
  if (partition && partition.deferred_sessions) {
    partition.deferred_sessions.forEach(function (ds) {
      (ds.proposition_ids || []).forEach(function (pid) {
        var prop = props.find(function (p) { return p.id === pid; });
        if (prop) depthOrder.push(Object.assign({ depth: ds.component_id === 'C4' ? 3 : 0 }, prop));
      });
    });
  }

  // Build evalBreakdown (L126-130)
  var evalBreakdown = [];
  if (evaluations && evaluations.evaluations) {
    evalBreakdown = evaluations.evaluations.map(function (e) {
      return {
        id: e.proposition_id,
        name: (e.proposition || '').slice(0, 24),
        total: e.total_score,
        cross_stack: e.scores.cross_stack_coupling,
        doc_vacuum: e.scores.doc_vacuum,
        experience: e.scores.experience_barrier,
        heat: e.scores.topical_heat,
        rec_order: e.recommended_order,
      };
    });
  }

  // Build dagEdges (L132)
  var dagEdges = (partition && partition.dag && partition.dag.edges) || [];

  // Build batchInfo (L134-136)
  var batchInfo = [];
  if (grouping && grouping.batches) {
    batchInfo = grouping.batches.map(function (batch, idx) {
      return {
        batch: idx + 1,
        groups: batch,
        desc: idx === 0 ? '基石能力（无前置依赖）'
              : idx === 1 ? '进阶能力（依赖基石）'
              : idx === 2 ? '高级能力（多组交汇）'
              : '顶层能力',
      };
    });
  }

  return {
    capFreq: capFreq,
    layerDist: layerDist,
    layerOrder: LAYER_ORDER,
    layerColors: LAYER_COLORS,
    depthOrder: depthOrder,
    evalBreakdown: evalBreakdown,
    dagEdges: dagEdges,
    batchInfo: batchInfo,
    propCaps: propCaps,
    capNames: capNames,
    capLayer: capLayer,
    totalCaps: capGraph.total_capabilities || capGraph.capabilities.length,
    totalProps: capGraph.total_propositions || props.length,
  };
}

/**
 * Build pipeline progress from raw data and step parameter.
 *
 * @param {object} rawData - RawData from data-loader
 * @param {number|null} step - Explicit step parameter (from --step=N)
 * @returns {object} PipelineProgress
 */
function buildProgress(rawData, step) {
  // Infer completed steps from file existence
  var inferredSteps = [];
  if (rawData.requirement.exists) inferredSteps.push(0);
  if (rawData.partition.exists) inferredSteps.push(1);
  if (rawData.rawMaterials.exists) inferredSteps.push(2);
  if (rawData.capabilityGraph.exists) inferredSteps.push(3);
  if (rawData.evaluations.exists) inferredSteps.push(4);
  if (rawData.capabilitySummaries && rawData.capabilitySummaries.length > 0) inferredSteps.push(5);
  if (rawData.propositionFiles && rawData.propositionFiles.length > 0) inferredSteps.push(7);

  // Use explicit step if provided and higher than inferred
  var maxStep = step !== null ? step : Math.max.apply(null, inferredSteps.concat([-1]));
  var completedSteps = [];
  for (var i = 0; i <= maxStep; i++) {
    completedSteps.push(i);
  }

  // Determine completed checkpoints based on completed steps
  var completedCheckpoints = [];
  CHECKPOINT_DEFINITIONS.forEach(function (cp) {
    if (completedSteps.indexOf(cp.step) >= 0 || completedSteps[completedSteps.length - 1] >= cp.step) {
      completedCheckpoints.push(cp.symbol);
    }
  });

  // Determine current checkpoint
  var currentCheckpoint = null;
  var nextStep = maxStep + 1;
  var nextCp = CHECKPOINT_DEFINITIONS.find(function (cp) { return cp.step === nextStep; });
  if (nextCp && nextStep <= 9) {
    currentCheckpoint = nextCp.symbol;
  } else if (maxStep >= 9) {
    currentCheckpoint = null; // Pipeline complete
  }

  return {
    completedSteps: completedSteps,
    completedCheckpoints: completedCheckpoints,
    currentCheckpoint: currentCheckpoint,
    totalSteps: 10,
    totalCheckpoints: 9,
  };
}

/**
 * Build checkpoint info array with status.
 *
 * @param {object} progress - PipelineProgress
 * @returns {Array} CheckpointInfo array with status field
 */
function buildCheckpoints(progress) {
  return CHECKPOINT_DEFINITIONS.map(function (cp) {
    var status = 'pending';
    if (progress.completedCheckpoints.indexOf(cp.symbol) >= 0) {
      status = 'completed';
    } else if (progress.currentCheckpoint === cp.symbol) {
      status = 'current';
    }
    return Object.assign({}, cp, { status: status });
  });
}

/**
 * Build pipeline meta information.
 *
 * @param {object} rawData - RawData
 * @param {number|null} step - Explicit step
 * @param {object} progress - PipelineProgress
 * @returns {object} PipelineMeta
 */
function buildMeta(rawData, step, progress) {
  var topic = '未指定';
  var targetLevel = '';

  // Try to extract topic from requirement-web
  if (rawData.requirement.exists && rawData.requirement.data) {
    var req = rawData.requirement.data;
    if (req.context) {
      topic = req.context.topic || req.context.source_text || topic;
      targetLevel = req.context.target_level || req.context.years_hint || '';
    }
    if (req.scope) {
      if (!targetLevel && req.scope.total_propositions) {
        targetLevel = req.scope.total_propositions + '命题';
      }
    }
  }

  var currentStep = step !== null ? step : progress.completedSteps.length - 1;

  return {
    topic: topic,
    targetLevel: targetLevel,
    generatedAt: new Date().toISOString(),
    currentStep: currentStep,
    currentCheckpoint: progress.currentCheckpoint,
    skillVersion: 'scenario-pipeline v2',
  };
}

/**
 * Build post-processing data from raw data.
 *
 * @param {object} rawData - RawData
 * @param {Array} props - Proposition array
 * @param {object|null} analytics - AnalyticsData
 * @returns {object} PostProcessingData
 */
function buildPostProcessing(rawData, props, analytics) {
  // Build capabilities summaries
  var capabilities = [];
  if (rawData.capabilitySummaries) {
    capabilities = rawData.capabilitySummaries.map(function (cs) {
      var propCount = 0;
      if (analytics && analytics.propCaps) {
        Object.keys(analytics.propCaps).forEach(function (pid) {
          if (analytics.propCaps[pid].indexOf(cs.id) >= 0) propCount++;
        });
      }
      return {
        id: cs.id,
        name: cs.name,
        layer: cs.layer,
        summary: cs.summary,
        propCount: propCount,
      };
    });
  }

  // Build propositions content
  var propositions = [];
  if (rawData.propositionFiles) {
    rawData.propositionFiles.forEach(function (pf) {
      var propMeta = props.find(function (p) { return p.id === pf.propId; }) || {};
      propositions.push({
        id: pf.propId,
        name: propMeta.name || pf.propId,
        dir: pf.propDir,
        priority: propMeta.priority || 'high',
        difficulty: propMeta.difficulty || 'high',
        score: propMeta.score || 0,
        caps: propMeta.caps || 0,
        role: propMeta.role || 'core',
        content: pf.tabs,
      });
    });
  }

  // Build learning ladder from analytics depthOrder
  var learningLadder = null;
  if (analytics && analytics.depthOrder.length > 0) {
    var depthLayers = {};
    analytics.depthOrder.forEach(function (item) {
      if (!depthLayers[item.depth]) depthLayers[item.depth] = { depth: item.depth, proposition_ids: [] };
      depthLayers[item.depth].proposition_ids.push(item.id);
    });
    learningLadder = {
      depth_layers: Object.values(depthLayers).sort(function (a, b) { return a.depth - b.depth; }),
      total_depths: Object.keys(depthLayers).length,
    };
  }

  return {
    capabilities: capabilities,
    propositions: propositions,
    learningLadder: learningLadder,
    analytics: analytics,
  };
}

/**
 * Main transformation function.
 * Converts RawData into a complete PipelineData structure.
 *
 * @param {object} rawData - RawData from data-loader
 * @param {number|null} step - Explicit step parameter (from --step=N)
 * @returns {object} PipelineData
 */
function transform(rawData, step) {
  var progress = buildProgress(rawData, step);
  var meta = buildMeta(rawData, step, progress);
  var checkpoints = buildCheckpoints(progress);
  var props = buildProps(rawData);
  var analytics = buildAnalytics(rawData, props);

  var preStage = {
    requirement: rawData.requirement.exists ? rawData.requirement.data : null,
    partition: rawData.partition.exists ? rawData.partition.data : null,
  };

  var preProcessing = {
    rawMaterials: rawData.rawMaterials.exists ? rawData.rawMaterials.data : null,
    capabilityGraph: rawData.capabilityGraph.exists ? rawData.capabilityGraph.data : null,
    evaluations: rawData.evaluations.exists ? rawData.evaluations.data : null,
    researchGrouping: rawData.researchGrouping.exists ? rawData.researchGrouping.data : null,
  };

  var postProcessing = buildPostProcessing(rawData, props, analytics);
  var decisionPanels = computeDecisionPanels(
    meta.currentStep, rawData, progress, props
  );

  return {
    meta: meta,
    progress: progress,
    preStage: preStage,
    preProcessing: preProcessing,
    postProcessing: postProcessing,
    checkpoints: checkpoints,
    decisionPanels: decisionPanels,
  };
}

/**
 * Compute decision panels based on the current step and available data.
 *
 * Decision moments:
 * - demand: steps 0-1 (after ⓩⓧ) — "这个方向对吗？"
 * - capability: steps 2-4 (after ⓐⓑ) — "覆盖和排序对吗？"
 * - output: steps 5-9 (after ⓒⓓⓕⓖⓗ) — "最终产物满意吗？"
 *
 * @param {number} step - Current pipeline step
 * @param {object} rawData - RawData from data-loader
 * @param {object} progress - PipelineProgress
 * @param {Array} props - Proposition array
 * @returns {Array} DecisionPanelData array
 */
function computeDecisionPanels(step, rawData, progress, props) {
  var panels = [];

  // ---- Demand Confirmation (steps 0-1) ----
  if (step >= 0) {
    var req = rawData.requirement.exists ? rawData.requirement.data : null;
    var part = rawData.partition.exists ? rawData.partition.data : null;

    var propCount = 0;
    var capCount = 0;
    var depEdgeCount = 0;
    var yearsHint = '';

    if (req) {
      propCount = (req.propositions || []).length;
      capCount = req.capability_web ? Object.keys(req.capability_web).length : 0;
      depEdgeCount = req.dependencies ? Object.keys(req.dependencies).length : 0;
      yearsHint = (req.context && req.context.years_hint) || (req.context && req.context.target_level) || '';
    }

    // Quality assessment
    var demandScore = 70;
    var demandIssues = [];
    var demandSuggestions = [];

    if (propCount < 5) {
      demandIssues.push('命题数量偏少（' + propCount + '个），可能覆盖不足');
      demandSuggestions.push('建议增加更多命题以提高覆盖度');
    } else if (propCount > 25) {
      demandIssues.push('命题数量偏多（' + propCount + '个），可能需要精简');
    } else {
      demandScore += 10;
    }

    if (capCount < 3) {
      demandIssues.push('能力雏形偏少（' + capCount + '个）');
    } else {
      demandScore += 10;
    }

    if (depEdgeCount === 0) {
      demandIssues.push('依赖关系为空，拓扑结构不清晰');
      demandSuggestions.push('建议检查依赖关系是否已正确生成');
    } else {
      demandScore += 10;
    }

    var compCount = part ? (part.components || []).length : 0;
    var maxDepth = part ? (part.partition_stats && part.partition_stats.max_depth) || 0 : 0;

    panels.push({
      decisionMoment: 'demand',
      title: '需求确认决策面板',
      summary: [
        { label: '命题数量', value: propCount },
        { label: '能力雏形', value: capCount },
        { label: '依赖边数', value: depEdgeCount },
        { label: '年限推断', value: yearsHint || '未推断' },
        { label: '连通分量', value: compCount },
        { label: '拓扑深度', value: maxDepth },
      ],
      quality: {
        score: Math.min(demandScore, 100),
        issues: demandIssues,
        suggestions: demandSuggestions.length > 0 ? demandSuggestions : ['需求结构健康，可以继续'],
      },
      options: [
        { id: 'confirm', label: '✓ 确认继续', description: '需求范围符合预期，进入下一阶段' },
        { id: 'adjust', label: '✏ 调整', description: '需要微调命题或能力范围' },
        { id: 'redo', label: '↺ 重做', description: '方向有误，需要重新头脑风暴' },
      ],
      impact: {
        nextStep: '信源扫描与能力图谱构建（Step 2-4）',
        risks: propCount < 5 ? ['命题过少可能导致后续能力覆盖不足'] :
               propCount > 25 ? ['命题过多可能导致研究资源分散'] :
               ['依赖关系的质量直接影响学习路径的合理性'],
      },
    });
  }

  // ---- Capability Confirmation (steps 2-4) ----
  if (step >= 2) {
    var cg = rawData.capabilityGraph.exists ? rawData.capabilityGraph.data : null;
    var ev = rawData.evaluations.exists ? rawData.evaluations.data : null;
    var rm = rawData.rawMaterials.exists ? rawData.rawMaterials.data : null;
    var rg = rawData.researchGrouping.exists ? rawData.researchGrouping.data : null;

    var atomCapCount = cg ? (cg.total_capabilities || (cg.capabilities || []).length) : 0;
    var highgroundCount = cg ? (cg.highgrounds || []).length : 0;
    var materialCount = rm ? (rm.scan_summary && rm.scan_summary.total_materials) || 0 : 0;
    var evalCount = ev ? (ev.evaluations || []).length : 0;

    // Layer distribution
    var layerDist = {};
    if (rg && rg.groups) {
      rg.groups.forEach(function (g) {
        if (!layerDist[g.layer]) layerDist[g.layer] = 0;
        layerDist[g.layer] += (g.capabilities || []).length;
      });
    }
    var layerSummary = Object.keys(layerDist).map(function (l) {
      return l + ':' + layerDist[l];
    }).join(', ');

    // Quality
    var capScore = 70;
    var capIssues = [];
    var capSuggestions = [];

    if (atomCapCount < 10) {
      capIssues.push('原子能力数偏少（' + atomCapCount + '个）');
      capSuggestions.push('建议补充更多能力扫描');
    } else {
      capScore += 10;
    }

    if (materialCount < 10) {
      capIssues.push('信源材料不足（' + materialCount + '篇）');
      capSuggestions.push('建议补充信源扫描以提高研究深度');
    } else {
      capScore += 10;
    }

    if (evalCount < atomCapCount * 0.5) {
      capIssues.push('评估覆盖不完整，仅 ' + evalCount + '/' + atomCapCount + ' 命题已评估');
    } else {
      capScore += 10;
    }

    var layerCount = Object.keys(layerDist).length;
    if (layerCount < 3) {
      capIssues.push('技术层分布不均，仅覆盖 ' + layerCount + ' 层');
    }

    var groupCount = rg ? (rg.groups || []).length : 0;

    panels.push({
      decisionMoment: 'capability',
      title: '能力确认决策面板',
      summary: [
        { label: '原子能力数', value: atomCapCount },
        { label: '技术层分布', value: layerSummary || '未统计' },
        { label: '枢纽能力数', value: highgroundCount },
        { label: '信源材料数', value: materialCount },
        { label: '已评估命题', value: evalCount },
        { label: '研究分组', value: groupCount },
      ],
      quality: {
        score: Math.min(capScore, 100),
        issues: capIssues,
        suggestions: capSuggestions.length > 0 ? capSuggestions : ['能力图谱健康，可以继续研究'],
      },
      options: [
        { id: 'confirm', label: '✓ 确认继续', description: '能力覆盖合理，开始深度研究' },
        { id: 'supplement', label: '⊕ 补充扫描', description: '需要补充更多信源或能力' },
        { id: 'redo', label: '↺ 重做', description: '能力图谱有结构性问题，需要重建' },
      ],
      impact: {
        nextStep: '能力深度研究与命题内容生成（Step 5-8）',
        risks: materialCount < 10 ? ['信源不足可能导致研究内容深度不够'] :
               atomCapCount < 10 ? ['能力覆盖不足可能遗漏关键知识点'] :
               ['能力图谱质量直接决定研究内容的全面性'],
      },
    });
  }

  // ---- Output Confirmation (steps 5-9) ----
  if (step >= 5) {
    var capFiles = rawData.capabilitySummaries || [];
    var propFiles = rawData.propositionFiles || [];

    var generatedFileCount = capFiles.length + propFiles.length;
    var totalTabs = 0;
    propFiles.forEach(function (pf) {
      totalTabs += Object.keys(pf.tabs || {}).length;
    });

    // Quality
    var outScore = 70;
    var outIssues = [];
    var outSuggestions = [];

    if (capFiles.length === 0 && step >= 5) {
      outIssues.push('能力研究文档尚未生成');
    } else {
      outScore += 10;
    }

    if (propFiles.length === 0 && step >= 7) {
      outIssues.push('命题内容尚未组装');
    } else if (propFiles.length > 0) {
      outScore += 10;
    }

    // Check completeness of tabs
    var incompleteProps = propFiles.filter(function (pf) {
      return Object.keys(pf.tabs || {}).length < 3;
    });
    if (incompleteProps.length > 0) {
      outIssues.push(incompleteProps.length + ' 个命题内容不完整（Tab < 3）');
      outSuggestions.push('建议完善不完整命题的内容');
    } else {
      outScore += 10;
    }

    if (generatedFileCount > 0 && outIssues.length === 0) {
      outScore = 100;
    }

    panels.push({
      decisionMoment: 'output',
      title: '产出确认决策面板',
      summary: [
        { label: '已生成文件数', value: generatedFileCount },
        { label: '能力研究文档', value: capFiles.length },
        { label: '命题文件数', value: propFiles.length },
        { label: '内容Tab总数', value: totalTabs },
        { label: '不完整命题', value: incompleteProps.length },
        { label: '当前步骤', value: step + '/9' },
      ],
      quality: {
        score: Math.min(outScore, 100),
        issues: outIssues,
        suggestions: outSuggestions.length > 0 ? outSuggestions : ['产出质量达标，可以确认交付'],
      },
      options: [
        { id: 'confirm', label: '✓ 确认继续', description: '产出质量满意，继续完成管线' },
        { id: 'refine', label: '✦ 要求精炼', description: '部分内容需要深度打磨' },
        { id: 'redo', label: '↺ 重做', description: '产出不符合预期，需要重做' },
      ],
      impact: {
        nextStep: step < 9 ? '继续生成剩余内容（Step ' + (step + 1) + '）' : '管线全部完成，交付最终看板',
        risks: generatedFileCount === 0 ? ['尚无产出文件，无法进行质量评估'] :
               incompleteProps.length > 0 ? ['不完整命题可能影响学习效果'] :
               ['产出质量直接决定最终交付物的价值'],
      },
    });
  }

  return panels;
}

module.exports = {
  transform: transform,
  buildAnalytics: buildAnalytics,
  buildProgress: buildProgress,
  buildCheckpoints: buildCheckpoints,
  buildProps: buildProps,
  buildMeta: buildMeta,
  buildPostProcessing: buildPostProcessing,
  computeDecisionPanels: computeDecisionPanels,
};
