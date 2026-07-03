# Lighthouse Development Notes

## Repository state

Lighthouse has a TypeScript/esbuild scaffold and a preserved JavaScript runtime
snapshot. The scaffold is intentionally transitional: `src/main.ts` is a
mechanical copy of the known-working JavaScript with `@ts-nocheck`, not a finished
typed refactor.

```text
├── dist/                         # generated and ignored
├── scripts/                      # packaging and test-update guards
├── src/
│   ├── main.ts                   # transitional behavior-parity source
│   └── styles.css                # authored copy of the current stylesheet
├── simple-drafts-navigator-v0.23.0-alpha-focus-simplification/
│   ├── README.md
│   ├── main.js
│   ├── manifest.json
│   └── styles.css
├── esbuild.config.mjs
├── manifest.json                 # canonical Lighthouse plugin metadata
├── package.json
├── tsconfig.json
└── versions.json
```

Read [the architecture document](architecture.md) before implementing Focus
model changes. Read [the repository audit](repo-audit.md) for the original state
and [the migration plan](migration-plan.md) before converting runtime code.

## File roles

- `src/main.ts` is the current build entry. It intentionally preserves the
  original CommonJS structure while the typed migration is staged.
- `src/styles.css` is the current authored stylesheet used by packaging.
- `manifest.json` is the canonical Lighthouse plugin metadata. Its plugin ID is
  `lighthouse`.
- `dist/` is generated release output and must contain exactly `main.js`,
  `manifest.json`, and `styles.css`.
- `data.json` is not stored in this repository. Obsidian creates it per vault
  through the plugin data API when Lighthouse saves settings. It can contain
  paths, Focus membership, and UI choices, so it is ignored by Git and excluded
  from source and release output.
- The versioned snapshot remains the known-working comparison baseline.

## Install dependencies and build

Use a supported Node.js installation, then run:

```sh
pnpm install --frozen-lockfile
pnpm run build
```

The build:

1. removes only the repository-local `dist/` directory;
2. runs the TypeScript compiler without emitting;
3. bundles `src/main.ts` to `dist/main.js`;
4. copies the root manifest and `src/styles.css` into `dist/`; and
5. fails unless `dist/` contains exactly the approved three release files.

Available commands:

- `pnpm run clean` — remove the repository-local generated `dist/` directory;
- `pnpm run typecheck` — run TypeScript validation;
- `pnpm run build` — create and verify production release output;
- `pnpm run build:dev` — create a non-release development build with generated
  diagnostics metadata;
- `pnpm run verify:release` — verify an existing `dist/` allowlist;
- `pnpm run dev` — watch `src/main.ts` and emit an inline-source-map development
  build;
- `pnpm run test:update` — copy an already-built package to an explicitly
  configured test-vault plugin folder;
- `pnpm run test:deploy:dev` — build a development package and update the
  configured test vault;
- `pnpm run test:deploy:prod` — build a production package and update the
  configured test vault;
- `pnpm run test:deploy` — alias for `pnpm run test:deploy:dev`.

The current `@ts-nocheck` directive means `pnpm run typecheck` validates the
project wiring but not the body of the transitional entry file. Removing that
directive safely is planned migration work.

## Safe test-vault update workflow

Use a dedicated test vault or a vault with a current backup. Production builds
exclude development diagnostics and must contain exactly the three installable
files:

```sh
pnpm run build
```

Development builds include generated diagnostics metadata in `build-info.json`.
That file makes the Settings Developer section visible for local testing and is
not a release asset:

```sh
pnpm run build:dev
```

Set the target plugin install path explicitly:

```sh
export LIGHTHOUSE_TEST_PLUGIN_DIR="/absolute/path/to/YourVault/.obsidian/plugins/lighthouse"
```

After building, copy the current `dist/` output with:

```sh
pnpm run test:update
```

Or build and update the test vault in one step:

```sh
pnpm run test:deploy:dev
pnpm run test:deploy:prod
```

The updater:

