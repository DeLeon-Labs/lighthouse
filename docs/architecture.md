# Lighthouse Architecture

This document is the canonical design reference for the next Lighthouse
implementation phase. It expands issue #16 into an architecture direction before
code changes begin.

## Core philosophy

Lighthouse is the focus and navigation center for meaningful working context in
Obsidian.

Its job is not to replace the vault, become a second file manager, or pull every
external system into the core plugin. Its job is to help a person define,
recover, and work inside the context that matters right now.

The vault remains the native source of truth for notes, folders, attachments,
and Obsidian-owned state. Lighthouse stores context definitions, view
preferences, and lightweight references to vault material.

The next architecture should make this distinction clear:

- Files is the grounded vault view.
- Recents is the time-based recovery view.
- Focus is the saved context view.

Sources and Work are useful layouts, but they are not the underlying data model.
They are optional ways to present and organize a Focus.

The architectural principle is:

- Lighthouse decides where the user is and what working context they are in.
- Other plugins decide what actions can be taken there.

## Ecosystem framing

Lighthouse belongs inside a broader DeLeon Labs software direction, but it should
not try to become the entire ecosystem.

Working vocabulary:

- **DeLeon Labs** — the broader experimental studio.
- **Nautilus** — possible name for the modular creative software ecosystem.
- **Lighthouse** — the focus, navigation, and working-context center inside
  Obsidian.
- **Companion plugins** — separate tools that can optionally integrate with
  Lighthouse through APIs.

This keeps the core plugin focused. Related features should be placed as
Lighthouse Core, Lighthouse Core Modules, or DeLeon Labs Companion Plugins.

## Feature classification

### Lighthouse Core

Lighthouse Core is essential to the plugin's identity and remains inside the main
plugin:

- Focus states;
- Recents;
- Files;
- pinned notes;
- watch folders;
- Focus view;
- context switching;
- Focus-aware filtering.

### Lighthouse Core Modules

Core Modules are first-party optional modules that feel native to Lighthouse but
should be internally modular and toggleable:

- Graph Focus;
- Sidecar Notes / focused capture;
- future workspace-specific utilities.

Core Modules should:

- live in separate files/folders, not inside one giant `main.ts`;
- register themselves through an internal module registry;
- have stable internal module IDs;
- expose display name, description, enabled state, settings schema, and optional
  commands/views;
- be toggleable in Lighthouse settings;
- optionally expose settings UI sections;
- register commands, views, event listeners, and cleanup handlers only when
  enabled;
- avoid requiring companion plugins to function.

### DeLeon Labs Companion Plugins

Companion plugins are separate plugins or tools that may integrate with
Lighthouse but should not be folded into Lighthouse:

- Note Actions;
- Source Companion / Citation Source Integrity;
- Squido;
- Crate Digger;
- voice memo tools;
- publishing tools;
- fragment remixing tools.

Companion plugins should:

- work independently when Lighthouse is not installed;
- optionally detect Lighthouse;
- optionally consume Lighthouse context state through a public API;
- register integrations when available;
- avoid hard dependencies unless explicitly designed later.

## Conceptual model

Lighthouse has five conceptual layers:

1. Core app/controller coordinates lifecycle, settings, modules, and API.
2. Providers expose things Lighthouse can reference.
3. Items are normalized references to those things.
4. Focus definitions save which items matter and why.
5. Views render a Focus or vault state for a particular user task.

The first implementation remains vault-native. A built-in vault provider can
expose notes, folders, supported attachments, and safe Obsidian bookmark data.
External systems belong in future provider plugins after the vault-native model
is stable.

## Item model

A Lighthouse item is a stable reference to something that can belong to context.
For the vault-native slice, items should represent vault notes, folders,
attachments, and other Obsidian-native references that Lighthouse can safely
resolve.

The model should reserve enough shape for future providers without implementing
those providers now.

Recommended fields:

