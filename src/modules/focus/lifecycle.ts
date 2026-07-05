import {
  normalizeFocusItemPath,
} from "./items";
import type {
  FocusDefinition,
  FocusSettingsState,
} from "./types";

interface FocusPathRewriteOptions {
  includeChildren?: boolean;
}

interface FocusPathLifecycleResult {
  changed: boolean;
}

type FocusPathListKey = "items" | "sourceItems" | "workItems" | "unfiledItems";
type FocusSettingsPathListKey = "focusGlobalItems" | "focusGlobalSourceItems" | "focusGlobalWorkItems" | "focusGlobalUnfiledItems";

const FOCUS_PATH_LIST_KEYS: readonly FocusPathListKey[] = ["items", "sourceItems", "workItems", "unfiledItems"];
const FOCUS_SETTINGS_PATH_LIST_KEYS: readonly FocusSettingsPathListKey[] = [
  "focusGlobalItems",
  "focusGlobalSourceItems",
  "focusGlobalWorkItems",
  "focusGlobalUnfiledItems",
];

export function rewriteFocusPath(path: string, oldPath: string, newPath: string, options: FocusPathRewriteOptions = {}): string {
  const normalizedPath = normalizeFocusItemPath(path);
  const normalizedOldPath = normalizeFocusItemPath(oldPath);
  const normalizedNewPath = normalizeFocusItemPath(newPath);

  if (!normalizedPath || !normalizedOldPath || !normalizedNewPath) return normalizedPath;
  if (normalizedPath === normalizedOldPath) return normalizedNewPath;
  if (!options.includeChildren) return normalizedPath;

  const oldPrefix = `${normalizedOldPath}/`;
  if (!normalizedPath.startsWith(oldPrefix)) return normalizedPath;

  return `${normalizedNewPath}/${normalizedPath.slice(oldPrefix.length)}`;
}

export function rewriteFocusPathList(
  paths: readonly string[] | null | undefined,
  oldPath: string,
  newPath: string,
  options: FocusPathRewriteOptions = {},
): { paths: string[]; changed: boolean } {
  const rewritten: string[] = [];
  const seen = new Set<string>();
  let changed = false;

  for (const path of paths || []) {
    const nextPath = rewriteFocusPath(path, oldPath, newPath, options);
    if (!nextPath) {
      changed = true;
      continue;
    }

    if (nextPath !== path) changed = true;
    if (seen.has(nextPath)) {
      changed = true;
      continue;
    }

    seen.add(nextPath);
    rewritten.push(nextPath);
  }

  return { paths: rewritten, changed };
}

export function rewriteFocusDefinitionPaths(
  focus: FocusDefinition,
  oldPath: string,
  newPath: string,
  options: FocusPathRewriteOptions = {},
): FocusPathLifecycleResult {
  let changed = false;

  for (const key of FOCUS_PATH_LIST_KEYS) {
    const result = rewriteFocusPathList(focus[key], oldPath, newPath, options);
    if (!result.changed) continue;

    focus[key] = result.paths;
    changed = true;
  }

  return { changed };
}

export function rewriteFocusSettingsPaths(
  settings: FocusSettingsState,
  oldPath: string,
  newPath: string,
  options: FocusPathRewriteOptions = {},
): FocusPathLifecycleResult {
  let changed = false;

  for (const key of FOCUS_SETTINGS_PATH_LIST_KEYS) {
    const result = rewriteFocusPathList(settings[key], oldPath, newPath, options);
    if (!result.changed) continue;

    settings[key] = result.paths;
    changed = true;
  }

  for (const focus of settings.focuses) {
    const result = rewriteFocusDefinitionPaths(focus, oldPath, newPath, options);
    if (result.changed) changed = true;
  }

  return { changed };
}
