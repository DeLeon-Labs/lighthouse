# Lighthouse TypeScript Migration Plan

- Plan date: 2026-06-22
- Baseline: `simple-drafts-navigator-v0.23.0-alpha-focus-simplification/`
- Strategy: preserve behavior first, improve architecture second

## Non-negotiable constraints

The migration must not silently change:

- the plugin ID, display name, command IDs, view type, or CSS class names;
- the meaning or defaults of saved settings;
- the Recents, Files, or Focus interaction model;
- Sources, Work, Unfiled, global-item, or named-Focus behavior;
- desktop or mobile support;
- release contents expected by Obsidian.

The existing snapshot remains untouched until the TypeScript build is accepted.
No files are moved or deleted by this plan without a separate reviewed proposal.

## Migration principles

1. Make the build reproducible before reorganizing behavior.
2. Treat the current JavaScript and CSS as a behavioral and visual reference,
   not as disposable generated files.
3. Separate mechanical conversion from design cleanup.
4. Preserve unknown and legacy saved-state fields until compatibility is tested.
5. Keep each phase independently reviewable and reversible.
6. Test on both desktop and mobile before retiring any baseline artifact.

## Phase 0 — Record the baseline

**Goal:** make the current alpha observable before introducing build tooling.

Actions:

- Keep the entire `0.23.0-alpha` snapshot in its current location.
- Record checksums for `main.js`, `styles.css`, and `manifest.json` so the
  baseline can be identified exactly.
- Add `docs/testing.md` with a manual smoke-test matrix covering:
  - plugin load/unload and view restoration;
  - Recents sorting, previews, dates, pinning, and active-Focus filtering;
  - Files navigation, expand/collapse, sorting, watched folders, drag/drop, and
    reveal-current-file behavior;
  - Focus creation, editing, deletion, switching, Sources/Work/Unfiled
    assignment, global items, bookmarks, open tabs, and watched folders;
  - note creation, quick capture, daily note, and open-file commands;
  - settings persistence, vault rename/delete handling, and reload behavior;
  - scroll controls in Reading and Editing modes;
  - desktop sidebar/main-pane behavior and mobile tap behavior.
- Capture reference screenshots for the three tabs and key modals at agreed
  desktop and mobile sizes.
- Review `data.json`; do not use it as a fixture until it is sanitized.

Exit criteria:

- the baseline files are identifiable;
- the smoke checklist is repeatable;
- sensitive/local settings are understood; and
- no runtime behavior has changed.

## Phase 1 — Add the TypeScript project scaffold

**Goal:** create a maintainable project shell without switching the runtime.

Proposed additions:

- root `package.json` and lockfile;
- root `tsconfig.json`;
- root `esbuild.config.mjs`;
- root `eslint.config.mts`;
- root `.editorconfig`;
- root `manifest.json` copied from the snapshot without changing identity;
- root `versions.json` and `version-bump.mjs`;
- `src/`, `test/`, and generated `dist/` conventions;
- scripts for `dev`, `build`, `lint`, `typecheck`, `test`, and `package`.

Recommended build behavior:

1. type-check TypeScript without emitting;
2. bundle `src/main.ts` as CommonJS for Obsidian;
3. assemble authored CSS into one `styles.css`;
4. copy the canonical `manifest.json`;
5. place only `main.js`, `styles.css`, and `manifest.json` in `dist/`;
6. fail if `data.json` or unexpected files enter `dist/`.

During this phase, the current snapshot remains the runnable implementation.
The new build may initially compile a minimal non-shipping harness; it does not
replace the snapshot.

Exit criteria:

- dependencies install reproducibly;
- all project scripts run in a clean checkout;
- release packaging produces a deterministic three-file directory; and
- no existing runtime file has been replaced.

## Phase 2 — Create a behavior-equivalent TypeScript baseline

**Goal:** make TypeScript the authored representation without refactoring the
product at the same time.

Actions:

- Copy the implementation into `src/main.ts`; do not move or overwrite the
  snapshot.
- Convert `require("obsidian")` to typed imports.
- Define `LighthouseSettings`, `Focus`, layout, tab-action, and persisted legacy
  shapes. Allow documented legacy fields rather than deleting them.
- Type plugin properties, event callbacks, files/folders, views, menus, and
  modal state.
- Keep existing class boundaries and method order where practical.
- Keep command IDs, view type, notices, defaults, DOM class names, and save
  timing unchanged.
- Compile to `dist/main.js` and run the Phase 0 checklist against an isolated
  test vault.
- Compare settings written by the old and new builds using sanitized fixtures.

Avoid during this phase:

- renaming `SimpleDraftsNavigatorPlugin` or the manifest identity;
- extracting dozens of modules;
- changing settings defaults or normalization;
- consolidating CSS;
- redesigning views or commands;
- fixing unrelated issues unless they block parity and are tracked separately.

Exit criteria:

- type checking and linting pass;
- the compiled plugin loads on desktop and mobile;
- the smoke checklist matches the snapshot;
- persisted settings round-trip without data loss; and
- any intentional bundle differences are documented.

