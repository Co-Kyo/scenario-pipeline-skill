# AGENTS.md

## What This Repo Is

A **skill definition** for an LLM agent platform. It defines a multi-stage pipeline (Markdown + JSON) that transforms tech articles into structured knowledge products: topic research, capability knowledge base, and learning ladders. **No code, no build system, no tests.** The "build" is an LLM reading these files and executing the instructions.

OpenCode is used to develop and maintain these Markdown/JSON files.

## File Structure

| Directory | Purpose | Edit frequency |
|-----------|---------|---------------|
| `SKILL.md` | Skill entry point — frontmatter + pipeline overview + execution protocol | Rare |
| `processes/00-intent-anchor.md` ... `09-learning-ladder.md` | Step-by-step execution docs (the "code") | Medium |
| `assets/{step-id}/schemas.md` | JSON output formats for each step (§0-§7 sections) | Medium |
| `assets/{step-id}/method.md` | Methodology definitions (algorithms, scoring, grouping) | Medium |
| `assets/common/rule-isolation.md` | Context isolation: each step reads only its own files | Low |
| `assets/common/protocol-checkpoint.md` | Checkpoint protocol: mandatory pause + barrier records | Low |
| `assets/common/rule-reuse.md` | Incremental reuse: file-existence-based skip | Low |
| `assets/common/convention-trace.md` | Decision credentials: _trace field naming | Low |
| `assets/common/strategy-level.md` | Dynamic strategy table, level_weight rules, integrator def | Low |
| `assets/common/protocol-scheduling.md` | Sub-agent scheduling (3 modes), label naming, validation | Low |
| `assets/common/ref-sources.md` | Domain tier table (T0/T1/T2/T3) + anti-crawl domains | Low |
| `assets/common/ref-paths.md` | Path conventions for all outputs | Low |
| `plugins/*.md` | Optional enhancements loaded by specific steps | Low |
| `dev/` | Human-only: design docs, observation views. **Never loaded during pipeline execution.** | — |

## How Files Connect

```
SKILL.md (trigger + overview)
  └─ references → processes/*.md (execution steps)
                    ├─ references → assets/{step-id}/schemas.md §N (output format)
                    ├─ references → assets/{step-id}/method.md (how to do it)
                    ├─ references → assets/common/*.md (shared rules)
                    └─ may load → plugins/*.md (optional enhancement)
```

Each `processes/{step}.md` declares a **preconditions** section listing exactly which files it reads. This is the source of truth for file dependencies.

## Critical Development Rules

### 1. Context Isolation (development side)

When editing a process file, you must understand that the **executing agent** will only read files listed in that step's preconditions. If you add a reference to a new file in a process file, you must also ensure that file exists and contains the right content.

### 2. schemas.md is sectioned

Each `assets/{step-id}/schemas.md` contains output formats for **all steps** in sections §0-§7. When editing, only modify the §N section relevant to that step. Use `read` with offset/limit to target the right section.

### 3. Naming conventions are enforced downstream

- Capability IDs: prefix + number (`A1`=generic, `V1`=Vue, `R1`=React, `W1`=Webpack, `VI1`=Vite)
- Topic seq numbers: two digits starting at `01` (`01-长列表渲染/`)
- Output paths: `{workDir}/{seq}-{short_name}/` for topics, `{workDir}/capabilities/` for capabilities
- Agent labels: `brainstorm-{dimension}`, `search-{batch_id}`, `extract-{batch_id}`, `agent-{group_id}`, etc.

### 4. Plugin loading is conditional

Plugins (`plugins/*.md`) are only loaded when a step's preconditions explicitly reference them. Don't add plugin references to steps that don't need them. Current plugins:

- `capability-research-mode.md` — loaded by Step ④ (capability research)
- `anti-crawl-fetch.md` — loaded by Step ① scan when Playwright is needed
- `year-granularity.md` — loaded by Steps ①/⑤ when `--year` is specified

### 5. Checkpoints are mandatory stops

Every barrier (ⓩ ⓧ ⓐ ⓑ ⓒ ⓓ ⓕ ⓖ) must include a `clarify` call that pauses execution. If you edit a process file, ensure the checkpoint flow is preserved.

## Gotchas

- **No code to run.** There's no `npm install`, `make`, `pytest`, or similar. Verification means reading the Markdown and checking internal consistency.
- **Anti-crawl domains are hardcoded** in `assets/common/ref-sources.md`. If a new domain needs anti-crawl handling, add it there — not in individual process files.
- **`dev/` is off-limits** for pipeline execution. It's for human developers only.
- **SKILL.md frontmatter** (`name`, `description`, trigger words) is the skill's API surface. Changes here affect how the platform discovers and triggers the skill.
- **Chinese content is primary.** Process files, schemas, and domain terminology are in Chinese. Keep edits consistent with the existing language.
- **Incremental reuse** is file-existence-based. If you add a new output file to a step, document its path in `assets/common/ref-paths.md` so the reuse logic can find it.
