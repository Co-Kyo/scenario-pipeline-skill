'use strict';

/**
 * Data Loader — Node.js module for reading .meta/*.json and markdown content files.
 *
 * This module is part of the runtime build pipeline (zero third-party dependencies).
 * It reads files from the work directory and returns a RawData structure with
 * existence flags, so the transformer can handle missing files gracefully.
 *
 * Files loaded:
 * - .meta/requirement-web.json
 * - .meta/partition-analysis.json
 * - .meta/.raw-materials/index.json
 * - .meta/capability-graph.json
 * - .meta/evaluations.json
 * - .meta/research-grouping.json
 * - capabilities/*.md (summaries)
 * - {seq}-{name}/*.md (proposition content: overview, edge-cases, trade-offs, experiment, references, learning-ladder)
 */

const fs = require('fs');
const path = require('path');

/**
 * Proposition tab definitions — maps tab IDs to filenames.
 * Evolved from build-dashboard-v2.js TABS, with 'experiment' added per architecture.
 */
const PROP_TABS = [
  { id: 'overview', label: '概述', file: 'overview.md' },
  { id: 'edge-cases', label: '边界case', file: 'edge-cases.md' },
  { id: 'trade-offs', label: '权衡', file: 'trade-offs.md' },
  { id: 'experiment', label: '实验', file: 'experiment.md' },
  { id: 'refs', label: '参考', file: 'references.md' },
  { id: 'learning-ladder', label: '学习阶梯', file: 'learning-ladder.md' },
];

/**
 * Load a single JSON file with existence checking.
 *
 * @param {string} filePath - Absolute path to the JSON file
 * @returns {{data: any, exists: boolean, error: string|null}} Load result
 */
function loadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { data: null, exists: false, error: null };
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return { data, exists: true, error: null };
  } catch (err) {
    return { data: null, exists: false, error: err.message };
  }
}

/**
 * Load a markdown file, returning null if it doesn't exist.
 *
 * @param {string} filePath - Absolute path to the markdown file
 * @returns {string|null} File content or null
 */
function loadMarkdown(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    return null;
  }
}

/**
 * Scan for proposition directories in the work directory.
 * Proposition dirs match pattern: {seq}-{name}/ (e.g., "P1-rendering-bottleneck-diagnosis").
 *
 * @param {string} workDir - Working directory path
 * @returns {string[]} Array of directory names that look like proposition dirs
 */
function scanPropositionDirs(workDir) {
  try {
    const entries = fs.readdirSync(workDir, { withFileTypes: true });
    return entries
      .filter(function (e) { return e.isDirectory(); })
      .map(function (e) { return e.name; })
      .filter(function (name) {
        // Match patterns like P1-*, P2-*, RW-P1-*, etc.
        return /^P\d+-/.test(name) || /^RW-P\d+-/.test(name);
      });
  } catch (err) {
    return [];
  }
}

/**
 * Load all proposition content files from the work directory.
 * For each proposition directory, reads all 6 tab markdown files.
 *
 * @param {string} workDir - Working directory path
 * @returns {Array<{propId: string, propDir: string, tabs: Record<string, string>}>} Proposition files
 */
function loadPropositionFiles(workDir) {
  const dirs = scanPropositionDirs(workDir);
  var result = [];

  dirs.forEach(function (dirName) {
    // Extract prop ID from directory name
    // "P1-rendering-bottleneck-diagnosis" → "RW-P1"
    // "P10-full-pipeline-optimization" → "RW-P10"
    var match = dirName.match(/^P(\d+)-/);
    if (!match) return;
    var propId = 'RW-P' + match[1];

    var tabs = {};
    PROP_TABS.forEach(function (tab) {
      var filePath = path.join(workDir, dirName, tab.file);
      var content = loadMarkdown(filePath);
      if (content !== null) {
        tabs[tab.id] = content;
      }
    });

    // Only include if at least one tab was loaded
    if (Object.keys(tabs).length > 0) {
      result.push({
        propId: propId,
        propDir: dirName,
        tabs: tabs,
      });
    }
  });

  return result;
}

/**
 * Load capability summary files from capabilities/ directory.
 * Each .md file represents one capability research document.
 * We extract a brief summary from the first paragraph.
 *
 * @param {string} workDir - Working directory path
 * @returns {Array<{id: string, name: string, layer: string, summary: string}>} Capability summaries
 */
function loadCapabilitySummaries(workDir) {
  var capsDir = path.join(workDir, 'capabilities');
  try {
    if (!fs.existsSync(capsDir)) {
      return [];
    }
    var entries = fs.readdirSync(capsDir, { withFileTypes: true });
    var result = [];

    entries
      .filter(function (e) { return e.isFile() && e.name.endsWith('.md'); })
      .forEach(function (e) {
        var filePath = path.join(capsDir, e.name);
        var content = loadMarkdown(filePath);
        if (!content) return;

        // Extract first heading as name, first paragraph as summary
        var nameMatch = content.match(/^#\s+(.+)$/m);
        var name = nameMatch ? nameMatch[1].trim() : e.name.replace('.md', '');

        // Extract ID from filename (e.g., "A01-browser-rendering.md" → "A01")
        var idMatch = e.name.match(/^([A-Z]\d+)/);
        var id = idMatch ? idMatch[1] : e.name.replace('.md', '');

        // Try to extract layer from content
        var layerMatch = content.match(/层[：:]\s*(.+?)$/m);
        var layer = layerMatch ? layerMatch[1].trim() : '未知';

        // Extract first paragraph after the heading
        var bodyStart = content.indexOf('\n');
        var body = bodyStart >= 0 ? content.slice(bodyStart + 1).trim() : '';
        var firstPara = body.split(/\n\n/)[0] || '';
        var summary = firstPara.slice(0, 200);

        result.push({ id: id, name: name, layer: layer, summary: summary });
      });

    return result;
  } catch (err) {
    return [];
  }
}

/**
 * Load all data assets from the work directory.
 * Returns a RawData structure with existence flags for each file.
 *
 * @param {string} workDir - Working directory path (where .meta/ lives)
 * @returns {object} RawData structure
 */
function loadAll(workDir) {
  var metaDir = path.join(workDir, '.meta');

  // Load JSON files with existence checking
  var requirement = loadJson(path.join(metaDir, 'requirement-web.json'));
  var partition = loadJson(path.join(metaDir, 'partition-analysis.json'));
  var rawMaterials = loadJson(path.join(metaDir, '.raw-materials', 'index.json'));
  var capabilityGraph = loadJson(path.join(metaDir, 'capability-graph.json'));
  var evaluations = loadJson(path.join(metaDir, 'evaluations.json'));
  var researchGrouping = loadJson(path.join(metaDir, 'research-grouping.json'));

  // Load markdown content files
  var propositionFiles = loadPropositionFiles(workDir);
  var capabilitySummaries = loadCapabilitySummaries(workDir);

  return {
    requirement: requirement,
    partition: partition,
    rawMaterials: rawMaterials,
    capabilityGraph: capabilityGraph,
    evaluations: evaluations,
    researchGrouping: researchGrouping,
    propositionFiles: propositionFiles,
    capabilitySummaries: capabilitySummaries,
  };
}

module.exports = {
  loadJson: loadJson,
  loadMarkdown: loadMarkdown,
  loadAll: loadAll,
  loadPropositionFiles: loadPropositionFiles,
  loadCapabilitySummaries: loadCapabilitySummaries,
  scanPropositionDirs: scanPropositionDirs,
  PROP_TABS: PROP_TABS,
};
