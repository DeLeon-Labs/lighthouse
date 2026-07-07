# Lighthouse Repository Audit

- Audit date: 2026-06-22
- Repository: `DeLeon-Labs/lighthouse`
- Active alpha build: `0.26.4-alpha`
- Preserved behavior snapshot: `0.23.0-alpha`
- Scope: repository organization only; no behavior, plugin ID, or product-name
  changes are included

## Executive summary

Lighthouse currently has two layers:

1. a small repository-level documentation shell; and
2. one versioned folder containing an installable JavaScript plugin snapshot.

The snapshot is valuable as the current behavioral baseline, but it is not yet a
source-based development project. The 5,293-line `main.js` contains nearly all
plugin behavior, the 1,976-line `styles.css` contains both foundational styles and
many accumulated version patches, and there is no TypeScript source, package
manifest, build configuration, test harness, lint configuration, or release
automation.

The safest path is to preserve the snapshot unchanged while a TypeScript build is
introduced beside it. The snapshot should not be reorganized until a compiled
TypeScript build can be compared against it and passes a desktop/mobile behavior
checklist.

## Current inventory

```text
obsidian-lighthouse/
├── .gitignore
├── DESIGN-LOG
├── LICENSE
├── README.md
└── simple-drafts-navigator-v0.23.0-alpha-focus-simplification/
    ├── README.md
    ├── main.js
    ├── manifest.json
    └── styles.css
```

| Current path | What it is | Recommended long-term role |
| --- | --- | --- |
| `.gitignore` | General Node/build ignore rules | Keep at the repository root and tailor to the eventual build. |
| `README.md` | Public Lighthouse overview | Keep at the repository root. Expand installation, development, and release instructions after the build exists. |
| `LICENSE` | Repository license | Keep at the repository root. |
| `DESIGN-LOG` | Short product decision history | Eventually propose moving to `docs/design-log.md`; do not move it during the runtime migration. |
| Snapshot `README.md` | Notes for the `0.23.0-alpha` working copy | Preserve with the snapshot; later summarize under `docs/releases/` if desired. |
| Snapshot `main.js` | CommonJS runtime loaded by Obsidian; also the only current implementation | Preserve as the parity baseline. Future `main.js` must be generated from `src/main.ts`, not edited as source. |
| Snapshot `styles.css` | CSS loaded by Obsidian; currently the only authored style source as well as a release artifact | Preserve as the visual baseline. Later split authored CSS into source modules and generate a release `styles.css`. |
| Snapshot `manifest.json` | Installable plugin metadata | Preserve in the snapshot. Add a canonical root `manifest.json` when the build scaffold is introduced. |

The root `.DS_Store` is ignored and untracked. It is local operating-system
metadata, not part of the repository.

## Runtime output versus source material

### Installable runtime output

Obsidian installs a plugin from these release files:

- `main.js`
- `manifest.json`
- `styles.css`, when the plugin has styles

For this repository, those three files currently live inside the versioned
snapshot. In the target repository they should be reproducible build/release
outputs. `manifest.json` should also remain at the repository root because
Obsidian uses the repository copy to determine the latest plugin version.

`data.json` is different: Obsidian creates it inside an installed plugin folder
to store user-specific state. It is neither a release artifact nor application
source. It can include folder names, note paths, Focus membership, collapsed
sections, and other local choices. It has been removed from the tracked snapshot
and is blocked by the repository-wide ignore rule.

### Current authored source

There is no separate authored source tree yet. Practically:

- `main.js` is generated-format JavaScript but is also the only record of the
  implementation;
- `styles.css` is a shippable file but is also the only record of the visual
  implementation;
- `manifest.json` is both metadata and a release file; and
- the two README files plus `DESIGN-LOG` are documentation.

That overlap is why the first migration step should copy behavior into a typed
source path and prove parity, not move or delete the snapshot.

## Internal map of `main.js`

The single runtime file already contains useful seams for a future module split:

