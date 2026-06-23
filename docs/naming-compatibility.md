# Lighthouse Naming and Compatibility

Lighthouse is the canonical public-facing product name. Runtime labels, current
documentation, package metadata, and the canonical manifest should use
`Lighthouse` rather than `Simple Drafts Navigator`, `Drafts Navigator`, or a
brand-like use of `Navigator`.

## Naming audit

### User-facing names

- The manifest display name, view title, ribbon tooltip, settings heading,
  command labels, notices, dialogs, and accessibility labels use `Lighthouse`.
- `Recents`, `Files`, and `Focus` remain feature names within Lighthouse.

### Manifest and plugin metadata

- The canonical manifest display name is `Lighthouse`.
- The package and manifest descriptions identify Lighthouse directly.
- The manifest ID remains `simple-drafts-navigator` for compatibility.

### Internal identifiers

- Authored TypeScript classes use `LighthousePlugin`, `LighthouseView`, and
  `LighthouseSettingTab`.
- Settings keys and method names containing `navigator`, such as
  `navigatorFontSize`, `autoOpenNavigator`, and `openNavigatorInMainPane`, remain
  unchanged to avoid mixing naming cleanup with persisted-state or behavioral
  refactoring.

### Documentation references

- Current product documentation uses Lighthouse as the public name.
- References to the legacy snapshot directory remain because they identify a
  specific preserved baseline rather than the current product name.
- The design-log heading `Navigator becomes Lighthouse` remains as a dated
  record of the naming decision, not as current product terminology.

### Build and configuration references

- The test-vault updater continues to deploy to
  `.obsidian/plugins/simple-drafts-navigator/`. Obsidian derives that directory
  from the stable plugin ID; changing it would create a second installation and
  separate it from existing `data.json` state.
- The `LIGHTHOUSE_TEST_PLUGIN_DIR` environment variable is already canonical and
  remains unchanged.

### Legacy compatibility identifiers

The following identifiers intentionally retain legacy wording:

- manifest ID: `simple-drafts-navigator`;
- view type: `simple-drafts-navigator-view`;
- command IDs such as `open-simple-drafts-navigator`;
- CSS selectors and custom properties tied to the stable view/DOM contract,
  including the `--sdn-*` namespace;
- drag-and-drop MIME keys such as `application/x-simple-drafts-path` and
  `application/x-navigator-*`;
- persisted settings keys containing `navigator`;
- the preserved snapshot directory and all files within it.

Changing any of these requires a separately tested migration with explicit
handling for saved settings, restored workspace leaves, hotkeys, external
automation, styles, drag state, and existing test-vault installations.

## Preserved snapshot

`simple-drafts-navigator-v0.23.0-alpha-focus-simplification/` is a known-working
historical baseline. Its manifest and bundled runtime still say `Simple Drafts
Navigator` and use the legacy internal names. Those files remain unchanged so
behavior and generated output can be compared during the TypeScript migration.
