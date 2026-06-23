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
├── manifest.json                 # canonical metadata; stable plugin ID
├── package.json
├── tsconfig.json
└── versions.json
```

Read [the repository audit](repo-audit.md) for the original state and
[the migration plan](migration-plan.md) before converting runtime code.

## File roles

- `src/main.ts` is the current build entry. It intentionally preserves the
  original CommonJS structure while the typed migration is staged.
- `src/styles.css` is the current authored stylesheet used by packaging.
- `manifest.json` is the canonical plugin metadata. Its display name is
  `Lighthouse`; its stable plugin ID remains byte-equivalent to the preserved
  snapshot manifest.
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
- `pnpm run verify:release` — verify an existing `dist/` allowlist;
- `pnpm run dev` — watch `src/main.ts` and emit an inline-source-map development
  build;
- `pnpm run test:update` — copy an already-built three-file package to the
  configured test-vault plugin folder;
- `pnpm run test:deploy` — build, verify, and then update the configured test
  vault in one deliberate command.

The current `@ts-nocheck` directive means `pnpm run typecheck` validates the
project wiring but not the body of the transitional entry file. Removing that
directive safely is planned migration work.

## Safe test-vault update workflow

Use a dedicated test vault or a vault with a current backup. Build first:

```sh
pnpm run build
```

The updater defaults to the confirmed iCloud test-vault plugin path:

```text
/Users/jon/Library/Mobile Documents/iCloud~md~obsidian/Documents/Test Vault/.obsidian/plugins/simple-drafts-navigator
```

After building, copy the three release files with:

```sh
pnpm run test:update
```

Or build and update the test vault in one step:

```sh
pnpm run test:deploy
```

If the vault moves, override the default for one command:

```sh
LIGHTHOUSE_TEST_PLUGIN_DIR="/absolute/path/to/Another Test Vault/.obsidian/plugins/simple-drafts-navigator" pnpm run test:update
```

The updater:

- uses the confirmed absolute `Test Vault` path unless an explicit environment
  override is supplied;
- verifies `dist/` contains exactly `main.js`, `manifest.json`, and `styles.css`;
- creates the missing `.obsidian/plugins/simple-drafts-navigator` path when run;
- copies only those three files;
- does not delete or replace the plugin folder;
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

## Compatibility constraints

The migration must preserve until deliberately changed:

- manifest ID `simple-drafts-navigator`;
- view type `simple-drafts-navigator-view`;
- existing command IDs;
- settings defaults and legacy settings fields;
- settings save and normalization behavior;
- DOM class names used by the stylesheet;
- desktop and mobile support.

The canonical manifest display name is `Lighthouse`. Changing the plugin ID is
not part of this scaffold because it would create a separate Obsidian plugin
identity and disconnect existing settings.

## Change discipline

- Keep build scaffolding, type conversion, refactoring, visual changes, and issue
  fixes in separate commits.
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
- [Current user-facing behavior](user-facing-behavior.md)
- [Roadmap](roadmap.md)
- [Release plan](release-plan.md)
- [Repository audit](repo-audit.md)
- [Migration plan](migration-plan.md)
- [Naming and compatibility](naming-compatibility.md)
