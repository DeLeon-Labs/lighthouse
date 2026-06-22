# Lighthouse Roadmap

This roadmap separates repository preparation from product work. Items marked
**planned** are not implemented merely because they appear here.

## Current — preserve and document the alpha

Status: **in progress**

- Preserve the `0.23.0-alpha` JavaScript snapshot as the behavior baseline.
- Document current user behavior, repository structure, and release boundaries.
- Keep the plugin ID, manifest, runtime files, and vault-specific `data.json`
  unchanged while planning the migration.
- Define a desktop and mobile smoke-test checklist.
- Record baseline checksums and reference screenshots.

## Next — add a safe development scaffold

Status: **planned**

- Add root TypeScript, package, lint, and build configuration.
- Add a canonical root manifest by copying current values without renaming the
  plugin or changing identity.
- Define `src/`, `test/`, and generated `dist/` boundaries.
- Package only `main.js`, `manifest.json`, and `styles.css` for installation.
- Add a release guard that rejects `data.json` and unexpected files.

This phase should not replace the current runnable snapshot.

## Then — establish TypeScript behavior parity

Status: **planned**

- Create a typed `src/main.ts` representation of the current implementation.
- Preserve command IDs, view type, settings defaults, legacy settings fields,
  CSS classes, and save behavior.
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

## Product work after the baseline is safe

Status: **planned; scope not yet committed**

Likely areas include persistence reliability, Focus surfacing, navigation and
file visibility, and mobile interaction quality. Each change should be linked to
a tracked issue, assigned to a release, and tested independently of repository
migration work.

## Explicitly deferred

- Renaming the plugin or changing its manifest ID.
- Deleting or moving the current runtime snapshot.
- Treating `data.json` as source or including it in a release.
- Broad visual redesign during the TypeScript migration.
- Claiming stable or community-directory readiness before release checks exist.
