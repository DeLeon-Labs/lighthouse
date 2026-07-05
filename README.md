# Lighthouse

Lighthouse is an alpha Obsidian plugin for finding the material that matters to
the work in front of you. It brings recent notes, vault navigation, bookmarks,
open tabs, watched folders, and selected Focus material into one sidebar view.

The plugin is intended to reduce the time spent reconstructing context: what you
were working on, where it lives, and what belongs to the current task.

## What it currently does

Lighthouse presents three coordinated tabs:

- **Recents** — revisit recently modified Markdown notes, pin important notes,
  and adjust sorting, dates, and previews.
- **Files** — navigate the vault, watch useful folders, reveal the active file,
  and work with files and folders from the sidebar.
- **Focus** — create named working contexts and organize selected material into
  Sources, Work, and Unfiled sections. Focus can also surface bookmarks, pinned
  notes, open tabs, and watched folders.

The current build also includes commands for opening Lighthouse, creating a note
in a configured folder, opening a quick-capture note, opening the daily note,
pinning the active note, and adding material to Focus.

The next planning direction defines Lighthouse as the focus and navigation
center for meaningful working context in Obsidian. Focus should become a saved
context definition; Sources and Work are optional layouts over that context, not
the underlying model.

Lighthouse is part of a broader modular Obsidian tool ecosystem. It should stay
focused: first-party optional features belong in toggleable Lighthouse Core
Modules, while independent tools belong in DeLeon Labs Companion Plugins that can
optionally integrate through APIs.

See [user-facing behavior](docs/user-facing-behavior.md) for the current behavior
and known boundaries.

## Development status

**Status: alpha.** The current working build is `0.26.3-alpha`.

This repository now has a TypeScript build scaffold. The initial `src/main.ts` is
a behavior-preserving mechanical copy of the current JavaScript runtime with type
checking temporarily disabled inside that file. It is not yet a fully typed or
modular implementation.

The known-working implementation remains preserved as a JavaScript snapshot in:

```text
simple-drafts-navigator-v0.23.0-alpha-focus-simplification/
```

The build generates a guarded three-file package in `dist/`. No claim is made
that Lighthouse is ready for the Obsidian community plugin directory or stable
daily use.

## Install for testing

Use a test vault or a vault with a current backup.

1. Clone or download this repository.
2. Install dependencies and build the three-file package:
   ```sh
   pnpm install --frozen-lockfile
   pnpm run build
   ```
3. In the test vault, create:
   `.obsidian/plugins/lighthouse/`
4. Copy these files from `dist/` into that folder:
   - `main.js`
   - `manifest.json`
   - `styles.css`
5. Copy only those three files. Obsidian creates `data.json` inside the installed
   plugin folder when it saves settings for that vault; it is not part of this
   repository or the plugin release.
6. Reload Obsidian.
7. Enable the plugin in **Settings → Community plugins**.

The installed plugin appears as **Lighthouse** and uses the canonical plugin ID
`lighthouse`. This alpha rename does not migrate data from older
`simple-drafts-navigator` test installs; remove or disable the old test plugin
folder before validating the renamed build.

## Planned next

The next repository work is planned, not complete:

1. record a repeatable desktop and mobile behavior baseline;
2. replace the transitional `@ts-nocheck` source with explicit settings and
   runtime types without changing behavior;
3. verify the generated build against the preserved JavaScript snapshot;
4. extract modules and styles in small, separately tested changes;
5. add automated checks around the existing reproducible packaging guard.

Product fixes and enhancements should remain separate from the mechanical
migration so regressions are easier to identify.

## Documentation

- [Vision](docs/vision.md)
- [Architecture](docs/architecture.md)
- [Current user-facing behavior](docs/user-facing-behavior.md)
- [Roadmap](docs/roadmap.md)
- [Release plan](docs/release-plan.md)
- [Development notes](docs/development-notes.md)
- [Repository audit](docs/repo-audit.md)
- [TypeScript migration plan](docs/migration-plan.md)

## Screenshots

![Lighthouse desktop view](https://github.com/user-attachments/assets/a50eb53d-2bb4-49cb-a9f2-4d95f21f0385)

![Lighthouse compact view](https://github.com/user-attachments/assets/54a2ab2e-dc41-4577-bb05-6614e431b1)

## License

See [LICENSE](LICENSE).
