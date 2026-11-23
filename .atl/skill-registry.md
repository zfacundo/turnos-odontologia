# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

Project-level (`.claude/skills/`, identical copy in `.agents/skills/`) wins over user-level.

| Trigger | Skill | Path |
|---------|-------|------|
| Implement/continue tasks of an OpenSpec change; "openspec apply", "opsx apply" | openspec-apply-change | .claude/skills/openspec-apply-change/SKILL.md |
| Archive a completed change; "openspec archive", "opsx archive" | openspec-archive-change | .claude/skills/openspec-archive-change/SKILL.md |
| Think/investigate before or during a change; "openspec explore", "opsx explore" | openspec-explore | .claude/skills/openspec-explore/SKILL.md |
| Create a change with all artifacts in one step; "openspec propose", "opsx propose" | openspec-propose | .claude/skills/openspec-propose/SKILL.md |
| Sync delta specs into main specs without archiving; "openspec sync", "opsx sync" | openspec-sync-specs | .claude/skills/openspec-sync-specs/SKILL.md |
| Revise/reconcile planning artifacts of a change; "openspec update change", "opsx update" | openspec-update-change | .claude/skills/openspec-update-change/SKILL.md |
| Start/resume project foundation (openspec init, KB, roadmap, skills, instructions); /active-orchestrator init | active-orchestrator | ~/.claude/skills/active-orchestrator/SKILL.md |
| Generate/update AGENTS.md / CLAUDE.md; "armar las reglas del proyecto", "generar claude.md" | agent-instruction | ~/.claude/skills/agent-instruction/SKILL.md |
| Discovery/research before the KB (competitors, Q&A checklist) | discovery-research | ~/.claude/skills/discovery-research/SKILL.md |
| "how do I do X", "find a skill for X", discover/install skills | find-skill | ~/.claude/skills/find-skill/SKILL.md |
| Create/build knowledge base; "armar base de conocimiento", "crear KB" | kb-creator | ~/.claude/skills/kb-creator/SKILL.md |
| Create/regenerate CHANGES.md / roadmap; "armar CHANGES", "armar roadmap" | roadmap-generator | ~/.claude/skills/roadmap-generator/SKILL.md |
| Create, edit, evaluate or optimize skills | skill-creator | ~/.claude/skills/skill-creator/SKILL.md |
| Research a competitor/solution from a URL (WebFetch/WebSearch) | web-scraper | ~/.claude/skills/web-scraper/SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

Common to all openspec-* skills: requires `openspec` CLI (`allowed-tools: Bash(openspec:*)`). If the workflow was auto-selected (user never named OpenSpec/the skill), stop using OpenSpec and answer normally. If the user explicitly asked for OpenSpec but the project is not set up, stop before writing and ask how to proceed (`openspec init`, etc.). `openspec/config.yaml` `context`/`rules` are constraints for YOU, never copy them into files. Project config: schema `spec-driven`, artifacts in Spanish (es), keep OpenSpec headings and SHALL/MUST in English.

### openspec-propose
- Planning only: never implement/apply or edit project code, even if the request says so.
- Create change with `openspec new change "<kebab-name>"`; if it exists, ask continue vs new.
- Artifacts: proposal.md (what/why), `specs/<capability>/spec.md` (DELTA, not main spec), design.md (how), tasks.md.
- Follow each artifact's `instruction` field from `openspec instructions <id> --change <name> --json`; use `template` as structure.
- Create every artifact that apply transitively depends on, not only `apply.requires`.
- Re-read dependency artifacts from disk before creating the next one; verify each file exists after writing.
- Ask only about ambiguities that change scope/behavior/compat/acceptance; record other assumptions.
- End with: "plan ready for review, ask me to apply it".

### openspec-apply-change
- Start: `openspec status --change <n> --json`, `openspec instructions apply --change <n> --json`; read all contextFiles first.
- Work through tasks until done or blocked; update the exact checkbox (sourcePath + line) immediately after each task.
- Mark `- [x]` only if the specified behavior is FULLY implemented; never silently narrow/defer/simplify scope.
- Ambiguous task, error, blocker or design issue -> pause and ask / suggest artifact updates; do not guess.
- Keep code changes minimal and scoped to the task; preserve CLI blocked/ready/all-done semantics.
- Do not copy runtime context/guidance into code or artifacts; report conflicts with controlling inputs.
- Not phase-locked: may run before all artifacts are done if tasks exist.

