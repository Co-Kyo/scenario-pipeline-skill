'use strict';

/**
 * Shell Injector — Injects PipelineData JSON into the prebuilt dashboard-shell.html.
 *
 * This module replaces the PIPELINE_DATA_PLACEHOLDER in the shell HTML with
 * the actual PipelineData JSON, properly escaped for inline <script> embedding.
 *
 * Key safety measure: </script> tags in the JSON are escaped to <\/script>
 * to prevent the HTML parser from prematurely closing the script block.
 * This pattern is inherited from build-dashboard-v2.js L88-92.
 *
 * Zero third-party dependencies — Node.js built-in modules only.
 */

const fs = require('fs');
const path = require('path');

/**
 * Placeholder marker in the shell HTML.
 * Must match the comment in dashboard-dev/index.html.
 */
var PLACEHOLDER_MARKER = '/* PIPELINE_DATA_PLACEHOLDER */';

/**
 * Escape </script> tags in a JSON string for safe inline embedding.
 *
 * The HTML parser doesn't understand JS string contexts — it will close
 * a <script> block at the first </script> it encounters, even inside a
 * string literal. This function replaces all case-insensitive </script>
 * occurrences with <\/script> (which JS treats identically).
 *
 * @param {string} jsonStr - JSON string to escape
 * @returns {string} Escaped JSON string
 */
function escapeScriptTags(jsonStr) {
  return jsonStr
    .replace(/<\/script>/gi, '<\\/script>')
    .replace(/<\/SCRIPT>/g, '<\\/SCRIPT>');
}

/**
 * Inject PipelineData into the shell HTML.
 *
 * @param {string} shellHtml - The content of dashboard-shell.html
 * @param {object} pipelineData - The PipelineData object to inject
 * @returns {string} Complete HTML with data injected
 */
function inject(shellHtml, pipelineData) {
  // Serialize data with no indentation for minimal file size
  var jsonStr = JSON.stringify(pipelineData, null, 0);

  // Escape </script> for HTML parser safety
  var escapedJson = escapeScriptTags(jsonStr);

  // Build the replacement: window.__PIPELINE_DATA__ = {...};
  var replacement = 'window.__PIPELINE_DATA__ = ' + escapedJson + ';';

  // Replace the placeholder
  var result = shellHtml.replace(PLACEHOLDER_MARKER, replacement);

  // Verify replacement occurred
  if (result.indexOf(PLACEHOLDER_MARKER) >= 0) {
    throw new Error('PIPELINE_DATA_PLACEHOLDER was not replaced. Shell HTML may be malformed.');
  }

  return result;
}

/**
 * Read the shell HTML from the dashboard-dist directory.
 *
 * @param {string} shellPath - Absolute path to dashboard-shell.html
 * @returns {string} Shell HTML content
 * @throws {Error} If shell file doesn't exist or can't be read
 */
function readShell(shellPath) {
  if (!fs.existsSync(shellPath)) {
    throw new Error(
      'Shell HTML not found at: ' + shellPath + '\n' +
      'Run "npm run build" in scripts/dashboard-dev/ to generate the shell.'
    );
  }
  return fs.readFileSync(shellPath, 'utf-8');
}

/**
 * Write the final HTML to the output path.
 *
 * @param {string} html - Complete HTML string
 * @param {string} outputPath - Absolute path to write dashboard.html
 */
function writeOutput(html, outputPath) {
  // Ensure output directory exists
  var outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, html, 'utf-8');
}

module.exports = {
  inject: inject,
  escapeScriptTags: escapeScriptTags,
  readShell: readShell,
  writeOutput: writeOutput,
  PLACEHOLDER_MARKER: PLACEHOLDER_MARKER,
};
