# Lighthouse Release Plan

## Current state

Lighthouse now has a local TypeScript/esbuild scaffold that generates and
validates release files in `dist/`. It does not yet have automated GitHub release
publishing or a fully typed implementation. The current `0.23.0-alpha` working
copy remains preserved as the known-working installable snapshot.

Its installable files are:

- `main.js`
- `manifest.json`
- `styles.css`

Obsidian generates `data.json` per vault when the installed plugin saves settings.
The repository does not contain that runtime file, `.gitignore` blocks it, and
future packaging must continue to reject it.

## Release contents boundary

The installable release has an allowlist, not a broad copy rule. Only these
three files should be attached as plugin release assets:

- `main.js`
- `manifest.json`
- `styles.css`

Everything else in the repository is excluded from the installable release.

### Current files excluded from release

- `simple-drafts-navigator-v0.23.0-alpha-focus-simplification/README.md` —
  working-copy documentation;
- root `README.md`, `LICENSE`, and `DESIGN-LOG` — repository documentation and
  licensing, not plugin runtime assets;
- `docs/` — project documentation;
- `.gitignore`, `.DS_Store`, and `.git/` metadata.

No `data.json` is tracked. The repository-wide ignore rule prevents a new
vault-specific runtime-state file from being added accidentally.

The current snapshot directory is a storage boundary, not a release folder. A
manual test install should select the three approved files rather than copy the
whole directory.

### Future files excluded from release

- `src/` and authored TypeScript/CSS modules;
- `test/`, fixtures, snapshots, coverage, and test-vault content;
- `assets/` documentation and promotional images;
- `node_modules/` and package-manager caches;
- `package.json`, lockfiles, TypeScript, bundler, lint, and editor configuration;
- `.github/` workflows and repository templates;
- `versions.json` and version-bump scripts;
- source maps, debug bundles, logs, temporary files, and caches;
- `.env` files, local configuration, credentials, and machine-specific paths;
- any `data.json`, regardless of directory depth;
- ZIP files or directories that contain more than the approved runtime assets.

GitHub may provide automatic source-code archives for a tag. Those archives are
not the installable plugin package and should not be presented as such.

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
