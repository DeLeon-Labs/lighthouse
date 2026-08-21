# Lighthouse Roadmap

This roadmap separates repository preparation from product work. Items marked
**planned** are not implemented merely because they appear here.

## Completed — preserve, document, and scaffold the alpha

Status: **completed for `v0.24.0-alpha`**

- Preserve the `0.23.0-alpha` JavaScript snapshot as the behavior baseline.
- Document current user behavior, repository structure, and release boundaries.
- Keep vault-specific `data.json` outside the repository.
- Maintain the TypeScript/esbuild scaffold and guarded three-file `dist/`
  package without treating the transitional source as fully typed.
- Define a desktop and mobile smoke-test checklist.
- Record baseline checksums and reference screenshots.

`v0.24.0-alpha` closed after the state-retention fix for pinned notes and watch
folders. The remaining product issues were moved forward so the next alpha could
focus on plugin identity.

## Completed — hard rename the unreleased alpha

Status: **completed for `v0.25.0-alpha`**

- Rename the active plugin identity to `lighthouse`.
- Install future test builds into `.obsidian/plugins/lighthouse/`.
- Rename active view types, command IDs, plugin constants, test-vault paths, and
  deployment scripts.
- Update documentation to describe the canonical Lighthouse identity.
- Do not add data migration, compatibility aliases, migration notices, workspace
  restoration, or hotkey preservation in this alpha-only rename.

## Completed — Focus Context Model

Status: **completed for `v0.26.x-alpha`**

Lighthouse is the context engine for Obsidian. This milestone defined the model
boundary before larger Focus Experience work.

Completed scope:

- complete Focus-view internal naming cleanup before expanding the model;
- complete issue #16;
- define the Focus model;
- define the Lighthouse item model;
- define the vault-native provider boundary;
- define Files vs Recents vs Focus;
- define Focus inheritance;
- define persistence expectations;
- update architecture documentation.

The closeout record is in
[Focus Context Model closeout](focus-context-model-closeout.md).

The model foundation is complete; remaining UX implementation belongs to
`v0.27.0-alpha`.

## Parallel architecture track — Lighthouse Modular Architecture

Status: **planned as a dedicated milestone**

Lighthouse should remain a focused context system, not a growing feature pile.
The modular architecture track creates clean internal and ecosystem boundaries
so new capabilities can be added without making the core fragile.

Product boundary:

- Lighthouse is the focus, navigation, and working-context center.
- Core modules are first-party optional features that feel native to Lighthouse.
- Companion plugins are separate DeLeon Labs tools that may integrate with
  Lighthouse but must not be folded into it.

Scope:

- document module architecture and ecosystem boundaries;
- refactor `main.ts` into a lightweight bootstrap/controller;
- create an internal module registry;
- define module metadata and enabled-state settings;
- redesign settings into sidebar sections;
- add Core Modules and Companion Plugins settings areas;
- add a placeholder integration registry;
- document public Lighthouse API boundaries;
- add developer notes.

Implementation order:

1. documentation first;
2. settings/data model proposal;
3. internal module registry;
4. settings UI sidebar;
5. move one low-risk optional module first;
6. only then continue broader refactor.

Graph Focus and Sidecar Notes are better first module-registry candidates than
the existing stable Focus core.

## Current - Focus Experience

Status: **in progress for `v0.27.x-alpha`**

Make Focus effortless and enjoyable after the model is clear.

Implemented in the current 0.27.x work:

- reduce empty Focus friction with the empty-state add flow;
- implement single and split Focus layouts;
- inherit newly created notes into the active Focus context;
- add the first settings-tab restructuring and native-style settings treatment.

Remaining product work:

- continue simplifying Focus creation and population beyond the empty-state flow;
- improve drag-and-drop section assignment;
- finish simplifying Focus settings without mixing product changes into the
  TypeScript migration;
- address compatibility regressions introduced by Obsidian interface changes,
  including the resizable Settings window tracked in issue #55;
- validate mobile behavior independently from desktop layout work.

Keep compatibility fixes and product improvements independently reviewable where
practical.

## Later — Ecosystem API

Status: **planned for `v0.28.0-alpha`**

Expose Lighthouse as the context engine for future plugins while remaining
vault-native.

Scope:

- Lighthouse API;
- Focus events and hooks;
- provider interface;
- ecosystem documentation.

Do not implement GitHub or other external providers in this milestone.

## Scaffold established — remaining validation

Status: **in progress**

- Root TypeScript, package, and esbuild configuration is present.
- The canonical root manifest preserves the current plugin identity.
- `src/` and generated `dist/` boundaries are established; a `test/` suite is
  still planned.
- Packaging emits only `main.js`, `manifest.json`, and `styles.css`.
- Release verification rejects `data.json` and unexpected files.
- Automated linting and behavior-parity checks remain planned.

The scaffold does not replace the preserved runnable snapshot yet.

## Then — establish TypeScript behavior parity

Status: **planned**

- Create a typed `src/main.ts` representation of the current implementation.
- Preserve behavior while continuing to use the canonical Lighthouse identity.
- Validate settings round-trips with sanitized fixtures.
- Run the complete behavior checklist on desktop and mobile.
- Document every intentional difference in compiled output.

Feature fixes should remain separate unless they are required to complete the
parity migration.

## Later — improve internal architecture

Status: **planned**

- Extract pure utilities and settings normalization first.
- Separate scroll controls, modals, settings UI, and state services.
- Split Recents, Files, and Focus rendering along existing behavior seams.
- Modularize CSS only with computed-style and screenshot comparison.
- Add unit checks for pure logic and repeatable release checks.

## Product work after the context model is safe

Status: **planned; scope not yet committed**

Likely areas include Focus surfacing, navigation and file visibility, and mobile
interaction quality. Each change should be linked to a tracked issue, assigned
to a release, and tested independently of architecture/model work.

## Explicitly deferred

- Deleting or moving the current runtime snapshot.
- Treating `data.json` as source or including it in a release.
- Implementing external providers in core Lighthouse.
- Using Obsidian `manifest.json` to identify internal Lighthouse modules.
- Making companion plugins hard dependencies of Lighthouse.
- Broad visual redesign during the TypeScript migration.
- Claiming stable or community-directory readiness before release checks exist.
