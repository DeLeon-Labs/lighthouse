# Focus Context Model closeout

Issue #16 defined the `v0.26.x-alpha` Focus Context Model milestone. The goal
was to establish the model boundary before larger Focus Experience work.

## Status

The Focus Context Model foundation is complete for `0.26.5-alpha`.

This does not mean the full Focus Experience is complete. UX work such as empty
Focus friction, drag-and-drop section assignment, settings simplification, and
polished single/split layout controls belongs to `v0.27.0-alpha`.

## Acceptance review

| Acceptance criterion | Status | Evidence |
| --- | --- | --- |
| Focus model is documented clearly enough for follow-up implementation | Complete | `docs/architecture.md` defines Focus as a saved context definition with manual items, rules, exclusions, section assignments, display mode, and inheritance. |
| Vault-native item shape is defined | Complete | `src/modules/focus/types.ts` defines `FocusItemReference`; `src/modules/focus/items.ts` defines vault item helpers. |
| Future provider fields are reserved without external provider implementation | Complete | Item references carry `providerId`; rule definitions carry `providerId`; external systems remain deferred. |
| Files, Recents, and Focus are distinct | Complete | `docs/architecture.md` and `docs/user-facing-behavior.md` define each surface separately. |
| New notes created while a Focus is active have defined inheritance behavior | Complete | `src/modules/focus/inheritance.ts` defines inheritance; Lighthouse-created Markdown notes inherit into Work for the active named Focus. |
| File rename/move/delete persistence behavior is defined | Complete | Rename/move rewrites Focus paths; delete preserves unresolved membership for later explicit cleanup. |
| Single and split Focus layouts are views over the same data | Complete | `docs/architecture.md` defines single/split as display modes, not separate data models. |
| Existing Focus data has a clear normalization path | Complete | Current arrays adapt into `FocusContextDefinition` via `src/modules/focus/definition.ts`; no destructive migration is required. |

## Implemented foundation

- Focus module boundary under `src/modules/focus`.
- Vault-native item reference model.
- Focus membership-to-item adapters.
- Active Focus context helpers.
- Rename/move path lifecycle helpers.
- Focus display model normalized to `single` and `split`, with legacy `drill`
  treated as `split`.
- Inheritance helpers and Lighthouse-created Markdown note inheritance into
  Work.
- Reserved rule, exclusion, and section-assignment model shapes.

## Reserved, not implemented yet

- Rule execution.
- Exclusion editing or enforcement.
- Public provider API.
- External providers such as GitHub, web, citation, email, or calendar.
- Full single/split layout UX controls.
- Drag-and-drop section assignment polish.
- Settings redesign.

## Recommendation

Issue #16 can be closed after this closeout branch merges.

The next milestone should be `v0.27.0-alpha — Focus Experience`, starting with
the smallest UX slice that makes Focus creation and population less empty or
confusing.