- requires `LIGHTHOUSE_TEST_PLUGIN_DIR` to be an absolute plugin install path;
- verifies `dist/` contains the expected plugin runtime files;
- allows `build-info.json` only for development builds;
- creates the missing `.obsidian/plugins/lighthouse` path when run;
- copies only approved generated files;
- removes stale development diagnostics when copying a production build;
- does not read, write, copy, or remove `data.json`; and
- leaves all vault-specific plugin state untouched.

Do not point the updater at a production vault unless that is a deliberate manual
choice outside the repository workflow.

The updater is tooling only. It is not run as part of `pnpm run build`, tests, CI,
or release packaging.

## Development watch mode

Run:

```sh
pnpm run dev
```

This watches TypeScript and writes `dist/main.js`. Release assets are copied when
the command starts. Until CSS watching is added, rerun the command after changing
`src/styles.css`.

## Alpha identity constraints

The active alpha identity is intentionally hard-renamed to Lighthouse:

- manifest ID `lighthouse`;
- install folder `.obsidian/plugins/lighthouse`;
- active view type and command IDs use Lighthouse naming;
- deployment and test-vault scripts target the Lighthouse plugin folder.

This rename deliberately does not include:

- data migration from older `simple-drafts-navigator` test installs;
- compatibility aliases;
- migration notices;
- workspace restoration; or
- hotkey preservation.

Behavior work still must preserve:

- settings defaults;
- settings save and normalization behavior;
- desktop and mobile support.

The preserved snapshot remains a historical baseline and may contain old naming.
Do not treat it as the active plugin identity.

## Focus architecture constraints

The next implementation phase follows [the architecture document](architecture.md).

Core rules:

- Lighthouse is the context engine for Obsidian.
- Focus is a saved context definition.
- Sources and Work are optional layouts, not the underlying model.
- Lighthouse begins vault-native.
- External systems belong in future provider plugins.

Do not implement the Focus architecture inside documentation/planning branches.
Implementation branches should reference issue #16 and the architecture document
before changing runtime behavior.

## Modular architecture constraints

Lighthouse should grow through clean boundaries:

- Lighthouse Core remains focused on Focus states, Recents, Files, pinned notes,
  watch folders, Bookmarks/Home, context switching, and Focus-aware filtering.
- Lighthouse Core Modules are first-party optional modules such as Graph Focus
  and Sidecar Notes.
- DeLeon Labs Companion Plugins are separate tools such as Note Actions, Source
  Companion, Squido, Crate Digger, voice memo tools, publishing tools, and
  fragment remixing tools.

Do not use Obsidian `manifest.json` to identify internal Lighthouse modules.
Use an internal module registry or module manifest object.

Module implementation expectations:

- stable module ID;
- display name and description;
- category;
- enabled-by-default policy;
- settings key;
- optional commands/views/settings UI;
- cleanup handler;
- no command/view/listener registration while disabled.

Store module enabled states and module-specific settings in normal Lighthouse
plugin settings. Avoid per-module JSON files unless there is a clear reason.

Recommended development order:

1. documentation first;
2. settings/data model proposal;
3. internal module registry;
4. settings UI sidebar;
5. one low-risk optional module as proof of concept;
6. broader refactor only after the pattern proves stable.

## Change discipline

- Keep build scaffolding, type conversion, refactoring, visual changes, and issue
  fixes in separate commits.
- Keep planning/documentation branches free of runtime implementation changes.
- Start modularization with future optional modules before moving stable core
  behavior.
- Treat `@ts-nocheck` removal as a typed migration with behavior checks, not a
  search-and-replace cleanup.
- Keep the current snapshot available until a TypeScript-built alpha passes the
  full baseline.
- Add tests before moving pure settings or path logic.
- Compare desktop and mobile behavior after every UI extraction.
- Do not consolidate chronological CSS overrides without checking final computed
  styles and cascade order.
- Never package `data.json`.

## Documentation map

- [Vision](vision.md)
- [Architecture](architecture.md)
- [Current user-facing behavior](user-facing-behavior.md)
- [Roadmap](roadmap.md)
- [Release plan](release-plan.md)
- [Repository audit](repo-audit.md)
- [Migration plan](migration-plan.md)
