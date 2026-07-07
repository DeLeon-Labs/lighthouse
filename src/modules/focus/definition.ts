import {
  createVaultFocusItemReference,
  normalizeFocusItemPath,
} from "./items";
import {
  normalizeFocusDisplayMode,
} from "./model";
import type {
  FocusContextDefinition,
  FocusDefinition,
  FocusFilterRule,
  FocusManualItem,
  FocusSectionAssignment,
  FocusSectionId,
} from "./types";

interface ManualItemInput {
  path: string;
  sectionId: FocusSectionId;
}

export function createFocusContextDefinition(focus: FocusDefinition): FocusContextDefinition {
  const manualItems = createManualItemsFromFocus(focus);

  return {
    id: focus.id,
    name: focus.name,
    displayMode: normalizeFocusDisplayMode(focus.displayMode),
    manualItems,
    rules: createFolderRulesFromFocus(focus),
    exclusions: [],
    sectionAssignments: createSectionAssignmentsFromManualItems(manualItems),
  };
}

export function createManualItemsFromFocus(focus: FocusDefinition): FocusManualItem[] {
  return createManualItems([
    ...pathsToManualInputs(focus.items, "sources"),
    ...pathsToManualInputs(focus.sourceItems, "sources"),
    ...pathsToManualInputs(focus.workItems, "work"),
    ...pathsToManualInputs(focus.unfiledItems, "unfiled"),
  ]);
}

export function createManualItems(inputs: Iterable<ManualItemInput>): FocusManualItem[] {
  const items: FocusManualItem[] = [];
  const seen = new Set<string>();

  for (const input of inputs) {
    const path = normalizeFocusItemPath(input.path);
    if (!path) continue;

    const item = createVaultFocusItemReference({ path });
    if (seen.has(item.id)) continue;

    seen.add(item.id);
    items.push({
      item,
      sectionId: input.sectionId,
    });
  }

  return items;
}

export function createFolderRulesFromFocus(focus: FocusDefinition): FocusFilterRule[] {
  const rules: FocusFilterRule[] = [];
  const seen = new Set<string>();

  for (const rawPath of focus.visibleFolders) {
    const path = normalizeFocusItemPath(rawPath);
    if (!path || seen.has(path)) continue;

    seen.add(path);
    rules.push({
      id: `vault:path-prefix:${path}`,
      type: "path-prefix",
      providerId: "vault",
      enabled: true,
      path,
    });
  }

  return rules;
}

export function createSectionAssignmentsFromManualItems(manualItems: readonly FocusManualItem[]): FocusSectionAssignment[] {
  return manualItems.map((manualItem) => ({
    itemId: manualItem.item.id,
    sectionId: manualItem.sectionId,
  }));
}

function pathsToManualInputs(paths: readonly string[], sectionId: FocusSectionId): ManualItemInput[] {
  return paths.map((path) => ({ path, sectionId }));
}
