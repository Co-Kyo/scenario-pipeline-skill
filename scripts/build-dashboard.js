#!/usr/bin/env node
'use strict';

/**
 * build-dashboard.js — Incremental dashboard build entry point.
 *
 * Usage:
 *   node scripts/build-dashboard.js {workDir} [--step=N] [--verbose] [--legacy]
 *
 * This script:
 * 1. Loads all .meta/*.json and markdown content from {workDir}
 * 2. Transforms raw data into PipelineData
 * 3. Injects data into dashboard-shell.html
 * 4. Writes {workDir}/dashboard.html
 *
 * Error handling:
 * - Shell HTML not found → error and exit
 * - All .meta files missing → generate skeleton state (all EmptyState)
 * - Individual file errors → skip that file, continue with others
 *
 * Zero third-party dependencies — Node.js built-in modules only.
 */

const fs = require('fs');
const path = require('path');

// Import build modules
const { loadAll } = require('./lib/data-loader');
const { transform } = require('./lib/data-transformer');
const { inject, readShell, writeOutput } = require('./lib/shell-injector');

/**
 * Parse CLI arguments.
 * @returns {{workDir: string, step: number|null, verbose: boolean, legacy: boolean}}
 */
function parseArgs() {
  var args = process.argv.slice(2);

  // Check for --help first, before any other processing
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  var workDir = args.find(function(a) { return !a.startsWith('-'); }) || process.cwd();
  var step = null;
  var verbose = false;
  var legacy = false;

  for (var i = 0; i < args.length; i++) {
    var arg = args[i];
    if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--legacy') {
      legacy = true;
    } else if (arg.startsWith('--step=')) {
      step = parseInt(arg.split('=')[1], 10);
      if (isNaN(step) || step < 0 || step > 9) {
        console.error('Error: --step must be a number between 0 and 9');
        process.exit(1);
      }
    }
  }

  return { workDir: workDir, step: step, verbose: verbose, legacy: legacy };
}

/**
 * Print help message.
 */
function printHelp() {
  console.log([
    'Usage: node build-dashboard.js {workDir} [options]',
    '',
    'Options:',
    '  --step=N    Current pipeline step (0-9). Used for progress inference.',
    '  --verbose   Enable verbose logging.',
    '  --legacy    Use legacy build-dashboard-v2.js instead.',
    '  --help      Show this help message.',
    '',
    'Output:',
    '  {workDir}/dashboard.html — self-contained HTML dashboard',
    '',
    'Example:',
    '  node scripts/build-dashboard.js /path/to/workDir --step=3 --verbose',
  ].join('\n'));
}

/**
 * Main build function.
 */
function main() {
  var opts = parseArgs();

  console.log('=== Scenario Pipeline Dashboard Builder ===');
  console.log('workDir:', opts.workDir);
  if (opts.step !== null) console.log('step:', opts.step);
  if (opts.verbose) console.log('verbose: enabled');

  // Handle legacy mode
  if (opts.legacy) {
    console.log('Using legacy builder (build-dashboard-v2.js)...');
    var legacyScript = path.join(__dirname, 'build-dashboard-v2.js');
    if (!fs.existsSync(legacyScript)) {
      console.error('Error: Legacy script not found:', legacyScript);
      process.exit(1);
    }
    var { execSync } = require('child_process');
    execSync('node "' + legacyScript + '" "' + opts.workDir + '"', { stdio: 'inherit' });
    return;
  }

  // Step 1: Load all data
  console.log('\n[1/4] Loading data...');
  var rawData = loadAll(opts.workDir);

  var loadedCount = 0;
  var missingCount = 0;
  Object.keys(rawData).forEach(function (key) {
    if (key === 'propositionFiles' || key === 'capabilitySummaries') {
      if (rawData[key] && rawData[key].length > 0) loadedCount++;
      return;
    }
    if (rawData[key] && rawData[key].exists) {
      loadedCount++;
      if (opts.verbose) console.log('  ✓ ' + key);
    } else {
      missingCount++;
      if (opts.verbose) console.log('  ✗ ' + key + (rawData[key] && rawData[key].error ? ' (' + rawData[key].error + ')' : ''));
    }
  });
  console.log('  Loaded: ' + loadedCount + ' sources, Missing: ' + missingCount);

  if (loadedCount === 0) {
    console.log('  Warning: No data files found. Generating skeleton dashboard.');
  }

  // Step 2: Transform data
  console.log('\n[2/4] Transforming data...');
  var pipelineData = transform(rawData, opts.step);
  console.log('  PipelineData built: step=' + pipelineData.meta.currentStep +
    ', checkpoints=' + pipelineData.progress.completedCheckpoints.length + '/' + pipelineData.progress.totalCheckpoints);

  // Step 3: Read shell and inject data
  console.log('\n[3/4] Injecting data into shell...');
  var shellPath = path.join(__dirname, 'dashboard-dist', 'dashboard-shell.html');
  var shellHtml;
  try {
    shellHtml = readShell(shellPath);
  } catch (err) {
    console.error('\nError: ' + err.message);
    console.error('\nTo generate the shell, run:');
    console.error('  cd scripts/dashboard-dev && npm install && npm run build');
    process.exit(1);
  }

  var finalHtml = inject(shellHtml, pipelineData);
  console.log('  Injected. HTML size: ' + (finalHtml.length / 1024).toFixed(1) + ' KB');

  // Step 4: Write output
  console.log('\n[4/4] Writing output...');
  var outputPath = path.join(opts.workDir, 'dashboard.html');
  writeOutput(finalHtml, outputPath);
  console.log('  Written: ' + outputPath);

  console.log('\n=== Done ===');
}

// Run main
try {
  main();
} catch (err) {
  console.error('\nFatal error:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
}
