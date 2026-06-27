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

## Current — Focus Context Model

Status: **planned for `v0.26.0-alpha`**

Lighthouse is the context engine for Obsidian. The next milestone defines that
architecture before major implementation.

Scope:

- complete issue #16;
- define the Focus model;
- define the Lighthouse item model;
- define the vault-native provider boundary;
- define Files vs Recents vs Focus;
- define Focus inheritance;
- define persistence expectations;
- update architecture documentation.

No major implementation work belongs in this milestone.

## Next — Focus Experience

Status: **planned for `v0.27.0-alpha`**

Make Focus effortless and enjoyable after the model is clear.

Scope:

- redesign Focus creation flow;
- eliminate empty Focus friction;
- implement single-panel and structured-panel layouts;
- drag and drop section assignment;
- automatic Focus inheritance;
- simplify Focus settings.

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
- Broad visual redesign during the TypeScript migration.
- Claiming stable or community-directory readiness before release checks exist.