### openspec-archive-change
- Announce/select the change (prompt if ambiguous); check completion via `openspec status --json`.
- Warnings (incomplete tasks/artifacts) inform + confirm, never hard-block.
- If delta specs exist: run sync assessment first and show combined summary before prompting.
- Sync = run `openspec-sync-specs` inline (or merge inline with same safeguards); NEVER archive while a sync is in flight; verify main specs before moving.
- Delete a spec whose last requirement is removed only if `.openspec.yaml` has `retire_capabilities: true`.
- `.openspec.yaml` moves with the directory to `openspec/changes/archive/YYYY-MM-DD-<name>/`.
- Show a clear summary of what happened.

### openspec-explore
- Thinking-partner mode: NEVER write code/implement; also no creating/editing schemas, templates or `openspec/config.yaml`.
- Read-only commands OK; ask before the first write-capable action (incl. `openspec new change`). Do not auto-capture insights.
- Ask one focused question at a time, resolve blocking decisions first, offer grounded recommendations with tradeoffs.
- Keep decisions in conversation (separate confirmed vs proposed vs unresolved); silence is not acceptance.
- Ground in the real codebase; use ASCII diagrams; check `openspec list --json` for active changes.
- Offer to flow into a proposal, update artifacts, or just end; no forced structure.

### openspec-sync-specs
- Read both delta and main specs before changing anything; use only `artifactPaths.specs.existingOutputPaths` (honor a caller-supplied subset).
- Delta ops: ADDED / MODIFIED / REMOVED / RENAMED (FROM/TO) Requirements; MODIFIED carries the whole requirement with all surviving scenarios.
- Never copy a delta file as-is into a main spec; merge so main spec keeps `## Purpose` + `## Requirements` format with no delta headers.
- Preserve content the delta does not mention, in existing order; each requirement has `#### Scenario` with WHEN/THEN.
- Idempotent; fetch specs instructions once; stop before any write on non-zero/invalid JSON.
- Show what is changing; ask when unclear.

### openspec-update-change
- Planning artifacts only; NEVER edit implementation code (identify needed code changes and stop).
- Use artifact ids/paths from `openspec status`; edit only `existingOutputPaths` (+ confirmed paths in a partly populated glob artifact).
- Confirm every edit with the user before writing; keep artifacts coherent with each other.
- Do not create missing ready/blocked artifacts here (separate step); leave `skipped` untouched.
- If the request changes the change's INTENT, ask for a new name and recommend `openspec new change`.
- `openspec update` CLI command (refresh generated files) is NOT this skill: run the command.

### active-orchestrator
- First pick route: direct (bounded, ~1 day, clear acceptance) vs foundation (multi-session, handoffs); let user correct it.
- Inspect read-only, show ONE checklist of phases (discovery, kb, visual-design, roadmap, task-management, team-mode, memory-policy, find-skill, registry, agents) with outputs/variants/reuse.
- Required core outputs: kb, roadmap (local CHANGES.md), agents. Requires explicit approval of the plan before writing state, installing or connecting anything.
- Order: discovery -> kb -> roadmap -> task-management -> team-mode -> memory-policy -> registry -> agents.
- State in `.active-orchestrator-state.json`; reuse existing artifacts, never re-run completed phases; preserve a completed foundation on standalone phases.
- In Claude Code invoke as `/active-orchestrator <action>` (init, kb, team, memory, ...).

### agent-instruction
- Pre-check: `knowledge-base/` must exist (run kb-creator first); also uses CHANGES.md and `.atl/skill-registry.md` if present.
- Modes: generate (only write missing paths), reuse (validate links, no writes), update (show diff for approval, snapshot before writing).
- Output sections: Stack, Base de Conocimiento, Skills Disponibles, Roadmap de Changes, Reglas Duras, Flujo de Trabajo.
- Do NOT repeat rules already in the global client instructions; if a universal rule is missing from global, include it in the project file.
- Hard rules are stack-aware and confirmed interactively with the user; no Engram Cloud duplication.
- Links: root `AGENTS.md` uses `knowledge-base/`, `CHANGES.md`; `.claude/CLAUDE.md` uses `../` prefix. Respect `<!-- active-stack:* -->` managed blocks.

