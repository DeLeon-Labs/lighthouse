# Lighthouse Architecture

This document is the canonical design reference for the next Lighthouse
implementation phase. It expands issue #16 into an architecture direction before
code changes begin.

## Core philosophy

Lighthouse is the context engine for Obsidian.

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

## Conceptual model

Lighthouse has four conceptual layers:

1. Providers expose things Lighthouse can reference.
2. Items are normalized references to those things.
3. Focus definitions save which items matter and why.
4. Views render a Focus or vault state for a particular user task.

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

## Focus model

A Focus is a saved context definition.

It should not be modeled as “the Sources panel plus the Work panel.” Sources and
Work are layouts over Focus membership. The Focus definition should be able to
store item membership independently from the current presentation mode.

Recommended Focus definition shape:

- `id`
- `name`
- `description`
- `manualItems`
- `rules`
- `exclusions`
- `sectionAssignments`
- `layout`
- `inheritance`
- `createdAt`
- `updatedAt`

Manual items are explicit user choices. Rules include folders, filters, or other
criteria that include matching items. Exclusions remove items from the Focus even
when another rule would include them.

Section assignments are presentation metadata. An item can be assigned to
Sources, Work, Unfiled, or later custom sections without changing whether it
belongs to the Focus.

## View model

The same Focus data should support multiple views.

Initial view modes:

- Single-panel Focus: one flattened list of relevant context.
- Structured Focus: grouped sections such as Sources, Work, and Unfiled.

Flattening must not erase section assignment. A user should be able to switch
between a single-panel view and a structured-panel view without losing the
underlying Focus organization.

Files, Recents, and Focus remain distinct surfaces:

- Files shows vault hierarchy and native file relationships.
- Recents shows recent activity and can be filtered by active Focus.
- Focus shows saved context and can choose a flat or structured layout.

## Persistence model

Lighthouse persists context definitions in plugin data. Vault content remains in
the vault.

Persistence expectations:

- Save Focus definitions as durable data, not derived UI state.
- Preserve unresolved item references by default.
- Normalize old Focus state deliberately when schema changes.
- Track provider IDs so future item references can coexist.
- Store layout preferences separately from membership.
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

Possible inheritance options:

- inherit into the Focus without a section assignment;
- inherit into Work by default;
- inherit based on creation command or target folder;
- opt out per Focus.

The architecture should define inheritance in the model first. UX details belong
to the Focus Experience milestone.

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
- implement single-panel and structured-panel layouts;
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

## Issue review

Current issue recommendations:

- #16 belongs in `v0.26.0-alpha` and is the architecture anchor.
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
