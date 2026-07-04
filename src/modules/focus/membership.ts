import {
  isFocusSectionId,
} from "./model";
import type {
  FocusDefinition,
  FocusSectionId,
  FocusSettingsState,
} from "./types";

type FocusMembershipKey = "sourceItems" | "workItems" | "unfiledItems";
type GlobalFocusMembershipKey = "focusGlobalSourceItems" | "focusGlobalWorkItems" | "focusGlobalUnfiledItems";

const FOCUS_SECTION_KEYS: Record<FocusSectionId, FocusMembershipKey> = {
  sources: "sourceItems",
  work: "workItems",
  unfiled: "unfiledItems",
};

const GLOBAL_FOCUS_SECTION_KEYS: Record<FocusSectionId, GlobalFocusMembershipKey> = {
  sources: "focusGlobalSourceItems",
  work: "focusGlobalWorkItems",
  unfiled: "focusGlobalUnfiledItems",
};

export function getFocusMembershipPaths(focus: FocusDefinition | null | undefined): Set<string> {
  const paths = new Set<string>();
  if (!focus) return paths;

  for (const path of focus.items) paths.add(path);
  for (const path of focus.sourceItems) paths.add(path);
  for (const path of focus.workItems) paths.add(path);
  for (const path of focus.unfiledItems) paths.add(path);

  return paths;
}

export function getFocusSettingsMembershipPaths(
  settings: FocusSettingsState,
  focus: FocusDefinition | null | undefined,
): Set<string> {
  const paths = new Set<string>(settings.focusGlobalItems || []);

  for (const path of settings.focusGlobalSourceItems || []) paths.add(path);
  for (const path of settings.focusGlobalWorkItems || []) paths.add(path);
  for (const path of settings.focusGlobalUnfiledItems || []) paths.add(path);
  for (const path of getFocusMembershipPaths(focus)) paths.add(path);

  return paths;
}

export function isPathInFocusMembership(path: string | null | undefined, focusPaths: Set<string>): boolean {
  if (!path) return false;

  for (const focusPath of focusPaths) {
    if (!focusPath) continue;
    if (path === focusPath || path.startsWith(`${focusPath}/`)) return true;
  }

  return false;
}

export function setFocusSectionMembershipValue(
  settings: FocusSettingsState,
  path: string | null | undefined,
  focusId: string,
  sectionId: unknown,
  enabled: boolean,
): boolean {
  if (!path || !isFocusSectionId(sectionId)) return false;

  if (isGlobalFocusId(focusId)) {
    setGlobalFocusSectionMembership(settings, path, sectionId, enabled);
    return true;
  }

  const focus = settings.focuses.find((item) => item.id === focusId);
  if (!focus) return false;

  setNamedFocusSectionMembership(focus, path, sectionId, enabled);
  return true;
}

export function isItemInFocusSectionValue(
  settings: FocusSettingsState,
  path: string | null | undefined,
  focusId: string,
  sectionId: unknown,
): boolean {
  if (!path || !isFocusSectionId(sectionId)) return false;

  if (isGlobalFocusId(focusId)) {
    return (settings[GLOBAL_FOCUS_SECTION_KEYS[sectionId]] || []).includes(path);
  }

  const focus = settings.focuses.find((item) => item.id === focusId);
  return !!(focus && focus[FOCUS_SECTION_KEYS[sectionId]].includes(path));
}

export function isItemInFocusValue(
  settings: FocusSettingsState,
  path: string | null | undefined,
  focusId: string,
): boolean {
  if (!path) return false;

  if (isGlobalFocusId(focusId)) {
    return (
      (settings.focusGlobalSourceItems || []).includes(path) ||
      (settings.focusGlobalWorkItems || []).includes(path) ||
      (settings.focusGlobalUnfiledItems || []).includes(path)
    );
  }

  const focus = settings.focuses.find((item) => item.id === focusId);
  return !!(
    focus &&
    (
      focus.sourceItems.includes(path) ||
      focus.workItems.includes(path) ||
      focus.unfiledItems.includes(path)
    )
  );
}

function setGlobalFocusSectionMembership(
  settings: FocusSettingsState,
  path: string,
  sectionId: FocusSectionId,
  enabled: boolean,
): void {
  const sets = {
    focusGlobalSourceItems: new Set(settings.focusGlobalSourceItems || []),
    focusGlobalWorkItems: new Set(settings.focusGlobalWorkItems || []),
    focusGlobalUnfiledItems: new Set(settings.focusGlobalUnfiledItems || []),
  };
  const key = GLOBAL_FOCUS_SECTION_KEYS[sectionId];

  if (enabled) {
    for (const set of Object.values(sets)) set.delete(path);
    sets[key].add(path);
  } else {
    sets[key].delete(path);
  }

  settings.focusGlobalSourceItems = Array.from(sets.focusGlobalSourceItems);
  settings.focusGlobalWorkItems = Array.from(sets.focusGlobalWorkItems);
  settings.focusGlobalUnfiledItems = Array.from(sets.focusGlobalUnfiledItems);
  settings.focusGlobalItems = [...settings.focusGlobalSourceItems];
}

function setNamedFocusSectionMembership(
  focus: FocusDefinition,
  path: string,
  sectionId: FocusSectionId,
  enabled: boolean,
): void {
  const sets = {
    sourceItems: new Set(focus.sourceItems),
    workItems: new Set(focus.workItems),
    unfiledItems: new Set(focus.unfiledItems),
  };
  const key = FOCUS_SECTION_KEYS[sectionId];

  if (enabled) {
    for (const set of Object.values(sets)) set.delete(path);
    sets[key].add(path);
  } else {
    sets[key].delete(path);
  }

  focus.sourceItems = Array.from(sets.sourceItems);
  focus.workItems = Array.from(sets.workItems);
  focus.unfiledItems = Array.from(sets.unfiledItems);
  focus.items = [...focus.sourceItems];
}

function isGlobalFocusId(focusId: string): boolean {
  return focusId === "all" || focusId === "global";
}