| Approximate lines | Responsibility | Suggested TypeScript destination |
| --- | --- | --- |
| 1–88 | Obsidian imports, view type, default settings | `src/constants.ts`, `src/settings/defaults.ts`, `src/settings/types.ts` |
| 89–1177 | Plugin lifecycle, commands, settings persistence, Focus state, vault actions | `src/main.ts`, `src/services/`, `src/settings/` |
| 1178–3884 | Main item view and rendering for Recents, Files, and Focus | `src/views/LighthouseView.ts`, then feature renderers under `src/features/` |
| 3885–4150 | Reading/editing scroll controls | `src/features/scroll/ScrollControls.ts` |
| 4151–4725 | Files, Focus, Home, confirmation, and text-input modals | `src/modals/` |
| 4726–4990 | Plugin settings tab | `src/settings/LighthouseSettingTab.ts` |
| 4990–5293 | Folder suggestions and shared path/bookmark/Markdown helpers | `src/components/`, `src/utils/` |

The initial TypeScript port does not need to create every module immediately.
Typing the existing seams first is safer than combining a language migration
with a broad architectural rewrite.

## Recommended target structure

```text
lighthouse/
├── .github/
│   └── workflows/
│       ├── checks.yml
│       └── release.yml
├── assets/
│   ├── brand/
│   └── screenshots/
├── dist/                         # generated packaging directory; normally ignored
│   ├── main.js
│   ├── manifest.json
│   └── styles.css
├── docs/
│   ├── architecture.md
│   ├── design-log.md
│   ├── migration-plan.md
│   ├── repo-audit.md
│   ├── testing.md
│   └── releases/
├── src/
│   ├── main.ts
│   ├── constants.ts
│   ├── types.ts
│   ├── components/
│   ├── features/
│   │   ├── files/
│   │   ├── focus/
│   │   ├── recents/
│   │   └── scroll/
│   ├── modals/
│   ├── services/
│   ├── settings/
│   │   ├── defaults.ts
│   │   ├── migrations.ts
│   │   ├── types.ts
│   │   └── LighthouseSettingTab.ts
│   ├── styles/
│   │   ├── index.css
│   │   ├── base.css
│   │   ├── files.css
│   │   ├── focus.css
│   │   ├── recents.css
│   │   ├── modals.css
│   │   └── mobile.css
│   ├── utils/
│   └── views/
│       └── LighthouseView.ts
├── test/
│   ├── fixtures/
│   └── unit/
├── .editorconfig
├── .gitignore
├── eslint.config.mts
├── esbuild.config.mjs
├── LICENSE
├── manifest.json
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
├── tsconfig.json
├── version-bump.mjs
└── versions.json
```

This follows the current official Obsidian sample plugin's TypeScript and root
configuration pattern while adding a `dist/` staging directory for reproducible
release assets. The root `manifest.json` remains canonical; a build copies it to
`dist/` with compiled `main.js` and `styles.css`. GitHub releases should upload
those three files and use a tag identical to the manifest version, without a `v`
prefix.

References:

