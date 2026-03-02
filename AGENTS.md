# AGENTS.md

Execution guide for contributors and coding agents working on `obsidian-pdf-plus`.

## 1. Mission

Upgrade and refactor the plugin safely while preserving its core user workflow:
- copy link to PDF selection/annotation,
- backlink visualization,
- write-to-file annotations,
- PDF embed and navigation behavior.

Prioritize compatibility, predictable behavior, and fast iteration.

## 2. Source of Truth

Use primary documentation only:
- Obsidian developer docs: https://docs.obsidian.md/Plugins
- Obsidian TypeScript API reference: https://docs.obsidian.md/Reference/TypeScript%2BAPI
- Obsidian API typings repo: https://github.com/obsidianmd/obsidian-api
- PDF.js docs root: https://mozilla.github.io/pdf.js/
- PDF.js API docs: https://mozilla.github.io/pdf.js/api/
- PDF.js examples: https://mozilla.github.io/pdf.js/examples/

If "latest" matters, verify online before making version claims.

## 3. Skills to Use

Use these local skills explicitly when relevant:
- `$obsidian-plugin`: Obsidian plugin quality/submission/API best practices.
- `$pdfjs-dev`: PDF.js integration/debugging playbook for render lifecycle, layer alignment, and performance triage.

Rule:
- Obsidian API/lifecycle/UI changes -> use `$obsidian-plugin`.
- PDF.js rendering/layer/worker/cancelation issues -> use `$pdfjs-dev`.
- Cross-cutting changes should use both.

## 4. Current Baseline (as of 2026-03-02)

Repository currently resolves to:
- `obsidian@1.8.7` typings in lockfile.
- `pdfjs-dist@5.4.54` in lockfile.

This is behind latest upstream versions. Treat upgrades as controlled migrations, not a single bulk bump.

## 5. Architecture Hotspots

High-risk files (large + behavior-dense):
- `src/settings.ts`
- `src/patchers/pdf-internals.ts`
- `src/lib/copy-link.ts`
- `src/context-menu.ts`

Upgrade strategy:
- avoid broad rewrites,
- isolate unstable host internals behind adapters,
- preserve user-facing behavior first, then simplify internals.

## 6. Upgrade Plan

### Phase 0: Baseline and Guardrails
- Keep `pnpm run typecheck` and `pnpm run lint` green.
- Maintain manual regression checklist in `docs/upgrade_regression_checklist.md`.
- Use `scripts/setup-obsidian-dev-vault.sh` for local vault linkage.

### Phase 1: Compatibility Adapter Layer
- Centralize private/unstable Obsidian PDF internals access in `src/adapters/`.
- Replace scattered direct private-field access incrementally.
- Keep behavior unchanged while refactoring call sites.

### Phase 2: Annotation Write Flow Decoupling
- Introduce `AnnotationIntent` + write queue + optimistic UI overlay.
- Decouple immediate visual feedback from disk write completion.
- Start with highlight flow only, keep fallback path.

### Phase 3: Module Decomposition
- Split oversized files into focused modules by responsibility.
- Preserve existing command IDs/settings keys for compatibility.

### Phase 4: Verification and Hardening
- Add targeted tests for pure logic and parsing helpers.
- Expand smoke coverage for write-file and highlight workflows.

## 7. Coding Rules

- Prefer minimal, reversible changes.
- Do not break settings schema or existing command IDs.
- Do not remove compatibility shims without proving target versions are covered.
- Keep patch points observable with low-noise debug logs when investigating issues.
- Remove temporary diagnostics after validation.

## 8. PR Definition of Done

A change is ready only if all are true:
- `pnpm run typecheck` passes.
- `pnpm run lint` passes.
- Relevant items in `docs/upgrade_regression_checklist.md` are manually verified.
- Risk and fallback are documented in PR notes.

## 9. Branching

Use `codex/*` branch names for agent-driven work.
Recommended pattern:
- `codex/upgrade-phase0-phase1-*`
- `codex/annotation-intent-phase2-*`

## 10. Non-Goals (for now)

- No full rewrite of patching architecture in one step.
- No "latest version" upgrade without staged compatibility checks.
- No changes that trade correctness for cosmetic cleanup.
