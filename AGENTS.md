# AGENTS.md — Scenario Pipeline Skill

## What This Repo Is

Pure Markdown skill definition for an AI pipeline that transforms technical articles into structured interview preparation materials. **No code to build, test, or lint.** The executable content is in `SKILL.md`, `processes/`, `core/`, `meta/`, and `plugins/`.

## Critical Convention: Context Isolation Protocol

**Every step reads only its own files. Never pre-load subsequent steps.**

Violation = loading `processes/03-*.md` while executing Step 02, or loading `core/*.md` during initialization.

- Each `processes/{step}-xxx.md` declares its own "前置条件" (prerequisites) — read only those files
- `meta/output-contracts.md` has sections §0–§7; read only the §N matching the current step
- `dev/` is human-facing documentation; agents skip it during execution

## Execution Entry Point

1. Read `SKILL.md` (full pipeline spec + trigger patterns)
2. Read `core/shared-conventions.md` (shared rules — loaded once, held throughout)
3. Read `meta/paths.md` (path conventions — loaded once)
4. **Confirm `workDir` with user** before proceeding (default path shown, wait for acknowledgment)

## Process Steps (strict order)

| Step | File | Output |
|------|------|--------|
| ⓪ Brainstorm | `processes/00-brainstorm.md` | `requirement-web.json` |
| ① Partition | `processes/01-partition.md` | `partition-analysis.json` + `execution-plan.md` |
| ② Scan | `processes/02-scan.md` | `.raw-materials/` (index + markdown) |
| ③ Capability Graph | `processes/03-capability-graph.md` | `capability-graph.json` |
| ④ Evaluate Pool | `processes/04-evaluate-pool.md` | `evaluations.json` + `README.md` |
| ⑤–⑨ Post-processing | `processes/05-09` | capabilities, briefings, assemblies, ladder, dashboard |

Steps ②–④ run serially. Steps ⑤–⑧ run with parallel sub-agents (concurrency W=5). Step ⑨ runs in main thread.

## Checkpoints (mandatory user confirmation)

9 checkpoints (ⓩ–ⓗ) between steps. Each must:
1. Show summary statistics
2. Write checkpoint record to `{workDir}/.meta/checkpoints/barrier-{N}.md`
3. **Stop and wait for user response** — never auto-advance

Skip conditions: `--batch=pending` mode or user says "全部确认".

## Key Conventions

- **Path placeholders**: `{skillDir}` = directory containing `SKILL.md` (set when agent reads SKILL.md). `{workDir}` = output directory (confirmed with user at init). Use these in all path references.
- **Level/role system**: `target_level` (L1–L4) drives all parameter adjustments. `role` (core/premise/outlook) determines scan depth, research depth, and assembly completeness.
- **Sub-agent labeling**: Follow exact patterns in `core/shared-conventions.md` §Label 命名规范 (e.g., `brainstorm-scenario`, `asm-md-01-长列表渲染`).
- **File validation**: After each sub-agent completes, verify file exists + JSON valid + key fields present. Retry once on failure.
- **Large JSON writes**: Use `exec + Python` for merged JSON > 20KB, not `write` tool.
- **Incremental reuse**: Skip any step whose output file already exists (check file existence, no state file needed).

## Scripts (not part of skill execution)

`{skillDir}/scripts/` contains Python/JS utilities for dashboard building and analysis. Run manually when needed:
```
node {skillDir}/scripts/build-dashboard-v2.js {workDir}
```

## Directory Boundaries

| Directory | Purpose | Agent reads? |
|-----------|---------|-------------|
| `SKILL.md` | Entry point + pipeline spec | Yes (start here) |
| `core/` | Methodology definitions | Per step's prerequisites |
| `meta/` | Data schemas + path conventions | Per step's prerequisites |
| `processes/` | Step-by-step execution docs | One at a time, strict order |
| `plugins/` | Optional enhancements | Per step's prerequisites |
| `dev/` | Design docs + tools | No (human/audit only) |
| `scripts/` | Utility scripts | Only step ⑨ dashboard build |