## Phase 3 — Extract modules along existing seams

**Goal:** reduce the monolith in small, behavior-neutral changes.

Recommended extraction order:

1. **Pure utilities** — Markdown preview cleanup, path helpers, bookmark tree
   traversal, date formatting, and small set operations.
2. **Settings model** — types, defaults, normalization, compatibility
   migrations, and debounced persistence.
3. **Scroll controls** — already isolated as `ScrollControls`.
4. **Modals** — Files customization, Focus editing/deletion, Home
   customization, and text input.
5. **Settings tab and suggestion controls.**
6. **Services** — pinned notes, watched folders, bookmarks, Focus membership,
   vault rename/delete reactions, and workspace layout.
7. **View features** — Recents first, Files second, Focus last. The Focus view
   has the most cross-feature state and should move only after services are
   stable.

For each extraction:

- move one responsibility per commit;
- preserve public method behavior and DOM class names;
- add unit tests for pure logic before moving the next seam;
- run the relevant manual checklist slice;
- compare generated `dist/` contents and screenshots.

Exit criteria:

- `src/main.ts` primarily coordinates lifecycle and dependencies;
- `LighthouseView` coordinates feature renderers instead of containing all
  behavior;
- saved-state compatibility remains explicit; and
- no issue fix or redesign is hidden inside an architecture commit.

## Phase 4 — Modularize styles without changing appearance

**Goal:** turn the chronological stylesheet into maintainable authored CSS.

Proposed source modules:

- `base.css` — root, typography, shared rows, buttons, and states;
- `recents.css` — recent items, previews, dates, and pins;
- `files.css` — tree, folders, files, watched indicators, drag/drop, and reveal;
- `focus.css` — Home sections, bookmarks, Focus drill-down, and membership;
- `modals.css` — settings and modal layouts;
- `scroll.css` — floating scroll controls;
- `mobile.css` — touch targets and mobile-only overrides;
- `index.css` — deterministic import order.

Do not simply deduplicate version-labeled overrides. Later declarations may be
deliberately winning the cascade. For each block:

1. identify the selector it supersedes;
2. record the final computed value;
3. move the effective rule while preserving specificity and order;
4. compare desktop and mobile screenshots;
5. keep the original snapshot stylesheet available for diagnosis.

Exit criteria:

- the build emits one `dist/styles.css`;
- computed styles and screenshots match the baseline;
- there are no unexplained version-patch blocks in authored CSS; and
- touch and responsive behavior passes the mobile checklist.

## Phase 5 — Establish checks and release packaging

**Goal:** make every future release reproducible and reviewable.

Actions:

- Add continuous checks for install, typecheck, lint, unit tests, and production
  build.
- Verify the manifest, package version, and `versions.json` agree.
- Verify the plugin ID has not changed unexpectedly.
- Verify `dist/` contains exactly the approved release files.
- Create release automation that attaches `main.js`, `manifest.json`, and
  `styles.css` to a GitHub release whose tag exactly matches the manifest
  version.
- Document local development installation and test-vault workflows.
- Add a release checklist including desktop and mobile smoke results.

Exit criteria:

- a clean checkout can reproduce the release assets;
- CI rejects type, lint, version, and packaging failures;
- an alpha release can be installed without copying `data.json`; and
- rollback to the last known-good release is documented.

## Phase 6 — Retire the snapshot only after acceptance

**Goal:** remove ambiguity about the canonical implementation after the typed
build has shipped successfully.

This phase requires a separate proposal before any move or deletion. Options
include:

- keep the snapshot permanently under a documented `legacy/` or `archive/`
  location;
- retain it only in Git history and release assets; or
- preserve a sanitized fixture plus checksums and remove the duplicate runtime
  files from the active tree.

The decision should be made only after at least one TypeScript-built alpha has
been installed, exercised, and judged equivalent. Plugin renaming is explicitly
outside this migration and should have its own compatibility decision.

## Suggested pull-request sequence

1. `docs: audit repository and define migration plan` — this documentation.
2. `build: add TypeScript and packaging scaffold` — configuration only.
3. `test: record 0.23.0 alpha behavior baseline` — checklist, sanitized fixtures,
   and pure-logic tests where possible.
4. `refactor: establish behavior-equivalent TypeScript entry point` — mechanical
   port, no feature changes.
5. Small extraction pull requests following the Phase 3 order.
6. Separate CSS-module pull requests with screenshot evidence.
7. `ci: verify and package Obsidian release assets`.
8. A later, explicit snapshot-retirement proposal.

## First decision before implementation

Choose how the development build will reach a test vault:

- symlink or copy `dist/` into a dedicated vault's
  `.obsidian/plugins/simple-drafts-navigator/` directory; or
- configure the build to write to a developer-supplied test-vault path that is
  excluded from Git.

The first option keeps builds repository-local and packaging-like. The second is
faster during active UI work but needs a safe environment variable or ignored
local configuration. Either approach must keep personal vault state and
`data.json` out of the repository.
