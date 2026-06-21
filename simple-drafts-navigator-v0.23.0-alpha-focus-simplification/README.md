# Lighthouse v0.23.0-alpha

Internal alpha working copy of Lighthouse, a focus-aware navigator for Obsidian.

## Current architecture

Lighthouse presents one sidebar view with three coordinated tabs:

- **Recents** answers “What was I working on?” and includes pinned notes.
- **Files** answers “Where does this live?” with folder navigation and watched
  folders.
- **Focus** answers “What matters right now?” by bringing together bookmarks,
  pinned notes, open tabs, watched folders, and explicitly selected material.

An active Focus scopes the experience across these views. Focus material is
organized into **Sources**, **Work**, and **Unfiled** sections, with both global
items and items belonging to a named Focus. Lighthouse stores its own navigation
and selection state while leaving vault files as the canonical source material.

## Changes

- Treat Sources and Work as the canonical Focus item sections
- Keep legacy `items` data only as a backward-compatible Sources mirror
- Prevent Work items from being re-added to Sources during normalization
- Remove stale Focus membership from Sources, Work, and legacy item arrays together
- Lock Focus rendering to the Sources / Work drill-down view
- Update Focus edit summaries to show Sources, Work, Global Sources, and Global Work separately
