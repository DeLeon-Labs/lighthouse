# Lighthouse Vision

## Purpose

Lighthouse is the focus and navigation center for meaningful working context in
Obsidian. It helps a person recover and shape the context around active work. It
should make three questions easier to answer:

1. What was I working on?
2. Where does this material live?
3. What matters for the task in front of me?

The current Recents, Files, and Focus tabs are the first expression of that idea.

## Product direction

Lighthouse should become a dependable context layer rather than another place
where a person's notes are stored. The vault remains the canonical home for
notes and attachments. Lighthouse stores context definitions, navigation,
selection, and presentation state that helps a person work with that material.

Lighthouse is part of a broader modular Obsidian tool ecosystem. It should not
become the entire ecosystem. It should decide where the user is and what context
they are in; companion plugins should decide what actions can be taken there.

The desired experience is calm and legible:

- recent work is easy to recover;
- location and hierarchy remain understandable;
- a large vault can be narrowed to a bounded working context;
- Focus definitions are understandable and recoverable;
- Sources, active Work, and Unfiled material can remain distinguishable when the
  chosen layout calls for that structure;
- the user can see and change what belongs to a Focus;
- state changes are deliberate and recoverable where practical;
- desktop and mobile behavior remain coherent.

## Current product boundaries

Lighthouse begins vault-native. It currently provides navigation and Focus
organization inside Obsidian. It does not replace the vault, rewrite note
content, verify sources, or provide a general synchronization service.

External systems such as GitHub, web sources, citations, email, and calendar
belong in future provider plugins, not in the first Focus architecture pass.
Related first-party ideas should become toggleable Lighthouse Core Modules when
they are native to the focus/navigation experience, or separate DeLeon Labs
Companion Plugins when they are independent tools.

The current alpha stores plugin settings and Focus state through Obsidian's
plugin data mechanism. Cross-device consistency depends on how the user's
Obsidian configuration is synchronized and is not yet a finished Lighthouse
capability.

## Planned direction

The following items are planned directions, not finished features:

- a source-based TypeScript implementation with explicit settings types and
  compatibility migrations;
- reproducible builds, checks, and alpha release packaging;
- a documented Focus context model and vault-native provider boundary;
- a documented module architecture that separates Lighthouse Core, Core Modules,
  and Companion Plugins;
- clearer documentation of Focus semantics, inheritance, and state boundaries;
- safer persistence and cross-device behavior;
- documented context handoffs and provider APIs after the local Lighthouse
  architecture is stable.

The repository migration must not become a disguised product rewrite. Current
behavior should first be preserved and tested; later product changes should be
designed and reviewed separately.

## Measures of progress

Lighthouse is moving in the right direction when:

- a person can return to active work without reconstructing the whole vault;
- the same Focus is understandable in Recents, Files, and Focus views;
- saved state survives ordinary vault changes without silent loss;
- mobile and desktop interactions are predictable;
- releases can be reproduced from typed source; and
- another contributor can understand the repository without reading one large
  generated JavaScript file.