- `id` — stable Lighthouse item identifier.
- `providerId` — source namespace, initially `vault`.
- `type` — item kind such as `note`, `folder`, `attachment`, `bookmark`, or
  future provider-specific types.
- `path` — vault path when the item is vault-backed.
- `title` — display title.
- `status` — current resolution state such as `available`, `missing`, or
  `unresolved`.
- `metadata` — small provider-owned display/search metadata.
- `updatedAt` — provider-reported modified time when available.

Vault item IDs should be derived from stable vault information, but Lighthouse
must expect paths to rename, move, disappear, and reappear. The item model should
allow unresolved references to remain in saved Focus state until an explicit
cleanup removes them.

## Provider model

A provider is the boundary between Lighthouse and a source of context items.

The built-in provider is the vault provider. It can:

- list vault items Lighthouse knows how to show;
- resolve a saved item reference back to current vault state;
- report rename, move, create, and delete events;
- provide display metadata;
- declare which item types it supports.

Future provider plugins may expose GitHub issues, GitHub pull requests, web
sources, citations, or DeLeon Labs ecosystem objects. Those should not be
implemented in the core plugin during the Focus Context Model phase.

The core rule is simple: Lighthouse owns context; providers own source-specific
lookup.

## Core module model

Obsidian's `manifest.json` identifies the plugin itself. It must not be used to
identify internal Lighthouse modules.

Internal modules should use a Lighthouse-owned module manifest or registry
object. Suggested shape:

```ts
interface LighthouseModule {
  id: string;
  name: string;
  description: string;
  category: "core" | "core-module" | "integration" | "experimental" | "companion-detected";
  enabledByDefault: boolean;
  requiresDesktop?: boolean;
  settingsKey: string;
  register(context: LighthousePluginContext): void | Promise<void>;
  unregister?(): void | Promise<void>;
  renderSettings?(containerEl: HTMLElement, context: LighthouseSettingsContext): void;
}
```

Suggested module IDs:

- `focus`;
- `recents`;
- `files`;
- `pins`;
- `watch-folders`;
- `focus-view`;
- `graph-focus`;
- `sidecar-notes`.

The first implementation should modularize future optional features before
ripping apart stable core behavior. Graph Focus and Sidecar Notes are better
first candidates for the registry than Focus itself. Once the pattern is stable,
existing core areas can move into module folders incrementally where it improves
clarity.

## Focus model

A Focus is a saved context definition.

It should not be modeled as “the Sources panel plus the Work panel.” Sources and
Work are layouts over Focus membership. The Focus definition should be able to
store item membership independently from the current presentation mode.

Recommended Focus definition shape:

- `id`
- `name`
- `manualItems`
- `rules`
- `exclusions`
- `sectionAssignments`
- `displayMode`
- `inheritance`
- `createdAt`
- `updatedAt`

Manual items are explicit user choices. In the current vault-native
implementation, they adapt from the existing `sourceItems`, `workItems`, and
`unfiledItems` arrays.

Rules include folders, filters, or other criteria that include matching items.
The first reserved rule shape is `path-prefix`, which represents a vault folder
or path scope. Defining this shape does not require rule execution to be wired
immediately.

Exclusions remove items from the Focus even when another rule would include
them. Exclusion storage is part of the model boundary but should not be used to
silently delete existing Focus membership.

Section assignments are presentation metadata. An item can be assigned to
Sources, Work, Unfiled, or later custom sections without changing whether it
belongs to the Focus.

## View model

The same Focus data should support multiple views.

Initial display modes:

- Single Focus: one flattened list of relevant context.
- Split Focus: grouped sections such as Sources, Work, and Unfiled.

Flattening must not erase section assignment. A user should be able to switch
between a single display and a split display without losing the underlying Focus
organization.

Files, Recents, and Focus remain distinct surfaces:

- Files shows vault hierarchy and native file relationships.
- Recents shows recent activity and can be filtered by active Focus.
- Focus shows saved context and can choose a single or split layout.

## Persistence model

