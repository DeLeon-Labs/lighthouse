# Lighthouse Development Notes

## Repository state

The repository currently contains documentation and one installable JavaScript
snapshot:

```text
simple-drafts-navigator-v0.23.0-alpha-focus-simplification/
├── README.md
├── main.js
├── manifest.json
└── styles.css
```

There is no root package manifest, TypeScript source tree, build command, lint
command, automated test suite, or release workflow yet.

Read [the repository audit](repo-audit.md) before changing structure and
[the migration plan](migration-plan.md) before converting runtime code.

## File roles

- `main.js` is the Obsidian runtime and the only current implementation.
- `styles.css` is both the current authored stylesheet and an installable file.
- `manifest.json` is the current installable plugin metadata.
- `data.json` is not stored in this repository. Obsidian creates it per vault
  through the plugin data API when Lighthouse saves settings. It can contain
  paths, Focus membership, and UI choices, so it is ignored by Git and excluded
  from source and release output.
- The snapshot README records the working-copy architecture and changes.

Do not hand-edit the runtime while performing documentation or build-scaffold
work. Behavior changes should be tracked and reviewed separately.

## Manual test installation

Until a build exists:

1. create `.obsidian/plugins/simple-drafts-navigator/` in a dedicated test vault;
2. copy `main.js`, `manifest.json`, and `styles.css` from the snapshot;
3. do not add or copy a repository `data.json`; let the installed plugin create
   vault-specific state when needed;
4. reload Obsidian and enable the plugin;
5. record the Obsidian version, operating system, and whether the test is desktop
   or mobile.

Use a disposable or backed-up vault. The current alpha can create notes, move
files, update plugin state, and interact with bookmarks and workspace leaves.

## Compatibility constraints

The migration must preserve until deliberately changed:

- manifest ID `simple-drafts-navigator`;
- view type `simple-drafts-navigator-view`;
- existing command IDs;
- settings defaults and legacy settings fields;
- settings save and normalization behavior;
- DOM class names used by the stylesheet;
- desktop and mobile support.

Changing the display name or plugin ID is not part of the current work.

## Expected future development commands

The following commands are planned; they do not exist yet:

- `npm run dev` — watch and compile the plugin;
- `npm run typecheck` — validate TypeScript without emitting;
- `npm run lint` — run code-quality checks;
- `npm test` — run automated checks for pure logic;
- `npm run build` — create production runtime output;
- `npm run package` — create and validate the three-file `dist/` package.

Do not add placeholder instructions to the root README that imply these commands
already work.

## Change discipline

- Keep documentation, build scaffolding, mechanical conversion, refactoring,
  visual changes, and issue fixes in separate commits.
- Move one architectural responsibility at a time.
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