### discovery-research
- Phase before KB: run web-scraper if competitor URLs exist, then guided Q&A on the 11-point checklist (references/checklist.md).
- Never fill a checklist point with an assumption when it can be asked or researched.
- Final gate: summary + explicit user confirmation before writing.
- Output: `discovery/discovery.md` + `state.discovery` (input for kb-creator, not a replacement).
- Whether to do discovery is the orchestrator's decision, not this skill's. Governance MEDIA: checkpoints.

### find-skill
- Use `npx skills find <query>`, `npx skills add <pkg>`, `npx skills update`; check the skills.sh leaderboard first.
- Verify quality (install count, source reputation) before recommending; present options with install command.
- Offer to install only after user choice; if nothing found, say so and offer to help directly.

### kb-creator
- Output: `knowledge-base/` at project root with the 10 canonical files (01_vision_y_objetivos ... 10_preguntas_abiertas) + README index; optional extras 11+.
- Modes: import (silent from docs/ or confirmed sources), interview (interactive), reuse (verify only, no writes).
- If a complete KB already exists, suggest targeted edits instead of regenerating.
- Mark inferred items `**Suposición:**`; interview mode challenges weak decisions and flags risks.
- Records state in `state.kb` (source: ingest | interactive); templates in assets/canonical-templates.md.

### roadmap-generator
- Pre-check: `knowledge-base/` exists with the 10 canonical files, else stop and point to kb-creator.
- Output: single `CHANGES.md` at project root; do not add/remove first-level sections (contract).
- Always read KB 04, 06, 07, 08; optionally 03, 05, 10.
- Change IDs `C-NN` (2-digit), kebab-case names, never renumber/recycle IDs; each has Estado, Scope, Dependencias, Governance (BAJO/MEDIO/ALTO/CRITICO), Leer antes.
- Include dependency tree, parallelism GATES, critical path, 3-agent plan, FASE sections.
- If CHANGES.md exists, propose a targeted revision and wait for confirmation. ClickUp publishing goes through `active-roadmap`.

### skill-creator
- Flow: capture intent -> interview -> draft SKILL.md -> test prompts/evals -> iterate -> optimize description.
- Adapt vocabulary to user's technical level; skip evals if the user just wants to iterate informally.
- Frontmatter needs `name` and trigger-rich `description`; keep SKILL.md concise, move detail into references/assets.

### web-scraper
- Input one competitor URL; fetch with WebFetch/WebSearch (no API keys); no crawling, no JS-heavy/anti-bot sites.
- Fixed 8-field markdown output schema, always all fields, same order.
- Never invent data the page does not show; mark empty fields explicitly.

## Project Conventions

No `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `GEMINI.md` or `copilot-instructions.md` exist yet in the project. Conventions currently live in the files below (KB, roadmap, OpenSpec config).

| File | Path | Notes |
|------|------|-------|
| KB index | knowledge-base/README.md | Index of the 10 canonical KB files |
| Vision y objetivos | knowledge-base/01_vision_y_objetivos.md | |
| Descripcion general / stack | knowledge-base/02_descripcion_general.md | |
| Actores y roles | knowledge-base/03_actores_y_roles.md | |
| Modelo de datos | knowledge-base/04_modelo_de_datos.md | |
| Reglas de negocio | knowledge-base/05_reglas_de_negocio.md | |
| Funcionalidades | knowledge-base/06_funcionalidades.md | |
| Flujos principales | knowledge-base/07_flujos_principales.md | |
| Arquitectura propuesta | knowledge-base/08_arquitectura_propuesta.md | |
| Decisiones y supuestos | knowledge-base/09_decisiones_y_supuestos.md | |
| Preguntas abiertas | knowledge-base/10_preguntas_abiertas.md | |
| Roadmap / change index | CHANGES.md | Operational index of changes (C-NN) |
| OpenSpec config | openspec/config.yaml | schema spec-driven; artifacts in Spanish |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