- [Official Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Official Obsidian API plugin structure](https://github.com/obsidianmd/obsidian-api)
- [Official community plugin release requirements](https://github.com/obsidianmd/obsidian-releases)

## Placement rules

### `src/`

Place human-authored runtime behavior here:

- plugin lifecycle and command registration;
- settings types, defaults, validation, normalization, and migrations;
- Recents, Files, Focus, bookmarks, watch-folder, and scroll behavior;
- views, modals, settings UI, small components, and utilities;
- authored CSS modules if the build concatenates them into `styles.css`.

Do not place compiled `main.js`, live `data.json`, screenshots, or release ZIPs
in `src/`.

### `assets/`

Place non-code materials used by repository documentation or release promotion:

- Lighthouse logo and brand files;
- README screenshots and mobile/desktop demonstrations;
- store/listing artwork.

There are no tracked local assets today; the root README embeds remote GitHub
upload URLs. Moving those images into `assets/screenshots/` should be a separate,
reviewable documentation change.

### `docs/`

Place durable project knowledge here:

- repository and architecture documentation;
- migration and compatibility plans;
- design history and accepted decisions;
- manual testing procedures;
- historical release notes that are useful beyond a GitHub release entry.

Keep the public product overview, installation instructions, and contributor
entry point in the root `README.md`.

### `dist/` and release output

`dist/` should be generated, never hand-edited, and normally excluded from Git.
It should contain only the files needed to install or publish the plugin:

- `main.js` compiled and bundled from `src/main.ts`;
- `manifest.json` copied from the root canonical manifest;
- `styles.css` assembled from authored style sources.

Do not include `data.json`, source maps containing local paths, screenshots,
documentation, test fixtures, or development dependencies in the release bundle.

### Root configuration and project files

The root should contain files used to understand, build, verify, and release the
project:

- `manifest.json`, `versions.json`, and `version-bump.mjs` for Obsidian versioning;
- `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml` for reproducible
  dependencies, scripts, and an explicit dependency-build allowlist;
- `tsconfig.json`, `esbuild.config.mjs`, and `eslint.config.mts` for build quality;
- `.editorconfig` and `.gitignore` for consistent repository behavior;
- `README.md` and `LICENSE`;
- `.github/workflows/` for checks and release packaging when the local build is
  stable.

## Proposed moves and transformations — not performed

| Current item | Proposed destination or treatment | Prerequisite |
| --- | --- | --- |
| `DESIGN-LOG` | `docs/design-log.md` | Agree on Markdown naming and preserve history. |
| Snapshot `main.js` | Keep as baseline; create typed source under `src/` and generate a new `dist/main.js` | Behavior checklist and reproducible build. |
| Snapshot `styles.css` | Keep as baseline; progressively extract authored modules under `src/styles/` | Screenshot comparison on desktop and mobile. |
| Snapshot `manifest.json` | Keep with the historical snapshot; the canonical root `manifest.json` now owns the active Lighthouse identity | Build scaffold and version policy. |
| Runtime `data.json` | Keep ignored and out of releases. If compatibility tests need state, create a purpose-built sanitized `test/fixtures/settings.v0.23.json` | Define representative fields without copying a real vault's state. |
| Snapshot `README.md` | Preserve with the snapshot; optionally summarize in `docs/releases/0.23.0-alpha.md` | Decide how historical snapshots will be retained. |
| Remote README images | `assets/screenshots/` | Download and verify ownership, resolution, and alt text. |

## Risks and constraints

1. **Identity reset:** the active alpha now uses the canonical `lighthouse`
   plugin ID. Older `simple-drafts-navigator` test installs are intentionally
   not migrated as part of the hard rename.
2. **Saved-state compatibility:** settings normalization includes legacy fields
   such as `items` and `focusGlobalItems`. Type definitions must preserve them
   until an explicit, tested migration removes them.
3. **Behavior concentration:** most behavior is coupled inside one `ItemView`.
   Splitting it while converting syntax would make regressions hard to locate.
4. **CSS archaeology:** the stylesheet includes many chronological override
   blocks. Consolidating them can change specificity, cascade order, and mobile
   behavior even when declarations look equivalent.
5. **Private/runtime state:** `data.json` was previously committed, showing how
   local state can enter source control. The ignore rule and future release checks
   must prevent a recurrence.
6. **Desktop/mobile parity:** the manifest declares `isDesktopOnly: false`, and
   the code contains mobile-specific controls. Both platforms are required for
   migration acceptance.
7. **No automated safety net:** there are currently no build, lint, unit, or UI
   checks. Establishing baselines must precede refactoring.

## Audit conclusion

The repository is ready for a low-risk scaffold phase, not a rewrite. Preserve
the `0.23.0-alpha` folder as evidence of current behavior, establish canonical
root metadata and a reproducible TypeScript build beside it, then port and split
code only after parity checks exist. The detailed sequence is in
[`migration-plan.md`](migration-plan.md).
