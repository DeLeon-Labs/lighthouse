# Lighthouse Release Plan

## Current state

Lighthouse now has a local TypeScript/esbuild scaffold that generates and
validates release files in `dist/`. It does not yet have automated GitHub release
publishing or a fully typed implementation. The `0.23.0-alpha` working copy
remains preserved as the known-working installable snapshot, while the active
alpha build is `0.26.1-alpha`.

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
- `build-info.json` development diagnostics metadata;
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

## Completed `0.24.0-alpha` gate

`v0.24.0-alpha` is treated as complete after the state-retention fix for pinned
notes and watched folders. The remaining product issues were moved forward so
the next alpha can focus on identity.

## Completed `0.25.0-alpha` gate

`v0.25.0-alpha` completed the hard Lighthouse rename for the unreleased alpha.
The release gate confirmed:

- the manifest plugin ID is `lighthouse`;
- test installs use `.obsidian/plugins/lighthouse/`;
- view type, command IDs, plugin constants, test-vault paths, deployment scripts,
  active aliases/functions, and documentation use Lighthouse naming;
- no active user-facing `Simple Drafts Navigator` naming remains;
- the old compatibility documentation has been removed or replaced;
- the manual behavior checklist passes or exceptions are documented;
- desktop and mobile results are recorded;
- no vault-specific `data.json` is present;
- the three installable assets match the version in the manifest; and
- rollback to `0.23.0-alpha` is possible.

This is not a compatibility migration. It does not preserve old plugin folders,
workspace leaves, hotkeys, or saved settings from `simple-drafts-navigator` test
installs.

## Planned `0.26.0-alpha` gate

`v0.26.0-alpha` is the Focus Context Model milestone. It should leave the
repository with architecture clear enough for implementation branches to follow.

Before release, confirm:

- Focus-view internal naming is cleaned up so `bookmark` terminology only refers
  to literal Obsidian bookmarks and bookmark groups;
- issue #16 is complete;
- the canonical architecture document defines Lighthouse as the context engine
  for Obsidian;
- Focus is documented as a saved context definition;
- Sources and Work are documented as optional layouts, not the underlying model;
- the item model, provider boundary, view model, persistence model, and
  inheritance model are documented;
- Files, Recents, and Focus have distinct responsibilities;
- Lighthouse remains vault-native;
- external systems are deferred to future provider plugins; and
- no major implementation work is mixed into the model milestone.

## Planned `0.27.0-alpha` gate

`v0.27.0-alpha` is the Focus Experience milestone. It should make Focus easier
to create, populate, understand, and use.

Before release, confirm:

- empty Focus friction is removed or deliberately redesigned;
- single-panel and structured-panel layouts operate over the same Focus data;
- section assignment does not change underlying membership;
- drag-and-drop assignment behavior is tested;
- active-Focus inheritance is implemented according to the model;
- Focus settings are simpler and documented; and
- mobile interaction issues assigned to the milestone are tested.

## Planned `0.28.0-alpha` gate

`v0.28.0-alpha` is the Ecosystem API milestone. It should expose Lighthouse as a
context engine for future plugins without implementing external providers in
core.

Before release, confirm:

- the Lighthouse API surface is documented;
- Focus events/hooks are documented;
- the provider interface is documented;
- ecosystem examples remain vault-native; and
- GitHub, web, email, calendar, and other external providers remain out of core.

## Planned Lighthouse Modular Architecture gate

The Lighthouse Modular Architecture milestone defines the internal module system
and companion-plugin boundary. It is not permission to rewrite stable behavior in
one pass.

Before release, confirm:

- Lighthouse Core, Core Modules, and Companion Plugins are documented;
- Obsidian `manifest.json` remains the plugin manifest only, not a module
  manifest;
- the internal module metadata shape is documented;
- module enabled states live in normal Lighthouse settings;
- the settings sidebar structure is documented;
- Core Modules and Companion Plugins settings sections are defined;
- companion plugins remain optional and independently usable;
- disabled modules avoid registering commands, views, listeners, or expensive
  startup work;
- developer notes explain how to add future modules; and
- the first implementation target is low-risk and optional, not a disruptive
  rewrite of stable Focus behavior.

## Version and compatibility rules

- Treat `lighthouse` as the canonical plugin ID for active builds.
- Do not add legacy data migration or compatibility aliases during the
  `v0.25.0-alpha` hard rename.
- Keep core Lighthouse vault-native until the provider interface is designed and
  reviewed.
- Keep Lighthouse focused on context and navigation. Related actions belong in
  core modules or companion plugins depending on scope.
- Add compatibility entries to `versions.json` when that file is introduced.
- Treat a settings-schema change as a compatibility change, even when the UI
  looks unchanged.
- Keep `Lighthouse` as the canonical display name.

## Release ownership checklist

Before publishing, one maintainer should explicitly confirm:

- intended issue scope;
- version consistency;
- generated asset contents;
- desktop and mobile smoke results;
- known issues and user-facing changes;
- installation and rollback instructions; and
- GitHub release asset installation from a clean download.
