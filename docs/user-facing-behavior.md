# Lighthouse User-Facing Behavior

This document describes the current `0.25.0-alpha` working build. It is not a
promise that planned behavior is already implemented.

## Main view

Lighthouse registers one Obsidian item view that can open in the sidebar or the
main workspace. The view has three tabs: Recents, Files, and Focus. An active
named Focus can narrow material shown across the view; selecting “All” removes
that named-Focus scope.

## Recents

Current behavior:

- lists recently modified Markdown files;
- supports configurable sort order and result limit;
- can show note previews, locations, and dates;
- supports pinning and unpinning notes;
- keeps pinned notes in a separate collapsible section;
- opens notes from the list;
- can filter results using the active Focus.

This is a navigation surface. It does not copy or rewrite the note content.

## Files

Current behavior:

- renders the vault's folder and file hierarchy;
- expands and collapses folders;
- supports configurable name/time sorting and folder placement;
- can reveal the active file;
- supports watched-folder indicators and counts;
- supports file and folder context actions, including creation and movement;
- supports drag interactions;
- can filter roots using the active Focus.

Ignored paths can be configured. Attachment visibility depends on what the
current implementation includes in the tree; support for every attachment type
should not be assumed.

## Focus

Current behavior:

- creates, edits, switches, and deletes named Focus definitions;
- organizes selected paths into Sources, Work, and Unfiled sections;
- supports items that apply globally and items belonging to a named Focus;
- can add the current file or selected files/folders to Focus;
- surfaces configured combinations of bookmark groups, pinned notes, open tabs,
  and watched folders;
- supports ordering and collapsing Home sections and bookmark groups;
- preserves legacy item fields while normalizing current Source/Work state.

Focus membership is plugin state. Adding a note or folder to Focus does not move
the underlying vault item.

## Commands and note actions

The current snapshot registers commands to:

- open the Lighthouse view;
- open the view in the main pane;
- create a note in the configured default folder;
- open the configured quick-capture file;
- open today's daily note using the configured folder pattern;
- toggle the current Markdown note's Recents pin;
- add the current file to the active Focus;
- add the current file to global Focus material.

The canonical TypeScript source uses Lighthouse as the public-facing product
name. Stable command IDs retain legacy wording where changing them could break
hotkeys or external automation. The preserved historical snapshot still
contains its original labels for comparison.

## Scroll controls

The plugin can show controls for jumping to the top or bottom of the active
Markdown view. The implementation accounts for desktop and mobile presentation,
editing state, and temporary visibility. Reading-mode behavior has a tracked
alpha issue and should be tested rather than assumed complete.

## Settings and stored state

Current settings cover areas including:

- default note, quick-capture, and daily-note locations;
- recent-note limits, sorting, previews, locations, and dates;
- typography for the main view sections;
- pinned notes and watched folders;
- file-tree sorting, folder behavior, and ignored paths;
- bookmark and Home section display;
- Focus definitions, labels, global material, and filtering;
- tab action buttons;
- automatic view opening and active-file reveal;
- scroll-control visibility and size.

Obsidian stores these settings in the installed plugin's per-vault `data.json`.
The repository intentionally does not contain that runtime file. It is not a
default configuration or release asset and is blocked by `.gitignore`.

## Current limitations

- The plugin is alpha software with open behavior and reliability issues.
- The repository does not yet provide a source build or automated tests.
- The runtime is one large JavaScript file and the stylesheet contains
  accumulated compatibility overrides.
- State persistence and cross-device behavior are not yet presented as stable.
- Attachment visibility is incomplete for some file types.
- Some mobile tap behavior needs further testing and correction.
- Manual installation is required for the current snapshot.

## Planned behavior and engineering work

The following items are planned, not current guarantees:

- safer, typed settings and explicit compatibility migrations;
- reproducible TypeScript builds and alpha release packaging;
- improved state reliability and cross-device expectations;
- fixes for tracked navigation, Focus surfacing, attachment, scroll, and mobile
  interaction issues;
- future documented context handoffs within the DeLeon Labs ecosystem.

Planned work should be linked to an issue and release milestone before it is
described as part of a shipped version.