Lighthouse persists context definitions in plugin data. Vault content remains in
the vault.

Persistence expectations:

- Save Focus definitions as durable data, not derived UI state.
- Preserve unresolved item references by default.
- Normalize old Focus state deliberately when schema changes.
- Track provider IDs so future item references can coexist.
- Store layout preferences separately from membership.
- Store module enabled states and module-specific settings in normal Lighthouse
  plugin settings.
- Never treat `data.json` as a source file or release asset.

Rename, move, and delete behavior should be explicit:

- Rename/move should update resolvable vault item references.
- Delete should mark item references missing or unresolved rather than silently
  deleting Focus membership.
- Explicit cleanup can remove missing references later.
- Newly created notes can inherit the active Focus when the inheritance rules say
  they should.

## Inheritance model

Focus inheritance answers this question: when the user creates or captures a new
item while a Focus is active, should Lighthouse automatically treat that item as
part of the Focus?

Initial rule:

- A new vault note created through Lighthouse while a named Focus is active
  should inherit that Focus.

Initial inheritance assignment:

- new vault notes created while a named Focus is active should inherit into Work
  by default. In single display mode, the item still appears in the flattened
  list because the display is a view over the same underlying membership.

Possible later inheritance options:

- inherit into the Focus without a section assignment;
- inherit based on creation command or target folder;
- opt out per Focus.

The architecture should define inheritance in the model first. UX details belong
to the Focus Experience milestone.

## Settings model

Lighthouse settings should behave more like an app settings panel than one long
scrolling page.

Recommended sidebar sections:

- General;
- Focus;
- Recents;
- Files;
- Pins;
- Watch Folders;
- Focus View;
- Core Modules;
- Companion Plugins;
- Integrations;
- Advanced.

Core Modules settings should list first-party optional modules such as Graph
Focus and Sidecar Notes with toggles and module-provided settings panels.

Companion Plugins settings should show optional integrations such as Note
Actions, Source Companion, Squido, and Crate Digger. Possible statuses:

- Not installed;
- Detected;
- Connected;
- Disabled;
- Requires update.

This section can be placeholder/documentation-first until integrations exist.
No companion plugin should be required at this stage.

Use Lighthouse's normal plugin settings data as the source of truth. Do not
create separate JSON files for every module unless there is a specific reason.

Suggested shape:

```ts
settings.modules = {
  graphFocus: {
    enabled: false
  },
  sidecarNotes: {
    enabled: false
  }
};

settings.integrations = {
  noteActions: {
    enabled: true
  },
  sourceCompanion: {
    enabled: true
  },
  squido: {
    enabled: true
  }
};
```

## Suggested source structure

The target structure should move toward:

```text
src/
  main.ts
  core/
    LighthousePlugin.ts
    settings.ts
    types.ts
    events.ts
    api.ts
  modules/
    focus/
      index.ts
      settings.ts
      views.ts
      types.ts
    recents/
      index.ts
      settings.ts
      view.ts
    files/
      index.ts
      settings.ts
      view.ts
    pins/
      index.ts
      settings.ts
    watch-folders/
      index.ts
      settings.ts
    focus-view/
      index.ts
      settings.ts
    graph-focus/
      index.ts
      settings.ts
    sidecar-notes/
      index.ts
      settings.ts
  integrations/
    note-actions.ts
    source-companion.ts
    squido.ts
  ui/
    settings/
      SettingsRoot.ts
      SettingsSidebar.ts
      SettingsPanel.ts
  data/
    defaults.ts
    migrations.ts
```

`main.ts` should become a lightweight entry point:

- load settings;
- initialize `LighthousePlugin` or the core app controller;
- register core modules;
- register the settings tab;
- register the public API;
- handle unload cleanup.

Feature implementation should not continue accumulating directly inside
`main.ts`.

## Performance model

The module architecture should reduce startup risk, not add complexity.

Performance rules:

