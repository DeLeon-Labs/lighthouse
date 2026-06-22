# Lighthouse Release Plan

## Current state

Lighthouse does not yet have a source-based, automated release process. The
current `0.23.0-alpha` working copy is a manually preserved installable snapshot.

Its installable files are:

- `main.js`
- `manifest.json`
- `styles.css`

The adjacent `data.json` is vault-specific plugin state. It is not a release
file. It must remain excluded from manual test installs and must be ignored by
the future packaging process before any release is published.

## Release stages

### 1. Snapshot testing

Status: **current**

- Install the three runtime files manually in a dedicated test vault.
- Record the exact snapshot version and file checksums.
- Run desktop and mobile smoke checks.
- Record known failures rather than silently accepting them as intended behavior.

### 2. Reproducible local packaging

Status: **planned**

- Build from TypeScript source into a clean `dist/` directory.
- Copy the canonical root `manifest.json` into `dist/`.
- Assemble one release `styles.css`.
- Fail packaging unless `dist/` contains exactly the approved three files.
- Fail packaging if `data.json`, local paths, or test-vault state are present.

### 3. Continuous checks

Status: **planned**

- Install dependencies from the lockfile.
- Type-check, lint, test pure logic, and run a production build.
- Verify package, manifest, and `versions.json` versions agree.
- Verify the manifest ID has not changed unexpectedly.
- Preserve generated artifacts for inspection.

### 4. GitHub alpha release

Status: **planned**

- Use a tag exactly matching the manifest version, without a `v` prefix.
- Attach `main.js`, `manifest.json`, and `styles.css` individually.
- Include an honest changelog, installation steps, known issues, and rollback
  instructions.
- Mark pre-stable builds clearly as alpha.
- Test the uploaded assets in a clean vault before announcing the release.

## Planned `0.24.0-alpha` gate

The next alpha should not be cut solely because the version exists. Before
release, confirm:

- its scope is defined by assigned issues;
- completed fixes are separated from the TypeScript migration;
- the manual behavior checklist passes or exceptions are documented;
- desktop and mobile results are recorded;
- no vault-specific `data.json` is present;
- the three installable assets match the version in the manifest; and
- rollback to `0.23.0-alpha` is possible.

## Version and compatibility rules

- Do not change the plugin ID during the repository migration.
- Preserve old settings fields until an explicit migration is tested.
- Add compatibility entries to `versions.json` when that file is introduced.
- Treat a settings-schema change as a compatibility change, even when the UI
  looks unchanged.
- Do not combine a display-name change with a source migration release.

## Release ownership checklist

Before publishing, one maintainer should explicitly confirm:

- intended issue scope;
- version consistency;
- generated asset contents;
- desktop and mobile smoke results;
- known issues and user-facing changes;
- installation and rollback instructions; and
- GitHub release asset installation from a clean download.