- only register module commands/views/listeners when the module is enabled;
- unregister or clean up when disabled;
- avoid constantly scanning the vault for disabled modules;
- keep settings rendering lazy by section;
- avoid large synchronous startup work;
- prefer event-driven updates over polling.

## Future ecosystem direction

Lighthouse should remain vault-native first.

The future ecosystem direction is to expose Lighthouse as a context engine that
other plugins can integrate with. That means:

- a stable Lighthouse API;
- Focus events and hooks;
- a provider interface;
- ecosystem documentation;
- clear boundaries between core context logic and provider plugins.

GitHub, web, email, calendar, and other external systems should not enter the
core plugin during the Focus Context Model phase. They belong in future provider
plugins once the vault-native architecture is stable.

## Development order

The modular architecture should be introduced incrementally:

1. Documentation first.
2. Settings/data model proposal.
3. Internal module registry.
4. Settings UI sidebar.
5. Move one low-risk feature/module first as proof of concept.
6. Continue broader refactor only after the pattern proves stable.

The first low-risk module should probably be a future optional module such as
Graph Focus or Sidecar Notes, not the existing Focus core. Good architecture here
is not about adding complexity. It is about creating clean boundaries so
Lighthouse can grow without becoming fragile.

## Milestone map

### `v0.26.0-alpha` — Focus Context Model

Define the model before major implementation.

Scope:

- complete issue #16;
- define the Focus model;
- define the item model;
- define the provider boundary;
- define Files vs Recents vs Focus;
- define Focus inheritance;
- define persistence expectations;
- update architecture documentation.

### `v0.27.0-alpha` — Focus Experience

Make Focus effortless and enjoyable.

Scope:

- redesign Focus creation flow;
- eliminate empty Focus friction;
- implement single and split layouts;
- drag and drop section assignment;
- automatic Focus inheritance;
- simplify Focus settings.

### `v0.28.0-alpha` — Ecosystem API

Expose Lighthouse as the context engine for future plugins.

Scope:

- Lighthouse API;
- Focus events/hooks;
- provider interface;
- ecosystem documentation.

Remain vault-native. Do not implement GitHub or other external providers yet.

### `Lighthouse Modular Architecture`

Define and incrementally build the internal module system and ecosystem
boundaries.

Scope:

- document Lighthouse module architecture and ecosystem boundaries;
- refactor `main.ts` into a lightweight bootstrap/controller;
- create an internal module registry;
- move existing core areas into module folders where practical;
- add module metadata structure;
- add module enabled-state settings model;
- redesign settings UI with sidebar sections;
- add Core Modules settings section;
- add Companion Plugins settings section;
- add placeholder integration registry;
- document public Lighthouse API for companion plugins;
- document boundaries between Lighthouse, core modules, and companion plugins;
- add developer notes for future modules.

## Issue review

Current issue recommendations:

- #16 belongs in `v0.26.0-alpha` and is the architecture anchor.
- Focus-view internal naming cleanup belongs in `v0.26.0-alpha` before #16
  implementation, so Focus concepts do not continue to inherit historical
  Bookmarks/Home identifiers. Bookmark terminology should remain for literal
  Obsidian bookmarks and bookmark groups.
- #9 should be reframed under `v0.27.0-alpha` as Focus creation and empty-state
  friction.
- #2 should stay in `v0.27.0-alpha` as Focus surfacing/layout behavior, not as a
  file-tree-only problem.
- #6 should stay in `v0.27.0-alpha` if bookmarks become vault-native Focus
  items; otherwise rewrite after the item model decision.
- #3 should stay in `v0.27.0-alpha` as vault item visibility after the item model
  defines supported file kinds.
- #1, #7, and #10 are experience/polish issues and fit `v0.27.0-alpha`.
- #4 and #5 are already closed and should not drive the new architecture
  milestone.
- #11 is historical and can remain closed.

No new issue is required until the architecture document has been reviewed. The
main gap to consider later is a focused implementation issue for the built-in
vault provider after #16 is complete.
